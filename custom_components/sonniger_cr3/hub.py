"""MQTT hub: discover boards and cache leaf payloads."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from homeassistant.components import mqtt
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    DOMAIN,
    MANUFACTURER,
    MODEL_CR3,
    MODEL_MIX,
    SIGNAL_DEVICE,
    TOPIC_PREFIX,
)

_LOGGER = logging.getLogger(__name__)


@dataclass
class SonnigerDevice:
    """One controller identified by device_id."""

    device_id: str
    unit: str = "cr3"  # cr3 | mix
    online: bool = False
    data: dict[str, str] = field(default_factory=dict)

    @property
    def is_mix(self) -> bool:
        return self.unit == "mix"

    @property
    def name(self) -> str:
        kind = "MIX" if self.is_mix else "CR3"
        return f"Sonniger {kind} {self.device_id}"

    @property
    def model(self) -> str:
        return MODEL_MIX if self.is_mix else MODEL_CR3

    def get(self, leaf: str, default: str | None = None) -> str | None:
        return self.data.get(leaf, default)

    def get_float(self, leaf: str, default: float | None = None) -> float | None:
        raw = self.data.get(leaf)
        if raw is None or raw == "":
            return default
        try:
            return float(raw)
        except ValueError:
            return default

    def get_bool(self, leaf: str, default: bool = False) -> bool:
        raw = self.data.get(leaf)
        if raw is None:
            return default
        return raw in ("1", "on", "true", "ON", "True", "online")

    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self.device_id)},
            "name": self.name,
            "manufacturer": MANUFACTURER,
            "model": self.model,
            "sw_version": self.data.get("fw"),
        }


class SonnigerHub:
    """Subscribe to sonniger/cr3/# and track devices."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.devices: dict[str, SonnigerDevice] = {}
        self._unsubs: list[Callable[[], None]] = []
        self._entity_callbacks: list[Callable[[SonnigerDevice], None]] = []

    @property
    def ui_mode(self) -> str:
        return self.entry.options.get(
            "ui_mode", self.entry.data.get("ui_mode", "simple")
        )

    def is_advanced(self) -> bool:
        return self.ui_mode == "advanced"

    def register_entity_callback(
        self, cb: Callable[[SonnigerDevice], None]
    ) -> Callable[[], None]:
        """Call cb for every existing and future device."""
        self._entity_callbacks.append(cb)
        for dev in list(self.devices.values()):
            cb(dev)

        def _remove() -> None:
            if cb in self._entity_callbacks:
                self._entity_callbacks.remove(cb)

        return _remove

    async def async_start(self) -> None:
        topic = f"{TOPIC_PREFIX}/#"

        @callback
        def _message(msg: mqtt.ReceiveMessage) -> None:
            self._handle_message(msg.topic, msg.payload)

        self._unsubs.append(
            await mqtt.async_subscribe(self.hass, topic, _message, qos=0)
        )
        _LOGGER.info("Sonniger hub subscribed to %s (mode=%s)", topic, self.ui_mode)

    @callback
    def _handle_message(self, topic: str, payload: bytes | str) -> None:
        if isinstance(payload, bytes):
            try:
                payload = payload.decode("utf-8", errors="ignore")
            except Exception:  # noqa: BLE001
                return
        parts = topic.split("/")
        # sonniger/cr3/<id>/<leaf>  or  sonniger/cr3/all/...  or  sonniger/cr3/grp/...
        if len(parts) < 4 or parts[0] != "sonniger" or parts[1] != "cr3":
            return
        device_id = parts[2]
        if device_id in ("all", "grp"):
            return
        leaf = "/".join(parts[3:])
        if leaf.startswith("cmd/"):
            return

        created = device_id not in self.devices
        dev = self.devices.setdefault(device_id, SonnigerDevice(device_id=device_id))
        unit_before = dev.get("unit") in ("cr3", "mix")

        if leaf == "online":
            dev.online = payload.strip().lower() == "online"
            dev.data["online"] = "online" if dev.online else "offline"
        elif leaf == "unit":
            u = payload.strip().lower()
            if u in ("cr3", "mix"):
                dev.unit = u
            dev.data["unit"] = u
        elif leaf == "state":
            self._ingest_state(dev, payload)
        elif leaf == "alarm":
            dev.data["alarm"] = payload
            try:
                obj = json.loads(payload)
                if isinstance(obj, dict):
                    text = obj.get("text") or obj.get("code") or payload
                    dev.data["alarm_text"] = str(text)
                    code = obj.get("code")
                    if code is not None:
                        dev.data["alarm_code"] = str(code)
            except (json.JSONDecodeError, TypeError):
                dev.data["alarm_text"] = payload
        else:
            # flatten nested leaves like grp/... into key with slash
            key = leaf.replace("/", "_") if "/" in leaf else leaf
            # keep original leaf for known flat topics
            if "/" not in leaf:
                dev.data[leaf] = payload
            else:
                dev.data[key] = payload
                dev.data[leaf] = payload

        unit_after = dev.get("unit") in ("cr3", "mix")
        # Notify platforms on new device or when unit becomes known (entity gates).
        if created or (not unit_before and unit_after):
            for cb in self._entity_callbacks:
                cb(dev)
        async_dispatcher_send(self.hass, f"{SIGNAL_DEVICE}_{device_id}", dev)

    def _ingest_state(self, dev: SonnigerDevice, payload: str) -> None:
        try:
            obj = json.loads(payload)
        except (json.JSONDecodeError, TypeError):
            return
        if not isinstance(obj, dict):
            return
        unit = obj.get("unit")
        if unit in ("cr3", "mix"):
            dev.unit = unit
            dev.data["unit"] = unit
        mapping = {
            "tin": "tin",
            "tout": "tout",
            "ain": "ain",
            "aout": "aout",
            "ttop": "ttop",
            "tbot": "tbot",
            "dt": "dt",
            "fan": "fan_pct",
            "fan_pct": "fan_pct",
            "fan2": "fan2_pct",
            "fan2_pct": "fan2_pct",
            "mode": "mode",
            "enabled": "enabled",
            "setpoint": "setpoint",
            "heat_target": "heat_target",
            "heat_idx": "heat_idx",
            "heat_process": "heat_process",
            "valve": "valve",
            "phase": "phase",
            "fw": "fw",
        }
        for src, dst in mapping.items():
            if src in obj and obj[src] is not None:
                val = obj[src]
                if isinstance(val, bool):
                    dev.data[dst] = "1" if val else "0"
                else:
                    dev.data[dst] = str(val)

    async def async_publish(self, device_id: str, leaf: str, payload: str) -> None:
        topic = f"{TOPIC_PREFIX}/{device_id}/cmd/{leaf}"
        await mqtt.async_publish(self.hass, topic, payload, qos=0, retain=False)

    async def async_publish_raw(self, topic: str, payload: str) -> None:
        await mqtt.async_publish(self.hass, topic, payload, qos=0, retain=False)

    async def async_stop(self) -> None:
        while self._unsubs:
            unsub = self._unsubs.pop()
            unsub()

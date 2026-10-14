"""Sensors."""

from __future__ import annotations

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTemperature, UnitOfTime
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub

# key, name, leaf, unit, device_class, state_class, advanced, cr3, mix, text
SENSOR_DEFS = [
    ("alarm_text", "Alarm text", "alarm_text", None, None, None, False, False, False, True),
    ("tin", "Tin", "tin", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("tout", "Tout", "tout", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("ain", "Ain", "ain", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("aout", "Aout", "aout", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("dt_water", "ΔT water", "dt_water", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("heat_idx", "Heat idx", "heat_idx", None, None, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("heat_process", "Heat process", "heat_process", None, None, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("ttop", "T top", "ttop", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, False, True, False),
    ("tbot", "T bottom", "tbot", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, False, True, False),
    ("dt", "ΔT", "dt", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT, True, False, True, False),
    ("phase", "Phase", "phase", None, None, None, True, False, True, True),
    ("wait_left", "Wait left", "wait_left", UnitOfTime.SECONDS, SensorDeviceClass.DURATION, SensorStateClass.MEASUREMENT, True, False, True, False),
    ("fan_pct", "Fan %", "fan_pct", PERCENTAGE, None, SensorStateClass.MEASUREMENT, True, False, False, False),
    ("fan2_pct", "Fan2 %", "fan2_pct", PERCENTAGE, None, SensorStateClass.MEASUREMENT, True, True, False, False),
    ("fw", "Firmware", "fw", None, None, None, True, False, False, True),
    ("ip", "IP", "ip", None, None, None, True, False, False, True),
    ("uptime", "Uptime", "uptime", UnitOfTime.SECONDS, SensorDeviceClass.DURATION, SensorStateClass.TOTAL_INCREASING, True, False, False, False),
    ("ota", "OTA status", "ota", None, None, None, True, False, False, True),
    ("load_pct", "Loop load", "load_pct", PERCENTAGE, None, SensorStateClass.MEASUREMENT, True, False, False, False),
    ("roms_ok", "ROMs OK", "roms_ok", None, None, None, True, False, False, True),
    ("mode", "Mode", "mode", None, None, None, True, False, False, True),
    ("group", "Group", "group", None, None, None, True, False, False, True),
    ("grp_role", "Group role", "grp_role", None, None, None, True, False, False, True),
    ("grp_master", "Group master", "grp_master", None, None, None, True, False, False, True),
    ("grp_n", "Group slaves", "grp_n", None, None, SensorStateClass.MEASUREMENT, True, False, False, False),
    ("grp_lock", "Group lock", "grp_lock", None, None, None, True, False, False, True),
]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    hub: SonnigerHub = hass.data[DOMAIN][entry.entry_id]
    known: set[str] = set()

    @callback
    def _discover(device: SonnigerDevice) -> None:
        # alarm_text always; unit-specific sensors after unit is known
        unit_known = device.get("unit") in ("cr3", "mix")
        entities: list[SonnigerSensor] = []
        for (
            key,
            name,
            leaf,
            unit,
            dclass,
            sclass,
            adv,
            cr3,
            mix,
            text,
        ) in SENSOR_DEFS:
            uid = f"{device.device_id}_{key}"
            if uid in known:
                continue
            if adv and not hub.is_advanced():
                continue
            if (cr3 or mix) and not unit_known:
                continue
            if cr3 and device.is_mix:
                continue
            if mix and not device.is_mix:
                continue
            # Fan % sensor: skip on CR3 (Climate) always; show on MIX in Advanced
            if key == "fan_pct" and (not device.is_mix or not hub.is_advanced()):
                continue
            known.add(uid)
            entities.append(
                SonnigerSensor(
                    hub, device, key, name, leaf, unit, dclass, sclass, text
                )
            )
        if entities:
            async_add_entities(entities)

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerSensor(SonnigerEntity, SensorEntity):
    def __init__(
        self,
        hub: SonnigerHub,
        device: SonnigerDevice,
        key: str,
        name: str,
        leaf: str,
        unit: str | None,
        device_class: SensorDeviceClass | None,
        state_class: SensorStateClass | None,
        text: bool,
    ) -> None:
        super().__init__(hub, device, key, name)
        self._leaf = leaf
        self._text = text
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = device_class
        self._attr_state_class = state_class

    @property
    def native_value(self):
        raw = self._device.get(self._leaf)
        if raw is None:
            return None
        if self._text:
            # OTA may be JSON — keep as string
            if self._leaf == "ota" and raw.startswith("{"):
                try:
                    import json

                    obj = json.loads(raw)
                    return obj.get("st", raw)
                except (json.JSONDecodeError, TypeError):
                    return raw
            return raw
        try:
            if "." in raw:
                return float(raw)
            return int(raw)
        except ValueError:
            return raw

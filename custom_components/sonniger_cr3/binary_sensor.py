"""Binary sensors."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub

# (key, name, leaf, device_class, advanced_only, cr3_only, mix_only)
BINARY_DEFS = [
    ("online", "Online", "online", BinarySensorDeviceClass.CONNECTIVITY, False, False, False),
    ("alarm", "Alarm", "alarm_active", BinarySensorDeviceClass.PROBLEM, False, False, False),
    ("afz", "Antifreeze", "afz_active", BinarySensorDeviceClass.SAFETY, True, True, False),
    ("afz_water", "AFZ water", "afz_water", BinarySensorDeviceClass.SAFETY, True, True, False),
    ("afz_room", "AFZ room", "afz_room", BinarySensorDeviceClass.SAFETY, True, True, False),
    (
        "mqtt_wdog",
        "MQTT watchdog",
        "mqtt_watchdog_alarm",
        BinarySensorDeviceClass.PROBLEM,
        True,
        False,
        False,
    ),
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
        unit_known = device.get("unit") in ("cr3", "mix")
        entities: list[SonnigerBinarySensor] = []
        for key, name, leaf, dclass, adv, cr3, mix in BINARY_DEFS:
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
            known.add(uid)
            entities.append(
                SonnigerBinarySensor(hub, device, key, name, leaf, dclass)
            )
        if entities:
            async_add_entities(entities)

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerBinarySensor(SonnigerEntity, BinarySensorEntity):
    def __init__(
        self,
        hub: SonnigerHub,
        device: SonnigerDevice,
        key: str,
        name: str,
        leaf: str,
        device_class: BinarySensorDeviceClass | None,
    ) -> None:
        super().__init__(hub, device, key, name)
        self._leaf = leaf
        self._attr_device_class = device_class

    @property
    def available(self) -> bool:
        if self._key == "online":
            return True
        return super().available

    @property
    def is_on(self) -> bool | None:
        if self._leaf == "online":
            return self._device.online
        return self._device.get_bool(self._leaf)

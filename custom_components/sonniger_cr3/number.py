"""Number entities (Advanced)."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTemperature, UnitOfTime
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub

# key, name, state_leaf, cmd_leaf, min, max, step, unit, cr3, mix
NUMBER_DEFS = [
    ("heat_target", "Heat target", "heat_target", "heat_target", 0, 100, 0.5, None, True, False),
    ("setpoint", "Setpoint", "setpoint", "setpoint", 5, 35, 0.5, UnitOfTemperature.CELSIUS, True, False),
    ("afz", "AFZ water", "afz", "antifreeze", 2, 20, 0.5, UnitOfTemperature.CELSIUS, True, False),
    ("room_afz", "RAFZ air", "room_afz", "room_afz", 5, 15, 0.5, UnitOfTemperature.CELSIUS, True, False),
    ("fan2", "Fan2 command", "fan2_pct", "fan2_pct", 0, 100, 1, PERCENTAGE, True, False),
    ("fsafe", "Fan failsafe", "fan_failsafe", "fan_failsafe", 0, 100, 1, PERCENTAGE, False, False),
    ("dt_on", "ΔT on", "dt_on", "dt_on", 0.5, 20, 0.5, UnitOfTemperature.CELSIUS, False, True),
    ("dt_full", "ΔT full", "dt_full", "dt_full", 1, 30, 0.5, UnitOfTemperature.CELSIUS, False, True),
    ("wait_s", "Wait", "wait_s", "wait_s", 30, 7200, 30, UnitOfTime.SECONDS, False, True),
    ("mqtt_wdog_s", "MQTT watchdog", "mqtt_watchdog", "mqtt_watchdog", 0, 3600, 10, UnitOfTime.SECONDS, False, False),
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
        if not hub.is_advanced():
            return
        if device.get("unit") not in ("cr3", "mix"):
            return
        entities: list[SonnigerNumber] = []
        for key, name, state, cmd, mn, mx, step, unit, cr3, mix in NUMBER_DEFS:
            uid = f"{device.device_id}_{key}"
            if uid in known:
                continue
            if cr3 and device.is_mix:
                continue
            if mix and not device.is_mix:
                continue
            known.add(uid)
            entities.append(
                SonnigerNumber(hub, device, key, name, state, cmd, mn, mx, step, unit)
            )
        if entities:
            async_add_entities(entities)

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerNumber(SonnigerEntity, NumberEntity):
    _attr_mode = NumberMode.BOX

    def __init__(
        self,
        hub: SonnigerHub,
        device: SonnigerDevice,
        key: str,
        name: str,
        state_leaf: str,
        cmd_leaf: str,
        minimum: float,
        maximum: float,
        step: float,
        unit: str | None,
    ) -> None:
        super().__init__(hub, device, key, name)
        self._state_leaf = state_leaf
        self._cmd_leaf = cmd_leaf
        self._attr_native_min_value = minimum
        self._attr_native_max_value = maximum
        self._attr_native_step = step
        self._attr_native_unit_of_measurement = unit

    @property
    def native_value(self) -> float | None:
        return self._device.get_float(self._state_leaf)

    async def async_set_native_value(self, value: float) -> None:
        # integers for some leaves
        if self._attr_native_step >= 1 and float(self._attr_native_step).is_integer():
            payload = str(int(round(value)))
        else:
            payload = str(value)
        await self._async_cmd(self._cmd_leaf, payload)

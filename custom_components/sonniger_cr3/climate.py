"""Climate entity for CR3 (Simple + Advanced)."""

from __future__ import annotations

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub

FAN_MODES = [str(i) for i in range(0, 105, 5)]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    hub: SonnigerHub = hass.data[DOMAIN][entry.entry_id]
    known: set[str] = set()

    @callback
    def _discover(device: SonnigerDevice) -> None:
        if device.device_id in known:
            return
        # Wait until unit is known (avoid creating CR3 climate for MIX).
        if device.get("unit") not in ("cr3", "mix"):
            return
        if device.is_mix:
            return
        known.add(device.device_id)
        async_add_entities([SonnigerClimate(hub, device)])

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerClimate(SonnigerEntity, ClimateEntity):
    """CR3 heat circuit as a thermostat."""

    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_fan_modes = FAN_MODES
    _attr_min_temp = 0.0
    _attr_max_temp = 100.0
    _attr_target_temperature_step = 0.5
    _cmd_leaf = "enable"  # attrs: group lock state

    def __init__(self, hub: SonnigerHub, device: SonnigerDevice) -> None:
        super().__init__(hub, device, "climate", "Climate")

    @property
    def hvac_modes(self) -> list[HVACMode]:
        if self._device.cmd_writable("enable"):
            return [HVACMode.OFF, HVACMode.HEAT]
        return [self.hvac_mode]

    @property
    def supported_features(self) -> ClimateEntityFeature:
        feats = ClimateEntityFeature(0)
        # Hard Slave: heat_target not accepted by FW — hide target control.
        if self._device.cmd_writable("heat_target"):
            feats |= ClimateEntityFeature.TARGET_TEMPERATURE
        if self._device.cmd_writable("fan_pct"):
            feats |= ClimateEntityFeature.FAN_MODE
        if self._device.cmd_writable("enable"):
            feats |= ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF
        return feats

    @property
    def current_temperature(self) -> float | None:
        return self._device.get_float("ain")

    @property
    def target_temperature(self) -> float | None:
        return self._device.get_float("heat_target")

    @property
    def hvac_mode(self) -> HVACMode:
        if self._device.get_bool("enabled", True):
            return HVACMode.HEAT
        return HVACMode.OFF

    @property
    def fan_mode(self) -> str | None:
        pct = self._device.get_float("fan_pct")
        if pct is None:
            return None
        stepped = int(round(pct / 5.0) * 5)
        stepped = max(0, min(100, stepped))
        return str(stepped)

    async def async_set_temperature(self, **kwargs) -> None:
        temp = kwargs.get(ATTR_TEMPERATURE)
        if temp is None:
            return
        await self._async_cmd("heat_target", str(temp))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        if hvac_mode == HVACMode.OFF:
            await self._async_cmd("enable", "0")
        else:
            await self._async_cmd("enable", "1")

    async def async_turn_on(self) -> None:
        await self._async_cmd("enable", "1")

    async def async_turn_off(self) -> None:
        await self._async_cmd("enable", "0")

    async def async_set_fan_mode(self, fan_mode: str) -> None:
        await self._async_cmd("fan_pct", fan_mode)

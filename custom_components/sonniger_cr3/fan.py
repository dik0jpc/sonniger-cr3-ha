"""Fan entity — MIX Simple; optional Advanced CR3 omitted (Climate owns %)."""

from __future__ import annotations

from homeassistant.components.fan import FanEntity, FanEntityFeature
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub


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
        if device.get("unit") not in ("cr3", "mix"):
            return
        # Simple+Advanced: Fan for MIX only (CR3 uses Climate fan_mode)
        if not device.is_mix:
            return
        known.add(device.device_id)
        async_add_entities([SonnigerFan(hub, device)])

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerFan(SonnigerEntity, FanEntity):
    """MIX fan percentage."""

    _attr_supported_features = (
        FanEntityFeature.SET_SPEED
        | FanEntityFeature.TURN_ON
        | FanEntityFeature.TURN_OFF
    )
    _attr_percentage_step = 1.0

    def __init__(self, hub: SonnigerHub, device: SonnigerDevice) -> None:
        super().__init__(hub, device, "fan", "Fan")

    @property
    def is_on(self) -> bool | None:
        pct = self.percentage
        if pct is None:
            return None
        return pct > 0

    @property
    def percentage(self) -> int | None:
        pct = self._device.get_float("fan_pct")
        if pct is None:
            return None
        return int(round(pct))

    async def async_set_percentage(self, percentage: int) -> None:
        await self._async_cmd("fan_pct", str(percentage))

    async def async_turn_on(
        self,
        percentage: int | None = None,
        preset_mode: str | None = None,
        **kwargs,
    ) -> None:
        if percentage is None:
            percentage = self.percentage or 30
        await self._async_cmd("fan_pct", str(percentage))

    async def async_turn_off(self, **kwargs) -> None:
        await self._async_cmd("fan_pct", "0")

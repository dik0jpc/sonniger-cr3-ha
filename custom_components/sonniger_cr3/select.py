"""Select entities (Advanced)."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, MODE_OPTIONS
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
        if not hub.is_advanced():
            return
        uid = f"{device.device_id}_mode_sel"
        if uid in known:
            return
        known.add(uid)
        async_add_entities([SonnigerModeSelect(hub, device)])

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerModeSelect(SonnigerEntity, SelectEntity):
    _attr_options = MODE_OPTIONS

    def __init__(self, hub: SonnigerHub, device: SonnigerDevice) -> None:
        super().__init__(hub, device, "mode_sel", "Mode")

    @property
    def current_option(self) -> str | None:
        mode = self._device.get("mode")
        if mode == "auto":
            return "manual"
        if mode == "ha":
            return "slave"
        if mode in MODE_OPTIONS:
            return mode
        return None

    async def async_select_option(self, option: str) -> None:
        await self._async_cmd("mode", option)

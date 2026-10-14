"""Base entity for Sonniger devices."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import SIGNAL_DEVICE
from .hub import SonnigerDevice, SonnigerHub


class SonnigerEntity(Entity):
    """Entity bound to one SonnigerDevice."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        hub: SonnigerHub,
        device: SonnigerDevice,
        key: str,
        name: str,
    ) -> None:
        self._hub = hub
        self._device = device
        self._key = key
        self._attr_name = name
        self._attr_unique_id = f"{device.device_id}_{key}"
        self._attr_device_info = device.device_info()

    @property
    def available(self) -> bool:
        return self._device.online

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                f"{SIGNAL_DEVICE}_{self._device.device_id}",
                self._handle_update,
            )
        )

    @callback
    def _handle_update(self, device: SonnigerDevice) -> None:
        self._device = device
        self._attr_device_info = device.device_info()
        self.async_write_ha_state()

    async def _async_cmd(self, leaf: str, payload: str) -> None:
        await self._hub.async_publish(self._device.device_id, leaf, payload)

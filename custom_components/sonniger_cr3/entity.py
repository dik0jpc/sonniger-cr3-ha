"""Base entity for Sonniger devices."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import INTEGRATION_VERSION, SIGNAL_DEVICE
from .entity_help import help_text
from .hub import SonnigerDevice, SonnigerHub


class SonnigerEntity(Entity):
    """Entity bound to one SonnigerDevice."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    # MQTT cmd leaf this control writes; None = sensors / always-info.
    _cmd_leaf: str | None = None
    # HA platform name for help lookup (sensor / binary_sensor / number / …).
    _help_platform: str | None = None

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

    @property
    def cmd_writable(self) -> bool:
        if not self._cmd_leaf:
            return True
        return self._device.cmd_writable(self._cmd_leaf)

    @property
    def icon(self) -> str | None:
        if self._cmd_leaf and not self.cmd_writable:
            return "mdi:lock"
        return None

    @property
    def extra_state_attributes(self) -> dict[str, str | bool]:
        attrs: dict[str, str | bool] = {
            "integration_version": INTEGRATION_VERSION,
        }
        platform = self._help_platform
        if platform is None and self.entity_id:
            platform = self.entity_id.split(".", 1)[0]
        desc = help_text(self.hass, self._key, platform)
        if desc:
            # Shown in more-info; frontend tooltips.js also uses this for hover title.
            attrs["description"] = desc
        if self._cmd_leaf:
            attrs["writable"] = self.cmd_writable
            attrs["group_locked"] = self._device.is_group_locked()
        return attrs

    def _sync_control_features(self) -> None:
        """Override in Number/Switch/Climate/Fan to refresh supported_features."""

    async def async_added_to_hass(self) -> None:
        self._sync_control_features()
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
        self._sync_control_features()
        self.async_write_ha_state()

    async def _async_cmd(self, leaf: str, payload: str) -> None:
        if not self._device.cmd_writable(leaf):
            return
        await self._hub.async_publish(self._device.device_id, leaf, payload)

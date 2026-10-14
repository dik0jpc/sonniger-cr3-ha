"""Switch entities."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SonnigerEntity
from .hub import SonnigerDevice, SonnigerHub

try:
    from homeassistant.components.switch import SwitchEntityFeature
except ImportError:  # pragma: no cover
    SwitchEntityFeature = None  # type: ignore[misc, assignment]

_TURN_ON = getattr(SwitchEntityFeature, "TURN_ON", None) if SwitchEntityFeature else None
_TURN_OFF = getattr(SwitchEntityFeature, "TURN_OFF", None) if SwitchEntityFeature else None

SWITCH_DEFS = [
    ("enable", "Circuit enable", "enabled", "enable", False, False, True),
    ("enable_adv", "Circuit enable", "enabled", "enable", True, True, False),
    ("valve", "Valve", "valve", "valve", True, True, False),
    ("eco", "Eco", "eco", "eco", True, False, False),
    ("room_afz_en", "Room AFZ", "room_afz_en", "room_afz_en", True, True, False),
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
        if device.get("unit") not in ("cr3", "mix"):
            return
        entities: list[SonnigerSwitch] = []
        for key, name, state, cmd, adv, cr3, mix in SWITCH_DEFS:
            uid = f"{device.device_id}_{key}"
            if uid in known:
                continue
            if adv and not hub.is_advanced():
                continue
            if cr3 and device.is_mix:
                continue
            if mix and not device.is_mix:
                continue
            if key == "enable_adv" and (device.is_mix or not hub.is_advanced()):
                continue
            known.add(uid)
            entities.append(SonnigerSwitch(hub, device, key, name, state, cmd))
        if entities:
            async_add_entities(entities)

    entry.async_on_unload(hub.register_entity_callback(_discover))


class SonnigerSwitch(SonnigerEntity, SwitchEntity):
    def __init__(
        self,
        hub: SonnigerHub,
        device: SonnigerDevice,
        key: str,
        name: str,
        state_leaf: str,
        cmd_leaf: str,
    ) -> None:
        super().__init__(hub, device, key, name)
        self._state_leaf = state_leaf
        self._cmd_leaf = cmd_leaf
        self._sync_control_features()

    def _sync_control_features(self) -> None:
        if _TURN_ON is None or _TURN_OFF is None or SwitchEntityFeature is None:
            return
        if self._device.cmd_writable(self._cmd_leaf or ""):
            self._attr_supported_features = _TURN_ON | _TURN_OFF
        else:
            self._attr_supported_features = SwitchEntityFeature(0)

    @property
    def is_on(self) -> bool | None:
        return self._device.get_bool(self._state_leaf)

    async def async_turn_on(self, **kwargs) -> None:
        await self._async_cmd(self._cmd_leaf or "", "1")

    async def async_turn_off(self, **kwargs) -> None:
        await self._async_cmd(self._cmd_leaf or "", "0")

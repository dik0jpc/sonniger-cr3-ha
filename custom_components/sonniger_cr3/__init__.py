"""Sonniger CR3 / MIX Home Assistant integration."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import (
    ATTR_DEVICE_ID,
    DOMAIN,
    INTEGRATION_VERSION,
    PLATFORMS,
    TOPIC_ALL_OTA,
)
from .hub import SonnigerHub

_LOGGER = logging.getLogger(__name__)

SERVICE_PING = "ping"
SERVICE_OTA = "ota"
_FRONTEND_KEY = f"{DOMAIN}_frontend"


async def _async_setup_frontend(hass: HomeAssistant) -> None:
    """Serve one-shot cleanup JS (removes stuck overlays from older releases).

    Home Assistant has no integration API for custom entity hover tooltips
    (frontend discussion #24271). Help stays in attributes.description /
    attributes.справка — open the entity → Attributes.
    """
    if hass.data.get(_FRONTEND_KEY):
        return
    www = Path(__file__).parent / "www"
    if not www.is_dir():
        return
    url_path = f"/{DOMAIN}_static"
    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path, str(www), False)]
        )
    except Exception:  # noqa: BLE001 — older HA
        try:
            hass.http.register_static_path(url_path, str(www), False)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("sonniger_cr3: static path failed: %s", err)
            return
    try:
        from homeassistant.components.frontend import add_extra_js_url

        # Cache-bust: old builds attached pointermove listeners; this build only cleans up.
        add_extra_js_url(
            hass, f"{url_path}/tooltips.js?v={INTEGRATION_VERSION}"
        )
        hass.data[_FRONTEND_KEY] = True
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("sonniger_cr3: extra js failed: %s", err)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up from a config entry."""
    hub = SonnigerHub(hass, entry)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = hub
    await hub.async_start()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    _async_register_services(hass)
    await _async_setup_frontend(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hub: SonnigerHub = hass.data[DOMAIN].pop(entry.entry_id)
        await hub.async_stop()
        if not hass.data[DOMAIN]:
            hass.services.async_remove(DOMAIN, SERVICE_PING)
            hass.services.async_remove(DOMAIN, SERVICE_OTA)
            hass.data.pop(DOMAIN, None)
    return unload_ok


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _hubs(hass: HomeAssistant) -> list[SonnigerHub]:
    data = hass.data.get(DOMAIN, {})
    return [h for h in data.values() if isinstance(h, SonnigerHub)]


def _async_register_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, SERVICE_PING):
        return

    async def async_ping(call: ServiceCall) -> None:
        hubs = _hubs(hass)
        if not hubs:
            return
        hub = hubs[0]
        device_id = call.data.get(ATTR_DEVICE_ID)
        targets = (
            [device_id]
            if device_id
            else list(hub.devices.keys())
        )
        for did in targets:
            await hub.async_publish(did, "ping", "1")

    async def async_ota(call: ServiceCall) -> None:
        hubs = _hubs(hass)
        if not hubs:
            return
        hub = hubs[0]
        url = call.data["url"]
        delay_s = call.data.get("delay_s")
        device_id = call.data.get(ATTR_DEVICE_ID)
        send_all = call.data.get("all", False)

        if delay_s is not None:
            payload = json.dumps({"url": url, "delay_s": int(delay_s)})
        else:
            payload = url

        if send_all or not device_id:
            await hub.async_publish_raw(TOPIC_ALL_OTA, payload)
            return

        await hub.async_publish(device_id, "ota", payload)

    hass.services.async_register(
        DOMAIN,
        SERVICE_PING,
        async_ping,
        schema=vol.Schema(
            {
                vol.Optional(ATTR_DEVICE_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_OTA,
        async_ota,
        schema=vol.Schema(
            {
                vol.Required("url"): cv.string,
                vol.Optional(ATTR_DEVICE_ID): cv.string,
                vol.Optional("all", default=False): cv.boolean,
                vol.Optional("delay_s"): vol.Coerce(int),
            }
        ),
    )

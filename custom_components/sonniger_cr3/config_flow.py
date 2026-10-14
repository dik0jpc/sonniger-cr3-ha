"""Config flow for Sonniger CR3."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_UI_MODE, DOMAIN, UI_MODE_ADVANCED, UI_MODE_SIMPLE

try:
    from homeassistant.config_entries import ConfigFlowResult
except ImportError:  # older HA
    from homeassistant.data_entry_flow import FlowResult as ConfigFlowResult


def _ui_mode_schema(default: str = UI_MODE_SIMPLE) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_UI_MODE, default=default): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(
                            value=UI_MODE_SIMPLE,
                            label="Simple — Climate/Fan + alarm",
                        ),
                        selector.SelectOptionDict(
                            value=UI_MODE_ADVANCED,
                            label="Advanced — full sensors & controls",
                        ),
                    ],
                    mode=selector.SelectSelectorMode.LIST,
                )
            ),
        }
    )


class SonnigerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if "mqtt" not in self.hass.config.components:
            return self.async_abort(reason="mqtt_required")

        if user_input is not None:
            return self.async_create_entry(
                title="Sonniger CR3",
                data={CONF_UI_MODE: user_input[CONF_UI_MODE]},
            )

        return self.async_show_form(step_id="user", data_schema=_ui_mode_schema())

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        return SonnigerOptionsFlow()


class SonnigerOptionsFlow(config_entries.OptionsFlow):
    """Options: switch Simple / Advanced."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        entry = self.config_entry
        current = entry.options.get(
            CONF_UI_MODE, entry.data.get(CONF_UI_MODE, UI_MODE_SIMPLE)
        )
        return self.async_show_form(
            step_id="init",
            data_schema=_ui_mode_schema(current),
        )

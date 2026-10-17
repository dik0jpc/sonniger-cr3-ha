"""Constants for Sonniger CR3."""

from __future__ import annotations

DOMAIN = "sonniger_cr3"
INTEGRATION_VERSION = "1.0.14"
MANUFACTURER = "Sonniger"
MODEL_CR3 = "CR3 EC"
MODEL_MIX = "MIX 1 EC"

CONF_UI_MODE = "ui_mode"
UI_MODE_SIMPLE = "simple"
UI_MODE_ADVANCED = "advanced"

TOPIC_PREFIX = "sonniger/cr3"
TOPIC_ALL_OTA = f"{TOPIC_PREFIX}/all/cmd/ota"

PLATFORMS = [
    "binary_sensor",
    "climate",
    "fan",
    "number",
    "select",
    "sensor",
    "switch",
]

ATTR_DEVICE_ID = "device_id"
ATTR_UNIT = "unit"

SIGNAL_DEVICE = f"{DOMAIN}_device"

MODE_OPTIONS = ["slave", "smart", "manual", "master"]

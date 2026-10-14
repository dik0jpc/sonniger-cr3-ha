"""MQTT topic helpers for Sonniger boards.

Device discovery is implemented in hub.SonnigerHub (subscribe sonniger/cr3/#).
"""

from __future__ import annotations

from .const import TOPIC_PREFIX


def device_base(device_id: str) -> str:
    return f"{TOPIC_PREFIX}/{device_id}"


def cmd_topic(device_id: str, leaf: str) -> str:
    return f"{TOPIC_PREFIX}/{device_id}/cmd/{leaf}"

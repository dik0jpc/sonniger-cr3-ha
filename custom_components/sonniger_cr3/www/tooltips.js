/**
 * Sonniger CR3 — show attributes.description on hover.
 * HA device page uses ha-tooltip / title with the entity NAME; we override per-row
 * via pointerover + composedPath (do NOT blanket-walk and title parents — that
 * made "Loop load" show "OTA status").
 */
(function () {
  const ATTR = "description";
  const ATTR_RU = "справка";
  const MARK = "data-sonniger-tip";

  function hass() {
    try {
      return document.querySelector("home-assistant")?.hass;
    } catch (e) {
      return null;
    }
  }

  function helpFor(entityId) {
    if (!entityId) return "";
    const st = hass()?.states?.[entityId];
    if (!st?.attributes) return "";
    const d = st.attributes[ATTR] || st.attributes[ATTR_RU];
    return typeof d === "string" && d.length > 8 ? d : "";
  }

  function entityIdFromNode(n) {
    if (!n || typeof n !== "object") return null;
    if (typeof n.entityId === "string") return n.entityId;
    if (typeof n.entity_id === "string") return n.entity_id;
    if (n.stateObj?.entity_id) return n.stateObj.entity_id;
    if (n._config?.entity) return n._config.entity;
    if (n.row?.entity_id) return n.row.entity_id;
    if (n.entry?.entity_id) return n.entry.entity_id;
    if (n._entityEntry?.entity_id) return n._entityEntry.entity_id;
    try {
      const a =
        n.getAttribute?.("data-entity-id") ||
        n.getAttribute?.("entity-id");
      if (a) return a;
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function isRowHost(n) {
    if (!n || !n.localName) return false;
    const t = n.localName;
    return (
      t === "ha-list-item" ||
      t === "ha-md-list-item" ||
      t === "hui-generic-entity-row" ||
      (t.startsWith("hui-") && t.endsWith("-entity-row")) ||
      t.startsWith("hui-sensor-") ||
      t === "state-badge" ||
      t === "ha-state-icon"
    );
  }

  function applyHelp(entityId, path) {
    const text = helpFor(entityId);
    if (!text) return;

    // 1) Override ha-tooltip content (HA 2024+ device / lovelace rows)
    for (const n of path) {
      if (!n || n.localName !== "ha-tooltip") continue;
      try {
        if (n.content !== text) {
          n.content = text;
          n.setAttribute?.("content", text);
          n.requestUpdate?.();
        }
      } catch (e) {
        /* ignore */
      }
    }

    // 2) title only on the entity row host (not ancestors — avoids wrong tips)
    let row = null;
    for (const n of path) {
      if (isRowHost(n)) {
        row = n;
        break;
      }
    }
    if (!row) {
      for (const n of path) {
        if (entityIdFromNode(n) === entityId && n.setAttribute) {
          row = n;
          break;
        }
      }
    }
    if (row?.setAttribute) {
      row.setAttribute("title", text);
      row.setAttribute(MARK, entityId);
    }
  }

  function onPointerOver(ev) {
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    let entityId = null;
    for (const n of path) {
      entityId = entityIdFromNode(n);
      if (entityId) break;
    }
    if (!entityId || !helpFor(entityId)) return;
    applyHelp(entityId, path);
  }

  function start() {
    // Capture phase so we run before HA finishes its own tip with just the name
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("focusin", onPointerOver, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

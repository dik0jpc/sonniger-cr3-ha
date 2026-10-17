/**
 * Sonniger CR3 — hover help from attributes.description.
 * Re-resolve entity under cursor on every move (no sticky text / follow-old).
 */
(function () {
  const ATTR = "description";
  const ATTR_RU = "справка";
  const TIP_ID = "sonniger-cr3-tip";
  const STYLE_ID = "sonniger-cr3-tip-css";
  let tipEl = null;
  let lastText = "";

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
      t === "ha-settings-row" ||
      t === "ha-entity-toggle" ||
      t === "state-badge" ||
      t === "ha-state-icon"
    );
  }

  /** Deepest helpful entity on this event path (row preferred over nested). */
  function resolveFromPath(path) {
    let nested = null;
    let nestedText = "";
    let row = null;
    let rowText = "";
    for (const n of path) {
      if (!n || n === tipEl) continue;
      if (n.id === TIP_ID) continue;
      const id = entityIdFromNode(n);
      if (!id) continue;
      const text = helpFor(id);
      if (!text) continue;
      if (!nested) {
        nested = id;
        nestedText = text;
      }
      if (isRowHost(n) && !row) {
        row = id;
        rowText = text;
      }
    }
    if (row) return { id: row, text: rowText };
    if (nested) return { id: nested, text: nestedText };
    return null;
  }

  function resolveFromPoint(x, y) {
    let stack;
    try {
      stack = document.elementsFromPoint(x, y);
    } catch (e) {
      return null;
    }
    if (!stack || !stack.length) return null;
    for (const el of stack) {
      if (el === tipEl || el.id === TIP_ID) continue;
      let n = el;
      const seen = new Set();
      while (n && !seen.has(n)) {
        seen.add(n);
        const id = entityIdFromNode(n);
        if (id) {
          const text = helpFor(id);
          if (text) return { id, text };
        }
        const parent = n.parentNode;
        if (parent) {
          n = parent;
          continue;
        }
        n = n.host || null; /* shadow root → host */
      }
    }
    return null;
  }

  function ensureTip() {
    if (tipEl && document.body.contains(tipEl)) return tipEl;
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent =
        "#" +
        TIP_ID +
        "{position:fixed;z-index:100000;max-width:min(360px,92vw);" +
        "padding:8px 10px;border-radius:8px;font:13px/1.35 system-ui,sans-serif;" +
        "color:#f5f5f5;background:#1c1c1c;border:1px solid #666;" +
        "box-shadow:0 4px 16px rgba(0,0,0,.45);pointer-events:none;" +
        "white-space:pre-wrap;word-break:break-word;display:none;}";
      document.documentElement.appendChild(s);
    }
    tipEl = document.createElement("div");
    tipEl.id = TIP_ID;
    tipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function hideTip() {
    lastText = "";
    if (tipEl) tipEl.style.display = "none";
  }

  function showTip(text, x, y) {
    const el = ensureTip();
    if (text !== lastText) {
      el.textContent = text;
      lastText = text;
    }
    const pad = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    el.style.display = "block";
    const w = el.offsetWidth || 280;
    const h = el.offsetHeight || 40;
    let left = x + pad;
    let top = y + pad;
    if (left + w > vw - 8) left = Math.max(8, x - w - pad);
    if (top + h > vh - 8) top = Math.max(8, y - h - pad);
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function silenceNativeTitles(path) {
    for (const n of path) {
      if (!n || !n.removeAttribute) continue;
      try {
        if (n.hasAttribute?.("title")) {
          const t = n.getAttribute("title") || "";
          if (t.length < 40) n.removeAttribute("title");
        }
      } catch (e) {
        /* ignore */
      }
      if (n.localName === "ha-tooltip") {
        try {
          if (typeof n.content === "string" && n.content.length < 40) {
            n.content = "";
            n.setAttribute?.("content", "");
          }
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  function updateFromEvent(ev) {
    const x = ev.clientX ?? 0;
    const y = ev.clientY ?? 0;
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    let hit = resolveFromPath(path);
    if (!hit) hit = resolveFromPoint(x, y);
    if (!hit) {
      hideTip();
      return;
    }
    silenceNativeTitles(path);
    showTip(hit.text, x, y);
  }

  function start() {
    /* pointermove alone: always re-bind entity + text under cursor */
    document.addEventListener("pointermove", updateFromEvent, true);
    document.addEventListener("pointerover", updateFromEvent, true);
    document.addEventListener("pointerleave", hideTip, true);
    document.addEventListener("blur", hideTip, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

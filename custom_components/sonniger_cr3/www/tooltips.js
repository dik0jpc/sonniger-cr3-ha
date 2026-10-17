/**
 * Sonniger CR3 — custom hover tip from attributes.description.
 * Do NOT rely on HA title / ha-tooltip (they show entity NAME and can leak
 * the previous row's name onto the next — e.g. Loop load → "OTA status").
 */
(function () {
  const ATTR = "description";
  const ATTR_RU = "справка";
  const TIP_ID = "sonniger-cr3-tip";
  const STYLE_ID = "sonniger-cr3-tip-css";
  let tipEl = null;
  let hideTimer = null;
  let lastEntity = "";

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

  function placeTip(x, y) {
    const el = ensureTip();
    const pad = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    el.style.display = "block";
    // measure after text set
    const w = el.offsetWidth || 280;
    const h = el.offsetHeight || 40;
    let left = x + pad;
    let top = y + pad;
    if (left + w > vw - 8) left = Math.max(8, x - w - pad);
    if (top + h > vh - 8) top = Math.max(8, y - h - pad);
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function showTip(text, x, y) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const el = ensureTip();
    el.textContent = text;
    placeTip(x, y);
  }

  function hideTipSoon() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (tipEl) tipEl.style.display = "none";
      lastEntity = "";
    }, 80);
  }

  /** Kill native name tooltips on this row so they don't fight ours. */
  function silenceNativeTitles(path) {
    for (const n of path) {
      if (!n || !n.removeAttribute) continue;
      try {
        if (n.hasAttribute?.("title")) {
          const t = n.getAttribute("title") || "";
          // Keep only if it already looks like our long help
          if (t.length < 40) n.removeAttribute("title");
        }
      } catch (e) {
        /* ignore */
      }
      if (n.localName === "ha-tooltip") {
        try {
          // Empty content so HA doesn't flash the entity name
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

  function onPointerOver(ev) {
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    let entityId = null;
    for (const n of path) {
      entityId = entityIdFromNode(n);
      if (entityId) break;
    }
    if (!entityId) {
      hideTipSoon();
      return;
    }
    const text = helpFor(entityId);
    if (!text) {
      hideTipSoon();
      return;
    }
    silenceNativeTitles(path);
    lastEntity = entityId;
    const x = ev.clientX ?? 0;
    const y = ev.clientY ?? 0;
    showTip(text, x, y);
  }

  function onPointerMove(ev) {
    if (!lastEntity || !tipEl || tipEl.style.display === "none") return;
    placeTip(ev.clientX ?? 0, ev.clientY ?? 0);
  }

  function onPointerOut() {
    hideTipSoon();
  }

  function start() {
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onPointerOver, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

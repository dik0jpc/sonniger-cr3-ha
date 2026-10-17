/**
 * Sonniger CR3 1.0.17 — put long help INTO the native tip that shows the name.
 *
 * User requirement: explanation must appear in the same tip that says
 * "OTA status" / "Uptime" / … — not a second tip behind it.
 *
 * ha-tooltip text is the default SLOT (light DOM children), not `.content`.
 * We replace that slot text with attributes.help while hovered, and keep
 * re-applying (rAF) because Lit re-renders reset the slot to the short name.
 * On leave we restore. No second tip element. No mouse-follow overlay.
 */
(function () {
  const ATTRS = ["help", "\u0441\u043f\u0440\u0430\u0432\u043a\u0430"];
  const LEGACY_IDS = [
    "sonniger-cr3-help-tip",
    "sonniger-cr3-tip",
    "sonniger-cr3-tip-css",
  ];

  /**
   * @type {{
   *   tip: Element,
   *   prev: string,
   *   entityId: string,
   *   raf: number,
   * } | null}
   */
  let active = null;
  let leaveTimer = null;

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
    for (const a of ATTRS) {
      const d = st.attributes[a];
      if (typeof d === "string" && d.length > 8) return d;
    }
    return "";
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

  function isLegacyTip(n) {
    return n && LEGACY_IDS.indexOf(n.id) !== -1;
  }

  function tipText(tip) {
    try {
      const t = (tip.textContent || "").trim();
      if (t) return t;
    } catch (e) {
      /* ignore */
    }
    try {
      if (typeof tip.content === "string" && tip.content) return tip.content;
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function setTipText(tip, text) {
    try {
      tip.textContent = text;
    } catch (e) {
      /* ignore */
    }
    try {
      tip.content = text;
      tip.setAttribute?.("content", text);
    } catch (e) {
      /* ignore */
    }
    try {
      tip.requestUpdate?.();
    } catch (e) {
      /* ignore */
    }
  }

  /** Innermost ha-tooltip for this row (the one that shows the entity name). */
  function findNativeTip(path) {
    for (const n of path) {
      if (n && n.localName === "ha-tooltip" && !isLegacyTip(n)) return n;
    }
    for (const n of path) {
      if (!n || !n.localName) continue;
      const ln = n.localName;
      const isRow =
        ln.includes("entity-row") ||
        ln === "hui-generic-entity-row" ||
        ln === "ha-list-item";
      if (!isRow) continue;
      try {
        const t =
          n.shadowRoot?.querySelector?.("ha-tooltip") ||
          n.querySelector?.("ha-tooltip");
        if (t && !isLegacyTip(t)) return t;
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  }

  function stripTitles(path) {
    for (const n of path) {
      if (!n?.hasAttribute?.("title")) continue;
      try {
        n.removeAttribute("title");
      } catch (e) {
        /* ignore */
      }
    }
  }

  function stopLoop() {
    if (active && active.raf) {
      cancelAnimationFrame(active.raf);
      active.raf = 0;
    }
  }

  function restore() {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    if (!active) return;
    stopLoop();
    setTipText(active.tip, active.prev);
    active = null;
  }

  function keepHelp() {
    if (!active) return;
    const help = helpFor(active.entityId);
    if (!help) {
      restore();
      return;
    }
    if (tipText(active.tip) !== help) {
      setTipText(active.tip, help);
    }
    active.raf = requestAnimationFrame(keepHelp);
  }

  function activate(entityId, tip, path) {
    const help = helpFor(entityId);
    if (!help || !tip) {
      restore();
      return;
    }
    stripTitles(path);

    if (active && active.tip === tip && active.entityId === entityId) {
      if (tipText(tip) !== help) setTipText(tip, help);
      return;
    }

    restore();

    const prev = tipText(tip) || entityId;
    active = { tip, prev, entityId, raf: 0 };
    setTipText(tip, help);
    active.raf = requestAnimationFrame(keepHelp);
  }

  function onPointerOver(ev) {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    const path =
      typeof ev.composedPath === "function" ? ev.composedPath() : [];

    for (const n of path) {
      if (isLegacyTip(n)) return;
    }

    let entityId = null;
    for (const n of path) {
      entityId = entityIdFromNode(n);
      if (entityId) break;
    }

    if (!entityId || !helpFor(entityId)) {
      leaveTimer = setTimeout(restore, 100);
      return;
    }

    const tip = findNativeTip(path);
    if (!tip) {
      leaveTimer = setTimeout(restore, 100);
      return;
    }

    activate(entityId, tip, path);
  }

  function scrubLegacy() {
    for (const id of LEGACY_IDS) {
      try {
        document.getElementById(id)?.remove();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function boot() {
    scrubLegacy();
    setTimeout(scrubLegacy, 500);
    document.addEventListener("pointerover", onPointerOver, true);
    window.addEventListener("blur", restore);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) restore();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

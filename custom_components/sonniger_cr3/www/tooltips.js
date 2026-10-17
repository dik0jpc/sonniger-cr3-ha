/**
 * Sonniger CR3 1.0.19 — one hover tip with attributes.help.
 *
 * 1.0.17 tried to rewrite the native tip slot; Lit/WA kept showing the short
 * name ("Group master"). This build:
 *   - disables every native ha-tooltip under the pointer
 *   - shows ONE manual ha-tooltip we own, anchored to the row, with help text
 * So the window under the cursor is the long explanation — not a second tip
 * behind the name, and not the useless short name alone.
 */
(function () {
  const ATTRS = ["help", "\u0441\u043f\u0440\u0430\u0432\u043a\u0430"];
  const TIP_ID = "sonniger-cr3-help-tip";
  const LEGACY_IDS = ["sonniger-cr3-tip", "sonniger-cr3-tip-css", TIP_ID];

  /** @type {HTMLElement | null} */
  let tip = null;
  /** @type {{ entityId: string, disabled: Element[] } | null} */
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

  function findAnchor(path, entityId) {
    for (const n of path) {
      if (!n || !n.localName) continue;
      const ln = n.localName;
      if (ln.includes("entity-row") || ln === "hui-generic-entity-row") return n;
      if (ln === "ha-list-item" || ln === "mwc-list-item") return n;
      if (entityIdFromNode(n) === entityId) return n;
    }
    for (const n of path) {
      if (n && n.nodeType === 1 && n.getBoundingClientRect) return n;
    }
    return null;
  }

  function collectNativeTips(path) {
    const out = [];
    const seen = new Set();
    const add = (t) => {
      if (!t || t.id === TIP_ID || seen.has(t)) return;
      seen.add(t);
      out.push(t);
    };
    for (const n of path) {
      if (!n) continue;
      if (n.localName === "ha-tooltip") add(n);
      try {
        n.querySelectorAll?.("ha-tooltip").forEach(add);
      } catch (e) {
        /* ignore */
      }
      try {
        n.shadowRoot?.querySelectorAll?.("ha-tooltip").forEach(add);
      } catch (e) {
        /* ignore */
      }
    }
    return out;
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

  function ensureTip() {
    if (tip && tip.isConnected) return tip;
    tip = document.createElement("ha-tooltip");
    tip.id = TIP_ID;
    try {
      tip.trigger = "manual";
      tip.placement = "left";
      tip.withoutArrow = true;
      tip.showDelay = 0;
      tip.hideDelay = 0;
    } catch (e) {
      tip.setAttribute("trigger", "manual");
      tip.setAttribute("placement", "left");
    }
    tip.style.cssText =
      "--max-width:min(360px,92vw);--ha-tooltip-max-width:min(360px,92vw);z-index:10000;";
    document.body.appendChild(tip);
    return tip;
  }

  function hideOurs() {
    if (!tip) return;
    try {
      tip.open = false;
      if (typeof tip.hide === "function") tip.hide();
      tip.anchor = null;
      tip.textContent = "";
    } catch (e) {
      /* ignore */
    }
  }

  function restoreNatives(list) {
    for (const t of list || []) {
      try {
        t.disabled = false;
      } catch (e) {
        /* ignore */
      }
    }
  }

  function hide() {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    if (active) {
      restoreNatives(active.disabled);
      active = null;
    }
    hideOurs();
  }

  function showHelp(entityId, anchor, path) {
    const help = helpFor(entityId);
    if (!help || !anchor) {
      hide();
      return;
    }

    stripTitles(path);
    const natives = collectNativeTips(path);
    const disabled = [];
    for (const t of natives) {
      try {
        t.open = false;
        if (typeof t.hide === "function") t.hide();
        if (!t.disabled) {
          t.disabled = true;
          disabled.push(t);
        }
      } catch (e) {
        /* ignore */
      }
    }

    if (active && active.entityId !== entityId) {
      restoreNatives(active.disabled.filter((t) => disabled.indexOf(t) === -1));
    }

    const t = ensureTip();
    const same = active && active.entityId === entityId && t.textContent === help;
    active = { entityId, disabled };
    if (same) return;

    t.textContent = help;
    try {
      t.anchor = anchor;
    } catch (e) {
      /* ignore */
    }
    requestAnimationFrame(() => {
      try {
        t.open = true;
        if (typeof t.show === "function") t.show();
      } catch (e) {
        /* ignore */
      }
    });
  }

  function onPointerOver(ev) {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    const path =
      typeof ev.composedPath === "function" ? ev.composedPath() : [];
    for (const n of path) {
      if (n && n.id === TIP_ID) return;
    }

    let entityId = null;
    for (const n of path) {
      entityId = entityIdFromNode(n);
      if (entityId) break;
    }
    if (!entityId || !helpFor(entityId)) {
      leaveTimer = setTimeout(hide, 120);
      return;
    }
    const anchor = findAnchor(path, entityId);
    showHelp(entityId, anchor, path);
  }

  function scrubLegacy() {
    for (const id of LEGACY_IDS) {
      if (id === TIP_ID) continue;
      try {
        document.getElementById(id)?.remove();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function boot() {
    scrubLegacy();
    setTimeout(scrubLegacy, 400);
    document.addEventListener("pointerover", onPointerOver, true);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) hide();
    });
  }

  const start = () => {
    if (window.customElements?.whenDefined) {
      customElements.whenDefined("ha-tooltip").then(boot).catch(boot);
    } else {
      boot();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

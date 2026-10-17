/**
 * Sonniger CR3 1.0.16 — long help on hover.
 *
 * Root cause of dual tips (short name + long help): ha-tooltip/wa-tooltip has
 * NO `.content` property — text lives in the default slot. Writing `.content`
 * left the slot (entity name) intact, so hover showed the short name while a
 * second surface showed the long text (often only after click).
 *
 * Fix: one manual ha-tooltip we own, anchored to the hovered row. Native
 * ha-tooltips in the path are disabled while ours is open. No mouse-follow
 * overlay (that stuck to the cursor in 1.0.11–1.0.12).
 */
(function () {
  const ATTRS = ["help", "\u0441\u043f\u0440\u0430\u0432\u043a\u0430"];
  const TIP_ID = "sonniger-cr3-help-tip";
  const OLD_TIP_ID = "sonniger-cr3-tip";
  const STYLE_ID = "sonniger-cr3-tip-css";

  /** @type {HTMLElement | null} */
  let tip = null;
  /** @type {{ entityId: string, disabled: Element[] } | null} */
  let active = null;
  let hideTimer = null;

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
      if (ln.includes("entity-row")) return n;
      if (ln === "hui-generic-entity-row") return n;
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
        if (n.querySelectorAll) {
          n.querySelectorAll("ha-tooltip").forEach(add);
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (n.shadowRoot?.querySelectorAll) {
          n.shadowRoot.querySelectorAll("ha-tooltip").forEach(add);
        }
      } catch (e) {
        /* ignore */
      }
    }
    return out;
  }

  function stripTitles(path) {
    for (const n of path) {
      if (!n?.removeAttribute || !n.hasAttribute?.("title")) continue;
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
    tip.style.setProperty("--max-width", "min(360px, 92vw)");
    tip.style.setProperty("--ha-tooltip-max-width", "min(360px, 92vw)");
    document.body.appendChild(tip);
    return tip;
  }

  function reopen(t) {
    try {
      t.open = false;
    } catch (e) {
      /* ignore */
    }
    try {
      if (typeof t.hide === "function") t.hide();
    } catch (e) {
      /* ignore */
    }
    /* next frame so WA applies new slot + anchor */
    requestAnimationFrame(() => {
      try {
        t.open = true;
        if (typeof t.show === "function") t.show();
      } catch (e) {
        /* ignore */
      }
    });
  }

  function hide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (!active) {
      if (tip) {
        try {
          tip.open = false;
          tip.anchor = null;
        } catch (e) {
          /* ignore */
        }
      }
      return;
    }
    for (const t of active.disabled) {
      try {
        t.disabled = false;
      } catch (e) {
        /* ignore */
      }
    }
    if (tip) {
      try {
        tip.open = false;
        if (typeof tip.hide === "function") tip.hide();
        tip.anchor = null;
        tip.textContent = "";
      } catch (e) {
        /* ignore */
      }
    }
    active = null;
  }

  function show(entityId, anchor, path) {
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
        if (!t.disabled) {
          t.disabled = true;
          disabled.push(t);
        }
        t.open = false;
        if (typeof t.hide === "function") t.hide();
      } catch (e) {
        /* ignore */
      }
    }

    const t = ensureTip();
    const same = active && active.entityId === entityId;
    if (same) {
      active.disabled = disabled;
      if (t.textContent !== help) {
        t.textContent = help;
        t.anchor = anchor;
        reopen(t);
      }
      return;
    }

    if (active) {
      for (const old of active.disabled) {
        if (disabled.indexOf(old) === -1) {
          try {
            old.disabled = false;
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    t.textContent = help;
    try {
      t.anchor = anchor;
    } catch (e) {
      /* ignore */
    }
    active = { entityId, disabled };
    reopen(t);
  }

  function onPointerOver(ev) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    /* ignore events inside our own tip */
    for (const n of path) {
      if (n && n.id === TIP_ID) return;
    }
    let entityId = null;
    for (const n of path) {
      entityId = entityIdFromNode(n);
      if (entityId) break;
    }
    if (!entityId || !helpFor(entityId)) {
      /* leave shortly so moving between rows does not flicker */
      hideTimer = setTimeout(hide, 120);
      return;
    }
    const anchor = findAnchor(path, entityId);
    show(entityId, anchor, path);
  }

  function onPointerDown(ev) {
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    for (const n of path) {
      if (entityIdFromNode(n) && helpFor(entityIdFromNode(n))) return;
      if (n && n.id === TIP_ID) return;
    }
    hide();
  }

  function scrubLegacy() {
    try {
      document.getElementById(OLD_TIP_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    } catch (e) {
      /* ignore */
    }
  }

  function boot() {
    scrubLegacy();
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerdown", onPointerDown, true);
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

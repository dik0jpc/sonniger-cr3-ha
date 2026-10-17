/**
 * Sonniger CR3 1.0.21 — help tip must track the row under the cursor.
 *
 * Root cause of "Group lock" + Group-master help (and similar): our tip is
 * placed to the LEFT of the row; the pointer crosses it when moving down the
 * list. We used to ignore events on our tip → help stayed on the previous
 * entity while the native name tip showed the new row.
 *
 * Fix: pointer-events:none on our tip + resolve entity via elementsFromPoint
 * on pointermove (not only pointerover).
 */
(function () {
  const ATTRS = ["help", "\u0441\u043f\u0440\u0430\u0432\u043a\u0430"];
  const TIP_ID = "sonniger-cr3-help-tip";
  const LEGACY_IDS = ["sonniger-cr3-tip", "sonniger-cr3-tip-css"];

  /** @type {HTMLElement | null} */
  let tip = null;
  /** @type {{ entityId: string, disabled: Element[] } | null} */
  let active = null;
  let leaveTimer = null;
  let lastX = 0;
  let lastY = 0;
  let moveScheduled = false;

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
    if (typeof n.config?.entity === "string") return n.config.entity;
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

  function isRow(n) {
    if (!n || !n.localName) return false;
    const ln = n.localName;
    return (
      ln.includes("entity-row") ||
      ln === "hui-generic-entity-row" ||
      ln === "ha-list-item"
    );
  }

  function pathFromPoint(x, y) {
    try {
      const stack = document.elementsFromPoint(x, y) || [];
      const path = [];
      for (const el of stack) {
        if (!el || el.id === TIP_ID) continue;
        path.push(el);
        let n = el;
        for (let i = 0; i < 12 && n; i++) {
          const root = n.getRootNode && n.getRootNode();
          if (root && root.host) {
            path.push(root.host);
            n = root.host;
          } else {
            break;
          }
        }
      }
      return path;
    } catch (e) {
      return [];
    }
  }

  function entityIdFromPath(path) {
    for (const n of path) {
      if (!isRow(n)) continue;
      const id = entityIdFromNode(n);
      if (id) return id;
    }
    for (const n of path) {
      const id = entityIdFromNode(n);
      if (id && helpFor(id)) return id;
    }
    for (const n of path) {
      const id = entityIdFromNode(n);
      if (id) return id;
    }
    return null;
  }

  function findAnchor(path, entityId) {
    for (const n of path) {
      if (isRow(n) && (!entityId || entityIdFromNode(n) === entityId)) return n;
    }
    for (const n of path) {
      if (entityIdFromNode(n) === entityId && n.getBoundingClientRect) return n;
    }
    for (const n of path) {
      if (n && n.nodeType === 1 && n.getBoundingClientRect) return n;
    }
    return null;
  }

  function cardRoot(anchor) {
    let n = anchor;
    for (let i = 0; i < 20 && n; i++) {
      const ln = n.localName;
      if (
        ln === "ha-card" ||
        ln === "ha-device-entities-card" ||
        ln === "hui-entities-card"
      ) {
        return n;
      }
      const root = n.getRootNode && n.getRootNode();
      if (root && root.host) n = root.host;
      else n = n.parentElement;
    }
    return anchor;
  }

  function walkTips(node, out, seen) {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.localName === "ha-tooltip" && node.id !== TIP_ID) out.push(node);
    try {
      if (node.shadowRoot) walkTips(node.shadowRoot, out, seen);
    } catch (e) {
      /* ignore */
    }
    try {
      const kids = node.children;
      if (kids) for (let i = 0; i < kids.length; i++) walkTips(kids[i], out, seen);
    } catch (e) {
      /* ignore */
    }
  }

  function collectNativeTips(path, anchor) {
    const out = [];
    const seen = new Set();
    for (const n of path) {
      if (n && n.localName === "ha-tooltip" && n.id !== TIP_ID) out.push(n);
    }
    walkTips(cardRoot(anchor), out, seen);
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
    /* CRITICAL: do not steal pointer — otherwise help sticks to previous row */
    tip.style.cssText =
      "pointer-events:none !important;--max-width:min(360px,92vw);--ha-tooltip-max-width:min(360px,92vw);z-index:2147483646;";
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
        if (t.dataset?.sonnigerPrev != null) {
          t.textContent = t.dataset.sonnigerPrev;
          delete t.dataset.sonnigerPrev;
        }
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

  function silenceNative(t) {
    try {
      t.open = false;
      if (typeof t.hide === "function") t.hide();
      t.disabled = true;
      if (typeof t.textContent === "string" && t.textContent.length < 48) {
        if (t.dataset.sonnigerPrev == null) t.dataset.sonnigerPrev = t.textContent;
        t.textContent = "\u00a0";
      }
    } catch (e) {
      /* ignore */
    }
  }

  function showHelp(entityId, anchor, path) {
    const help = helpFor(entityId);
    if (!help || !anchor) {
      hide();
      return;
    }

    stripTitles(path);
    const natives = collectNativeTips(path, anchor);
    const disabled = [];
    for (const t of natives) {
      silenceNative(t);
      disabled.push(t);
    }

    if (active && active.entityId !== entityId) {
      restoreNatives(active.disabled.filter((t) => disabled.indexOf(t) === -1));
    }

    const t = ensureTip();
    const unchanged =
      active && active.entityId === entityId && t.textContent === help;
    active = { entityId, disabled };
    if (unchanged) {
      /* still keep natives silenced */
      return;
    }

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

  function updateAt(x, y) {
    const path = pathFromPoint(x, y);
    const entityId = entityIdFromPath(path);
    if (!entityId || !helpFor(entityId)) {
      if (!leaveTimer) leaveTimer = setTimeout(hide, 150);
      return;
    }
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    const anchor = findAnchor(path, entityId);
    showHelp(entityId, anchor, path);
  }

  function onPointerOver(ev) {
    lastX = ev.clientX;
    lastY = ev.clientY;
    updateAt(lastX, lastY);
  }

  function onPointerMove(ev) {
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (moveScheduled) return;
    moveScheduled = true;
    requestAnimationFrame(() => {
      moveScheduled = false;
      updateAt(lastX, lastY);
    });
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
    setTimeout(scrubLegacy, 400);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointermove", onPointerMove, true);
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

/**
 * Sonniger CR3 — put attributes.help into the native <ha-tooltip> on hover.
 *
 * No floating overlay (that stuck to the cursor). No pointermove follow.
 * On each pointerover: if the path has a Sonniger entity with help, set that
 * path's ha-tooltip.content to the help text; otherwise restore the previous
 * short name. Strip short HTML title= so HA name + help don't stack.
 */
(function () {
  const ATTRS = ["help", "справка", "description"];
  const TIP_ID = "sonniger-cr3-tip";
  const STYLE_ID = "sonniger-cr3-tip-css";

  /** @type {{ tip: Element, prev: string, entityId: string } | null} */
  let active = null;

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

  function nameFor(entityId) {
    const st = hass()?.states?.[entityId];
    const n = st?.attributes?.friendly_name;
    if (typeof n === "string" && n) return n;
    return entityId || "";
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

  function findHaTooltip(path) {
    for (const n of path) {
      if (n && n.localName === "ha-tooltip") return n;
    }
    for (const n of path) {
      if (!n) continue;
      try {
        if (n.querySelector) {
          const t = n.querySelector("ha-tooltip");
          if (t) return t;
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (n.shadowRoot?.querySelector) {
          const t = n.shadowRoot.querySelector("ha-tooltip");
          if (t) return t;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  }

  function setTipContent(tip, text) {
    if (!tip || typeof text !== "string") return;
    try {
      tip.content = text;
      tip.setAttribute?.("content", text);
      tip.requestUpdate?.();
    } catch (e) {
      /* ignore */
    }
  }

  function restore() {
    if (!active) return;
    setTipContent(active.tip, active.prev);
    active = null;
  }

  function stripShortTitles(path) {
    for (const n of path) {
      if (!n?.removeAttribute || !n.hasAttribute?.("title")) continue;
      try {
        const t = n.getAttribute("title") || "";
        /* short = entity name; leave long help if already set as title fallback */
        if (t.length > 0 && t.length < 48) n.removeAttribute("title");
      } catch (e) {
        /* ignore */
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
    const help = helpFor(entityId);
    if (!entityId || !help) {
      restore();
      return;
    }

    stripShortTitles(path);
    const tip = findHaTooltip(path);
    if (!tip) {
      /* Fallback: browser title on first element that accepts it */
      for (const n of path) {
        if (n?.setAttribute && n.localName && n.localName.includes("list-item")) {
          n.setAttribute("title", help);
          break;
        }
      }
      return;
    }

    if (active && active.tip === tip && active.entityId === entityId) {
      /* already showing this entity's help */
      if (tip.content !== help) setTipContent(tip, help);
      return;
    }

    if (active && active.tip !== tip) {
      restore();
    }

    const prev =
      active && active.tip === tip
        ? active.prev
        : typeof tip.content === "string" && tip.content.length
          ? tip.content
          : nameFor(entityId);

    active = { tip, prev, entityId };
    setTipContent(tip, help);
  }

  function boot() {
    try {
      document.getElementById(TIP_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    } catch (e) {
      /* ignore */
    }
    document.addEventListener("pointerover", onPointerOver, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

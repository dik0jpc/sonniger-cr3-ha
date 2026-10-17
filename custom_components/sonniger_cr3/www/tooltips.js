/**
 * Sonniger CR3 — set HTML title (hover tooltip) from entity attributes.description
 * on device/entity lists. Home Assistant has no native entity-help tooltip API.
 */
(function () {
  const ATTR = "description";
  const MARK = "data-sonniger-tip";

  function hass() {
    try {
      return document.querySelector("home-assistant")?.hass;
    } catch (e) {
      return null;
    }
  }

  function desc(entityId) {
    if (!entityId) return "";
    const st = hass()?.states?.[entityId];
    const d = st?.attributes?.[ATTR];
    return typeof d === "string" ? d : "";
  }

  function looksSonniger(entityId) {
    if (!entityId) return false;
    // unique_id / entity_id often contain device_id; attribute is the source of truth
    return !!desc(entityId);
  }

  function setTitle(el, text) {
    if (!el || !text) return;
    if (el.getAttribute(MARK) === text) return;
    el.setAttribute("title", text);
    el.setAttribute(MARK, text);
  }

  function entityIdFromEl(el) {
    if (!el) return null;
    if (el.entityId) return el.entityId;
    if (el.entity_id) return el.entity_id;
    if (el._entityId) return el._entityId;
    const a =
      el.getAttribute?.("data-entity-id") ||
      el.getAttribute?.("entity-id") ||
      el.getAttribute?.("data-entity");
    if (a) return a;
    // ha-more-info / history links
    const href = el.getAttribute?.("href") || el.href || "";
    let m = String(href).match(/entity_id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    m = String(href).match(/\/entity\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    // Polymer/Lit row with .row
    if (el.row?.entity_id) return el.row.entity_id;
    if (el.row?.entityId) return el.row.entityId;
    return null;
  }

  function walk(root, depth) {
    if (!root || depth > 12) return;
    const nodes = [];
    try {
      if (root.querySelectorAll) {
        root
          .querySelectorAll(
            "ha-list-item, ha-md-list-item, ha-state-icon, state-badge, a, [data-entity-id], [entity-id]"
          )
          .forEach((n) => nodes.push(n));
      }
    } catch (e) {
      /* ignore */
    }
    for (const el of nodes) {
      const eid = entityIdFromEl(el);
      if (eid && looksSonniger(eid)) {
        const d = desc(eid);
        setTitle(el, d);
        // primary label inside row
        try {
          el.querySelectorAll?.(
            ".primary, .info, .name, span, div, label"
          ).forEach((c) => setTitle(c, d));
        } catch (e) {
          /* ignore */
        }
      }
      if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
    }
    // deep shadow roots of interesting hosts
    try {
      root.querySelectorAll?.("*").forEach((el) => {
        if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
      });
    } catch (e) {
      /* ignore */
    }
  }

  function tick() {
    const root = document.querySelector("home-assistant");
    if (!root) return;
    walk(root.shadowRoot || root, 0);
  }

  const obs = new MutationObserver(() => {
    clearTimeout(obs._t);
    obs._t = setTimeout(tick, 400);
  });

  function start() {
    tick();
    try {
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      /* ignore */
    }
    setInterval(tick, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

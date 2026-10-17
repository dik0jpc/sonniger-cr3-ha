/**
 * Sonniger CR3 1.0.14 — cleanup only.
 *
 * Older releases (1.0.9–1.0.12) overwrote shared <ha-tooltip>.content, so
 * hovering "Uptime" could show Mode help. This build:
 *  - removes our floating tip
 *  - clears polluted ha-tooltip nodes
 *  - does NOT attach any hover / pointer listeners
 *
 * Help text: entity attributes.help / attributes.справка (more-info).
 */
(function () {
  const TIP_ID = "sonniger-cr3-tip";
  const STYLE_ID = "sonniger-cr3-tip-css";
  const MARK = "data-sonniger-tip";

  function clearNode(n) {
    if (!n) return;
    try {
      if (n.id === TIP_ID || n.id === STYLE_ID) {
        n.remove();
        return;
      }
      if (n.removeAttribute) {
        if (n.hasAttribute(MARK)) n.removeAttribute(MARK);
        /* Only strip titles we likely set (long help), keep short HA names */
        const t = n.getAttribute?.("title") || "";
        if (t.length > 40) n.removeAttribute("title");
      }
      if (n.localName === "ha-tooltip") {
        try {
          const c = n.content;
          if (typeof c === "string" && c.length > 40) {
            n.content = "";
            n.setAttribute?.("content", "");
            n.removeAttribute?.("content");
          }
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  function walk(root) {
    if (!root) return;
    clearNode(root);
    const kids = root.children || root.childNodes;
    if (!kids) return;
    for (const c of kids) {
      if (c.nodeType === 1) walk(c);
    }
    if (root.shadowRoot) walk(root.shadowRoot);
  }

  function scrub() {
    try {
      document.getElementById(TIP_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    } catch (e) {
      /* ignore */
    }
    try {
      walk(document.body);
    } catch (e) {
      /* ignore */
    }
  }

  scrub();
  /* Late-rendered device pages */
  setTimeout(scrub, 500);
  setTimeout(scrub, 2000);
})();

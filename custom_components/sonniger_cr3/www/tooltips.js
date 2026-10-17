/**
 * Sonniger CR3 — tip script retired (HA has no official entity hover-help API).
 * This file only tears down leftover overlays from 1.0.9–1.0.12 so they stop
 * sticking to the cursor. Help text lives in entity attributes.description /
 * attributes.справка (more-info → Attributes).
 */
(function () {
  try {
    document.getElementById("sonniger-cr3-tip")?.remove();
    document.getElementById("sonniger-cr3-tip-css")?.remove();
  } catch (e) {
    /* ignore */
  }
})();

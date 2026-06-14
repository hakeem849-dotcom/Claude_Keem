/* PharmaDesk V3 enhancement loader.
   Loads enhancement modules without requiring extra app entry script tags. */
(function () {
  const current = document.currentScript && document.currentScript.src || "v3/quality.js";
  const base = current.replace(/quality\.js(?:\?.*)?$/, "");

  function loadOnce(flag, file) {
    if (window[flag]) return;
    window[flag] = true;
    const script = document.createElement("script");
    script.src = base + file;
    script.defer = true;
    document.body.appendChild(script);
  }

  loadOnce("__pharmadeskOperatorUpgradesLoaded", "operator-upgrades.js");
  loadOnce("__pharmadeskViewModeLoaded", "view-mode.js");
})();

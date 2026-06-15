/* PharmaDesk V3 enhancement loader.
   Loads enhancement modules in order without requiring extra app entry script tags. */
(function () {
  const current = document.currentScript && document.currentScript.src || "v3/quality.js";
  const base = current.replace(/quality\.js(?:\?.*)?$/, "");

  const modules = [
    ["__pharmadeskOperatorUpgradesLoaded", "operator-upgrades.js"],
    ["__pharmadeskViewModeLoaded", "view-mode.js"],
    ["__pharmadeskImportCenterLoaded", "import-center.js"],
    ["__pharmadeskStreamlineLoaded", "streamline.js"],
    ["__pharmadeskStreamlineNavFixLoaded", "streamline-navfix.js"]
  ];

  function loadNext(index) {
    if (index >= modules.length) return;
    const [flag, file] = modules[index];
    if (window[flag]) return loadNext(index + 1);
    window[flag] = true;
    const script = document.createElement("script");
    script.src = base + file;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => loadNext(index + 1);
    document.body.appendChild(script);
  }

  loadNext(0);
})();

/* PharmaDesk V3 enhancement loader.
   Loads the operator upgrades module without adding another app entry script tag. */
(function () {
  if (window.__pharmadeskOperatorUpgradesLoaded) return;
  window.__pharmadeskOperatorUpgradesLoaded = true;
  const current = document.currentScript && document.currentScript.src || "v3/quality.js";
  const src = current.replace(/quality\.js(?:\?.*)?$/, "operator-upgrades.js");
  const script = document.createElement("script");
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
})();

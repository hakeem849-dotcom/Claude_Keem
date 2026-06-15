# Mobile and GitHub Pages rules for agents

Use these rules before changing navigation, tour behavior, mobile layout, or GitHub Pages delivery.

1. Treat GitHub Pages as the target runtime, not RawGitHack or jsDelivr.
2. Inspect the loaded entry file, script order, service worker, and localStorage schema before coding.
3. Keep one owner for navigation. Do not add duplicate routers, click interceptors, or mobile overrides until competing handlers are removed.
4. `navigate()`, nav buttons, mobile nav, `data-go`, and tour controls must all resolve through the same navigation path.
5. Do not use async enhancement loading for critical routing unless the order is proven deterministic.
6. For PWA/static-site changes, bump the service-worker cache or use a network-first strategy so Pages users do not keep seeing stale files.
7. When seed data shape changes, bump the app schema and reseed stale localStorage.
8. Test the exact mobile failure sequence before sending a link: open Pages on mobile, tap Dispense, tap Home, tap Dispense again, tap Take a tour, then test a normal action button.
9. Do not claim a link works unless the actual live target was tested after the update.

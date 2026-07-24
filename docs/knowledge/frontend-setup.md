# Frontend Setup (mirrors Frappe CRM)

Orbit's frontend is a Vue 3 + Frappe UI + Vite SPA, served at `/orbit` on the Frappe site. The pattern is copied from `/home/frappe/v16/apps/crm`.

## How routing & serving works

1. **Frappe → SPA entry:** `hooks.py` has `website_route_rules = [{"from_route": "/orbit/<path:app_path>", "to_route": "orbit"}]`. Any request to `/orbit/*` is served by the Jinja template at `orbit/www/orbit.html` (with Python context from `orbit/www/orbit.py`).
2. **SPA routing:** The Vue Router is created with `createWebHistory('/orbit')`. Vue routes are defined as `/`, `/projects`, etc. — Vue Router prepends `/orbit` automatically. So URL `/orbit/projects` matches route `/projects`.
3. **Assets:** Built assets live at `/assets/orbit/frontend/` (set via `vite build --base=/assets/orbit/frontend/`). Frappe serves `/assets/<app>/*` from `<app>/public/`.

## Dev workflow

- `cd apps/orbit/frontend && yarn dev` — Vite dev server on some port (e.g. 8080).
- The frappe-ui Vite plugin sets `frappeProxy: true` — all `/api`, `/assets`, `/files`, etc. requests proxy to the local Frappe bench.
- In dev mode, `src/main.js` fetches boot context from `/api/method/orbit.www.orbit.get_context_for_dev` before mounting.

## Build workflow

- `yarn build` runs `vite build --base=/assets/orbit/frontend/`.
- The frappe-ui plugin's `buildConfig.indexHtmlPath: '../orbit/www/orbit.html'` writes the final `index.html` (with hashed asset refs) directly to `orbit/www/orbit.html`.
- After build, `bench build --app orbit` syncs `frontend/public/` into `sites/assets/orbit/`.

## Critical files

| File | Purpose |
|---|---|
| `orbit/hooks.py` | `website_route_rules` + `add_to_apps_screen` + `app_icon_route` |
| `orbit/www/orbit.py` | `get_context()` (server boot), `get_context_for_dev()` (dev boot) |
| `orbit/www/orbit.html` | Jinja template that mounts the SPA — **overwritten by each build** |
| `frontend/package.json` | Deps: vue, vue-router, frappe-ui, socket.io-client, pinia, tailwindcss |
| `frontend/vite.config.js` | Uses `frappe-ui/vite` plugin with frappeProxy, lucideIcons, jinjaBootData |
| `frontend/tailwind.config.js` | `presets: [frappeUIPreset]` — inherits Espresso design tokens |
| `frontend/src/main.js` | Bootstraps Vue app, initializes FrappeUI, router, pinia, socket |
| `frontend/src/router.js` | `createWebHistory('/orbit')` — base path must match hooks.py |
| `frontend/src/socket.js` | Connects to Frappe's socket.io via `socketio_port` from common_site_config |

## Gotchas

- **Router base must match the website route.** If hooks.py says `/orbit/<path:...>`, router must be `createWebHistory('/orbit')`. Mismatch = infinite redirect or 404.
- **Don't edit `orbit/www/orbit.html` by hand after building** — build overwrites it. Source of truth is `frontend/index.html`.
- **Dev-mode boot:** `get_context_for_dev()` must be whitelisted with `allow_guest=True` and guarded behind `frappe.conf.developer_mode`.
- **Deep links in production:** The `<path:app_path>` catch-all in `website_route_rules` is what allows `/orbit/projects/PROJ-1` to work on a hard refresh — without it, only `/orbit` would load.
- **Socket port:** `src/socket.js` imports `socketio_port` from `../../../../sites/common_site_config.json` — the relative path matters because Vite reads that JSON at build time.

## When adding a new page

1. Create `frontend/src/pages/MyPage.vue`.
2. Add route entry in `frontend/src/router.js`.
3. If it needs a sidebar nav entry, edit the Layout component.
4. Write a Playwright spec in `frontend/tests/my-page.spec.ts`.

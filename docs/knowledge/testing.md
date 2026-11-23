# Testing

Both backend (Frappe) and frontend (Playwright) tests are **mandatory** for every feature. See [ADR-0005](decisions.md).

## Backend — Frappe tests

See [doctype-patterns.md](doctype-patterns.md) for the full pattern. One-liner to run:

```bash
# One module
bench --site v16.erpera.io run-tests --app orbit --module orbit.orbit.doctype.orbit_workspace.test_orbit_workspace

# Whole app
bench --site v16.erpera.io run-tests --app orbit
```

Use `IntegrationTestCase` (not the deprecated `FrappeTestCase`), clean with a `test-` prefix in setUp/tearDown, wrap creation in a `_make` helper.

## Frontend — Playwright

### Layout

```
frontend/
  playwright.config.ts         # config — baseURL, storage state, reporters
  .env.test                    # gitignored — base URL + test creds
  .env.test.example            # committed — template
  tests/
    global-setup.ts            # runs once before all specs; logs in and saves storage state
    smoke.spec.ts              # first suite — sidebar renders, nav works, dropdown opens
    .auth/                     # gitignored — storage state JSON lives here
```

### Running tests

```bash
cd /home/frappe/v16/apps/orbit/frontend

yarn playwright test                   # full suite
yarn playwright test smoke             # one file
yarn playwright test --ui              # interactive UI mode
yarn playwright test --headed          # see the browser
yarn playwright show-report            # open last HTML report
```

### Authentication — how it works

1. `tests/global-setup.ts` runs once before all specs.
2. It reads `.env.test` (falling back to process env, then defaults).
3. POSTs to `/api/method/login` with the tester credentials.
4. Saves the resulting cookies/storage to `tests/.auth/storage.json`.
5. `playwright.config.ts` has `use.storageState: 'tests/.auth/storage.json'` — every test starts logged in.

### The dedicated test user

A seed helper at [`orbit/tests/seed.py`](../../orbit/tests/seed.py) creates the tester idempotently:

```bash
bench --site v16.erpera.io execute 'frappe.get_attr("orbit.tests.seed.create_test_user")()'
```

- **Email:** `orbit-tester@example.com`
- **Password:** `orbit-test-5!Xq` (dev-only — this site is local)
- **Roles:** System Manager

Re-run the seed any time the user's roles or password need reset.

### Base URL gotcha — use `127.0.0.1`, not `localhost`

Playwright cookies set by a login POST to `localhost:6003` don't stick for subsequent page navigations, likely due to browser cookie scoping. **Always use `http://127.0.0.1:6003`** as `ORBIT_BASE_URL` in `.env.test`. The bench has `serve_default_site: true` pointing at `v16.erpera.io`, so no Host header override is needed.

### Selectors — how to write them

Don't rely on generic text like `"Projects"` (it appears both in the sidebar button and the page header). Prefer in this order:

1. **Role + accessible name** — `getByRole('button', { name: 'Projects' })` for nav items
2. **Unique subtitle / body copy** — e.g. `getByText('Create and manage projects.')` for the Projects placeholder page
3. **Test IDs** (add `data-testid="..."`) — only when 1 and 2 aren't enough
4. **Last resort:** CSS selectors / nth-of-type

This keeps tests resilient to structural CSS changes.

### Writing a new spec

```ts
import { test, expect } from "@playwright/test";

test.describe("My feature", () => {
  test("does the thing", async ({ page }) => {
    await page.goto("/orbit/my-route"); // baseURL is already set
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Created")).toBeVisible();
  });
});
```

No login code needed — storage state from global-setup handles it.

### Env loader (ESM quirk)

Playwright config runs as ESM, so `__dirname` isn't a built-in. `tests/global-setup.ts` shims it via `fileURLToPath(import.meta.url)`. Don't remove that shim — resolving `.env.test` breaks without it.

## Gotcha: Playwright does not see Python edits until gunicorn reloads

The v16 bench serves the site through `gunicorn ... --preload` with **no auto-reload**. A
change to any Python file (a new whitelisted seed helper, a wider allowlist, an API tweak)
is picked up only by workers that happen to re-import that module. With 17 workers the
result is a coin flip, and the symptom is a Playwright test that fails intermittently on a
seed call with `Refusing to set non-allowed field: ...` or an unexpected-keyword error,
while the same change works perfectly in `bench run-tests`.

`bench run-tests` never hits this, because it runs in its own process and imports the file
from disk. So "backend tests pass, Playwright fails on a seed helper I just added" is almost
always this, not a real bug.

Fix, before running the specs:

```bash
kill -HUP $(pgrep -f "gunicorn -b 127.0.0.1:8016" | head -1)
```

Gunicorn's HUP is graceful: in-flight requests finish and new workers spawn with the current
code. Confirm it took by calling the changed endpoint a handful of times, since one stale
worker is enough to reintroduce the flake:

```bash
for n in 1 2 3 4 5 6; do curl -s -b "$COOKIE" \
  "http://127.0.0.1:6003/api/method/<your.changed.method>" | head -c 80; echo; done
```

Frontend edits do not need this, but they do need `yarn build` — Playwright runs against the
built assets in `orbit/public/frontend`, not the Vite dev server.

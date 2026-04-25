# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **single-page, no-build, browser-only** lead-generation tool. The user enters a sector + job roles + optional location, and the page calls the [Apify](https://apify.com) actor `code_crafter~leads-finder` (an Apollo-style B2B database) and renders the resulting contacts in a sortable, filterable HTML table.

There is no `package.json`, no bundler, no framework, and no test suite. Four files in the project root: `index.html`, `styles.css`, `app.js`, `config.js`. Anything that adds a build step, framework, or backend is almost certainly the wrong direction unless the user explicitly asks for it.

## Running it

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

`file://` mostly works too, but serving over HTTP is preferred so the browser sends a real `Origin` header on the Apify call. There is nothing to install, build, lint, or test.

## How the pieces fit together

- **`index.html`** — single page. Loads `styles.css`, then `config.js`, then `app.js` (in that order — the order matters: `config.js` must run before `app.js` reads `window.APIFY_TOKEN`).
- **`config.js`** — sets `window.APIFY_TOKEN`. Treated as a local secret file: it lives in the repo as a placeholder, the user pastes their real token between the quotes locally, and it is **not** meant to be committed with a real value.
- **`app.js`** — entire app, wrapped in a single IIFE. No modules. Internal sections in order: token storage helpers, list/payload helpers, demo data generator, Apify call, record normalization, table rendering, event wiring, `init()`.
- **`styles.css`** — handwritten CSS variables + sticky table header + spinner overlay. No preprocessor.

### Three behaviors that aren't obvious from reading one file

1. **Token resolution order (in `onSubmit`):** `window.APIFY_TOKEN` (from `config.js`) → text field in the Settings panel → `localStorage["apify_token"]`. When `config.js` provides a token, the Settings inputs are disabled so the file is the single source of truth.

2. **Demo mode bypasses Apify entirely.** The "Demo mode" checkbox (default ON) makes `onSubmit` skip the network call and run `generateDemoLeads()` instead. This exists so UI work and form-validation changes can be done without burning Apify credits or waiting 1–5 minutes for a real run. When editing the renderer/table/filter, leave demo mode on; only flip it off for an end-to-end smoke test.

3. **`normalize()` is a defensive mapping layer.** Apollo-style records returned by the Apify actor use inconsistent field names (`first_name`+`last_name` vs `name`, `organization_name` vs `company_name` vs `organization.name`, `linkedin_url` vs `linkedin`, etc.). `normalize()` collapses each record to the eight columns the table renders, with `pick(...)` falling back through aliases. If results show up with blank columns, the fix is almost always to add another alias to `normalize()`, not to change the table.

## API call details (the bits worth knowing)

- Endpoint: `POST https://api.apify.com/v2/acts/code_crafter~leads-finder/run-sync-get-dataset-items?token=<TOKEN>`
- Synchronous — the request blocks for up to ~5 minutes while the actor runs, then returns a JSON array of dataset items. Long spinner is normal, not a bug.
- Apify allows CORS from any origin, so this works from a static page with no proxy.
- Relevant input fields: `company_industry: string[]`, `contact_job_title: string[]`, `contact_location: string[]`, `email_status: string[]` (defaulted to `["validated"]`), `fetch_count: int` (clamped client-side to ≤ 500 in `onSubmit` to protect the user's Apify credits — keep this cap).

## Conventions to preserve

- **No `innerHTML` for API/user data.** All scraped strings reach the DOM via `textContent`. The LinkedIn cell is the one place a link is built; `isSafeHttpUrl()` validates the URL is `http(s):` before it becomes an `href`. Don't regress this — scraped fields are untrusted.
- **Keep it framework-free.** Vanilla DOM APIs, single IIFE, no imports.
- The table column set lives in two places that must stay in sync: the `<th>` list in `index.html` and the `cols` array inside `renderTable()` in `app.js`.

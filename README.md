# Lead Finder

A single-page, no-build, browser-only B2B lead generation tool powered by the Apify `code_crafter~leads-finder` actor.

## Description

Enter a sector / industry, target job roles, and an optional location, and Lead Finder calls an Apollo-style B2B contact database (via the [Apify](https://apify.com) actor `code_crafter~leads-finder`) and renders the resulting contacts in a sortable, filterable HTML table. It is designed for sales / growth / recruiting teams that want a quick, disposable UI over Apify without standing up a backend.

The whole app is four files in the project root — no bundler, no framework, no server-side code. Open the page, paste an Apify token (or use Demo mode), and search.

## Features

- Search by `company_industry`, `contact_job_title`, and `contact_location` (comma-separated lists)
- Default filter to validated emails only (`email_status: ["validated"]`)
- Client-side cap of 500 results per run to protect Apify credits
- Sortable, filterable results table (Name, Title, Company, Industry, Location, Email, Phone, LinkedIn)
- Defensive field normalization that handles inconsistent Apollo-style record shapes
- Safe rendering: scraped strings reach the DOM via `textContent`; LinkedIn URLs are validated before becoming `href`s
- Token resolution chain: `config.js` → in-page Settings input → `localStorage`
- Demo mode (on by default) generates realistic mock leads without calling Apify

## Tech stack

- HTML5, CSS3 (handwritten, CSS variables, no preprocessor)
- Vanilla JavaScript (single IIFE, no modules, no framework)
- [Apify API](https://docs.apify.com/api/v2) — actor `code_crafter~leads-finder`, `run-sync-get-dataset-items` endpoint
- GitHub Pages (deploy target)

## Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/alfredang/leadgeneration.git
   cd leadgeneration
   ```

2. Copy the config template and paste your Apify token between the quotes:

   ```bash
   cp config.example.js config.js
   ```

   Get a token at <https://console.apify.com/account/integrations>. `config.js` is gitignored so the token stays local.

3. Serve the directory over HTTP (preferred over `file://` so the browser sends a real `Origin` header):

   ```bash
   python -m http.server 8000
   ```

4. Open <http://localhost:8000/>.

There is nothing to install, build, lint, or test.

## Usage

1. Open the page. Demo mode is on by default — you can search immediately without a token.
2. Enter a **Sector / industry** (e.g. `SaaS, Fintech`) and **Job roles** (e.g. `Marketing Manager, Head of Growth`). Location is optional.
3. Set **Max results** (1–500). Click **Find leads**.
4. To run against the real Apify actor, uncheck **Demo mode** and provide a token via `config.js` or the Settings panel. The synchronous Apify call can take 1–5 minutes.
5. Sort columns by clicking headers; narrow results with the filter box.

## Screenshots

Screenshots are TBD — drop them into `docs/screenshots/` and reference them here.

![Search form](docs/screenshots/search-form.png)
![Results table](docs/screenshots/results-table.png)

# leadgeneration

A single-page, no-build, browser-only lead-generation tool. Enter a sector + job roles + optional location and the page calls the [Apify](https://apify.com) actor `code_crafter~leads-finder` (an Apollo-style B2B database) and renders the resulting contacts in a sortable, filterable HTML table.

## Setup

1. Copy `config.example.js` to `config.js` and paste your Apify token between the quotes.
2. Serve the directory:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000/`.

Demo mode is on by default, so the UI works without a token.

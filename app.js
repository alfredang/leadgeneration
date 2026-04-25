(function () {
  'use strict';

  const TOKEN_KEY = 'apify_token';
  const ACTOR_ID = 'code_crafter~leads-finder';
  const ENDPOINT = (token) =>
    `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const MAX_FETCH = 500;

  const $ = (id) => document.getElementById(id);

  const els = {
    settingsToggle: $('settingsToggle'),
    settings: $('settings'),
    tokenInput: $('tokenInput'),
    saveToken: $('saveToken'),
    clearToken: $('clearToken'),
    tokenStatus: $('tokenStatus'),

    form: $('searchForm'),
    sector: $('sector'),
    roles: $('roles'),
    location: $('location'),
    maxResults: $('maxResults'),
    demoMode: $('demoMode'),
    submitBtn: $('submitBtn'),
    status: $('status'),

    resultsCard: $('resultsCard'),
    resultCount: $('resultCount'),
    filterInput: $('filterInput'),
    table: $('resultsTable'),
    tbody: document.querySelector('#resultsTable tbody'),
    emptyState: $('emptyState'),

    overlay: $('overlay'),
  };

  let currentRows = []; // normalized lead records
  let sortState = { key: null, dir: 1 }; // dir: 1 asc, -1 desc

  /* ---------- Token storage ---------- */

  function getConfigToken() {
    const t = (typeof window !== 'undefined' && window.APIFY_TOKEN) || '';
    return String(t || '').trim();
  }

  function loadToken() {
    const cfg = getConfigToken();
    if (cfg) {
      els.tokenInput.value = cfg;
      els.tokenInput.disabled = true;
      els.saveToken.disabled = true;
      els.clearToken.disabled = true;
      setTokenStatus('Token loaded from config.js.', 'ok');
      return cfg;
    }
    try {
      const t = localStorage.getItem(TOKEN_KEY) || '';
      if (t) {
        els.tokenInput.value = t;
        setTokenStatus('Token saved in this browser.', 'ok');
      } else {
        setTokenStatus('No token saved. Paste one here, or set window.APIFY_TOKEN in config.js.', 'muted');
      }
      return t;
    } catch {
      setTokenStatus('localStorage is unavailable in this browser.', 'error');
      return '';
    }
  }

  function saveToken() {
    const t = els.tokenInput.value.trim();
    if (!t) {
      setTokenStatus('Token is empty.', 'error');
      return;
    }
    try {
      localStorage.setItem(TOKEN_KEY, t);
      setTokenStatus('Token saved in this browser.', 'ok');
    } catch {
      setTokenStatus('Could not save token to localStorage.', 'error');
    }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch { /* ignore */ }
    els.tokenInput.value = '';
    setTokenStatus('Token cleared.', 'muted');
  }

  function setTokenStatus(msg, kind) {
    els.tokenStatus.textContent = msg;
    els.tokenStatus.className = 'status' + (kind === 'error' ? ' error' : kind === 'ok' ? ' ok' : '');
  }

  /* ---------- Helpers ---------- */

  function parseList(value) {
    if (!value) return [];
    const seen = new Set();
    const out = [];
    for (const part of String(value).split(',')) {
      const v = part.trim();
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        out.push(v);
      }
    }
    return out;
  }

  function buildPayload({ sector, roles, location, max }) {
    const payload = {
      email_status: ['validated'],
      fetch_count: max,
    };
    const ind = parseList(sector);
    const job = parseList(roles);
    const loc = parseList(location);
    if (ind.length) payload.company_industry = ind;
    if (job.length) payload.contact_job_title = job;
    if (loc.length) payload.contact_location = loc;
    return payload;
  }

  function setStatus(msg, kind) {
    els.status.textContent = msg || '';
    els.status.className = 'status' + (kind === 'error' ? ' error' : kind === 'ok' ? ' ok' : '');
  }

  function showOverlay(show) {
    els.overlay.hidden = !show;
  }

  function setBusy(busy) {
    els.submitBtn.disabled = busy;
    els.submitBtn.textContent = busy ? 'Searching…' : 'Find leads';
    showOverlay(busy);
  }

  /* ---------- Demo data ---------- */

  const DEMO_FIRST = ['Alex','Priya','Wei','Sofia','Marcus','Lina','Ravi','Chloe','Diego','Naomi','Ethan','Yuki','Hassan','Ingrid','Kenji','Mei','Theo','Aisha','Bruno','Saanvi'];
  const DEMO_LAST = ['Tan','Patel','Chen','Garcia','Johansson','Okafor','Reyes','Yamamoto','Khan','Müller','Silva','Kowalski','Nguyen','Andersen','Park','Singh','Costa','Larsen','Rossi','Adeyemi'];
  const DEMO_COMPANIES = ['Northwind SaaS','Acme Cloud','Helix Analytics','Beacon Health','Vertex Pay','Orbital Logistics','Lumen AI','Brightline EdTech','Atlas Robotics','Coral Biotech'];
  const DEMO_INDUSTRIES_DEFAULT = ['SaaS','Fintech','Healthcare','Logistics','EdTech','Biotech','Retail','Cybersecurity','Marketing','Manufacturing'];
  const DEMO_TITLES_DEFAULT = ['Marketing Manager','Head of Growth','VP Sales','Chief Technology Officer','Product Lead','Founder','Director of Operations','Customer Success Manager','VP Engineering','Head of People'];
  const DEMO_LOCATIONS_DEFAULT = ['Singapore','New York, NY, USA','London, UK','Berlin, Germany','Sydney, Australia','Toronto, Canada','Tokyo, Japan','Bangalore, India','Amsterdam, Netherlands','São Paulo, Brazil'];

  function pickFrom(arr, i) { return arr[i % arr.length]; }

  function generateDemoLeads(count, payload) {
    const industries = (payload.company_industry && payload.company_industry.length) ? payload.company_industry : DEMO_INDUSTRIES_DEFAULT;
    const titles = (payload.contact_job_title && payload.contact_job_title.length) ? payload.contact_job_title : DEMO_TITLES_DEFAULT;
    const locations = (payload.contact_location && payload.contact_location.length) ? payload.contact_location : DEMO_LOCATIONS_DEFAULT;

    const out = [];
    for (let i = 0; i < count; i++) {
      const first = pickFrom(DEMO_FIRST, i);
      const last = pickFrom(DEMO_LAST, i * 7 + 3);
      const company = pickFrom(DEMO_COMPANIES, i * 3 + 1);
      const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com';
      out.push({
        first_name: first,
        last_name: last,
        title: pickFrom(titles, i * 2 + 1),
        organization_name: company,
        industry: pickFrom(industries, i * 5 + 2),
        location: pickFrom(locations, i * 4 + 6),
        email: `${first}.${last}`.toLowerCase() + '@' + domain,
        phone: '+1-555-' + String(1000 + ((i * 137) % 9000)).padStart(4, '0'),
        linkedin_url: `https://www.linkedin.com/in/${first}-${last}-${(i + 1) * 17}`.toLowerCase(),
      });
    }
    return out;
  }

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ---------- Apify call ---------- */

  async function runApify(payload, token) {
    let res;
    try {
      res = await fetch(ENDPOINT(token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new Error('Network error reaching Apify: ' + e.message);
    }

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody && errBody.error && errBody.error.message
          ? errBody.error.message
          : JSON.stringify(errBody);
      } catch {
        try { detail = await res.text(); } catch { /* ignore */ }
      }
      throw new Error(`Apify ${res.status}: ${detail || res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected response from Apify (not a JSON array).');
    }
    return data;
  }

  /* ---------- Normalization ---------- */

  function pick(...vals) {
    for (const v of vals) {
      if (v != null && v !== '') return String(v);
    }
    return '';
  }

  function joinName(item) {
    const full = pick(item.name, item.full_name);
    if (full) return full;
    const first = pick(item.first_name, item.firstName, item.givenName);
    const last = pick(item.last_name, item.lastName, item.familyName);
    return [first, last].filter(Boolean).join(' ').trim();
  }

  function joinLocation(item) {
    const parts = [
      pick(item.city, item.contact_city),
      pick(item.state, item.region),
      pick(item.country, item.contact_country),
    ].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return pick(item.location, item.contact_location);
  }

  function normalize(item) {
    return {
      name: joinName(item),
      title: pick(item.title, item.job_title, item.contact_job_title),
      company: pick(
        item.organization_name,
        item.company_name,
        item.company,
        item.organization && item.organization.name
      ),
      industry: pick(
        item.industry,
        item.company_industry,
        item.organization && item.organization.industry
      ),
      location: joinLocation(item),
      email: pick(item.email, item.work_email, item.business_email, item.personal_email),
      phone: pick(item.phone, item.mobile_phone, item.work_phone, item.contact_phone),
      linkedin: pick(item.linkedin_url, item.linkedin, item.contact_linkedin),
    };
  }

  /* ---------- Rendering ---------- */

  function isSafeHttpUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function renderTable() {
    const rows = currentRows.slice();
    if (sortState.key) {
      rows.sort((a, b) => {
        const av = (a[sortState.key] || '').toLowerCase();
        const bv = (b[sortState.key] || '').toLowerCase();
        if (av < bv) return -1 * sortState.dir;
        if (av > bv) return 1 * sortState.dir;
        return 0;
      });
    }

    const tbody = els.tbody;
    tbody.replaceChildren();

    const cols = ['name', 'title', 'company', 'industry', 'location', 'email', 'phone', 'linkedin'];
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const key of cols) {
        const td = document.createElement('td');
        const value = row[key];

        if (!value) {
          td.textContent = '—';
          td.className = 'empty';
        } else if (key === 'linkedin' && isSafeHttpUrl(value)) {
          const a = document.createElement('a');
          a.href = value;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = 'Profile';
          td.appendChild(a);
        } else if (key === 'email' && value) {
          const a = document.createElement('a');
          a.href = 'mailto:' + value;
          a.textContent = value;
          td.appendChild(a);
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    // Re-apply current filter (if any)
    applyFilter(els.filterInput.value);

    // Update sort indicators
    for (const th of els.table.tHead.rows[0].cells) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.key === sortState.key) {
        th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      }
    }
  }

  function applyFilter(query) {
    const q = (query || '').trim().toLowerCase();
    let visible = 0;
    for (const tr of els.tbody.rows) {
      const text = tr.textContent.toLowerCase();
      const match = !q || text.includes(q);
      tr.classList.toggle('hidden', !match);
      if (match) visible++;
    }
    els.emptyState.hidden = visible !== 0 || els.tbody.rows.length === 0;
  }

  /* ---------- Wiring ---------- */

  function attachSorting() {
    for (const th of els.table.tHead.rows[0].cells) {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortState.key === key) {
          sortState.dir = sortState.dir === 1 ? -1 : 1;
        } else {
          sortState.key = key;
          sortState.dir = 1;
        }
        renderTable();
      });
    }
  }

  function attachFilter() {
    els.filterInput.addEventListener('input', (e) => applyFilter(e.target.value));
  }

  function attachSettings() {
    els.settingsToggle.addEventListener('click', () => {
      const open = !els.settings.hidden;
      els.settings.hidden = open;
      els.settingsToggle.setAttribute('aria-expanded', String(!open));
    });
    els.saveToken.addEventListener('click', saveToken);
    els.clearToken.addEventListener('click', clearToken);
  }

  async function onSubmit(e) {
    e.preventDefault();

    const demo = !!(els.demoMode && els.demoMode.checked);

    const sector = els.sector.value;
    const roles = els.roles.value;
    const location = els.location.value;

    if (!parseList(sector).length && !parseList(roles).length) {
      setStatus('Enter at least a sector or a job role.', 'error');
      return;
    }

    let max = parseInt(els.maxResults.value, 10);
    if (!Number.isFinite(max) || max < 1) max = 50;
    if (max > MAX_FETCH) max = MAX_FETCH;
    els.maxResults.value = max;

    const payload = buildPayload({ sector, roles, location, max });

    let token = '';
    if (!demo) {
      token = getConfigToken()
        || (els.tokenInput.value || '').trim()
        || (() => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } })();
      if (!token) {
        setStatus('Add your Apify API token in Settings first, or enable Demo mode.', 'error');
        els.settings.hidden = false;
        els.settingsToggle.setAttribute('aria-expanded', 'true');
        els.tokenInput.focus();
        return;
      }
    }

    setBusy(true);
    setStatus(demo ? 'Generating demo leads…' : 'Searching… this can take 1–5 minutes.', '');
    els.resultsCard.hidden = true;

    try {
      let raw;
      if (demo) {
        await delay(700); // simulate latency so spinner is visible
        raw = generateDemoLeads(max, payload);
      } else {
        raw = await runApify(payload, token);
      }
      currentRows = raw.map(normalize);
      els.resultCount.textContent = String(currentRows.length);
      sortState = { key: null, dir: 1 };
      renderTable();
      els.resultsCard.hidden = false;
      const prefix = demo ? 'Demo: ' : '';
      setStatus(
        currentRows.length
          ? `${prefix}Found ${currentRows.length} lead${currentRows.length === 1 ? '' : 's'}.`
          : `${prefix}No leads matched your filters.`,
        currentRows.length ? 'ok' : ''
      );
    } catch (err) {
      setStatus(err.message || String(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Init ---------- */

  function init() {
    loadToken();
    attachSettings();
    attachSorting();
    attachFilter();
    els.form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

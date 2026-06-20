import fetch from "node-fetch";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

const configFile = process.argv.includes("--config")
  ? process.argv[process.argv.indexOf("--config") + 1]
  : "./config.json";
const config = JSON.parse(readFileSync(configFile, "utf-8"));
const NTFY_BASE_URL = "https://ntfy.sh";
const defaultChannel = config.ntfy.channel;
const TIMEOUT_MS = 30000;
const STATE_FILE = "./state.json";
const CONCURRENCY = config.concurrency ?? 3;
const DRY_RUN = process.argv.includes("--dry-run");

const USE_PLAYWRIGHT_FOR = ["ticketone.it"];

const globalDefaults = {
  notifyOnce: false,
  resendAfterHours: null,
  ...config.defaults,
};

// --- Validazione config ---

function validateConfig(cfg) {
  const errors = [];

  if (!cfg.ntfy?.channel) errors.push("ntfy.channel è obbligatorio");
  if (!Array.isArray(cfg.pages) || cfg.pages.length === 0) errors.push("pages deve essere un array non vuoto");

  const VALID_PRIORITIES = ["default", "low", "min", "high", "urgent", "max"];
  const VALID_CONDITIONS = ["AND", "OR"];

  (cfg.pages ?? []).forEach((page, pi) => {
    const prefix = `pages[${pi}]`;
    if (!page.url) {
      errors.push(`${prefix}: url è obbligatorio`);
    } else {
      try { new URL(page.url); } catch { errors.push(`${prefix}: url non valido ("${page.url}")`); }
    }
    if (!Array.isArray(page.checks) || page.checks.length === 0) {
      errors.push(`${prefix}: checks deve essere un array non vuoto`);
    }
    (page.checks ?? []).forEach((check, ci) => {
      const cp = `${prefix}.checks[${ci}]`;
      if (!check.term && !check.terms) errors.push(`${cp}: term o terms è obbligatorio`);
      if (!check.message) errors.push(`${cp}: message è obbligatorio`);
      if (check.priority && !VALID_PRIORITIES.includes(check.priority))
        errors.push(`${cp}: priority non valida ("${check.priority}") — valori: ${VALID_PRIORITIES.join(", ")}`);
      if (check.condition && !VALID_CONDITIONS.includes(check.condition.toUpperCase()))
        errors.push(`${cp}: condition non valida ("${check.condition}") — valori: AND, OR`);
      if (check.silenceHours) {
        const { from, to } = check.silenceHours;
        if (from == null || to == null) errors.push(`${cp}: silenceHours richiede from e to`);
        if (from < 0 || from > 23 || to < 0 || to > 23) errors.push(`${cp}: silenceHours.from e to devono essere tra 0 e 23`);
      }
      if (check.regex && !check.term) errors.push(`${cp}: regex richiede term (non terms)`);
    });
  });

  return errors;
}

// --- State ---

function loadState() {
  if (!existsSync(STATE_FILE)) return {};
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function stateKey(url, term) {
  return `${url}|${term}`;
}

// --- Logica notifiche ---

function shouldNotify(state, key, opts = {}) {
  const notifyOnce = opts.notifyOnce ?? globalDefaults.notifyOnce;
  const resendAfterHours = opts.resendAfterHours ?? globalDefaults.resendAfterHours;

  if (!notifyOnce) return true;

  const entry = state[key];
  if (!entry) return true;

  if (resendAfterHours != null) {
    const hoursSinceLast = (Date.now() - new Date(entry.lastNotified).getTime()) / 36e5;
    return hoursSinceLast >= resendAfterHours;
  }

  return false;
}

function isSilenced(checkSilenceHours) {
  const silenceHours = checkSilenceHours ?? (config.defaults?.silenceHours ?? null);
  if (!silenceHours) return false;
  const hour = new Date().getHours();
  const { from, to } = silenceHours;
  return from < to
    ? hour >= from && hour < to
    : hour >= from || hour < to;
}

function needsPlaywright(pageConfig) {
  return pageConfig.screenshot || USE_PLAYWRIGHT_FOR.some((domain) => pageConfig.url.includes(domain));
}

async function sendNotification({ message, title, priority = "default", tags, channel, clickUrl, screenshot }) {
  if (DRY_RUN) {
    console.log(`[dry-run] Notifica → ${title ?? "(no title)"}: ${message}${clickUrl ? ` [link: ${clickUrl}]` : ""}${screenshot ? " [con screenshot]" : ""}`);
    return;
  }

  const ch = channel ?? defaultChannel;
  const ntfyUrl = `${NTFY_BASE_URL}/${ch}`;
  const signal = AbortSignal.timeout(15000);

  if (screenshot) {
    // Invia screenshot come allegato, messaggio nell'header
    const headers = { "Filename": "screenshot.png", "Content-Type": "image/png" };
    if (title) headers["Title"] = title;
    if (message) headers["Message"] = message;
    if (priority) headers["Priority"] = priority;
    if (tags) headers["Tags"] = Array.isArray(tags) ? tags.join(",") : tags;
    if (clickUrl) headers["Click"] = clickUrl;

    const res = await fetch(ntfyUrl, { method: "POST", headers, body: screenshot, signal });
    if (!res.ok) console.error(`Errore invio notifica con screenshot: ${res.status} ${res.statusText}`);
  } else {
    const headers = { "Content-Type": "text/plain" };
    if (title) headers["Title"] = title;
    if (priority) headers["Priority"] = priority;
    if (tags) headers["Tags"] = Array.isArray(tags) ? tags.join(",") : tags;
    if (clickUrl) headers["Click"] = clickUrl;

    const res = await fetch(ntfyUrl, { method: "POST", headers, body: message, signal });
    if (!res.ok) console.error(`Errore invio notifica: ${res.status} ${res.statusText}`);
  }
}

// --- Fetch ---

async function fetchWithPlaywright(url, browser, takeScreenshot = false) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    const html = await page.content();
    const screenshot = takeScreenshot ? await page.screenshot({ type: "png", fullPage: false }) : null;
    return { html, screenshot };
  } finally {
    await page.close();
  }
}

async function fetchWithHttp(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { html: await res.text(), screenshot: null };
}

// --- Retry fetch ---

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

async function fetchWithRetry(pageConfig, browser) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await (needsPlaywright(pageConfig)
        ? fetchWithPlaywright(pageConfig.url, browser, !!pageConfig.screenshot)
        : fetchWithHttp(pageConfig.url));
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`[retry] Tentativo ${attempt}/${RETRY_ATTEMPTS} fallito per ${pageConfig.url}: ${err.message} — riprovo tra ${RETRY_DELAY_MS / 1000}s`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw lastErr;
}

// --- Controllo pagina ---

async function checkPage(pageConfig, browser, state, pending) {
  const { url, checks, channel: pageChannel } = pageConfig;
  const errorKey = stateKey(url, "__error__");
  let html, screenshot;

  try {
    ({ html, screenshot } = await fetchWithRetry(pageConfig, browser));
    delete state[errorKey];
  } catch (err) {
    console.error(`[error] Fetch fallito per ${url} dopo ${RETRY_ATTEMPTS} tentativi: ${err.message}`);
    if (shouldNotify(state, errorKey, globalDefaults)) {
      await sendNotification({
        title: "Checker - pagina irraggiungibile",
        message: `Impossibile accedere a ${url}\nErrore: ${err.message}`,
        priority: "high",
        tags: ["warning"],
        channel: pageChannel,
        clickUrl: url,
      });
      state[errorKey] = { lastNotified: new Date().toISOString() };
    }
    return;
  }

  const lowerHtml = html.toLowerCase();

  for (const check of checks) {
    const { message, title, priority, tags, channel: checkChannel, silenceHours, clickUrl } = check;
    const channel = checkChannel ?? pageChannel;

    const terms = check.terms
      ? check.terms.map((t) => (typeof t === "string" ? { term: t } : t))
      : [{ term: check.term, regex: check.regex, regexFlags: check.regexFlags }];

    const condition = (check.condition ?? "AND").toUpperCase();
    const label = terms.map((t) => t.term).join(` ${condition} `);
    const key = stateKey(url, label);

    const matchTerm = (t) => t.regex
      ? new RegExp(t.term, t.regexFlags ?? "i").test(html)
      : lowerHtml.includes(t.term.toLowerCase());

    const results = terms.map(matchTerm);
    const found = condition === "OR" ? results.some(Boolean) : results.every(Boolean);

    if (found) {
      if (isSilenced(silenceHours)) {
        console.log(`[quiet] "${label}" trovato su ${url} ma silenziato (${silenceHours.from}:00-${silenceHours.to}:00)`);
      } else if (shouldNotify(state, key, check)) {
        console.log(`[MATCH] "${label}" trovato su ${url} → accodato`);
        pending.push({ message, title, priority, tags, channel, clickUrl: clickUrl ?? url, screenshot, label, url });
        state[key] = { lastNotified: new Date().toISOString() };
      } else {
        console.log(`[skip]  "${label}" trovato su ${url} ma notifica già inviata il ${state[key].lastNotified}`);
      }
    } else {
      console.log(`[miss]  "${label}" non trovato su ${url}`);
      delete state[key];
    }
  }
}

// --- Invio notifiche con aggregazione ---

async function flushNotifications(pending) {
  const agg = config.aggregation ?? {};
  const aggEnabled = agg.enabled ?? false;
  const aggThreshold = agg.threshold ?? 4;

  if (aggEnabled && pending.length >= aggThreshold) {
    console.log(`[aggrega] ${pending.length} match — invio notifica aggregata`);
    const body = pending.map((n) => `• ${n.label} su ${n.url}`).join("\n");
    await sendNotification({
      title: `Checker - ${pending.length} match trovati`,
      message: body,
      priority: "high",
      tags: ["tada"],
    });
  } else {
    for (const n of pending) {
      console.log(`[notify] "${n.label}" su ${n.url}`);
      await sendNotification(n);
    }
  }
}

// --- Concorrenza ---

async function runWithConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = task().finally(() => executing.delete(p));
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

// --- Heartbeat ---

async function sendHeartbeat(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.__heartbeat__ === today) return;
  await sendNotification({
    title: "Checker - script attivo",
    message: `Il checker sta girando regolarmente. (${today})`,
    priority: "low",
    tags: ["white_check_mark"],
  });
  state.__heartbeat__ = today;
}

// --- Main ---

async function main() {
  console.log(`Avvio controllo — ${new Date().toISOString()}`);

  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error("Errori di configurazione:");
    errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }

  const state = loadState();
  if (!DRY_RUN) await sendHeartbeat(state);
  const browser = await chromium.launch({ headless: true });

  try {
    const pages = config.pages.filter((p) => {
      if (p._disabled) { console.log(`[skip]  Pagina disabilitata: ${p.url}`); return false; }
      return true;
    });

    const activeChecks = pages.reduce((sum, p) => sum + p.checks.length, 0);
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(process.env.GITHUB_OUTPUT, `active_checks=${activeChecks}\n`, { flag: "a" });
    }

    const pending = [];
    await runWithConcurrency(
      pages.map((page) => () => checkPage(page, browser, state, pending)),
      CONCURRENCY
    );
    await flushNotifications(pending);
  } finally {
    await browser.close();
  }

  saveState(state);
  console.log("Controllo completato.");
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});

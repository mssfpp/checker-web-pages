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
const channel = config.ntfy.channel;
const TIMEOUT_MS = 30000;
const STATE_FILE = "./state.json";

const USE_PLAYWRIGHT_FOR = ["ticketone.it"];

const globalDefaults = {
  notifyOnce: false,
  resendAfterHours: null,
  ...config.defaults,
};

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

function needsPlaywright(url) {
  return USE_PLAYWRIGHT_FOR.some((domain) => url.includes(domain));
}

async function sendNotification({ message, title, priority = "default", tags }) {
  const headers = {
    "Content-Type": "text/plain",
  };
  if (title) headers["Title"] = title;
  if (priority) headers["Priority"] = priority;
  if (tags) headers["Tags"] = Array.isArray(tags) ? tags.join(",") : tags;

  const res = await fetch(`${NTFY_BASE_URL}/${channel}`, {
    method: "POST",
    headers,
    body: message,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.error(`Errore invio notifica: ${res.status} ${res.statusText}`);
  }
}

async function fetchWithPlaywright(url, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    return await page.content();
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
  return res.text();
}

async function checkPage(pageConfig, browser, state) {
  const { url, checks } = pageConfig;
  const errorKey = stateKey(url, "__error__");
  let html;

  try {
    html = needsPlaywright(url)
      ? await fetchWithPlaywright(url, browser)
      : await fetchWithHttp(url);

    // Pagina tornata raggiungibile — resetta errore precedente
    delete state[errorKey];
  } catch (err) {
    console.error(`[error] Fetch fallito per ${url}: ${err.message}`);

    if (shouldNotify(state, errorKey, globalDefaults)) {
      await sendNotification({
        title: "Checker - pagina irraggiungibile",
        message: `Impossibile accedere a ${url}\nErrore: ${err.message}`,
        priority: "high",
        tags: ["warning"],
      });
      state[errorKey] = { lastNotified: new Date().toISOString() };
    }
    return;
  }

  const lowerHtml = html.toLowerCase();

  for (const check of checks) {
    const { term, message, title, priority, tags } = check;
    const key = stateKey(url, term);
    const found = lowerHtml.includes(term.toLowerCase());

    if (found) {
      if (shouldNotify(state, key, check)) {
        console.log(`[MATCH] "${term}" trovato su ${url} → invio notifica`);
        await sendNotification({
          message,
          title: title ?? "Checker - termine trovato",
          priority: priority ?? "high",
          tags: tags ?? ["tada"],
        });
        state[key] = { lastNotified: new Date().toISOString() };
      } else {
        console.log(`[skip]  "${term}" trovato su ${url} ma notifica già inviata il ${state[key].lastNotified}`);
      }
    } else {
      console.log(`[miss]  "${term}" non trovato su ${url}`);
      delete state[key];
    }
  }
}

async function main() {
  console.log(`Avvio controllo — ${new Date().toISOString()}`);

  const state = loadState();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const page of config.pages) {
      if (page._disabled) {
        console.log(`[skip]  Pagina disabilitata: ${page.url}`);
        continue;
      }
      await checkPage(page, browser, state);
    }
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

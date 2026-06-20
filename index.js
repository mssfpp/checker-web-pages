import fetch from "node-fetch";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

const config = JSON.parse(readFileSync("./config.json", "utf-8"));
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

function shouldNotify(state, key, checkConfig) {
  const notifyOnce = checkConfig.notifyOnce ?? globalDefaults.notifyOnce;
  const resendAfterHours = checkConfig.resendAfterHours ?? globalDefaults.resendAfterHours;

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

async function sendNotification(message) {
  const res = await fetch(`${NTFY_BASE_URL}/${channel}`, {
    method: "POST",
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
  let html;

  try {
    html = needsPlaywright(url)
      ? await fetchWithPlaywright(url, browser)
      : await fetchWithHttp(url);
  } catch (err) {
    console.error(`[error] Fetch fallito per ${url}: ${err.message}`);
    return;
  }

  const lowerHtml = html.toLowerCase();

  for (const check of checks) {
    const { term, message } = check;
    const key = stateKey(url, term);
    const found = lowerHtml.includes(term.toLowerCase());

    if (found) {
      if (shouldNotify(state, key, check)) {
        console.log(`[MATCH] "${term}" trovato su ${url} → invio notifica`);
        await sendNotification(message);
        state[key] = { lastNotified: new Date().toISOString() };
      } else {
        const entry = state[key];
        console.log(`[skip]  "${term}" trovato su ${url} ma notifica già inviata il ${entry.lastNotified}`);
      }
    } else {
      console.log(`[miss]  "${term}" non trovato su ${url}`);
      // Resetta lo stato così se il termine ricompare viene notificato di nuovo
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

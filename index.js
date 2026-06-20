import fetch from "node-fetch";
import { readFileSync } from "fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

const config = JSON.parse(readFileSync("./config.json", "utf-8"));
const NTFY_BASE_URL = "https://ntfy.sh";
const channel = config.ntfy.channel;
const TIMEOUT_MS = 30000;

const USE_PLAYWRIGHT_FOR = ["ticketone.it"];

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
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function checkPage(pageConfig, browser) {
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

  for (const { term, message } of checks) {
    if (lowerHtml.includes(term.toLowerCase())) {
      console.log(`[MATCH] "${term}" trovato su ${url} → invio notifica`);
      await sendNotification(message);
    } else {
      console.log(`[miss]  "${term}" non trovato su ${url}`);
    }
  }
}

async function main() {
  console.log(`Avvio controllo — ${new Date().toISOString()}`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const page of config.pages) {
      await checkPage(page, browser);
    }
  } finally {
    await browser.close();
  }

  console.log("Controllo completato.");
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});

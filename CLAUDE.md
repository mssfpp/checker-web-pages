# Contesto progetto — checker-web-pages

## Cosa fa
Script Node.js che monitora pagine web cercando termini specifici e invia notifiche via [ntfy](https://ntfy.sh). Gira ogni 15 minuti su GitHub Actions.

## Obiettivo attuale
Notificare quando escono biglietti per Alessandro Barbero al Teatro Galleria di Bergamo. Le pagine monitorate sono in `config.json`.

## Stack
- **Node.js** (ESM, `"type": "module"`)
- **node-fetch** — HTTP per siti normali
- **playwright-extra + puppeteer-extra-plugin-stealth** — browser headless per siti con anti-bot (TicketOne usa Cloudflare)
- **ntfy.sh** — notifiche push, canale `notify-events-filippo-92847`
- **GitHub Actions** — esecuzione schedulata ogni 15 minuti

## File chiave
- `config.json` — pagine e termini da monitorare (produzione)
- `config.test.json` — scenari di test (match, miss, errore)
- `state.json` — traccia quando è stata inviata l'ultima notifica per ogni termine; viene committato da GitHub Actions dopo ogni run
- `index.js` — logica principale
- `.github/workflows/checker.yml` — workflow GitHub Actions

## Decisioni prese
- **Playwright solo per TicketOne** — gli altri siti usano fetch normale, più veloce. Il dominio si controlla in `USE_PLAYWRIGHT_FOR` in `index.js`
- **Emoji vietate negli header HTTP** — ntfy accetta emoji solo nel campo `tags`, non in `title`
- **`_disabled: true`** nel config per disabilitare una pagina senza rimuoverla
- **`--config` flag** — `npm test` usa `config.test.json`, `npm start` usa `config.json`
- **state.json committato nel repo** — unico modo per persistere stato tra run su GitHub Actions (filesystem effimero)
- **Cache Chromium** in Actions (`~/.cache/ms-playwright`) — riduce ogni run da ~3 min a ~35 sec
- **Timeout** — 30s per pagina, 8 min per lo step checker, 10 min per il job intero

## Comportamento notifiche
- `notifyOnce: true` — non rispedisce ogni 15 min se il termine è già stato trovato
- `resendAfterHours: 3` — reinvia dopo 3h se la condizione persiste
- Quando il termine scompare dalla pagina lo stato si resetta (alla ricomparsa torna a notificare)
- Errori di fetch seguono le stesse regole di dedup

## Comandi utili
```bash
npm start          # run normale (config.json)
npm test           # run di test (config.test.json)
gh workflow run checker.yml   # trigger manuale su GitHub Actions
gh run list --workflow=checker.yml --limit=10  # log run recenti
```

## Note GitHub Actions
- I run schedulati hanno ritardi variabili (10-30 min) — comportamento normale su account free
- Il warning "Node.js 20 deprecated" su actions/cache e actions/checkout è un problema interno di GitHub, non impatta il funzionamento
- Il workflow ha `permissions: contents: write` per poter committare `state.json`

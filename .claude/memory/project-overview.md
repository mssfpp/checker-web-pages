---
name: project-overview
description: Stack, obiettivo, file chiave e decisioni architetturali del progetto checker-web-pages
metadata:
  type: project
---

Progetto Node.js che monitora pagine web cercando termini e invia notifiche push via ntfy. Gira ogni 15 minuti su GitHub Actions.

**Why:** Notificare quando escono biglietti per Alessandro Barbero al Teatro Galleria di Bergamo.

**How to apply:** Ogni modifica deve tenere conto che lo script gira headless su Ubuntu su GitHub Actions, il filesystem è effimero tra run, e TicketOne richiede Playwright.

## Stack
- Node.js ESM (`"type": "module"`)
- `node-fetch` — HTTP per siti normali
- `playwright-extra` + `puppeteer-extra-plugin-stealth` — browser headless per TicketOne (Cloudflare)
- ntfy.sh — canale `notify-events-filippo-92847`
- GitHub Actions — account `mssfpp`, repo `checker-web-pages`

## File chiave
- `config.json` — pagine e termini (produzione)
- `config.test.json` — scenari di test
- `state.json` — stato notifiche, committato da Actions dopo ogni run
- `index.js` — logica principale
- `.github/workflows/checker.yml` — workflow schedulato

## Decisioni architetturali
- Playwright solo per domini in `USE_PLAYWRIGHT_FOR` (attualmente `ticketone.it`)
- Emoji vietate negli header HTTP — vanno solo nel campo `tags` di ntfy
- `_disabled: true` nel config per disabilitare una pagina senza rimuoverla
- `--config` flag: `npm start` → `config.json`, `npm test` → `config.test.json`
- `state.json` committato nel repo — unico modo per persistere stato tra run su Actions
- Cache Chromium in Actions → run ~35 sec invece di ~3 min
- Timeout: 30s per pagina, 8 min checker step, 10 min job

## Comportamento notifiche
- `notifyOnce: true` + `resendAfterHours: 3` come default globali
- Errori di fetch seguono le stesse regole di dedup
- Quando il termine scompare dalla pagina lo stato si resetta

## Comandi
```bash
npm start                                        # run produzione
npm test                                         # run test
gh workflow run checker.yml                      # trigger manuale Actions
gh run list --workflow=checker.yml --limit=10    # log run recenti
```

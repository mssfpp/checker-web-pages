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
- `config.test.json` — scenari di test (match, miss, errore)
- `state.json` — stato notifiche + heartbeat, committato da Actions dopo ogni run
- `index.js` — logica principale
- `.github/workflows/checker.yml` — workflow schedulato
- `setup-claude-memory.sh` — crea symlink memoria Claude su nuova macchina

## Decisioni architetturali
- Playwright solo per domini in `USE_PLAYWRIGHT_FOR` (attualmente `ticketone.it`)
- Emoji vietate negli header HTTP — vanno solo nel campo `tags` di ntfy
- `_disabled: true` nel config per disabilitare una pagina senza rimuoverla
- `--config` flag: `npm start` → `config.json`, `npm test` → `config.test.json`
- `state.json` committato nel repo — unico modo per persistere stato tra run su Actions
- Cache Chromium in Actions → run ~35 sec invece di ~3 min
- Timeout: 30s per pagina, 8 min checker step, 10 min job

## Opzioni per check (config.json)
- `term`, `message` — obbligatori
- `title`, `priority`, `tags` — aspetto notifica ntfy
- `notifyOnce` + `resendAfterHours` — dedup notifiche (default globali: true, 3h)
- `channel` — canale ntfy sovrascrivibile per pagina o per singolo check
- `silenceHours: { from, to }` — fascia oraria silenziosa, supporta a cavallo mezzanotte

## Notifiche automatiche
- **Errore pagina** — se fetch fallisce, notifica `high` con dedup 3h
- **Heartbeat giornaliero** — primo run del giorno manda ping `low` "script attivo"; data salvata in `state.__heartbeat__`

## Comportamento notifiche
- `notifyOnce: true` + `resendAfterHours: 3` come default globali
- Quando il termine scompare dalla pagina lo stato si resetta (notifica alla ricomparsa)
- `silenceHours` blocca l'invio ma non aggiorna lo stato — alla fine del silenzio la notifica parte al run successivo

## Comandi
```bash
npm start                                        # run produzione
npm test                                         # run test
gh workflow run checker.yml                      # trigger manuale Actions
gh run list --workflow=checker.yml --limit=10    # log run recenti
```

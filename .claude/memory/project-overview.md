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
- `.claude/commands/` — wizard Claude Code per gestire le notifiche
- `setup-claude-memory.sh` — crea symlink memoria Claude su nuova macchina

## Decisioni architetturali
- Playwright solo per domini in `USE_PLAYWRIGHT_FOR` (attualmente `ticketone.it`)
- Chromium lanciato con `--no-sandbox --disable-setuid-sandbox` (obbligatorio su Linux container di Actions)
- Emoji vietate negli header HTTP — vanno solo nel campo `tags` di ntfy
- `_disabled: true` nel config per disabilitare una pagina senza rimuoverla
- `--config` flag: `npm start` → `config.json`, `npm test` → `config.test.json`
- `state.json` committato nel repo — unico modo per persistere stato tra run su Actions
- `cleanOrphanState()` chiamata a ogni avvio — rimuove chiavi di check rimossi dal config
- Cache Chromium in Actions → run ~35 sec invece di ~3 min
- Timeout: 30s per pagina, 8 min checker step, 10 min job
- Badge "ultimo run" via Gist pubblico (`52f18e040ca29b6905b30fa7fca770d1`) + Shields.io, token in secret `GIST_TOKEN`

## Opzioni per check (config.json)
- `term` — termine singolo (stringa)
- `terms` + `condition` — multi-termine con `AND` (default) o `OR`
- Ogni elemento di `terms` può essere stringa o oggetto `{term, regex, regexFlags}`
- `regex` + `regexFlags` — ricerca con espressione regolare (default flag: `"i"`)
- `title`, `priority`, `tags` — aspetto notifica ntfy
- `notifyOnce` + `resendAfterHours` — dedup notifiche (default globali: true, 3h)
- `channel` — canale ntfy sovrascrivibile per pagina o per singolo check
- `silenceHours: { from, to }` — fascia oraria silenziosa, supporta a cavallo mezzanotte

## Notifiche automatiche
- **Errore pagina** — se fetch fallisce, notifica `high` con dedup 3h
- **Anti-bot attivo** — `detectBlock()` riconosce le pagine di blocco/challenge (Akamai/Cloudflare/captcha) tramite `BLOCK_SIGNATURES` e le tratta come errore con notifica dedicata (+ screenshot della pagina vista, disattivabile con `errorScreenshot: false`), invece di scambiarle per "termine non trovato". Le firme sono specifiche delle pagine di blocco: NON usare `/akam/` (presente anche su pagine legittime → falsi positivi)
  - **Mitigazione challenge intermittente**: la challenge Akamai (`sec-cpt`/"powered and protected by") si auto-risolve ricaricando dopo aver calcolato il sensore JS. `fetchWithPlaywright` attende fino a 4×2.5s che il blocco sparisca PRIMA di dichiararlo, e usa un context realistico (UA Chrome, viewport 1280x800, locale it-IT) per ridurre la frequenza delle challenge. Con `domcontentloaded` da solo si catturava l'HTML troppo presto → falsi blocchi
- **Heartbeat giornaliero** — primo run del giorno manda ping `low` "script attivo"; data salvata in `state.__heartbeat__`

## Opzioni ricerca testo
- `textOnly: true` su un check → cerca solo nel testo visibile (innerText con Playwright, HTML senza tag con HTTP), ignora attributi come `src`/`href`. Attivo sul check `legnano` di ticketone artist per evitare match su path immagini

## Comportamento notifiche
- `notifyOnce: true` + `resendAfterHours: 3` come default globali
- Quando il termine scompare dalla pagina lo stato si resetta (notifica alla ricomparsa)
- `silenceHours` blocca l'invio ma non aggiorna lo stato

## Wizard Claude Code (`.claude/commands/`)
- `/aggiungi-notifica` — aggiunge check con suggerimenti dal contesto
- `/modifica-notifica` — modifica check esistente
- `/rimuovi-notifica` — rimuove check esistente
- I comandi funzionano solo aprendo Claude Code nella directory del progetto

## Comandi
```bash
npm start                                        # run produzione
npm test                                         # run test
gh workflow run checker.yml                      # trigger manuale Actions
gh run list --workflow=checker.yml --limit=10    # log run recenti
```

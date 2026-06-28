# checker-web-pages

[![Web Page Checker](https://github.com/mssfpp/checker-web-pages/actions/workflows/checker.yml/badge.svg)](https://github.com/mssfpp/checker-web-pages/actions/workflows/checker.yml)
[![ultimo run](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/mssfpp/52f18e040ca29b6905b30fa7fca770d1/raw/status.json&cacheSeconds=60)](https://github.com/mssfpp/checker-web-pages/actions/workflows/checker.yml)

Monitora una o più pagine web e invia una notifica su [ntfy](https://ntfy.sh) quando viene trovato un termine specifico. Gira automaticamente ogni 15 minuti tramite GitHub Actions.

## Come funziona

Lo script legge `config.json`, visita ogni URL configurato e cerca i termini specificati nel contenuto della pagina. Se un termine viene trovato, invia una notifica al canale ntfy configurato.

Per i siti protetti da anti-bot (es. TicketOne), usa [Playwright](https://playwright.dev/) con il plugin stealth al posto di una semplice richiesta HTTP. Le pagine vengono visitate in parallelo (max 3 alla volta, configurabile).

## Configurazione

Modifica `config.json`:

```json
{
  "ntfy": {
    "channel": "nome-del-tuo-canale"
  },
  "defaults": {
    "notifyOnce": true,
    "resendAfterHours": 3,
    "silenceHours": { "from": 23, "to": 8 }
  },
  "concurrency": 3,
  "aggregation": {
    "enabled": true,
    "threshold": 4
  },
  "pages": [
    {
      "url": "https://example.com",
      "screenshot": true,
      "channel": "canale-opzionale-per-pagina",
      "checks": [
        {
          "term": "termine da cercare",
          "message": "Testo della notifica che riceverai",
          "title": "Titolo della notifica",
          "priority": "high",
          "tags": ["tada"],
          "channel": "canale-opzionale-per-check",
          "clickUrl": "https://example.com/pagina-specifica",
          "silenceHours": { "from": 23, "to": 8 }
        }
      ]
    }
  ]
}
```

### Opzioni globali (`defaults`)

Valgono per tutti i check, sovrascrivibili sul singolo check:

| Campo | Default | Descrizione |
|-------|---------|-------------|
| `notifyOnce` | `true` | Non reinvia la notifica finché il termine non scompare e ricompare |
| `resendAfterHours` | `3` | Reinvia dopo N ore se la condizione persiste |
| `silenceHours` | nessuno | Fascia oraria globale silenziosa, es. `{"from": 23, "to": 8}` |

### Opzioni di sistema

| Campo | Default | Descrizione |
|-------|---------|-------------|
| `concurrency` | `3` | Numero massimo di pagine visitate in parallelo |
| `aggregation.enabled` | `false` | Se `true`, aggrega le notifiche quando superano la soglia |
| `aggregation.threshold` | `4` | Numero di match oltre cui inviare una notifica aggregata invece di tante separate |

### Opzioni a livello di pagina

| Campo | Default | Descrizione |
|-------|---------|-------------|
| `channel` | canale globale | Canale ntfy per tutti i check della pagina |
| `screenshot` | `false` | Se `true`, allega uno screenshot alla notifica. Abilita automaticamente Playwright anche per siti non-TicketOne |
| `errorScreenshot` | `true` | Se `true`, allega lo screenshot della pagina alle notifiche di blocco anti-bot, per vedere cosa stava vedendo lo script. Solo per pagine via Playwright. Impostabile anche globalmente in `defaults` |
| `expiresAt` | nessuno | Data `YYYY-MM-DD` oltre la quale la pagina viene rimossa dalla lista di controllo. Il giorno indicato viene ancora eseguito, lo skip parte dal giorno successivo. Es. `"2026-07-02"` → attiva fino al 2 luglio incluso |

### Opzioni per ogni check

| Campo | Obbligatorio | Default | Descrizione |
|-------|-------------|---------|-------------|
| `term` | ✅ | — | Termine da cercare nel testo della pagina (case-insensitive) |
| `message` | ✅ | — | Testo della notifica ntfy |
| `title` | ❌ | `"Checker - termine trovato"` | Titolo della notifica |
| `priority` | ❌ | `"high"` | Priorità: `default`, `high`, `urgent` |
| `tags` | ❌ | `["tada"]` | Tag/emoji ntfy (es. `["ticket", "tada"]`) |
| `channel` | ❌ | canale pagina o globale | Canale ntfy specifico per questo check |
| `clickUrl` | ❌ | URL della pagina | URL che si apre toccando la notifica |
| `notifyOnce` | ❌ | da `defaults` | Sovrascrive il default globale per questo check |
| `resendAfterHours` | ❌ | da `defaults` | Sovrascrive il default globale per questo check |
| `silenceHours` | ❌ | da `defaults` | Fascia oraria silenziosa per questo check (sovrascrive il globale) |
| `regex` | ❌ | `false` | Se `true`, interpreta `term` come espressione regolare |
| `regexFlags` | ❌ | `"i"` | Flag regex — usato solo se `regex: true` |
| `terms` | ❌ | — | Array di termini per ricerca multi-termine (sostituisce `term`) |
| `condition` | ❌ | `"AND"` | Condizione tra i termini: `AND` (tutti presenti) o `OR` (almeno uno) |
| `textOnly` | ❌ | `false` | Se `true`, cerca solo nel testo visibile ignorando attributi HTML (src, href, class…) — evita falsi positivi da immagini o link |
| `expiresAt` | ❌ | nessuno | Data `YYYY-MM-DD` oltre la quale questo check viene disattivato (il giorno indicato è ancora attivo). Utile per controlli temporanei |

### Gerarchia canali ntfy

```
ntfy.channel (globale)
  └── page.channel (sovrascrive per tutta la pagina)
        └── check.channel (sovrascrive per il singolo check)
```

### Esempi

**Ricerca con regex** — notifica solo se "barbero" è vicino a "biglietti" o "vendita":
```json
{
  "term": "barbero.{0,100}(biglietti|vendita)",
  "regex": true,
  "regexFlags": "is",
  "message": "Biglietti Barbero trovati!"
}
```

**Multi-termine AND** — notifica solo se la pagina contiene sia "barbero" che "biglietti":
```json
{
  "terms": ["barbero", "biglietti"],
  "condition": "AND",
  "message": "Biglietti Barbero trovati!"
}
```

**Multi-termine OR** — notifica se trova almeno uno tra i termini:
```json
{
  "terms": ["barbero", "alessandro barbero"],
  "condition": "OR",
  "message": "Riferimento a Barbero trovato!"
}
```

### Disabilitare temporaneamente una pagina

Aggiungi `"_disabled": true` alla pagina nel config:
```json
{
  "_disabled": true,
  "url": "https://example.com",
  "checks": [...]
}
```

### Notifiche automatiche

- **Errore pagina** — se una pagina è irraggiungibile dopo 3 tentativi, arriva una notifica `high`. Rispetta `resendAfterHours` per non generare spam.
- **Anti-bot attivo** — se una pagina protetta (es. TicketOne) restituisce una pagina di blocco/challenge invece del contenuto reale, arriva una notifica `high` dedicata, con lo screenshot della pagina vista (disattivabile con `errorScreenshot: false`). Prima di arrendersi lo script attende che l'eventuale challenge Akamai si auto-risolva (ricarica). Evita di scambiare un blocco per un "termine non trovato" e perdere notifiche reali senza accorgersene.
- **Heartbeat giornaliero** — al primo run del giorno arriva un ping `low` "script attivo". Utile per accorgersi se GitHub smette di schedulare il workflow.

## Esecuzione locale

```bash
npm install
npx playwright install chromium
npm start                        # usa config.json
npm start -- --dry-run          # mostra i match senza inviare notifiche
npm test                         # usa config.test.json
```

## Comandi Claude Code

Digita questi comandi in una sessione Claude Code aperta nella directory del progetto:

- `/aggiungi-notifica` — aggiunge un nuovo check guidato passo passo
- `/modifica-notifica` — modifica un check esistente
- `/rimuovi-notifica` — rimuove un check esistente
- `/lista-notifiche` — mostra tutte le notifiche configurate in formato leggibile

## GitHub Actions

Il workflow `.github/workflows/checker.yml` esegue lo script automaticamente ogni 15 minuti.

> **Nota:** GitHub Actions non garantisce la puntualità esatta dei workflow schedulati. Ritardi di 10-30 minuti sono normali nei momenti di carico elevato.

Per eseguirlo manualmente: **Actions → Web Page Checker → Run workflow**.

## Stato notifiche

Il file `state.json` traccia l'ultima notifica inviata per ogni termine e il timestamp dell'heartbeat giornaliero. Viene aggiornato automaticamente dopo ogni run e committato nel repo da GitHub Actions.

## Setup su nuova macchina

```bash
git clone https://github.com/mssfpp/checker-web-pages
cd checker-web-pages
bash setup-claude-memory.sh   # collega la memoria di Claude Code al repo
npm install
npx playwright install chromium
```

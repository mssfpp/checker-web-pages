# checker-web-pages

[![Web Page Checker](https://github.com/mssfpp/checker-web-pages/actions/workflows/checker.yml/badge.svg)](https://github.com/mssfpp/checker-web-pages/actions/workflows/checker.yml)

Monitora una o più pagine web e invia una notifica su [ntfy](https://ntfy.sh) quando viene trovato un termine specifico. Gira automaticamente ogni 15 minuti tramite GitHub Actions.

## Come funziona

Lo script legge `config.json`, visita ogni URL configurato e cerca i termini specificati nel contenuto della pagina. Se un termine viene trovato, invia una notifica al canale ntfy configurato.

Per i siti protetti da anti-bot (es. TicketOne), usa [Playwright](https://playwright.dev/) con il plugin stealth al posto di una semplice richiesta HTTP.

## Configurazione

Modifica `config.json`:

```json
{
  "ntfy": {
    "channel": "nome-del-tuo-canale"
  },
  "defaults": {
    "notifyOnce": true,
    "resendAfterHours": 3
  },
  "pages": [
    {
      "url": "https://example.com",
      "channel": "canale-opzionale-per-pagina",
      "checks": [
        {
          "term": "termine da cercare",
          "message": "Testo della notifica che riceverai",
          "title": "Titolo della notifica",
          "priority": "high",
          "tags": ["tada"],
          "channel": "canale-opzionale-per-check",
          "silenceHours": { "from": 23, "to": 8 }
        }
      ]
    }
  ]
}
```

### Opzioni per ogni check

| Campo | Obbligatorio | Default | Descrizione |
|-------|-------------|---------|-------------|
| `term` | ✅ | — | Termine da cercare nel testo della pagina (case-insensitive) |
| `message` | ✅ | — | Testo della notifica ntfy |
| `title` | ❌ | `"Checker - termine trovato"` | Titolo della notifica |
| `priority` | ❌ | `"high"` | Priorità: `default`, `high`, `urgent` |
| `tags` | ❌ | `["tada"]` | Tag/emoji ntfy (es. `["ticket", "tada"]`) |
| `notifyOnce` | ❌ | `true` | Se `true`, non reinvia la notifica finché il termine non scompare e ricompare |
| `resendAfterHours` | ❌ | `3` | Se il termine è ancora presente, reinvia dopo N ore |
| `channel` | ❌ | canale globale | Canale ntfy per questo check (sovrascrive pagina e globale) |
| `silenceHours` | ❌ | nessuno | Fascia oraria silenziosa, es. `{"from": 23, "to": 8}` — funziona anche a cavallo della mezzanotte |
| `regex` | ❌ | `false` | Se `true`, interpreta `term` come espressione regolare |
| `regexFlags` | ❌ | `"i"` | Flag regex (es. `"i"`, `"is"`, `"gim"`) — usato solo se `regex: true` |
| `terms` | ❌ | — | Array di termini per ricerca multi-termine (sostituisce `term`) |
| `condition` | ❌ | `"AND"` | Condizione tra i termini: `AND` (tutti presenti) o `OR` (almeno uno) |

**Esempio regex** — cerca "barbero" solo se vicino a "biglietti" o "vendita":

```json
{
  "term": "barbero.{0,100}(biglietti|vendita)",
  "regex": true,
  "regexFlags": "is",
  "message": "Biglietti Barbero trovati!"
}
```

> Il flag `"is"` rende la ricerca case-insensitive (`i`) e fa sì che `.` matchi anche i newline (`s`), utile quando il testo è spezzato su più righe nell'HTML.

**Esempio multi-termine AND** — notifica solo se la pagina contiene sia "barbero" che "biglietti":

```json
{
  "terms": ["barbero", "biglietti"],
  "condition": "AND",
  "message": "Biglietti Barbero trovati!"
}
```

**Esempio multi-termine OR** — notifica se trova almeno uno tra i termini:

```json
{
  "terms": ["barbero", "alessandro barbero"],
  "condition": "OR",
  "message": "Riferimento a Barbero trovato!"
}
```

Ogni elemento di `terms` può anche essere un oggetto per usare regex su singoli termini:

```json
{
  "terms": [
    { "term": "barber[oo]", "regex": true, "regexFlags": "i" },
    "biglietti"
  ],
  "condition": "AND",
  "message": "Trovato!"
}
```

## Comandi wizard

Digita questi comandi in Claude Code per gestire le notifiche senza modificare il JSON a mano:

- `/aggiungi-notifica` — aggiunge un nuovo check guidato passo passo
- `/modifica-notifica` — modifica un check esistente
- `/rimuovi-notifica` — rimuove un check esistente

### Gerarchia canali ntfy

```
ntfy.channel (globale)
  └── page.channel (sovrascrive per tutta la pagina)
        └── check.channel (sovrascrive per il singolo check)
```

### Opzioni globali (`defaults`)

Valgono per tutti i check, sovrascrivibili sul singolo check:

- `notifyOnce` — evita notifiche ripetute ogni 15 minuti per lo stesso termine
- `resendAfterHours` — reinvia la notifica se la condizione persiste dopo N ore

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

- **Errore pagina** — se una pagina è irraggiungibile arriva una notifica con priorità `high`. Rispetta `resendAfterHours` per non generare spam in caso di downtime prolungato.
- **Heartbeat giornaliero** — ogni giorno al primo run arriva un ping "script attivo" con priorità `low`. Utile per accorgersi se GitHub smette di schedulare il workflow.

## Esecuzione locale

```bash
npm install
npx playwright install chromium
npm start   # usa config.json
npm test    # usa config.test.json
```

## GitHub Actions

Il workflow `.github/workflows/checker.yml` esegue lo script automaticamente ogni 15 minuti.

> **Nota:** GitHub Actions non garantisce la puntualità esatta dei workflow schedulati. Ritardi di 10-30 minuti sono normali nei momenti di carico elevato sui server GitHub.

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

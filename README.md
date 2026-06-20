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
      "checks": [
        {
          "term": "termine da cercare",
          "message": "Testo della notifica che riceverai",
          "title": "Titolo della notifica",
          "priority": "high",
          "tags": ["tada"]
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
| `channel` | ❌ | canale globale | Canale ntfy specifico per questo check |
| `silenceHours` | ❌ | nessuno | Fascia oraria in cui non inviare la notifica (es. `{"from": 23, "to": 7}`) |

Il campo `channel` può essere specificato anche a livello di pagina (vale per tutti i suoi check) o sul singolo check (priorità massima).

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

### Notifiche di errore

Se una pagina è irraggiungibile, arriva una notifica automatica su ntfy. Anche queste rispettano il vincolo `resendAfterHours` per non generare spam in caso di downtime prolungato.

## Esecuzione locale

```bash
npm install
npx playwright install chromium
npm start
```

## GitHub Actions

Il workflow `.github/workflows/checker.yml` esegue lo script automaticamente ogni 15 minuti.

> **Nota:** GitHub Actions non garantisce la puntualità esatta dei workflow schedulati. Ritardi di 10-30 minuti sono normali nei momenti di carico elevato sui server GitHub.

Per eseguirlo manualmente: **Actions → Web Page Checker → Run workflow**.

## Stato notifiche

Il file `state.json` traccia quando è stata inviata l'ultima notifica per ogni termine. Viene aggiornato automaticamente dopo ogni run e committato nel repo da GitHub Actions.

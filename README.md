# checker-web-pages

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
  "pages": [
    {
      "url": "https://example.com",
      "checks": [
        {
          "term": "termine da cercare",
          "message": "Testo della notifica che riceverai"
        }
      ]
    }
  ]
}
```

Ogni pagina può avere più `checks` indipendenti. Se più termini vengono trovati nella stessa pagina, arrivano notifiche separate.

## Esecuzione locale

```bash
npm install
npx playwright install chromium
npm start
```

## GitHub Actions

Il workflow `.github/workflows/checker.yml` esegue lo script automaticamente ogni 15 minuti. Per eseguirlo manualmente vai su **Actions → Web Page Checker → Run workflow**.

# Lista notifiche

Leggi `config.json` e mostra tutte le notifiche configurate in formato leggibile.

## Formato output

Mostra un riepilogo compatto con intestazione e poi ogni check numerato:

```
Canale globale: <channel>
Default: notifyOnce=<valore>, resendAfterHours=<valore>

[1] https://example.com
    🔍 "termine" (testuale)
    📩 Messaggio: "..."
    🏷️  Titolo: "..." | Priorità: high | Tag: tada, ticket
    🔕 Silenzio: 23:00-08:00
    ⏱️  Resend: 3h | Canale: globale

[2] https://altra-pagina.com
    🔍 "termine1" AND "termine2" (testuale)
    📩 Messaggio: "..."
    ...
```

## Regole

- Se il check usa `terms` con `condition`, mostralo come `"t1" AND "t2"` o `"t1" OR "t2"`
- Se un campo usa il default globale, scrivi "default" invece del valore
- Se la pagina ha `_disabled: true`, mostrala in grigio con `[DISABILITATA]`
- Alla fine mostra il totale: `Totale: N check su M pagine`
- Non chiedere nulla all'utente, mostra direttamente il risultato

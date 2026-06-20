# Lista notifiche

Leggi `config.json` e mostra tutte le notifiche configurate in formato leggibile. Non chiedere nulla all'utente, mostra direttamente il risultato.

## Formato output

```
Canale globale: <channel>
Default: notifyOnce=<valore>, resendAfterHours=<valore>h

[1] https://example.com
    🔍 "termine" (testuale)
    📩 "messaggio"
    🏷️  Titolo: "..." | Priorità: high | Tag: tada, ticket
    🔕 Silenzio: 23:00-08:00
    ⏱️  Resend: 3h | Canale: globale

Totale: N check su M pagine
```

## Regole

- Se il check usa `terms` con `condition`, mostralo come `"t1" AND "t2"` o `"t1" OR "t2"`
- Se un campo non è specificato e usa il default globale, scrivi "default"
- Se la pagina ha `_disabled: true`, aggiungile `[DISABILITATA]` accanto all'URL
- Mostra il totale alla fine

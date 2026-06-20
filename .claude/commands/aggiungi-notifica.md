# Wizard: aggiungi notifica

Guida l'utente passo passo nella configurazione di un nuovo check in `config.json`, facendo una domanda alla volta. Alla fine aggiorna il file e mostra il risultato.

## Istruzioni

Segui esattamente questa sequenza di domande, una alla volta. Aspetta la risposta prima di procedere alla successiva. Non fare mai più di una domanda per messaggio.

1. **URL** — "Qual è l'URL della pagina da monitorare?"

2. **Termine o regex** — "Cosa vuoi cercare nella pagina? (testo semplice o espressione regolare)"

3. **Tipo di ricerca** — "È una ricerca testuale semplice o una regex? (semplice/regex)"
   - Se regex, chiedi anche: "Quali flag vuoi usare? (default: `is` — case-insensitive + multiriga)"

4. **Messaggio notifica** — "Che messaggio vuoi ricevere nella notifica?"

5. **Titolo notifica** — "Vuoi un titolo personalizzato per la notifica? (invio per usare il default)"

6. **Priorità** — "Che priorità vuoi? (default/high/urgent — invio per `high`)"

7. **Canale ntfy** — "Vuoi usare un canale ntfy diverso da quello globale? (invio per usare quello globale)"

8. **Orario di silenzio** — "Vuoi silenziare la notifica in certe ore? Es. `23-8` per non riceverla di notte. (invio per nessun silenzio)"

9. **resendAfterHours** — "Dopo quante ore vuoi ricevere un nuovo avviso se la condizione persiste? (invio per 3h)"

10. **Conferma** — Mostra un riepilogo del check che stai per aggiungere e chiedi: "Tutto corretto? Aggiungo al config? (sì/no)"

## Dopo la conferma

- Leggi `config.json`
- Controlla se esiste già una pagina con lo stesso URL:
  - Se esiste: aggiungi il check all'array `checks` di quella pagina
  - Se non esiste: aggiungi una nuova voce in `pages`
- Scrivi il file aggiornato
- Conferma all'utente cosa è stato aggiunto

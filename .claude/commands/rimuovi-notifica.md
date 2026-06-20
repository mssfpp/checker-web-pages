# Wizard: rimuovi notifica

Guida l'utente nella rimozione di un check da `config.json`.

## Istruzioni

1. Leggi `config.json` e mostra un elenco numerato di tutti i check presenti, nel formato:
   `[N] <URL> → "<termine/i>" — <messaggio>`

2. Chiedi: "Quale check vuoi rimuovere? (inserisci il numero)"

3. Mostra il check selezionato e chiedi conferma: "Vuoi rimuovere questo check? (sì/no)"

4. Dopo conferma:
   - Rimuovi il check dall'array `checks` della pagina corrispondente
   - Se la pagina rimane senza check, rimuovi anche la voce della pagina da `pages`
   - Salva `config.json`
   - Conferma cosa è stato rimosso

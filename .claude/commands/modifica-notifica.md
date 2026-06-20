# Wizard: modifica notifica

Guida l'utente nella modifica di un check esistente in `config.json`.

## Istruzioni

1. Leggi `config.json` e mostra un elenco numerato di tutti i check presenti, nel formato:
   `[N] <URL> → "<termine/i>" — <messaggio>`

2. Chiedi: "Quale check vuoi modificare? (inserisci il numero)"

3. Mostra tutti i campi del check selezionato con i valori attuali, poi chiedi:
   "Quale campo vuoi modificare? (termine / condizione / messaggio / titolo / priorità / canale / silenzio / resend)"

4. Fai **una domanda alla volta** per il campo scelto, mostrando il valore attuale come suggerimento.
   - Se l'utente vuole modificare più campi, dopo ogni modifica chiedi: "Vuoi modificare altro? (sì/no)"

5. Mostra un riepilogo del check aggiornato e chiedi conferma: "Salvo le modifiche? (sì/no)"

6. Dopo conferma:
   - Aggiorna il check in `config.json`
   - Salva il file
   - Conferma cosa è cambiato

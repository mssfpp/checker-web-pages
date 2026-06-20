# Wizard: aggiungi notifica

Guida l'utente nell'aggiunta di un nuovo check in `config.json` in modo smart: leggi prima il config esistente per capire il contesto, proponi suggerimenti coerenti e fai solo le domande strettamente necessarie.

## Prima di iniziare

Leggi `config.json` e prendi nota di:
- I canali ntfy usati
- Le priorità usate
- I pattern di messaggi e titoli esistenti
- Gli URL già monitorati

## Sequenza domande

Fai **una domanda alla volta**. Per ogni domanda proponi suggerimenti concreti basati sul config esistente. Salta le domande per cui puoi dedurre un default ovvio dal contesto.

### 1. URL
Chiedi l'URL. Se l'utente ne fornisce uno già presente nel config, segnalalo subito ("questa pagina è già monitorata per [termini esistenti]").

### 2. Termine
Chiedi cosa cercare. Suggerisci se ha senso usare regex (es. se vuole cercare più varianti). Se l'URL è già nel config, mostra i termini già monitorati su quella pagina.

### 3. Messaggio e titolo
Proponi direttamente un messaggio e titolo coerenti con quelli già esistenti nel config per URL simili. Chiedi solo "Vuoi usare questo messaggio: `...`? (sì / modifica)" invece di chiedere da zero.

### 4. Priorità e canale
Se tutti i check esistenti usano la stessa priorità e canale, non chiedere — usa quelli e dillo esplicitamente. Chiedi solo se c'è ambiguità.

### 5. Screenshot
Se la pagina non ha già `"screenshot": true`, chiedi: "Vuoi allegare uno screenshot della pagina alla notifica? (sì/no)"
Se sì, aggiungi `"screenshot": true` alla pagina (non al singolo check).

### 6. Silenzio e resend
Chiedi solo se l'utente sembra volerlo (es. se lo ha menzionato). Altrimenti applica i default globali dal config (`defaults.resendAfterHours`) senza chiedere.

## Conferma e salvataggio

Mostra un riepilogo compatto e chiedi conferma. Dopo conferma:
- Se l'URL esiste già nel config: aggiungi il check all'array `checks` esistente
- Se l'URL è nuovo: aggiungi una nuova voce in `pages`
- Salva `config.json`
- Mostra cosa è cambiato

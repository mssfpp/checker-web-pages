---
name: feedback
description: Preferenze e correzioni emerse durante lo sviluppo
metadata:
  type: feedback
---

Risposte concise, senza riepiloghi ridondanti a fine messaggio.

**Why:** L'utente preferisce comunicazione diretta.
**How to apply:** Non riassumere ciò che si è appena fatto — è già visibile nel diff/output.

---

I test vanno tenuti in `config.test.json`, non in `config.json` con flag `_disabled`.

**Why:** Separazione netta tra configurazione di produzione e scenari di test.
**How to apply:** Nuovi test sempre in `config.test.json`, lanciabili con `npm test`.

---

Non rimuovere i test, tenerli pronti per usi futuri.

**Why:** Utili per verificare rapidamente che le notifiche funzionino dopo modifiche.
**How to apply:** I test in `config.test.json` non vanno mai eliminati, solo aggiornati.

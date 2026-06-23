# Setup Dashboard Registrazioni - Brutia Tango Fest 2026

## ✅ Completato

- ✅ Dashboard frontend (`dashboardregistrazioni.html`)
- ✅ Google Apps Script backend (`AppsScript.gs`)
- ✅ Configurazione (`config.js`)
- ✅ Security: XSS protection, auth token, input validation

---

## 🚀 Step Finali

### 1. Genera AUTH_TOKEN

Nel **Google Apps Script editor**:

1. Apri il foglio Google Sheet
2. Click **Estensioni** → **Apps Script**
3. Nel dropdown in alto, seleziona **`setupAuthToken`**
4. Click il bottone **Esegui** (▶️)
5. Nella sezione **Esecuzioni** (in basso), copia l'UUID generato

Esempio output:
```
✅ AUTH_TOKEN set to: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 2. Aggiungi token a config.js

Apri `config.js` e sostituisci la riga:

```javascript
AUTH_TOKEN: '',
```

Con:

```javascript
AUTH_TOKEN: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // ← Il tuo token da setupAuthToken()
```

### 3. Popola dati di test (opzionale)

Nel Google Apps Script editor, seleziona **`insertTestData`** → **Esegui** (▶️)

Questo crea 15 registrazioni fittizie nel foglio.

### 4. Testa il dashboard

1. Apri `dashboardregistrazioni.html` nel browser
2. Dovrebbe caricare le registrazioni dal Google Sheet
3. Prova:
   - ✅ Approva una registrazione
   - ✅ Assegna una camera
   - ✅ Modifica una registrazione
   - ✅ Elimina una registrazione

---

## 📝 File Struttura

```
.
├── dashboardregistrazioni.html   # Frontend dashboard
├── AppsScript.gs                 # Backend Google Apps Script
├── config.js                     # ⚠️ Credenziali (in .gitignore)
├── config.example.js             # Template per config.js
├── SETUP.md                      # Questo file
├── DASHBOARD_SETUP.md            # Dettagli sicurezza
└── .gitignore                    # Protegge config.js
```

---

## 🔐 Sicurezza

- ✅ **XSS Prevention** — Tutti gli input escapati
- ✅ **Auth Token** — Validato su ogni mutazione
- ✅ **Input Sanitization** — Rimozione caratteri pericolosi
- ✅ **Field Filtering** — Solo campi sicuri ritornati
- ✅ **CSP Header** — Content Security Policy

---

## ⚡ Comandi Utili (Google Apps Script)

| Funzione | Azione |
|----------|--------|
| `setupAuthToken()` | Genera nuovo token |
| `getAuthToken()` | Mostra token corrente |
| `insertTestData()` | Crea 15 registrazioni di test |
| `clearTestData()` | Elimina dati di test |
| `listHeaders()` | Mostra colonne del foglio |

---

## 🐛 Troubleshooting

### "Unauthorized: invalid token"
→ Assicurati che AUTH_TOKEN sia generato e corretto in config.js

### "Utente non trovato"
→ L'ID non esiste nel foglio. Usa `insertTestData()` per creare dati.

### Dashboard mostra "Nessuna registrazione"
→ Il foglio è vuoto. Esegui `insertTestData()`.

### Errore "Cannot read properties of undefined"
→ Ricarica la pagina (F5) e prova di nuovo.

---

## 📞 Support

- **Docs**: Vedi `DASHBOARD_SETUP.md` per dettagli sicurezza
- **Code**: `AppsScript.gs` contiene tutta la logica backend
- **Config**: `config.example.js` è il template

---

**Setup completato ✅**

Vai al **Step 1** sopra per terminare.

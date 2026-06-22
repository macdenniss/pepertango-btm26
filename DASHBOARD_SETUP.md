# Dashboard Registrazioni — Setup Sicuro

## 🔐 Configurazione Credenziali

### 1. Crea il file config.js

```bash
cp config.example.js config.js
```

### 2. Modifica config.js con i tuoi dati

```javascript
window.ADMIN_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  AUTH_TOKEN: 'your-secure-token-here',
};
window.ADMIN_SCRIPT_URL = window.ADMIN_CONFIG.SCRIPT_URL;
window.ADMIN_AUTH_TOKEN = window.ADMIN_CONFIG.AUTH_TOKEN;
```

### 3. Verifica .gitignore

Assicurati che `config.js` è elencato in `.gitignore`:

```bash
echo "config.js" >> .gitignore
```

## ⚠️ Problemi di Sicurezza Risolti

### CRITICAL (Fixati)
✅ **XSS Prevention**: Tutti i dati utente sono escapati prima di essere inseriti nel DOM  
✅ **Hardcoded Credentials**: URL del Google Apps Script spostato in config esterno  
✅ **CSP Header**: Aggiunto meta CSP per bloccare inline scripts

### HIGH (Fixati)
✅ **Variable Shadowing**: Rimosso in saveAssignment()  
✅ **DOM Fragile Selectors**: Usati ID stabili  
✅ **Error Feedback**: Aggiunto feedback visibile per errori di caricamento  
✅ **Button Handlers**: Verificati tutti gli onclick

## 🔒 Prossimi Passi Consigliati

1. **Aggiungere autenticazione al Google Apps Script**:
   - Verificare il token AUTH_TOKEN su ogni richiesta
   - Usare OAuth 2.0 se possibile

2. **Aggiungere HTTPS**:
   - Distribuire solo su HTTPS
   - Aggiungere header `Strict-Transport-Security`

3. **Rate limiting**:
   - Limitare il numero di richieste per IP/sessione

4. **Audit logging**:
   - Registrare tutte le azioni di modifica con timestamp e utente

5. **Validazione lato server**:
   - Validare tutti i dati anche nel Google Apps Script
   - Non fidarsi mai dei dati del client

## ✅ Deployment

1. Rinomina `config.example.js` → `config.js`
2. Inserisci il tuo Google Apps Script URL
3. Assicurati che `config.js` è in `.gitignore`
4. Deploy on HTTPS-only server
5. Testa con dati di prova

---

**Ultimo aggiornamento**: 2026-06-23  
**Revisione**: Sicurezza e affidabilità

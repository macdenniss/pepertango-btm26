// ⚠️ SECURITY: This file contains sensitive credentials
// RENAME THIS FILE TO: config.js (which is in .gitignore)
// NEVER commit the real config.js to version control

window.ADMIN_CONFIG = {
  // URL del Google Apps Script endpoint
  // Ottieni questo valore dal tuo Google Apps Script > Deploy > New deployment
  SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  // Token di autenticazione (opzionale, ma fortemente raccomandato)
  // Genera un token casuale e impostalo nel Google Apps Script
  AUTH_TOKEN: 'your-secure-token-here',
};

// Carica la configurazione nel global scope
window.ADMIN_SCRIPT_URL = window.ADMIN_CONFIG.SCRIPT_URL;
window.ADMIN_AUTH_TOKEN = window.ADMIN_CONFIG.AUTH_TOKEN;

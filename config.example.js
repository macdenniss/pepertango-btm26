// ⚠️ SECURITY: This file contains sensitive credentials
// RENAME THIS FILE TO: config.js (which is in .gitignore)
// NEVER commit the real config.js to version control

window.ADMIN_CONFIG = {
  // URL del Google Apps Script endpoint
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxWr75bCEn7ilkVjtVMMy9LhliaEYBEP3H02TTs0GtWMvrJYJMvfw-RjgUohvUva9Rdyg/exec',

  // Token di autenticazione - Genera con setupAuthToken() nello Apps Script
  // IMPORTANTE: Esegui setupAuthToken() nello Apps Script editor per generare il token
  AUTH_TOKEN: 'GENERA_CON_setupAuthToken_NELLO_APPS_SCRIPT',
};

// Carica la configurazione nel global scope
window.ADMIN_SCRIPT_URL = window.ADMIN_CONFIG.SCRIPT_URL;
window.ADMIN_AUTH_TOKEN = window.ADMIN_CONFIG.AUTH_TOKEN;

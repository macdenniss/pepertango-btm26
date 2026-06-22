// ============================================
// GOOGLE APPS SCRIPT - BRUTIA TANGO FEST 2026
// REGISTRATION DASHBOARD BACKEND
// ============================================

// SECURITY CONFIGURATION
const ADMIN_TOKEN = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
const SAFE_MODE = !ADMIN_TOKEN;

// Safe fields to return in getRegistrazioni (NO email, phone, etc.)
const SAFE_FIELDS = ['id', 'nome', 'cognome', 'ruolo', 'pacchetto', 'tipologia_stanza', 'camera', 'stato', 'data_approvazione'];

// ============================================
// MAIN HANDLERS
// ============================================
function doGet(e) {
  // Only allow getAll via GET; all mutations go to doPost
  e = e || {};
  e.parameter = e.parameter || {};
  const action = e.parameter.action || 'getAll';

  try {
    if (action === 'getAll') {
      return getRegistrazioni();
    }
    return errorResponse('GET method only supports getAll action. Use POST for modifications.', 403);
  } catch (err) {
    logError('doGet', err);
    return errorResponse(err.toString(), 500);
  }
}

function doPost(e) {
  // Validate token on EVERY mutation
  e = e || {};
  e.parameter = e.parameter || {};

  if (!validateToken(e)) {
    logError('doPost', 'Invalid or missing AUTH_TOKEN');
    return errorResponse('Unauthorized: invalid token', 401);
  }

  const action = e.parameter.action;

  try {
    if (action === 'accept') {
      validateRequired(['id'], e.parameter);
      return acceptUser(e.parameter.id, e.parameter.camera, e.parameter.tipologia_stanza);
    } else if (action === 'reject') {
      validateRequired(['id'], e.parameter);
      return rejectUser(e.parameter.id);
    } else if (action === 'editUser') {
      validateRequired(['id'], e.parameter);
      return editUser(e.parameter);
    } else if (action === 'deleteUser') {
      validateRequired(['id'], e.parameter);
      return deleteUser(e.parameter.id);
    } else if (action === 'assignRoom') {
      validateRequired(['id', 'camera', 'tipologia_stanza'], e.parameter);
      return assignRoom(e.parameter.id, e.parameter.camera, e.parameter.tipologia_stanza);
    } else if (action === 'changeRoom') {
      validateRequired(['id', 'camera'], e.parameter);
      return changeRoom(e.parameter.id, e.parameter.camera);
    }
    return errorResponse('Unknown action: ' + action, 400);
  } catch (err) {
    logError('doPost', err);
    return errorResponse(err.toString(), 400);
  }
}

// ============================================
// SECURITY FUNCTIONS
// ============================================
function validateToken(e) {
  if (SAFE_MODE) {
    console.warn('⚠️ SAFE_MODE: ADMIN_TOKEN not configured. Run setupAuthToken()');
    return false;
  }
  let token = e.parameter.token;
  if (!token && e.postData && e.postData.contents) {
    try {
      const parsed = JSON.parse(e.postData.contents);
      token = parsed.token;
    } catch (err) {
      // postData is not JSON, ignore
    }
  }
  return token === ADMIN_TOKEN;
}

function validateRequired(fields, params) {
  fields.forEach(field => {
    if (!params[field] || String(params[field]).trim() === '') {
      throw new Error(`Required field missing: ${field}`);
    }
  });
}

function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  return String(value)
    .trim()
    .replace(/[<>\"']/g, '');
}

// ============================================
// DATA HANDLERS
// ============================================
function getRegistrazioni() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const registrazioni = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      if (SAFE_FIELDS.includes(key)) {
        obj[key] = row[index];
      }
    });
    registrazioni.push(obj);
  }

  return successResponse(registrazioni);
}

function acceptUser(userId, camera, tipologia_stanza) {
  const result = findAndUpdateRow(userId, (sheet, rowIndex, headers) => {
    const statoIndex = headers.indexOf('stato');
    const cameraIndex = headers.indexOf('camera');
    const tipoIndex = headers.indexOf('tipologia_stanza');
    const dataIndex = headers.indexOf('data_approvazione');

    sheet.getRange(rowIndex + 1, statoIndex + 1).setValue('Accettato');
    if (camera) sheet.getRange(rowIndex + 1, cameraIndex + 1).setValue(sanitizeInput(camera));
    if (tipologia_stanza) sheet.getRange(rowIndex + 1, tipoIndex + 1).setValue(sanitizeInput(tipologia_stanza));
    sheet.getRange(rowIndex + 1, dataIndex + 1).setValue(new Date().toLocaleDateString('it-IT'));
  });

  if (result.success) {
    return successResponse({camera: camera || null});
  }
  return errorResponse(result.error, 404);
}

function rejectUser(userId) {
  const result = findAndUpdateRow(userId, (sheet, rowIndex, headers) => {
    const statoIndex = headers.indexOf('stato');
    sheet.getRange(rowIndex + 1, statoIndex + 1).setValue('Rifiutato');
  });

  if (result.success) {
    return successResponse(null);
  }
  return errorResponse(result.error, 404);
}

function editUser(params) {
  const userId = params.id;
  const result = findAndUpdateRow(userId, (sheet, rowIndex, headers) => {
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      if (params[key] && key !== 'id') {
        sheet.getRange(rowIndex + 1, index + 1).setValue(sanitizeInput(params[key]));
      }
    });
  });

  if (result.success) {
    return successResponse(null);
  }
  return errorResponse(result.error, 404);
}

function deleteUser(userId) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === userId) {
      sheet.deleteRow(i + 1);
      logAudit('DELETE', userId);
      return successResponse(null);
    }
  }
  return errorResponse('Utente non trovato', 404);
}

function assignRoom(userId, camera, tipologia_stanza) {
  const result = findAndUpdateRow(userId, (sheet, rowIndex, headers) => {
    const cameraIndex = headers.indexOf('camera');
    const tipoIndex = headers.indexOf('tipologia_stanza');

    sheet.getRange(rowIndex + 1, cameraIndex + 1).setValue(sanitizeInput(camera));
    sheet.getRange(rowIndex + 1, tipoIndex + 1).setValue(sanitizeInput(tipologia_stanza));
  });

  if (result.success) {
    logAudit('ASSIGN_ROOM', userId, {camera, tipologia_stanza});
    return successResponse(null);
  }
  return errorResponse(result.error, 404);
}

function changeRoom(userId, camera) {
  const result = findAndUpdateRow(userId, (sheet, rowIndex, headers) => {
    const cameraIndex = headers.indexOf('camera');
    sheet.getRange(rowIndex + 1, cameraIndex + 1).setValue(sanitizeInput(camera));
  });

  if (result.success) {
    logAudit('CHANGE_ROOM', userId, {camera});
    return successResponse(null);
  }
  return errorResponse(result.error, 404);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function findAndUpdateRow(userId, callback) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === userId) {
      try {
        callback(sheet, i, headers);
        logAudit('UPDATE', userId);
        return {success: true};
      } catch (err) {
        return {success: false, error: err.toString()};
      }
    }
  }
  return {success: false, error: 'Utente non trovato'};
}

function successResponse(data) {
  return ContentService.createTextOutput(
    JSON.stringify({success: true, data: data})
  ).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, status) {
  return ContentService.createTextOutput(
    JSON.stringify({success: false, error: message, status: status})
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// LOGGING & AUDIT
// ============================================
function logAudit(action, userId, details) {
  try {
    const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Audit');
    if (auditSheet) {
      auditSheet.appendRow([
        new Date().toISOString(),
        action,
        userId,
        JSON.stringify(details || {})
      ]);
    }
  } catch (err) {
    console.warn('Audit logging failed:', err);
  }
}

function logError(context, err) {
  console.error(`[${context}] ${err.toString()}`);
}

// ============================================
// SETUP & UTILITIES
// ============================================
function setupAuthToken() {
  const token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', token);
  Logger.log('✅ AUTH_TOKEN set to: ' + token);
  Logger.log('📋 Copy this token to config.js: window.ADMIN_CONFIG.AUTH_TOKEN = "' + token + '"');
}

function getAuthToken() {
  const token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  Logger.log('Current AUTH_TOKEN: ' + (token || 'NOT SET'));
}

function listHeaders() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const headers = sheet.getDataRange().getValues()[0];
  Logger.log('Headers del foglio:');
  headers.forEach((h, i) => Logger.log(`[${i}] ${h}`));
}

// ============================================
// TEST DATA GENERATION
// ============================================
function insertTestData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const testData = generateTestRegistrations(15);

  testData.forEach((row) => {
    sheet.appendRow(row);
  });

  Logger.log(`✅ Aggiunti ${testData.length} registrazioni di test`);
}

function generateTestRegistrations(count) {
  const nomiLeader = ['Marco', 'Giovanni', 'Andrea', 'Paolo', 'Federico', 'Luca', 'Matteo', 'Riccardo'];
  const nomiFollower = ['Sofia', 'Giulia', 'Elena', 'Francesca', 'Valentina', 'Chiara', 'Alessia', 'Martina'];
  const cognomi = ['Rossi', 'Bianchi', 'Verdi', 'Ferrari', 'Conti', 'Martinelli', 'Gallo', 'Costa', 'Gatti'];
  const citta = ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Palermo', 'Genova'];
  const pacchetti = ['Full Pass 4 giorni - €200', 'Weekend 2 giorni - €100'];
  const tipologie = ['Singola', 'Doppia', 'Tripla', 'Suite'];
  const stati = ['In attesa', 'Accettato', 'Rifiutato'];

  const testData = [];

  for (let i = 0; i < count; i++) {
    const isLeader = Math.random() > 0.5;
    const nome = isLeader
      ? nomiLeader[Math.floor(Math.random() * nomiLeader.length)]
      : nomiFollower[Math.floor(Math.random() * nomiFollower.length)];
    const cognome = cognomi[Math.floor(Math.random() * cognomi.length)];
    const ruolo = isLeader ? 'Leader' : 'Follower';
    const stato = stati[Math.floor(Math.random() * stati.length)];
    const pacchetto = pacchetti[Math.floor(Math.random() * pacchetti.length)];
    const tipologia = tipologie[Math.floor(Math.random() * tipologie.length)];
    const camera = stato === 'Accettato' ? String(100 + i) : '';
    const email = `${nome.toLowerCase()}.${cognome.toLowerCase()}@test.com`;
    const tel = `+39 3${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}`;
    const citta_val = citta[Math.floor(Math.random() * citta.length)];
    const data_app = stato === 'Accettato' ? new Date().toLocaleDateString('it-IT') : '';

    const id = `TEST_${Date.now()}_${i}`;

    testData.push([
      id,
      nome,
      cognome,
      ruolo,
      pacchetto,
      tipologia,
      camera,
      stato,
      email,
      tel,
      citta_val,
      data_app
    ]);
  }

  return testData;
}

function clearTestData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');

  for (let i = data.length - 1; i > 0; i--) {
    if (String(data[i][idIndex]).startsWith('TEST_')) {
      sheet.deleteRow(i + 1);
    }
  }

  Logger.log('✅ Dati di test eliminati');
}

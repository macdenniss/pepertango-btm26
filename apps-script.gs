const SPREADSHEET_ID = '10NWb995E6n2gRaXCQlb0BfikglQaOSNv3lnGlcfGhoA';
const SHEET_NAME = 'Iscritti';

function doGet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    const result = [];
    for (let i = 1; i < data.length; i++) {
      result.push({
        id: data[i][0] || '',
        nome: data[i][2] || '',
        cognome: data[i][3] || '',
        email: data[i][4] || '',
        ruolo: data[i][7] || '',
        pacchetto: data[i][8] || '',
        tipologia_stanza: data[i][11] || '',
        stato: data[i][16] || '',
        camera: data[i][17] || ''
      });
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const action = e.parameter.action;

    if (action === 'accept') {
      return acceptUser(e.parameter.id);
    }

    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Action not found'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function acceptUser(userId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    // Find user row
    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][0] || '').toString() === userId.toString()) {
        rowIdx = i;
        break;
      }
    }

    if (rowIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({success: false, message: 'Utente non trovato'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Update stato to Accettato
    sheet.getRange(rowIdx + 1, 17).setValue('Accettato');

    // Assign room
    const tipologia = data[rowIdx][11] || '';
    const nextCamera = getNextAvailableRoom(tipologia, data);

    if (nextCamera) {
      sheet.getRange(rowIdx + 1, 18).setValue(nextCamera);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Accettato',
      camera: nextCamera || 'Non assegnata'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getNextAvailableRoom(tipologia, data) {
  // Simple: find next room number for this type
  const prefix = tipologia === 'Doppia' ? '2' : tipologia === 'Matrimoniale' ? '3' : '4';
  const maxCapacity = tipologia === 'Tripla' ? 3 : 2;

  const occupied = {};
  for (let i = 1; i < data.length; i++) {
    const room = data[i][17];
    if (room) occupied[room] = (occupied[room] || 0) + 1;
  }

  let nextRoom = parseInt(prefix + '01');
  while (occupied[nextRoom] && occupied[nextRoom] >= maxCapacity) {
    nextRoom++;
  }

  return nextRoom;
}

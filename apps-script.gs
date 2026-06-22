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

function addTestData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  const testData = [
    ['id1', new Date(), 'Marco', 'Rossi', 'marco@email.com', '3201234567', 'Roma', 'Leader', 'Full Pass 4 giorni — €200', '', '', 'Doppia', '', 'marco_fb', '1990-05-15', 'Test 1', 'Accettato', 201, 'Saldato'],
    ['id2', new Date(), 'Alessia', 'Bianchi', 'alessia@email.com', '3209876543', 'Milano', 'Follower', 'Full Pass 4 giorni — €200', '', '', 'Doppia', 'Marco Rossi', 'alessia_fb', '1992-08-22', 'Test 2', 'Accettato', 201, 'Saldato'],
    ['id3', new Date(), 'Luca', 'Verdi', 'luca@email.com', '3215551234', 'Firenze', 'Leader', 'Weekend 2 giorni — €100', '', '', 'Matrimoniale', '', 'luca_fb', '1988-03-10', 'Test 3', 'Accettato', 301, 'Saldato'],
    ['id4', new Date(), 'Sofia', 'Neri', 'sofia@email.com', '3218889999', 'Bologna', 'Follower', 'Weekend 2 giorni — €100', '', '', 'Matrimoniale', 'Luca Verdi', 'sofia_fb', '1995-12-05', 'Test 4', 'Accettato', 301, 'Anticipo versato'],
    ['id5', new Date(), 'Giovanni', 'Galli', 'giovanni@email.com', '3224445678', 'Torino', 'Leader', 'Full Pass 4 giorni — €200', '', '', 'Tripla', '', 'giovanni_fb', '1985-07-30', 'Test 5', 'Accettato', 401, 'Saldato'],
    ['id6', new Date(), 'Francesca', 'Moretti', 'francesca@email.com', '3235556789', 'Napoli', 'Follower', 'Full Pass 4 giorni — €200', '', '', 'Tripla', 'Giovanni Galli', 'francesca_fb', '1993-11-18', 'Test 6', 'Accettato', 401, 'Saldato'],
    ['id7', new Date(), 'Andrea', 'Ferretti', 'andrea@email.com', '3246667890', 'Genova', 'Leader', 'Weekend 2 giorni — €100', '', '', 'Singola', '', 'andrea_fb', '1989-02-14', 'Test 7', 'Accettato', 101, 'Non pagato'],
    ['id8', new Date(), 'Beatrice', 'Lombardi', 'beatrice@email.com', '3257778901', 'Padova', 'Follower', 'Full Pass 4 giorni — €200', '', '', 'Tripla', 'Giovanni Galli', 'beatrice_fb', '1994-09-25', 'Test 8', 'In attesa', '', ''],
    ['id9', new Date(), 'Matteo', 'Rizzo', 'matteo@email.com', '3268889012', 'Venezia', 'Leader', 'Full Pass 4 giorni — €200', '', '', 'Doppia', '', 'matteo_fb', '1987-04-08', 'Test 9', 'In attesa', '', ''],
    ['id10', new Date(), 'Giulia', 'Conti', 'giulia@email.com', '3279990123', 'Bologna', 'Follower', 'Weekend 2 giorni — €100', '', '', 'Matrimoniale', '', 'giulia_fb', '1996-06-17', 'Test 10', 'In attesa', '', ''],
  ];

  for (const row of testData) {
    sheet.appendRow(row);
  }

  return 'Aggiunti 10 test data';
}

function clearTestData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19);
  range.clearContent();
  return 'Dati cancellati';
}

// ============================================================
// PEPERTANGO - Apps Script Backend (Multi-evento)
// Versione 4 - aggiornata 2026-06-16
// Supporta: Maratona Tango Piccante 2027 (MTP27) + Brutia Tango Festival
//
// MTP27 Sheet:   https://docs.google.com/spreadsheets/d/1kBWs15V94ypf4Mdp7qM5x4vsyiadP1W87Xt7BZuORik
// Brutia Sheet:  [PLACEHOLDER - inserisci ID dopo aver creato il foglio]
// Deploy URL:    https://script.google.com/macros/s/AKfycbx5lnoBRqshl1YVly5MyjSC3nJUp5sRlo8Wy7QGv8vy34J9XmdPZk2vIDSd_cX2ka17/exec
//
// Per aggiungere il foglio Brutia:
// 1. Crea un nuovo Google Sheet per Brutia
// 2. Copia l'ID dalla URL (la parte tra /d/ e /edit)
// 3. Incollalo in BRUTIA.SHEET_ID qui sotto
// 4. Rideploya lo script (Deploy -> Manage deployments -> Edit -> versione nuova)
// ============================================================


// -- CONFIGURAZIONE MARATONA TANGO PICCANTE 2027 -------------
var CONFIG = {
  SHEET_ID:       '1kBWs15V94ypf4Mdp7qM5x4vsyiadP1W87Xt7BZuORik',
  SHEET_ISCRITTI: 'Iscritti',
  SHEET_LOG:      'Log',
  EMAIL_DANILO:   'pepertango@gmail.com',
  DATA_SALDO:     '2027-05-21',
  MAX_POSTI:      120,
  NOME_EVENTO:    'Maratona Tango Piccante 2027',

  PACCHETTI: {
    'Cala Jannita':     { notti:4, prezzo:300, anticipo:150, saldo:150, link_anticipo:'https://pay.sumup.com/b2c/X69NARB9VH', link_saldo:'' },
    'Fiumicello':       { notti:3, prezzo:225, anticipo:150, saldo:75,  link_anticipo:'https://pay.sumup.com/b2c/X65KQ4I2Y5', link_saldo:'' },
    'Spiaggia Nera':    { notti:3, prezzo:225, anticipo:150, saldo:75,  link_anticipo:'https://pay.sumup.com/b2c/X65KQ4I2Y5', link_saldo:'' },
    'Porto di Maratea': { notti:2, prezzo:150, anticipo:150, saldo:0,   link_anticipo:'https://pay.sumup.com/b2c/XRT5D7EGHQ', link_saldo:'' }
  },

  SOGLIE:              { DELUXE: 50, STANDARD: 90, ECONOMY: 120 },
  PRIORITA_PACCHETTI:  ['Cala Jannita', 'Fiumicello', 'Spiaggia Nera', 'Porto di Maratea'],
  PREFISSO_CAMERA:     { Deluxe: 'DEL', Standard: 'STD', Economy: 'ECO' }
};

// -- CONFIGURAZIONE BRUTIA TANGO FESTIVAL --------------------
// SEGNAPOSTO: compila questi dati quando hai le informazioni definitive,
// poi rideploya lo script.
var BRUTIA = {
  SHEET_ID:       'PLACEHOLDER_INSERISCI_ID_SHEET_BRUTIA',
  SHEET_ISCRITTI: 'Iscritti',
  SHEET_LOG:      'Log',
  EMAIL_DANILO:   'pepertango@gmail.com',
  DATA_SALDO:     '2027-01-01',   // PLACEHOLDER - data invio email saldo
  MAX_POSTI:      80,             // PLACEHOLDER - posti disponibili
  NOME_EVENTO:    'Brutia Tango Festival',

  PACCHETTI: {
    'Pacchetto A': { notti:3, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' },  // PLACEHOLDER
    'Pacchetto B': { notti:2, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' },  // PLACEHOLDER
    'Pacchetto C': { notti:1, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' }   // PLACEHOLDER
  },

  SOGLIE:             { DELUXE: 30, STANDARD: 60, ECONOMY: 80 },  // PLACEHOLDER
  PRIORITA_PACCHETTI: ['Pacchetto A', 'Pacchetto B', 'Pacchetto C'],
  PREFISSO_CAMERA:    { Deluxe: 'DEL', Standard: 'STD', Economy: 'ECO' }
};

// -- HELPER: restituisce la config giusta in base all'evento --
// Usato internamente da tutte le funzioni che devono sapere
// a quale evento/foglio si riferisce l'operazione.
function getConfig(evento) {
  return (evento === 'Brutia') ? BRUTIA : CONFIG;
}

function getSpreadsheet(evento) {
  var cfg = getConfig(evento);
  if (!cfg.SHEET_ID || cfg.SHEET_ID.indexOf('PLACEHOLDER') !== -1) {
    throw new Error('Sheet ID per "' + (evento || 'MTP27') + '" non configurato. Inserisci l\'ID in BRUTIA.SHEET_ID.');
  }
  return SpreadsheetApp.openById(cfg.SHEET_ID);
}


// -- COLONNE FOGLIO ISCRITTI (1-based) -----------------------
// Le colonne 22 e 23 sono NUOVE in v3, aggiunte in fondo senza spostare le altre.
var COL = {
  ID:                      1,   // A
  DATA_ISCR:               2,   // B
  NOME:                    3,   // C
  EMAIL:                   4,   // D
  TEL:                     5,   // E
  CITTA:                   6,   // F
  PAESE:                   7,   // G
  RUOLO:                   8,   // H
  PACCHETTO:               9,   // I
  COMPAGNO_BALLO:          10,  // J
  COMPAGNO_LEGACY:         11,  // K - campo vecchio, non usato nelle nuove iscrizioni
  NOTE:                    12,  // L
  STATO:                   13,  // M
  PAGAMENTO:               14,  // N
  CAMERA:                  15,  // O
  TIPO_CAMERA:             16,  // P
  EMAIL_CONF:              17,  // Q
  EMAIL_ANTICIPO:          18,  // R
  EMAIL_SALDO:             19,  // S
  NUM_PROGR:               20,  // T
  PRIORITA:                21,  // U
  TIPOLOGIA_STANZA:        22,  // V - NUOVO: Singola/Doppia/Tripla/Quadrupla
  COMPAGNI_STANZA:         23   // W - NUOVO: nomi compagni separati da virgola
};

var TOT_COLONNE = 23;


// -- ENTRY POINT HTTP ----------------------------------------

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';
    var evento = params.evento || 'MTP27';

    // Azione di test/health-check
    if (!action || action === 'ping') {
      return jsonResponse({ ok: true, msg: 'PeperTango API v3 attiva', evento: evento });
    }

    switch (action) {

      // Dati iscritti (usato da entrambe le dashboard - tab Iscritti)
      case 'getIscritti':
        return getIscritti(evento);

      // Statistiche rapide (usato da Overview)
      case 'getStats':
        return getStats(evento);

      // Aggiorna lo stato di un iscritto (Accettato / In attesa / Rifiutato)
      // Richiede: id, stato
      case 'aggiornaStato':
        if (!params.id || !params.stato) {
          return jsonResponse({ ok: false, error: 'Parametri mancanti: id e stato sono obbligatori.' });
        }
        return aggiornaStato(params.id, params.stato, evento);

      // Aggiorna lo stato del pagamento di un iscritto
      // Richiede: id, pagamento
      case 'aggiornaPagamento':
        if (!params.id || !params.pagamento) {
          return jsonResponse({ ok: false, error: 'Parametri mancanti: id e pagamento sono obbligatori.' });
        }
        return aggiornaPagamento(params.id, params.pagamento, evento);

      // Assegna o modifica la camera manualmente dalla dashboard
      // Richiede: id, camera, tipo_camera
      case 'assegnaCameraManuale':
        if (!params.id) {
          return jsonResponse({ ok: false, error: 'Parametro mancante: id obbligatorio.' });
        }
        return assegnaCameraManuale(params.id, params.camera || '', params.tipo_camera || '', evento);

      // Elimina un iscritto dal foglio
      // Richiede: id
      case 'eliminaIscrizione':
        if (!params.id) {
          return jsonResponse({ ok: false, error: 'Parametro mancante: id obbligatorio.' });
        }
        return eliminaIscrizione(params.id, evento);

      default:
        return jsonResponse({ ok: false, error: 'Azione GET non riconosciuta: ' + action });
    }

  } catch (err) {
    logErrore('doGet', err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var data;

    if (e.postData && e.postData.contents && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err) { data = e.parameter || {}; }
    } else {
      data = {};
    }

    var action = data.action || 'nuova_iscrizione';

    // L'evento e' sempre incluso nel payload (MTP27 = default)
    var evento = data.evento || 'MTP27';

    switch (action) {
      case 'nuova_iscrizione':   return gestisciNuovaIscrizione(data, evento);
      case 'aggiorna_stato':     return aggiornaStato(data.id, data.stato, evento);
      case 'aggiorna_pagamento': return aggiornaPagamento(data.id, data.pagamento, evento);
      case 'assegna_camera':     return assegnaCameraManuale(data.id, data.camera, data.tipo_camera, evento);
      case 'get_iscritti':       return getIscritti(evento);
      case 'get_stats':          return getStats(evento);
      case 'elimina':            return eliminaIscrizione(data.id, evento);
      default:
        return jsonResponse({ ok: false, error: 'Azione non riconosciuta: ' + action });
    }

  } catch (err) {
    logErrore('doPost', err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}


// -- NUOVA ISCRIZIONE ----------------------------------------
function gestisciNuovaIscrizione(data, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);

  if (sheet.getLastRow() === 0) {
    inizializzaIntestazioni(sheet);
  }

  var tutti = getDatiIscritti(sheet);

  // Controlla duplicati email
  var duplicato = tutti.filter(function(r) {
    return r.email && r.email.toLowerCase() === (data.email || '').toLowerCase();
  });
  if (duplicato.length > 0) {
    return jsonResponse({ ok: false, error: 'Email gia registrata.' });
  }

  // Controlla posti disponibili
  var iscritti_attivi = tutti.filter(function(r) { return r.stato !== 'Rifiutato'; }).length;
  if (iscritti_attivi >= cfg.MAX_POSTI) {
    return jsonResponse({ ok: false, error: 'Spiacenti, i posti sono esauriti.' });
  }

  var num_progr = iscritti_attivi + 1;
  var pkg       = cfg.PACCHETTI[data.pacchetto] || {};
  var priorita  = cfg.PRIORITA_PACCHETTI.indexOf(data.pacchetto) + 1 || 99;

  // Normalizza compagni di stanza in stringa CSV
  var compagni_stanza = '';
  if (Array.isArray(data.compagni_stanza)) {
    compagni_stanza = data.compagni_stanza.filter(function(n) { return n && n.trim(); }).join(',');
  } else if (typeof data.compagni_stanza === 'string') {
    compagni_stanza = data.compagni_stanza.trim();
  }

  var id = new Date().getTime().toString();

  sheet.appendRow([
    id,                                 // A - ID
    new Date().toLocaleString('it-IT'), // B - Data
    data.nome           || '',          // C
    data.email          || '',          // D
    data.tel            || '',          // E
    data.citta          || '',          // F
    data.paese          || '',          // G
    data.ruolo          || '',          // H
    data.pacchetto      || '',          // I
    data.compagno_ballo || '',          // J
    '',                                 // K - legacy
    data.note           || '',          // L
    'In attesa',                        // M - Stato
    'Non pagato',                       // N - Pagamento
    '',                                 // O - Camera
    '',                                 // P - Tipo Camera
    false,                              // Q
    false,                              // R
    false,                              // S
    num_progr,                          // T
    priorita,                           // U
    data.tipologia_stanza || '',        // V - NUOVO
    compagni_stanza                     // W - NUOVO
  ]);

  inviaEmailConfermaRicezione(data, num_progr, pkg, cfg.NOME_EVENTO);
  inviaNotificaDanilo(data, num_progr, id, cfg.NOME_EVENTO, cfg.EMAIL_DANILO);

  log('NUOVA_ISCRIZIONE', '[' + evento + '] ' + data.nome + ' (' + data.email + ') - ' + data.pacchetto + ' - #' + num_progr + ' - stanza: ' + (data.tipologia_stanza || '?'));

  return jsonResponse({ ok: true, msg: 'Iscrizione ricevuta!', id: id, num_progr: num_progr, evento: evento });
}


// -- AGGIORNA STATO ------------------------------------------
function aggiornaStato(id, nuovoStato, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var riga  = trovaRigaPerId(sheet, id);

  if (!riga) return jsonResponse({ ok: false, error: 'Iscritto non trovato.' });

  var dati = rigaToOggetto(sheet.getRange(riga, 1, 1, TOT_COLONNE).getValues()[0]);

  sheet.getRange(riga, COL.STATO).setValue(nuovoStato);

  // Se accettato e non ancora inviata l'email anticipo -> invia
  if (nuovoStato === 'Accettato' && !dati.email_anticipo) {
    inviaEmailAccettazione(dati);
    sheet.getRange(riga, COL.EMAIL_ANTICIPO).setValue(true);
  }

  log('AGGIORNA_STATO', 'ID ' + id + ' -> ' + nuovoStato);
  return jsonResponse({ ok: true, msg: 'Stato aggiornato: ' + nuovoStato });
}


// -- AGGIORNA PAGAMENTO --------------------------------------
function aggiornaPagamento(id, nuovoPagamento, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var riga  = trovaRigaPerId(sheet, id);

  if (!riga) return jsonResponse({ ok: false, error: 'Iscritto non trovato.' });

  sheet.getRange(riga, COL.PAGAMENTO).setValue(nuovoPagamento);

  if (nuovoPagamento === 'Anticipo versato') {
    SpreadsheetApp.flush();
    tentaAssegnazioneCameraPerIscritto(sheet, id);
  }

  log('AGGIORNA_PAGAMENTO', 'ID ' + id + ' -> ' + nuovoPagamento);
  return jsonResponse({ ok: true, msg: 'Pagamento aggiornato: ' + nuovoPagamento });
}


// -- ASSEGNA CAMERA MANUALE (da dashboard) -------------------
function assegnaCameraManuale(id, camera, tipoCamera, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var riga  = trovaRigaPerId(sheet, id);

  if (!riga) return jsonResponse({ ok: false, error: 'Iscritto non trovato.' });

  sheet.getRange(riga, COL.CAMERA).setValue(camera || '');
  sheet.getRange(riga, COL.TIPO_CAMERA).setValue(tipoCamera || '');

  log('ASSEGNA_CAMERA_MANUALE', 'ID ' + id + ' -> ' + camera + ' (' + tipoCamera + ')');
  return jsonResponse({ ok: true, msg: 'Camera assegnata: ' + camera });
}


// -- LOGICA ASSEGNAZIONE CAMERA ------------------------------

// Determina la categoria (Deluxe/Standard/Economy) dal numero progressivo
function calcolaCategoriaCamera(num_progr) {
  if (num_progr <= CONFIG.SOGLIE.DELUXE)   return 'Deluxe';
  if (num_progr <= CONFIG.SOGLIE.STANDARD) return 'Standard';
  return 'Economy';
}

// Formatta il numero camera: DEL-001, STD-001, ECO-001
function formatNumeroCamera(tipo, numero) {
  var prefisso = CONFIG.PREFISSO_CAMERA[tipo] || tipo.substring(0, 3).toUpperCase();
  var num = numero.toString();
  while (num.length < 3) num = '0' + num;
  return prefisso + '-' + num;
}

// Trova il prossimo numero progressivo disponibile per una categoria
function prossimoNumeroCamera(tutti, tipo) {
  var numeriUsati = tutti
    .filter(function(r) { return r.tipo_camera === tipo && r.camera; })
    .map(function(r) {
      var match = r.camera.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
  return numeriUsati.length > 0 ? Math.max.apply(null, numeriUsati) + 1 : 1;
}

// Se un compagno ha gia' una camera assegnata, usa quella; altrimenti crea numero nuovo
function trovaOCreaNumeroCamera(tutti, tipo, nomiCompagni) {
  for (var i = 0; i < nomiCompagni.length; i++) {
    var nome = nomiCompagni[i];
    var trovato = null;
    for (var j = 0; j < tutti.length; j++) {
      if (tutti[j].nome.toLowerCase().trim() === nome.toLowerCase().trim() && tutti[j].camera) {
        trovato = tutti[j];
        break;
      }
    }
    if (trovato) {
      log('CAMERA_CONDIVISA', 'Trovata camera esistente ' + trovato.camera + ' per compagno "' + nome + '"');
      return trovato.camera;
    }
  }
  return formatNumeroCamera(tipo, prossimoNumeroCamera(tutti, tipo));
}

// Verifica che tutti i compagni dichiarati abbiano pagato l'anticipo
function verificaCompagni(tutti, iscritto) {
  var avvisi = [];
  var nomiCompagni = (iscritto.compagni_stanza || '')
    .split(',')
    .map(function(n) { return n.trim(); })
    .filter(function(n) { return n.length > 0; });

  if (nomiCompagni.length === 0) return { pronti: true, avvisi: [], nomi: [] };

  for (var i = 0; i < nomiCompagni.length; i++) {
    var nome = nomiCompagni[i];
    var compagno = null;
    for (var j = 0; j < tutti.length; j++) {
      if (tutti[j].nome.toLowerCase().trim() === nome.toLowerCase().trim()) {
        compagno = tutti[j];
        break;
      }
    }

    if (!compagno) {
      avvisi.push('Compagno "' + nome + '" non trovato nel foglio.');
      return { pronti: false, avvisi: avvisi, nomi: nomiCompagni };
    }

    // Avviso pacchetti diversi (non blocca, solo segnala)
    if (compagno.pacchetto !== iscritto.pacchetto) {
      avvisi.push('Pacchetto diverso: "' + iscritto.nome + '" ha "' + iscritto.pacchetto + '", "' + nome + '" ha "' + compagno.pacchetto + '".');
    }

    // Compagno non ha ancora pagato
    if (compagno.pagamento !== 'Anticipo versato' && compagno.pagamento !== 'Saldato') {
      return { pronti: false, avvisi: avvisi, nomi: nomiCompagni };
    }
  }

  return { pronti: true, avvisi: avvisi, nomi: nomiCompagni };
}

// Tenta assegnazione camera per un singolo iscritto
// - Singola: assegna subito
// - Doppia/Tripla/Quadrupla: aspetta che tutti i compagni abbiano pagato
function tentaAssegnazioneCameraPerIscritto(sheet, id) {
  var riga = trovaRigaPerId(sheet, id);
  if (!riga) return;

  var dati = rigaToOggetto(sheet.getRange(riga, 1, 1, TOT_COLONNE).getValues()[0]);
  if (dati.camera) return; // gia' assegnata

  var tutti    = getDatiIscritti(sheet);
  var tipo     = calcolaCategoriaCamera(dati.num_progr);
  var tipologia = dati.tipologia_stanza || 'Singola';

  if (tipologia === 'Singola') {
    // Camera singola: assegna subito
    var numCamera = formatNumeroCamera(tipo, prossimoNumeroCamera(tutti, tipo));
    sheet.getRange(riga, COL.CAMERA).setValue(numCamera);
    sheet.getRange(riga, COL.TIPO_CAMERA).setValue(tipo);
    log('CAMERA_SINGOLA', dati.nome + ' -> ' + numCamera + ' (assegnata subito)');

  } else {
    // Camera condivisa: verifica compagni
    var verifica = verificaCompagni(tutti, dati);

    if (verifica.avvisi.length > 0) {
      for (var i = 0; i < verifica.avvisi.length; i++) {
        log('AVVISO_COMPAGNI', verifica.avvisi[i]);
      }
    }

    if (!verifica.pronti) {
      log('CAMERA_IN_ATTESA', dati.nome + ' - in attesa dei compagni (' + tipologia + ')');
      return;
    }

    // Tutti pronti: assegna camera
    var numCameraGruppo = trovaOCreaNumeroCamera(tutti, tipo, verifica.nomi);

    // Assegna all'iscritto principale
    sheet.getRange(riga, COL.CAMERA).setValue(numCameraGruppo);
    sheet.getRange(riga, COL.TIPO_CAMERA).setValue(tipo);
    log('CAMERA_GRUPPO', dati.nome + ' -> ' + numCameraGruppo + ' (' + tipologia + ')');

    // Assegna la stessa camera ai compagni che non l'hanno ancora
    for (var k = 0; k < verifica.nomi.length; k++) {
      var nomeCompagno = verifica.nomi[k];
      var compagno = null;
      for (var m = 0; m < tutti.length; m++) {
        if (tutti[m].nome.toLowerCase().trim() === nomeCompagno.toLowerCase().trim()) {
          compagno = tutti[m];
          break;
        }
      }
      if (compagno && !compagno.camera) {
        var rigaCompagno = trovaRigaPerId(sheet, compagno.id);
        if (rigaCompagno) {
          var tipoCompagno = calcolaCategoriaCamera(compagno.num_progr);
          sheet.getRange(rigaCompagno, COL.CAMERA).setValue(numCameraGruppo);
          sheet.getRange(rigaCompagno, COL.TIPO_CAMERA).setValue(tipoCompagno);
          log('CAMERA_GRUPPO', compagno.nome + ' -> ' + numCameraGruppo + ' (assegnata con il gruppo)');
        }
      }
    }
  }
}

// Assegnazione batch notturna (trigger 2am)
function assegnaCamereAuto() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_ISCRITTI);
  var tutti = getDatiIscritti(sheet);

  var candidati = tutti.filter(function(r) {
    return r.stato === 'Accettato' && r.pagamento === 'Anticipo versato' && !r.camera;
  });

  candidati.sort(function(a, b) {
    if (a.priorita !== b.priorita) return a.priorita - b.priorita;
    return a.num_progr - b.num_progr;
  });

  var assegnate = 0;
  for (var i = 0; i < candidati.length; i++) {
    var r = candidati[i];
    var rigaAttuale = trovaRigaPerId(sheet, r.id);
    if (!rigaAttuale) continue;
    var datiAttuali = rigaToOggetto(sheet.getRange(rigaAttuale, 1, 1, TOT_COLONNE).getValues()[0]);
    if (datiAttuali.camera) continue; // gia' assegnata nel frattempo

    tentaAssegnazioneCameraPerIscritto(sheet, r.id);
    assegnate++;
  }

  log('ASSEGNA_CAMERE_AUTO', 'Elaborati ' + candidati.length + ' candidati, assegnate fino a ' + assegnate + ' camere.');
}


// -- TRIGGER ON MODIFICA FOGLIO ------------------------------
// Viene chiamato ogni volta che qualcuno modifica manualmente il Google Sheet.
// Controlla se e' stata modificata la colonna Pagamento (N=14) e
// se il nuovo valore e' "Anticipo versato", tenta l'assegnazione camera.
function onModificaFoglio(e) {
  try {
    var sheet   = e.source.getActiveSheet();
    if (sheet.getName() !== CONFIG.SHEET_ISCRITTI) return;

    var riga    = e.range.getRow();
    var colonna = e.range.getColumn();
    var valore  = e.value;

    if (riga < 2) return; // riga 1 = intestazioni

    if (colonna !== COL.PAGAMENTO) return;

    if (valore === 'Anticipo versato') {
      var id = sheet.getRange(riga, COL.ID).getValue().toString();
      if (!id) return;
      log('ON_MODIFICA_FOGLIO', 'Pagamento "Anticipo versato" rilevato per riga ' + riga + ' - ID: ' + id);
      tentaAssegnazioneCameraPerIscritto(sheet, id);
    }

  } catch (err) {
    logErrore('onModificaFoglio', err.toString());
  }
}


// -- GET ISCRITTI --------------------------------------------
function getIscritti(evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var dati  = getDatiIscritti(sheet);
  return jsonResponse({ ok: true, data: dati, evento: evento });
}


// -- GET STATS -----------------------------------------------
function getStats(evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var tutti = getDatiIscritti(sheet);

  var stats = {
    totale:      tutti.length,
    in_attesa:   tutti.filter(function(r) { return r.stato === 'In attesa'; }).length,
    accettati:   tutti.filter(function(r) { return r.stato === 'Accettato'; }).length,
    rifiutati:   tutti.filter(function(r) { return r.stato === 'Rifiutato'; }).length,
    non_pagato:  tutti.filter(function(r) { return r.pagamento === 'Non pagato'; }).length,
    anticipo:    tutti.filter(function(r) { return r.pagamento === 'Anticipo versato'; }).length,
    saldato:     tutti.filter(function(r) { return r.pagamento === 'Saldato'; }).length,
    con_camera:  tutti.filter(function(r) { return r.camera; }).length,
    senza_camera:tutti.filter(function(r) { return r.stato === 'Accettato' && r.pagamento === 'Anticipo versato' && !r.camera; }).length,

    incasso_anticipo: tutti
      .filter(function(r) { return r.pagamento !== 'Non pagato'; })
      .reduce(function(s, r) { return s + ((cfg.PACCHETTI[r.pacchetto] || {}).anticipo || 0); }, 0),

    incasso_totale_atteso: tutti
      .filter(function(r) { return r.stato === 'Accettato'; })
      .reduce(function(s, r) { return s + ((cfg.PACCHETTI[r.pacchetto] || {}).prezzo || 0); }, 0),

    per_categoria: {
      Deluxe:   { totale: tutti.filter(function(r) { return r.tipo_camera === 'Deluxe'; }).length },
      Standard: { totale: tutti.filter(function(r) { return r.tipo_camera === 'Standard'; }).length },
      Economy:  { totale: tutti.filter(function(r) { return r.tipo_camera === 'Economy'; }).length }
    },

    per_tipologia: {
      Singola:   tutti.filter(function(r) { return r.tipologia_stanza === 'Singola'; }).length,
      Doppia:    tutti.filter(function(r) { return r.tipologia_stanza === 'Doppia'; }).length,
      Tripla:    tutti.filter(function(r) { return r.tipologia_stanza === 'Tripla'; }).length,
      Quadrupla: tutti.filter(function(r) { return r.tipologia_stanza === 'Quadrupla'; }).length
    },

    per_pacchetto: {}
  };

  var pkgKeys = Object.keys(cfg.PACCHETTI);
  for (var i = 0; i < pkgKeys.length; i++) {
    var pkg = pkgKeys[i];
    var sub = tutti.filter(function(r) { return r.pacchetto === pkg; });
    stats.per_pacchetto[pkg] = {
      totale:    sub.length,
      accettati: sub.filter(function(r) { return r.stato === 'Accettato'; }).length,
      paganti:   sub.filter(function(r) { return r.pagamento !== 'Non pagato'; }).length,
      incasso:   sub.filter(function(r) { return r.pagamento !== 'Non pagato'; })
                    .reduce(function(s, r) { return s + ((cfg.PACCHETTI[pkg] || {}).anticipo || 0); }, 0)
    };
  }

  return jsonResponse({ ok: true, stats: stats });
}


// -- ELIMINA ISCRIZIONE --------------------------------------
function eliminaIscrizione(id, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var riga  = trovaRigaPerId(sheet, id);

  if (!riga) return jsonResponse({ ok: false, error: 'Iscritto non trovato.' });

  sheet.deleteRow(riga);
  log('ELIMINA', 'ID ' + id + ' eliminato');
  return jsonResponse({ ok: true, msg: 'Iscrizione eliminata.' });
}


// -- EMAIL: CONFERMA RICEZIONE --------------------------------
function inviaEmailConfermaRicezione(data, numProgr, pkg, nomeEvento) {
  var evento_label = nomeEvento || 'PeperTango';
  var soggetto = 'PeperTango - Abbiamo ricevuto la tua iscrizione a ' + evento_label + '!';
  var corpo =
    'Caro/a ' + data.nome + ',\n\n' +
    'Abbiamo ricevuto la tua richiesta di iscrizione a ' + evento_label + '!\n\n' +
    'RIEPILOGO ISCRIZIONE\n' +
    '------------------------------\n' +
    'Pacchetto:        ' + data.pacchetto + '\n' +
    'Prezzo totale:    EUR ' + (pkg.prezzo || '-') + ' a persona\n' +
    'Anticipo:         EUR ' + (pkg.anticipo || '-') + '\n' +
    'Ruolo:            ' + data.ruolo + '\n' +
    'Tipologia stanza: ' + (data.tipologia_stanza || '-') + '\n' +
    'Numero progr.:    #' + numProgr + '\n' +
    '------------------------------\n\n' +
    'La tua richiesta e\' ora "In attesa". Riceverai a breve una email con le istruzioni per il pagamento dell\'anticipo.\n\n' +
    'I posti sono limitati - controlla la tua casella nelle prossime 48 ore.\n\n' +
    'Grazie per aver scelto PeperTango!\n\n' +
    'PeperTango - Peper Bruzia ASD\n' +
    'www.pepertango.com';

  try {
    GmailApp.sendEmail(data.email, soggetto, corpo, { name: 'PeperTango' });
  } catch(e) {
    logErrore('inviaEmailConfermaRicezione', e.toString());
  }
}


// -- EMAIL: ACCETTAZIONE + LINK ANTICIPO ----------------------
function inviaEmailAccettazione(dati) {
  var pkg = CONFIG.PACCHETTI[dati.pacchetto] || {};
  var soggetto = 'PeperTango MTP27 - Iscrizione accettata!';
  var corpo =
    'Caro/a ' + dati.nome + ',\n\n' +
    'Ottima notizia! La tua iscrizione alla Maratona Tango Piccante 2027 e\' stata ACCETTATA!\n\n' +
    'Per confermare il tuo posto devi versare l\'anticipo di EUR ' + pkg.anticipo + ' entro 7 giorni:\n\n' +
    'PAGA L\'ANTICIPO: ' + (pkg.link_anticipo || '[link in arrivo]') + '\n\n' +
    '------------------------------\n' +
    'Pacchetto:     ' + dati.pacchetto + '\n' +
    'Anticipo:      EUR ' + pkg.anticipo + '\n' +
    'Saldo:         EUR ' + pkg.saldo + ' (entro il 21 maggio 2027)\n' +
    'Ruolo:         ' + dati.ruolo + '\n' +
    'Numero progr.: #' + dati.num_progr + '\n' +
    '------------------------------\n\n' +
    'IMPORTANTE: il tuo posto sara\' confermato SOLO dopo il pagamento dell\'anticipo.\n' +
    'Se non riceveremo il pagamento entro 7 giorni, il posto verra\' liberato.\n\n' +
    'Ci vediamo in pista!\n\n' +
    'PeperTango - Peper Bruzia ASD\n' +
    'www.pepertango.com';

  try {
    GmailApp.sendEmail(dati.email, soggetto, corpo, { name: 'PeperTango' });
  } catch(e) {
    logErrore('inviaEmailAccettazione', e.toString());
  }
}


// -- EMAIL: SALDO (trigger automatico dal 21/05/2027) ---------
function inviaEmailSaldoAutomatico() {
  var oggi       = new Date();
  var dataTarget = new Date(CONFIG.DATA_SALDO);
  if (oggi < dataTarget) return;

  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_ISCRITTI);
  var tutti = getDatiIscritti(sheet);

  var daContattare = tutti.filter(function(r) {
    return r.stato === 'Accettato' && r.pagamento === 'Anticipo versato' && !r.email_saldo;
  });

  for (var i = 0; i < daContattare.length; i++) {
    var dati = daContattare[i];
    var pkg  = CONFIG.PACCHETTI[dati.pacchetto] || {};
    if ((pkg.saldo || 0) <= 0) continue; // Porto di Maratea: nessun saldo

    var soggetto = 'PeperTango MTP27 - E\' ora di saldare il tuo posto!';
    var corpo =
      'Caro/a ' + dati.nome + ',\n\n' +
      'La Maratona Tango Piccante 2027 si avvicina! E\' arrivato il momento di versare il saldo.\n\n' +
      'PAGA IL SALDO: ' + (pkg.link_saldo || '[link disponibile a breve]') + '\n\n' +
      '------------------------------\n' +
      'Pacchetto:        ' + dati.pacchetto + '\n' +
      'Saldo da versare: EUR ' + pkg.saldo + '\n' +
      'Camera:           ' + (dati.camera || 'da comunicare') + '\n' +
      '------------------------------\n\n' +
      'Grazie e ci vediamo presto!\n\n' +
      'PeperTango - Peper Bruzia ASD';

    try {
      GmailApp.sendEmail(dati.email, soggetto, corpo, { name: 'PeperTango' });
      var riga = trovaRigaPerId(sheet, dati.id);
      if (riga) sheet.getRange(riga, COL.EMAIL_SALDO).setValue(true);
      log('EMAIL_SALDO', dati.nome + ' - ' + dati.email);
    } catch(e) {
      logErrore('inviaEmailSaldoAutomatico', e.toString());
    }
  }
}


// -- NOTIFICA A DANILO ----------------------------------------
function inviaNotificaDanilo(data, numProgr, id, nomeEvento, emailDanilo) {
  var tag     = nomeEvento ? '[' + nomeEvento + ']' : '[MTP27]';
  var dest    = emailDanilo || CONFIG.EMAIL_DANILO;
  var soggetto = tag + ' Nuova iscrizione #' + numProgr + ' - ' + data.nome;
  var corpo =
    'Nuova iscrizione ricevuta!\n\n' +
    'Nome:             ' + data.nome + '\n' +
    'Email:            ' + data.email + '\n' +
    'Tel:              ' + data.tel + '\n' +
    'Pacchetto:        ' + data.pacchetto + '\n' +
    'Ruolo:            ' + data.ruolo + '\n' +
    'Tipologia stanza: ' + (data.tipologia_stanza || '-') + '\n' +
    'Compagni stanza:  ' + (data.compagni_stanza || '-') + '\n' +
    'Compagno ballo:   ' + (data.compagno_ballo || '-') + '\n' +
    'Citta:            ' + data.citta + ', ' + data.paese + '\n' +
    'Note:             ' + (data.note || '-') + '\n' +
    'Progr.:           #' + numProgr + '\n' +
    'ID:               ' + id + '\n\n' +
    'Apri il Google Sheet:\n' +
    'https://docs.google.com/spreadsheets/d/1kBWs15V94ypf4Mdp7qM5x4vsyiadP1W87Xt7BZuORik/edit';

  try {
    GmailApp.sendEmail(dest, soggetto, corpo);
  } catch(e) {
    logErrore('inviaNotificaDanilo', e.toString());
  }
}


// -- TRIGGER SETUP -------------------------------------------
// Esegui questa funzione UNA VOLTA manualmente per creare i trigger.
// Apps Script -> seleziona "configuraTrigger" -> Esegui
function configuraTrigger() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  // Rimuovi tutti i trigger esistenti
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // Trigger 1: assegnazione camere ogni notte alle 2am
  ScriptApp.newTrigger('assegnaCamereAuto')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();

  // Trigger 2: email saldo ogni mattina alle 8am (attivo solo dal 21/05/2027)
  ScriptApp.newTrigger('inviaEmailSaldoAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // Trigger 3: rileva modifiche manuali al foglio
  ScriptApp.newTrigger('onModificaFoglio')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log('Trigger configurati: assegnaCamereAuto (2am) + inviaEmailSaldoAutomatico (8am) + onModificaFoglio (on edit)');
}


// -- INIZIALIZZA INTESTAZIONI FOGLIO -------------------------
function inizializzaIntestazioni(sheet) {
  var intestazioni = [
    'ID',                  // A
    'Data Iscrizione',     // B
    'Nome',                // C
    'Email',               // D
    'Telefono',            // E
    'Citta',               // F
    'Paese',               // G
    'Ruolo',               // H
    'Pacchetto',           // I
    'Compagno di Ballo',   // J
    'Legacy Compagno',     // K
    'Note',                // L
    'Stato',               // M
    'Pagamento',           // N
    'Camera',              // O
    'Tipo Camera',         // P
    'Email Conferma',      // Q
    'Email Anticipo',      // R
    'Email Saldo',         // S
    'N. Progressivo',      // T
    'Priorita',            // U
    'Tipologia Stanza',    // V - NUOVO v3
    'Compagni di Stanza'   // W - NUOVO v3
  ];

  sheet.appendRow(intestazioni);

  var headerRange = sheet.getRange(1, 1, 1, intestazioni.length);
  headerRange.setBackground('#C8372D');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(3,  160);
  sheet.setColumnWidth(4,  200);
  sheet.setColumnWidth(9,  150);
  sheet.setColumnWidth(13, 100);
  sheet.setColumnWidth(14, 130);
  sheet.setColumnWidth(22, 140);
  sheet.setColumnWidth(23, 200);
}


// -- UTILITY -------------------------------------------------

function trovaRigaPerId(sheet, id) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return null;
  var ids = sheet.getRange(2, COL.ID, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0].toString() === id.toString()) return i + 2;
  }
  return null;
}

function getDatiIscritti(sheet) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return [];
  var righe = sheet.getRange(2, 1, ultima - 1, TOT_COLONNE).getValues();
  return righe
    .filter(function(r) { return r[0]; })
    .map(function(r) { return rigaToOggetto(r); });
}

function rigaToOggetto(r) {
  return {
    id:               r[0]  ? r[0].toString() : '',
    data:             r[1]  ? r[1].toString() : '',
    nome:             r[2]  || '',
    email:            r[3]  || '',
    tel:              r[4]  || '',
    citta:            r[5]  || '',
    paese:            r[6]  || '',
    ruolo:            r[7]  || '',
    pacchetto:        r[8]  || '',
    compagno_ballo:   r[9]  || '',
    note:             r[11] || '',
    stato:            r[12] || '',
    pagamento:        r[13] || '',
    camera:           r[14] || '',
    tipo_camera:      r[15] || '',
    email_conf:       r[16] || false,
    email_anticipo:   r[17] || false,
    email_saldo:      r[18] || false,
    num_progr:        r[19] || 0,
    priorita:         r[20] || 99,
    tipologia_stanza: r[21] || '',
    compagni_stanza:  r[22] || ''
  };
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function log(tipo, messaggio) {
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = getOrCreateSheet(ss, CONFIG.SHEET_LOG);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Tipo', 'Messaggio']);
      sheet.getRange(1, 1, 1, 3).setBackground('#2E7D32').setFontColor('#fff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date().toLocaleString('it-IT'), tipo, messaggio]);
  } catch(e) { /* silenzioso */ }
}

function logErrore(funzione, errore) {
  log('ERRORE_' + funzione.toUpperCase(), errore);
}


// -- TEST ----------------------------------------------------
// Esegui manualmente per verificare che tutto funzioni.
function testSistema() {
  var datiTest = {
    action:           'nuova_iscrizione',
    nome:             'Mario Rossi Test',
    email:            'test@pepertango.com',
    tel:              '+39 333 1234567',
    citta:            'Milano',
    paese:            'Italia',
    ruolo:            'Leader',
    pacchetto:        'Cala Jannita',
    compagno_ballo:   '',
    tipologia_stanza: 'Doppia',
    compagni_stanza:  'Anna Verdi Test',
    note:             'Iscrizione di test v3'
  };

  var risultato = gestisciNuovaIscrizione(datiTest);
  Logger.log('Risultato test: ' + risultato.getContent());
}

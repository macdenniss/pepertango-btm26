// ============================================================
// PEPERTANGO - Apps Script Backend (Multi-evento)
// Versione 4 - aggiornata 2026-06-16
// Supporta: Maratona Tango Piccante 2027 (MTP27) + Brutia Tango Festival
//
// MTP27 Sheet:   https://docs.google.com/spreadsheets/d/1kBWs15V94ypf4Mdp7qM5x4vsyiadP1W87Xt7BZuORik
// Brutia Sheet:  [PLACEHOLDER - inserisci ID dopo aver creato il foglio]
// Deploy URL:    https://script.google.com/macros/s/AKfycbw6pqs5rvySS2_il_VAJLU07ucnIFdZ86RT6OWlhxVzDvb04REbJTt3ZXaziRvmDmTR/exec
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
var BRUTIA = {
  SHEET_ID:         '10NWb995E6n2gRaXCQlb0BfikglQaOSNv3lnGlcfGhoA',
  SHEET_ISCRITTI:   'Iscritti',
  SHEET_LOG:        'Log',
  EMAIL_DANILO:     'pepertango@gmail.com',
  DATA_SALDO:       '2027-01-01',   // PLACEHOLDER - data invio email saldo
  MAX_POSTI:        80,             // PLACEHOLDER - posti disponibili
  NOME_EVENTO:      'Brutia Tango Festival',

  PACCHETTI: {
    'Pacchetto A': { notti:3, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' },  // PLACEHOLDER
    'Pacchetto B': { notti:2, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' },  // PLACEHOLDER
    'Pacchetto C': { notti:1, prezzo:0, anticipo:0, saldo:0, link_anticipo:'', link_saldo:'' }   // PLACEHOLDER
  },

  // Brutia ha solo camere Standard (nessuna distinzione Deluxe/Economy)
  CATEGORIA_UNICA:  'Standard',
  PRIORITA_PACCHETTI: ['Pacchetto A', 'Pacchetto B', 'Pacchetto C'],
  PREFISSO_CAMERA:    { Standard: 'BTF' }
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
// Le colonne 22, 23, 24 sono NUOVE, aggiunte in fondo senza spostare le altre.
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
  TIPOLOGIA_STANZA:        22,  // V
  COMPAGNI_STANZA:         23,  // W
  COGNOME:                 24,  // X
  DATA_NASCITA:            25,  // Y - NUOVO v5: data di nascita
  FACEBOOK:                26   // Z - NUOVO v5: link profilo Facebook
};

var TOT_COLONNE = 26;


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

      // Aggiorna pacchetto, tipologia stanza, compagni e camera in un colpo solo
      // Richiede: id; opzionali: pacchetto, tipologia_stanza, compagni_stanza, camera, tipo_camera
      case 'aggiornaDatiIscritto':
        if (!params.id) {
          return jsonResponse({ ok: false, error: 'Parametro mancante: id obbligatorio.' });
        }
        return aggiornaDatiIscritto(params.id, params, evento);

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
      case 'nuova_iscrizione':   return htmlPostResponse(gestisciNuovaIscrizione(data, evento));
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
    return jsonResponse({ ok: false, error: 'Questa email e\' gia\' registrata. Controlla la tua casella di posta.' });
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
    data.tipologia_stanza || '',        // V
    compagni_stanza,                    // W
    data.cognome          || '',        // X
    data.data_nascita     || '',        // Y - NUOVO v5
    data.facebook         || ''         // Z - NUOVO v5
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

  // Brutia: assegna camera subito all'accettazione (non serve aspettare anticipo)
  if (nuovoStato === 'Accettato' && evento === 'Brutia') {
    SpreadsheetApp.flush();
    tentaAssegnazioneCameraPerIscritto(sheet, id, evento);
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

  // Brutia: camera gia' assegnata all'accettazione, non serve riassegnarla al pagamento
  if (nuovoPagamento === 'Anticipo versato' && evento !== 'Brutia') {
    SpreadsheetApp.flush();
    tentaAssegnazioneCameraPerIscritto(sheet, id, evento);
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


// -- AGGIORNA DATI ISCRITTO (pacchetto + stanza + camera) ----
function aggiornaDatiIscritto(id, params, evento) {
  var cfg   = getConfig(evento);
  var ss    = getSpreadsheet(evento);
  var sheet = getOrCreateSheet(ss, cfg.SHEET_ISCRITTI);
  var riga  = trovaRigaPerId(sheet, id);

  if (!riga) return jsonResponse({ ok: false, error: 'Iscritto non trovato.' });

  var aggiornati = [];

  if (params.pacchetto !== undefined && params.pacchetto !== '') {
    sheet.getRange(riga, COL.PACCHETTO).setValue(params.pacchetto);
    aggiornati.push('pacchetto');
  }
  if (params.tipologia_stanza !== undefined && params.tipologia_stanza !== '') {
    sheet.getRange(riga, COL.TIPOLOGIA_STANZA).setValue(params.tipologia_stanza);
    aggiornati.push('tipologia_stanza');
  }
  if (params.compagni_stanza !== undefined) {
    sheet.getRange(riga, COL.COMPAGNI_STANZA).setValue(params.compagni_stanza);
    aggiornati.push('compagni_stanza');
  }
  if (params.camera !== undefined) {
    sheet.getRange(riga, COL.CAMERA).setValue(params.camera);
    aggiornati.push('camera');
  }
  if (params.tipo_camera !== undefined && params.tipo_camera !== '') {
    sheet.getRange(riga, COL.TIPO_CAMERA).setValue(params.tipo_camera);
    aggiornati.push('tipo_camera');
  }

  log('AGGIORNA_DATI_ISCRITTO', 'ID ' + id + ' -> ' + aggiornati.join(', '));
  return jsonResponse({ ok: true, msg: 'Aggiornato: ' + aggiornati.join(', ') });
}


// -- LOGICA ASSEGNAZIONE CAMERA ------------------------------

// Determina la categoria (Deluxe/Standard/Economy) dal numero progressivo
// Per Brutia restituisce sempre 'Standard' (nessuna distinzione di categoria)
function calcolaCategoriaCamera(num_progr, evento) {
  if (evento === 'Brutia') return 'Standard';
  if (num_progr <= CONFIG.SOGLIE.DELUXE)   return 'Deluxe';
  if (num_progr <= CONFIG.SOGLIE.STANDARD) return 'Standard';
  return 'Economy';
}

// Formatta il numero camera: DEL-001 / STD-001 / ECO-001 per MTP27, BTF-001 per Brutia
function formatNumeroCamera(tipo, numero, evento) {
  var cfg = getConfig(evento || 'MTP27');
  var prefisso = cfg.PREFISSO_CAMERA[tipo] || tipo.substring(0, 3).toUpperCase();
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
function trovaOCreaNumeroCamera(tutti, tipo, nomiCompagni, evento) {
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
  return formatNumeroCamera(tipo, prossimoNumeroCamera(tutti, tipo), evento);
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
function tentaAssegnazioneCameraPerIscritto(sheet, id, evento) {
  var riga = trovaRigaPerId(sheet, id);
  if (!riga) return;

  var dati = rigaToOggetto(sheet.getRange(riga, 1, 1, TOT_COLONNE).getValues()[0]);
  if (dati.camera) return; // gia' assegnata

  var tutti     = getDatiIscritti(sheet);
  var tipo      = calcolaCategoriaCamera(dati.num_progr, evento);
  var tipologia = dati.tipologia_stanza || 'Singola';

  if (tipologia === 'Singola') {
    // Camera singola: assegna subito
    var numCamera = formatNumeroCamera(tipo, prossimoNumeroCamera(tutti, tipo), evento);
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
    var numCameraGruppo = trovaOCreaNumeroCamera(tutti, tipo, verifica.nomi, evento);

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
          var tipoCompagno = calcolaCategoriaCamera(compagno.num_progr, evento);
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
    'Compagni di Stanza',  // W - NUOVO v3
    'Cognome',             // X
    'Data di Nascita',    // Y - NUOVO v5
    'Facebook'             // Z - NUOVO v5
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
  sheet.setColumnWidth(24, 140);
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
    compagni_stanza:  r[22] || '',
    cognome:          r[23] || '',
    data_nascita:     r[24] || '',
    facebook:         r[25] || ''
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

// Usato da doPost per nuova_iscrizione: restituisce HTML che invia
// il risultato al form tramite postMessage (bypassa il limite CORS dell'iframe).
function htmlPostResponse(jsonResp) {
  var content = jsonResp.getContent();
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><body><script>' +
    'try{window.parent.postMessage(' + content + ',"*");}catch(e){}' +
    '<\/script></body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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


// -- TEST MTP27 ----------------------------------------------
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
  Logger.log('Risultato test MTP27: ' + risultato.getContent());
}


// -- DIAGNOSI ASSEGNAZIONE CAMERA ----------------------------
// Mostra lo stato di tutti gli iscritti Brutia e tenta l'assegnazione
// camera per il primo idoneo. Apparira' nelle Notifiche.
function diagnosiCameraAssegnazione() {
  var risultato = 'DIAGNOSI CAMERA BRUTIA\n';
  try {
    var ss    = SpreadsheetApp.openById(BRUTIA.SHEET_ID);
    var sheet = getOrCreateSheet(ss, BRUTIA.SHEET_ISCRITTI);
    var tutti = getDatiIscritti(sheet);

    risultato += 'Totale iscritti nel foglio: ' + tutti.length + '\n\n';

    for (var i = 0; i < tutti.length; i++) {
      var r = tutti[i];
      risultato += '--- #' + r.num_progr + ' ' + r.nome + ' ---\n';
      risultato += '  stato: ' + r.stato + '\n';
      risultato += '  pagamento: ' + r.pagamento + '\n';
      risultato += '  tipologia_stanza: "' + r.tipologia_stanza + '"\n';
      risultato += '  compagni_stanza: "' + r.compagni_stanza + '"\n';
      risultato += '  camera: "' + r.camera + '"\n';
    }

    // Cerca il primo senza camera e con pagamento anticipo
    var candidato = null;
    for (var j = 0; j < tutti.length; j++) {
      if (tutti[j].pagamento === 'Anticipo versato' && !tutti[j].camera) {
        candidato = tutti[j];
        break;
      }
    }

    if (!candidato) {
      risultato += '\nNessun candidato idoneo (anticipo versato e senza camera).';
      throw new Error(risultato);
    }

    risultato += '\nCANDIDATO: ' + candidato.nome + ' (#' + candidato.num_progr + ')\n';
    var tipo = calcolaCategoriaCamera(candidato.num_progr, 'Brutia');
    var tipologia = candidato.tipologia_stanza || 'Singola';
    risultato += 'tipo camera calcolato: ' + tipo + '\n';
    risultato += 'tipologia stanza: ' + tipologia + '\n';

    if (tipologia !== 'Singola') {
      var verifica = verificaCompagni(tutti, candidato);
      risultato += 'compagni pronti: ' + verifica.pronti + '\n';
      risultato += 'avvisi: ' + verifica.avvisi.join(' | ') + '\n';
    }

    risultato += '\nEseguo tentaAssegnazioneCameraPerIscritto...';
    tentaAssegnazioneCameraPerIscritto(sheet, candidato.id, 'Brutia');
    SpreadsheetApp.flush();

    // Rileggi
    var riga = trovaRigaPerId(sheet, candidato.id);
    var datiAggiornati = rigaToOggetto(sheet.getRange(riga, 1, 1, TOT_COLONNE).getValues()[0]);
    risultato += '\nCamera dopo assegnazione: "' + datiAggiornati.camera + '"';

    if (datiAggiornati.camera) {
      risultato += '\nSUCCESSO!';
    } else {
      risultato += '\nFALLITO - camera ancora vuota.';
    }

  } catch(err) {
    if (err.message && err.message.indexOf('DIAGNOSI') !== -1) throw err;
    risultato += '\nERRORE: ' + err.toString();
  }
  throw new Error(risultato);
}


// -- DIAGNOSI VISIBILE ---------------------------------------
// Esegui questa funzione: il risultato apparira' nelle Notifiche
// come un errore (testo rosso) con il messaggio di diagnosi.
function diagnosiBrutia() {
  var risultato = 'INIZIO DIAGNOSI\n';
  try {
    risultato += '1. Apro sheet Brutia (ID: ' + BRUTIA.SHEET_ID + ')...\n';
    var ss = SpreadsheetApp.openById(BRUTIA.SHEET_ID);
    risultato += '   OK - nome: ' + ss.getName() + '\n';

    risultato += '2. Tab nel foglio: ';
    var tabs = ss.getSheets().map(function(s) { return s.getName(); });
    risultato += tabs.join(', ') + '\n';

    risultato += '3. Creo/accedo tab Iscritti...\n';
    var sheet = getOrCreateSheet(ss, 'Iscritti');
    risultato += '   OK - righe attuali: ' + sheet.getLastRow() + '\n';

    risultato += '4. Scrivo riga di test...\n';
    sheet.appendRow(['DIAG-TEST', new Date(), 'Test diretto', 'diag@test.com']);
    SpreadsheetApp.flush();
    risultato += '   OK - righe dopo: ' + sheet.getLastRow() + '\n';

    risultato += 'SUCCESSO - tutto funziona!';

  } catch(err) {
    risultato += 'ERRORE: ' + err.toString();
  }
  // Lancia errore con il messaggio: apparira' nelle Notifiche
  throw new Error(risultato);
}


// -- TEST BRUTIA ---------------------------------------------
// ESEGUI QUESTA FUNZIONE MANUALMENTE nell'editor Apps Script
// prima di usare il form pubblico.
// Serve a: (1) autorizzare accesso al foglio Brutia,
//          (2) verificare che tutto funzioni.
// Come eseguirla: seleziona "testBrutia" nel menu a tendina
// vicino al pulsante Esegui (triangolo), poi clicca Esegui.
// Controlla il log in basso: deve apparire "OK - iscrizione salvata".
// Dopo averla eseguita con successo, rideploya lo script
// (Deploy -> Gestisci deployment -> Modifica -> Nuova versione).
function testBrutia() {
  try {
    Logger.log('--- TEST BRUTIA INIZIO ---');

    // Step 1: verifica accesso al foglio Brutia
    Logger.log('1. Apro il foglio Brutia...');
    var ss = SpreadsheetApp.openById(BRUTIA.SHEET_ID);
    Logger.log('   OK - foglio aperto: ' + ss.getName());

    // Step 2: verifica o crea il tab Iscritti
    Logger.log('2. Accedo al tab Iscritti...');
    var sheet = getOrCreateSheet(ss, BRUTIA.SHEET_ISCRITTI);
    Logger.log('   OK - tab trovato/creato: ' + sheet.getName());

    // Step 3: inizializza intestazioni se vuoto
    if (sheet.getLastRow() === 0) {
      Logger.log('3. Foglio vuoto - aggiungo intestazioni...');
      inizializzaIntestazioni(sheet);
      Logger.log('   OK - intestazioni aggiunte');
    } else {
      Logger.log('3. Foglio gia inizializzato (' + sheet.getLastRow() + ' righe)');
    }

    // Step 4: scrivi riga di test
    Logger.log('4. Scrivo riga di test...');
    var datiTest = {
      nome:             'Test Brutia',
      email:            'testbrutia@pepertango.com',
      tel:              '+39 333 0000000',
      citta:            'Cosenza',
      paese:            'Italia',
      ruolo:            'Follower',
      pacchetto:        'Pacchetto A',
      compagno_ballo:   '',
      tipologia_stanza: 'Singola',
      compagni_stanza:  [],
      note:             'Riga di test - eliminare'
    };
    var risultato = gestisciNuovaIscrizione(datiTest, 'Brutia');
    Logger.log('   Risposta: ' + risultato.getContent());

    // Step 5: verifica che la riga sia stata scritta
    Logger.log('5. Verifico riga scritta...');
    var righe = sheet.getLastRow();
    Logger.log('   Righe totali nel foglio: ' + righe);

    if (righe >= 2) {
      Logger.log('   OK - iscrizione salvata correttamente!');
      Logger.log('   Puoi eliminare la riga di test dal foglio.');
    } else {
      Logger.log('   ERRORE - riga non trovata dopo appendRow!');
    }

    Logger.log('--- TEST BRUTIA FINE ---');

  } catch(err) {
    Logger.log('ERRORE CRITICO: ' + err.toString());
    Logger.log('Stack: ' + (err.stack || 'non disponibile'));
  }
}

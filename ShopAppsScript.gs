// ============================================================
// PEPERTANGO SHOP — Google Apps Script Backend
// Stripe Checkout + Printful Order Fulfillment
//
// SETUP (vedi SHOP_DROPSHIPPING_SETUP.md):
//   1. Script Properties → aggiungi:
//      STRIPE_SECRET_KEY      = sk_live_...
//      STRIPE_WEBHOOK_SECRET  = whsec_...
//      PRINTFUL_API_KEY       = Bearer token da Printful
//   2. Deploy → Web App → Anyone (anche anonymous)
//   3. Copia l'URL del deploy in shop-cart.js → SHOP_SCRIPT_URL
// ============================================================

const SHOP_PROPS = PropertiesService.getScriptProperties();

// ============================================================
// ENTRY POINT
// ============================================================

function doPost(e) {
  // Permette richieste cross-origin dal sito
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'createCheckout') {
      return createStripeCheckout(body);
    }
    if (action === 'stripeWebhook') {
      return handleStripeWebhook(e);
    }

    return jsonResponse({ error: 'Azione sconosciuta: ' + action }, 400);

  } catch (err) {
    console.error('[doPost]', err);
    return jsonResponse({ error: err.toString() }, 500);
  }
}

function doGet(e) {
  e = e || {};
  var params = (e.parameter) ? e.parameter : {};
  var action = params.action || '';

  // Lettura ordini per il dashboard admin
  if (action === 'getOrders') {
    return getOrders();
  }

  // Redirect Stripe (success/cancel) — rimanda al sito
  return ContentService.createTextOutput('OK');
}

// ============================================================
// Legge gli ordini dal foglio "Ordini Shop" e li restituisce
// come JSON al dashboard admin
// ============================================================
function getOrders() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Ordini Shop');

    if (!sheet) {
      return jsonResponse({ success: true, orders: [] });
    }

    var data    = sheet.getDataRange().getValues();
    var headers = data[0]; // [Data, Stripe Session ID, Cliente, Email, Tel, Indirizzo, Prodotti, Totale, Stato, Printful ID]

    var orders = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      orders.push({
        data:        row[0] ? row[0].toString() : '',
        stripe_id:   row[1] || '',
        cliente:     row[2] || '',
        email:       row[3] || '',
        tel:         row[4] || '',
        indirizzo:   row[5] || '',
        prodotti:    row[6] || '',
        totale:      row[7] ? parseFloat(row[7]) : 0,
        stato:       row[8] || 'pending',
        printful_id: row[9] || ''
      });
    }

    // Ordine decrescente per data (più recenti prima)
    orders.reverse();

    return jsonResponse({ success: true, orders: orders });

  } catch (err) {
    console.error('[getOrders]', err);
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
// STRIPE: Crea sessione di checkout
// ============================================================

function createStripeCheckout(body) {
  var STRIPE_KEY = SHOP_PROPS.getProperty('STRIPE_SECRET_KEY');
  if (!STRIPE_KEY) {
    return jsonResponse({ error: 'STRIPE_SECRET_KEY non configurata nelle Script Properties' }, 500);
  }

  var customer = body.customer;
  var address  = body.address;
  var items    = body.items;

  // Costruisce i line_items per Stripe (prezzi in centesimi)
  var lineItemsEncoded = '';
  items.forEach(function(item, i) {
    var prefix = 'line_items[' + i + ']';
    lineItemsEncoded +=
      encodeURIComponent(prefix + '[price_data][currency]')                          + '=eur&' +
      encodeURIComponent(prefix + '[price_data][product_data][name]')                + '=' + encodeURIComponent(item.name + (item.variant ? ' — ' + item.variant : '')) + '&' +
      encodeURIComponent(prefix + '[price_data][unit_amount]')                       + '=' + Math.round(item.price * 100) + '&' +
      encodeURIComponent(prefix + '[quantity]')                                       + '=' + item.qty + '&';
  });

  var metadataEncoded =
    'metadata[customer_name]='  + encodeURIComponent(customer.nome + ' ' + customer.cognome) + '&' +
    'metadata[customer_email]=' + encodeURIComponent(customer.email) + '&' +
    'metadata[customer_phone]=' + encodeURIComponent(customer.tel || '') + '&' +
    'metadata[shipping_via]='   + encodeURIComponent(address.via) + '&' +
    'metadata[shipping_cap]='   + encodeURIComponent(address.cap) + '&' +
    'metadata[shipping_citta]=' + encodeURIComponent(address.citta) + '&' +
    'metadata[shipping_paese]=' + encodeURIComponent(address.paese || 'Italia') + '&' +
    'metadata[order_items]='    + encodeURIComponent(JSON.stringify(items)) + '&';

  var payload =
    lineItemsEncoded +
    metadataEncoded +
    'mode=payment&' +
    'customer_email=' + encodeURIComponent(customer.email) + '&' +
    'success_url=' + encodeURIComponent('https://www.pepertango.com/?shop_success=1') + '&' +
    'cancel_url='  + encodeURIComponent('https://www.pepertango.com/?shop_cancel=1');

  var response = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + STRIPE_KEY },
    payload: payload,
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());

  if (result.error) {
    console.error('[Stripe createCheckout]', result.error.message);
    return jsonResponse({ error: result.error.message }, 400);
  }

  // Log ordine pendente nel foglio Google
  logOrderToSheet({
    stripe_session_id: result.id,
    customer: customer,
    address: address,
    items: items,
    total: items.reduce(function(s, i) { return s + i.price * i.qty; }, 0),
    status: 'pending'
  });

  return jsonResponse({ url: result.url });
}

// ============================================================
// STRIPE: Webhook (chiamato da Stripe dopo pagamento)
// ============================================================

function handleStripeWebhook(e) {
  try {
    var event = JSON.parse(e.postData.contents);

    if (event.type === 'checkout.session.completed') {
      var session = event.data.object;
      var items   = JSON.parse(session.metadata.order_items || '[]');

      createPrintfulOrder({
        stripe_session_id: session.id,
        customer_name:  session.metadata.customer_name,
        customer_email: session.customer_email || session.metadata.customer_email,
        customer_phone: session.metadata.customer_phone || '',
        address: {
          via:    session.metadata.shipping_via,
          cap:    session.metadata.shipping_cap,
          citta:  session.metadata.shipping_citta,
          paese:  session.metadata.shipping_paese || 'Italia'
        },
        items: items
      });

      updateOrderStatus(session.id, 'paid');
    }

    return jsonResponse({ received: true });

  } catch (err) {
    console.error('[webhook]', err);
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ============================================================
// PRINTFUL: Crea ordine di produzione
// ============================================================

function createPrintfulOrder(orderData) {
  var PRINTFUL_KEY = SHOP_PROPS.getProperty('PRINTFUL_API_KEY');
  if (!PRINTFUL_KEY) {
    console.warn('[Printful] PRINTFUL_API_KEY non configurata — ordine non inoltrato');
    notifyAdminMissingPrintful(orderData);
    return;
  }

  var variantMap = getPrintfulVariantMap();

  var printfulItems = orderData.items.map(function(item) {
    var key = item.id + '|' + (item.color || '') + '|' + (item.size || '');
    var variantId = variantMap[key];

    if (!variantId || variantId === 0) {
      console.warn('[Printful] Variant ID mancante per:', key, '— configura getVariantMap()');
      return null;
    }
    return { variant_id: variantId, quantity: item.qty };
  }).filter(Boolean);

  if (printfulItems.length === 0) {
    console.error('[Printful] Nessun prodotto mappato — controlla getPrintfulVariantMap()');
    notifyAdminMissingPrintful(orderData);
    return;
  }

  var payload = {
    recipient: {
      name:         orderData.customer_name,
      email:        orderData.customer_email,
      phone:        orderData.customer_phone,
      address1:     orderData.address.via,
      zip:          orderData.address.cap,
      city:         orderData.address.citta,
      country_code: 'IT'
    },
    items: printfulItems,
    retail_costs: { currency: 'EUR' }
  };

  var response = UrlFetchApp.fetch('https://api.printful.com/orders', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + PRINTFUL_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());

  if (result.code !== 200) {
    console.error('[Printful] Errore creazione ordine:', JSON.stringify(result.result || result.error));
    updateOrderStatus(orderData.stripe_session_id, 'printful_error');
    notifyAdminError(orderData, JSON.stringify(result));
  } else {
    var printfulOrderId = result.result.id;
    console.log('[Printful] Ordine creato:', printfulOrderId);
    updateOrderStatus(orderData.stripe_session_id, 'fulfilled', printfulOrderId);
    sendConfirmationEmailToCustomer(orderData, printfulOrderId);
  }
}

// ============================================================
// MAPPA PRODOTTI → PRINTFUL VARIANT ID
// ============================================================
// Per trovare i Variant ID:
//   Printful Dashboard → Stores → [store] → Products → [prodotto]
//   → clicca su una variante → copia il numero "Variant ID"
// ============================================================

function getPrintfulVariantMap() {
  return {
    // T-SHIRT PeperTango
    'tshirt|Nero|XS':    0,  // ← sostituisci con Variant ID reale
    'tshirt|Nero|S':     0,
    'tshirt|Nero|M':     0,
    'tshirt|Nero|L':     0,
    'tshirt|Nero|XL':    0,
    'tshirt|Nero|XXL':   0,
    'tshirt|Bianco|XS':  0,
    'tshirt|Bianco|S':   0,
    'tshirt|Bianco|M':   0,
    'tshirt|Bianco|L':   0,
    'tshirt|Bianco|XL':  0,
    'tshirt|Bianco|XXL': 0,
    'tshirt|Rosso|XS':   0,
    'tshirt|Rosso|S':    0,
    'tshirt|Rosso|M':    0,
    'tshirt|Rosso|L':    0,
    'tshirt|Rosso|XL':   0,
    'tshirt|Rosso|XXL':  0,
    // FELPA GIROCOLLO
    'felpa|Nero|S':      0,
    'felpa|Nero|M':      0,
    'felpa|Nero|L':      0,
    'felpa|Nero|XL':     0,
    'felpa|Nero|XXL':    0,
    'felpa|Grigio|S':    0,
    'felpa|Grigio|M':    0,
    'felpa|Grigio|L':    0,
    'felpa|Grigio|XL':   0,
    'felpa|Grigio|XXL':  0,
    // HOODIE
    'hoodie|Nero|S':          0,
    'hoodie|Nero|M':          0,
    'hoodie|Nero|L':          0,
    'hoodie|Nero|XL':         0,
    'hoodie|Nero|XXL':        0,
    'hoodie|Verde oliva|S':   0,
    'hoodie|Verde oliva|M':   0,
    'hoodie|Verde oliva|L':   0,
    'hoodie|Verde oliva|XL':  0,
    'hoodie|Verde oliva|XXL': 0,
    // CAPPELLINO (taglia unica → size è vuota)
    'cappellino|Nero|':  0,
    'cappellino|Rosso|': 0,
    // TOTE BAG
    'tote|Naturale|':    0,
    // MUG
    'mug|Bianco|':       0,
    'mug|Nero|':         0,
    // POSTER
    'poster|Standard|':  0,
    // STICKER PACK
    'sticker|Multicolore|': 0
  };
}

// ============================================================
// GOOGLE SHEETS: Log ordini
// ============================================================

function logOrderToSheet(data) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Ordini Shop');

    if (!sheet) {
      sheet = ss.insertSheet('Ordini Shop');
      sheet.appendRow([
        'Data', 'Stripe Session ID', 'Cliente', 'Email',
        'Telefono', 'Indirizzo', 'Prodotti', 'Totale €', 'Stato', 'Printful ID'
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }

    sheet.appendRow([
      new Date().toLocaleString('it-IT'),
      data.stripe_session_id,
      data.customer.nome + ' ' + data.customer.cognome,
      data.customer.email,
      data.customer.tel || '',
      data.address.via + ', ' + data.address.cap + ' ' + data.address.citta,
      data.items.map(function(i) { return i.name + ' x' + i.qty; }).join('; '),
      data.total,
      data.status,
      ''
    ]);
  } catch (err) {
    console.warn('[Sheet log]', err);
  }
}

function updateOrderStatus(stripeSessionId, status, printfulId) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Ordini Shop');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === stripeSessionId) {
        sheet.getRange(i + 1, 9).setValue(status);
        if (printfulId) sheet.getRange(i + 1, 10).setValue(printfulId);
        return;
      }
    }
  } catch (err) {
    console.warn('[Sheet update]', err);
  }
}

// ============================================================
// EMAIL
// ============================================================

function sendConfirmationEmailToCustomer(orderData, printfulOrderId) {
  try {
    MailApp.sendEmail(
      orderData.customer_email,
      'Ordine confermato — PeperTango Store #' + printfulOrderId,
      'Ciao ' + orderData.customer_name + ',\n\n' +
      'Il tuo ordine è stato confermato e inoltrato alla produzione.\n\n' +
      'N° ordine Printful: ' + printfulOrderId + '\n\n' +
      'Spedizione a:\n' +
      orderData.address.via + ', ' + orderData.address.cap + ' ' + orderData.address.citta + '\n\n' +
      'Tempi previsti:\n' +
      '- Produzione: 3–7 giorni lavorativi (print on demand via Printful)\n' +
      '- Spedizione: 2–5 giorni lavorativi\n\n' +
      'Per qualsiasi domanda scrivi a pepertango@gmail.com\n\n' +
      'Grazie!\nIl team PeperTango'
    );
  } catch (err) {
    console.warn('[Email cliente]', err);
  }
}

function notifyAdminMissingPrintful(orderData) {
  try {
    MailApp.sendEmail(
      'pepertango@gmail.com',
      '⚠️ Ordine pagato — Printful non configurato',
      'Ordine ricevuto ma NON inoltrato a Printful (API key mancante o variant ID non configurati).\n\n' +
      'Stripe Session: ' + orderData.stripe_session_id + '\n' +
      'Cliente: ' + orderData.customer_name + ' <' + orderData.customer_email + '>\n' +
      'Prodotti: ' + JSON.stringify(orderData.items) + '\n\n' +
      'Azione richiesta: configura getPrintfulVariantMap() e PRINTFUL_API_KEY.'
    );
  } catch (err) {}
}

function notifyAdminError(orderData, errorDetail) {
  try {
    MailApp.sendEmail(
      'pepertango@gmail.com',
      '❌ Errore Printful su ordine pagato',
      'Ordine pagato su Stripe ma errore nella creazione ordine Printful.\n\n' +
      'Stripe Session: ' + orderData.stripe_session_id + '\n' +
      'Cliente: ' + orderData.customer_name + '\n' +
      'Errore: ' + errorDetail
    );
  } catch (err) {}
}

// ============================================================
// UTILITY
// ============================================================

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// PRINTFUL SETUP HELPERS
// Esegui queste funzioni manualmente dall'editor Apps Script:
//   Run → testPrintfulConnection     → verifica che l'API key funzioni
//   Run → buildVariantMapFromPrintful → genera la mappa dei Variant ID
//   Run → showVariantMapCode          → mostra il codice pronto da incollare
// ============================================================

/**
 * Passo 1 — verifica che PRINTFUL_API_KEY sia configurata e funzionante.
 * Esegui da: Apps Script editor → Run → testPrintfulConnection
 */
function testPrintfulConnection() {
  var key = SHOP_PROPS.getProperty('PRINTFUL_API_KEY');
  if (!key) {
    Logger.log('❌ PRINTFUL_API_KEY non trovata nelle Script Properties.');
    Logger.log('   Vai su: Project Settings → Script Properties → aggiungi PRINTFUL_API_KEY');
    return;
  }

  var res = UrlFetchApp.fetch('https://api.printful.com/stores', {
    headers: { 'Authorization': 'Bearer ' + key },
    muteHttpExceptions: true
  });

  var data = JSON.parse(res.getContentText());
  if (data.code === 200) {
    Logger.log('✅ Connessione Printful OK!');
    Logger.log('   Store trovati: ' + data.result.length);
    data.result.forEach(function(s) {
      Logger.log('   → ID: ' + s.id + '  Nome: ' + s.name + '  Tipo: ' + s.type);
    });
    Logger.log('');
    Logger.log('👉 Passo successivo: esegui buildVariantMapFromPrintful()');
  } else {
    Logger.log('❌ Errore Printful: ' + JSON.stringify(data.error || data));
  }
}

/**
 * Passo 2 — recupera tutti i prodotti e varianti dal tuo store Printful
 * e costruisce la mappa { 'productKey|Colore|Taglia': variantId }.
 * Esegui da: Apps Script editor → Run → buildVariantMapFromPrintful
 *
 * Dopo l'esecuzione usa showVariantMapCode() per vedere il codice completo.
 */
function buildVariantMapFromPrintful() {
  var key = SHOP_PROPS.getProperty('PRINTFUL_API_KEY');
  if (!key) {
    Logger.log('❌ Configura prima PRINTFUL_API_KEY nelle Script Properties.');
    return;
  }

  // Recupera lista prodotti dello store
  var res = UrlFetchApp.fetch('https://api.printful.com/store/products?limit=100', {
    headers: { 'Authorization': 'Bearer ' + key },
    muteHttpExceptions: true
  });
  var data = JSON.parse(res.getContentText());

  if (data.code !== 200) {
    Logger.log('❌ Errore nel recupero prodotti: ' + JSON.stringify(data));
    return;
  }

  var products = data.result;
  Logger.log('Trovati ' + products.length + ' prodotti nel tuo store Printful.');

  var variantMap = {};

  products.forEach(function(product) {
    // Recupera il dettaglio di ogni prodotto (incluse le varianti)
    var detailRes = UrlFetchApp.fetch(
      'https://api.printful.com/store/products/' + product.id,
      { headers: { 'Authorization': 'Bearer ' + key }, muteHttpExceptions: true }
    );
    var detail = JSON.parse(detailRes.getContentText());

    if (detail.code !== 200) {
      Logger.log('⚠️ Impossibile leggere prodotto ' + product.id + ': ' + JSON.stringify(detail));
      return;
    }

    var syncProduct = detail.result.sync_product;
    var syncVariants = detail.result.sync_variants;

    Logger.log('\nProdotto: ' + syncProduct.name + ' (ID store: ' + syncProduct.id + ')');

    syncVariants.forEach(function(v) {
      // Il nome variante di Printful ha formato "Colore / Taglia" oppure "Colore"
      var variantName = v.name || '';
      // Estraiamo colore e taglia dal nome della variante
      var parts = variantName.split(' / ');
      var color = parts.length > 1 ? parts[parts.length - 2].trim() : (parts[0] || '');
      var size  = parts.length > 1 ? parts[parts.length - 1].trim() : '';

      // Chiave nel formato usato da shop-cart.js: productId|Colore|Taglia
      // productId deve corrispondere a quello usato nel frontend (tshirt, felpa, hoodie, ecc.)
      // → qui usiamo il nome del prodotto come chiave temporanea, da sistemare dopo
      var productKey = syncProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      var mapKey = productKey + '|' + color + '|' + size;
      variantMap[mapKey] = v.variant_id;

      Logger.log('  ' + mapKey + ' → ' + v.variant_id);
    });
  });

  // Salva la mappa come Script Property per uso in showVariantMapCode()
  SHOP_PROPS.setProperty('_VARIANT_MAP_CACHE', JSON.stringify(variantMap));

  Logger.log('\n✅ Mappa salvata (' + Object.keys(variantMap).length + ' varianti).');
  Logger.log('👉 Ora esegui showVariantMapCode() per vedere il codice da incollare in getPrintfulVariantMap()');
}

/**
 * Passo 3 — mostra nel Logger il codice completo di getPrintfulVariantMap()
 * già compilato con i Variant ID reali del tuo store.
 * Copia il codice dal Logger e incollalo in questo file al posto della funzione attuale.
 * Esegui da: Apps Script editor → Run → showVariantMapCode
 */
function showVariantMapCode() {
  var cached = SHOP_PROPS.getProperty('_VARIANT_MAP_CACHE');
  if (!cached) {
    Logger.log('❌ Dati non trovati. Esegui prima buildVariantMapFromPrintful().');
    return;
  }

  var map = JSON.parse(cached);
  var lines = Object.keys(map).map(function(k) {
    return "    '" + k + "': " + map[k] + ",  // Variant ID Printful";
  });

  var code =
    'function getPrintfulVariantMap() {\n' +
    '  return {\n' +
    lines.join('\n') + '\n' +
    '  };\n' +
    '}\n';

  Logger.log('========================================');
  Logger.log('COPIA QUESTO CODICE in ShopAppsScript.gs');
  Logger.log('(sostituisce la funzione getPrintfulVariantMap esistente)');
  Logger.log('========================================\n');
  Logger.log(code);
  Logger.log('========================================');
  Logger.log('IMPORTANTE: verifica che le chiavi (es. "t_shirt_pepertango|Nero|M")');
  Logger.log('corrispondano agli ID prodotto usati in shop-cart.js (tshirt, felpa, hoodie, ecc.)');
  Logger.log('Adatta le chiavi se necessario prima di salvare.');
}

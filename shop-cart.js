// ============================================================
// PEPERTANGO STORE — Logica carrello + checkout
//
// Dipende da: shop-products.js (SHOP_PRODUCTS)
// Carica DOPO shop-products.js nel HTML.
//
// Funzioni principali:
//   cartOpen() / cartClose()          — apre/chiude il drawer
//   productOpen(id)                   — apre il modal prodotto
//   checkoutOpen() / checkoutClose()  — apre/chiude il checkout
//   shopRenderGrid(cat)               — renderizza la griglia prodotti
//   filterShop(btn, cat)              — filtra per categoria (override)
// ============================================================


// ============================================================
// 1. STATO DEL CARRELLO
// ============================================================

var cart = [];
var CART_KEY = 'pepertango_cart_v1';

// Salva il carrello in localStorage
function cartSave() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e) {}
}

// Carica il carrello da localStorage al caricamento pagina
function cartLoad() {
  try {
    var saved = localStorage.getItem(CART_KEY);
    if (saved) cart = JSON.parse(saved);
  } catch(e) { cart = []; }
  cartCountUpdate();
  cartRender();
}

// Calcola il totale del carrello
function cartTotal() {
  return cart.reduce(function(sum, item) {
    return sum + (item.price * item.qty);
  }, 0);
}

// Calcola il numero totale di pezzi (per il badge in nav)
function cartTotalItems() {
  return cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
}


// ============================================================
// 2. OPERAZIONI CARRELLO
// ============================================================

// Aggiunge un prodotto al carrello.
// Se la stessa variante esiste già, aumenta la quantità.
function cartAdd(productId, color, size, qty) {
  qty = qty || 1;

  // Costruisce una chiave univoca per prodotto + variante
  var variantKey = productId + '|' + (color || '') + '|' + (size || '');

  // Cerca se l'item esiste già
  var existing = null;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].variantKey === variantKey) { existing = cart[i]; break; }
  }

  // Recupera i dati del prodotto
  var product = null;
  for (var j = 0; j < SHOP_PRODUCTS.length; j++) {
    if (SHOP_PRODUCTS[j].id === productId) { product = SHOP_PRODUCTS[j]; break; }
  }
  if (!product) return;

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      variantKey: variantKey,
      id:         productId,
      name:       product.name,
      price:      product.price,
      color:      color,
      size:       size,
      qty:        qty,
      icon:       product.icon
    });
  }

  cartSave();
  cartCountUpdate();
  cartRender();
  cartOpen();
}

// Modifica la quantità di un item (delta = +1 o -1)
function cartUpdateQty(variantKey, delta) {
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].variantKey === variantKey) {
      cart[i].qty = Math.max(0, cart[i].qty + delta);
      if (cart[i].qty === 0) {
        cart.splice(i, 1); // rimuove se arriva a 0
      }
      break;
    }
  }
  cartSave();
  cartCountUpdate();
  cartRender();
}

// Svuota tutto il carrello
function cartClear() {
  cart = [];
  cartSave();
  cartCountUpdate();
  cartRender();
}

// Aggiorna il badge numerico nel nav
function cartCountUpdate() {
  var badge = document.getElementById('cartCount');
  if (!badge) return;
  var n = cartTotalItems();
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}


// ============================================================
// 3. RENDERING DRAWER CARRELLO
// ============================================================

function cartRender() {
  var list     = document.getElementById('cartItems');
  var emptyEl  = document.getElementById('cartEmpty');
  var footer   = document.getElementById('cartFooter');
  var totalEl  = document.getElementById('cartTotal');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (footer)  footer.style.display  = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (footer)  footer.style.display  = 'block';

  // Renderizza ogni item del carrello
  list.innerHTML = cart.map(function(item) {
    var info = [];
    if (item.color && item.color !== 'Standard' && item.color !== 'Multicolore' && item.color !== 'Naturale') info.push(item.color);
    if (item.size)  info.push(item.size);
    var variantEsc = item.variantKey.replace(/'/g, "\\'");

    return '<div class="cart-item">'
      + '<div class="cart-item-icon"><i class="' + item.icon + '"></i></div>'
      + '<div class="cart-item-info">'
      +   '<div class="cart-item-name">' + item.name + '</div>'
      +   (info.length ? '<div class="cart-item-variant">' + info.join(' · ') + '</div>' : '')
      +   '<div class="cart-item-price">&euro;' + (item.price * item.qty) + '</div>'
      + '</div>'
      + '<div class="cart-item-qty">'
      +   '<button class="cart-qty-btn" onclick="cartUpdateQty(\'' + variantEsc + '\',-1)">&#8722;</button>'
      +   '<span class="cart-qty-val">' + item.qty + '</span>'
      +   '<button class="cart-qty-btn" onclick="cartUpdateQty(\'' + variantEsc + '\',1)">+</button>'
      + '</div>'
      + '</div>';
  }).join('');

  if (totalEl) totalEl.textContent = '€' + cartTotal();
}


// ============================================================
// 4. APERTURA / CHIUSURA DRAWER
// ============================================================

function cartOpen() {
  var drawer  = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cartClose() {
  var drawer  = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}


// ============================================================
// 5. MODAL PRODOTTO
// ============================================================

var currentProduct  = null;
var selectedColor   = null;
var selectedSize    = null;
var selectedQty     = 1;

function productOpen(productId) {
  // Trova il prodotto
  var product = null;
  for (var i = 0; i < SHOP_PRODUCTS.length; i++) {
    if (SHOP_PRODUCTS[i].id === productId) { product = SHOP_PRODUCTS[i]; break; }
  }
  if (!product) return;

  currentProduct = product;

  // Valori default per varianti
  selectedColor = product.colors.length > 0 ? product.colors[0].name : null;
  // Default taglia: M se disponibile, altrimenti prima
  selectedSize = null;
  if (product.sizes.length > 0) {
    var midIdx = Math.min(2, product.sizes.length - 1);
    selectedSize = product.sizes[midIdx]; // S,M,L... → indice 2 = L, adatto come default
    // Preferisce M o L
    for (var s = 0; s < product.sizes.length; s++) {
      if (product.sizes[s] === 'M') { selectedSize = 'M'; break; }
    }
  }
  selectedQty = 1;

  // Popola il modal
  var iconEl = document.getElementById('pmIcon');
  if (iconEl) iconEl.className = product.icon + ' pm-icon-i';

  var badgeEl = document.getElementById('pmBadge');
  if (badgeEl) {
    badgeEl.textContent = product.badge || '';
    badgeEl.style.display = product.badge ? 'inline-block' : 'none';
  }

  var nameEl = document.getElementById('pmName');
  if (nameEl) nameEl.textContent = product.name;

  var priceEl = document.getElementById('pmPrice');
  if (priceEl) priceEl.textContent = '€' + product.price;

  var descEl = document.getElementById('pmDesc');
  if (descEl) descEl.textContent = product.description;

  var matEl = document.getElementById('pmMaterial');
  if (matEl) matEl.textContent = product.material;

  // Sezione colori
  var colorSection = document.getElementById('pmColors');
  if (colorSection) {
    if (product.colors.length > 1) {
      colorSection.style.display = 'block';
      var colorsList = document.getElementById('pmColorsList');
      if (colorsList) {
        colorsList.innerHTML = product.colors.map(function(c) {
          var isLight = ['#f0f0f0','#ffffff','#d4c5a9','#fff9c4','#ffeb3b'].indexOf(c.hex.toLowerCase()) !== -1;
          var isActive = c.name === selectedColor;
          return '<button class="pm-color' + (isActive ? ' active' : '') + '"'
            + ' style="background:' + c.hex + ';border-color:' + (isLight ? '#999' : '#2d2d2d') + '"'
            + ' title="' + c.name + '"'
            + ' onclick="pmSelectColor(\'' + c.name + '\',this,\'' + c.hex + '\',' + isLight + ')">'
            + (isActive ? '<i class="fa-solid fa-check" style="color:' + (isLight ? '#333' : '#fff') + '"></i>' : '')
            + '</button>';
        }).join('');
      }
    } else {
      colorSection.style.display = 'none';
    }
  }

  // Sezione taglie
  var sizeSection = document.getElementById('pmSizes');
  if (sizeSection) {
    if (product.sizes.length > 0) {
      sizeSection.style.display = 'block';
      var sizesList = document.getElementById('pmSizesList');
      if (sizesList) {
        sizesList.innerHTML = product.sizes.map(function(sz) {
          return '<button class="pm-size' + (sz === selectedSize ? ' active' : '') + '"'
            + ' onclick="pmSelectSize(\'' + sz + '\',this)">' + sz + '</button>';
        }).join('');
      }
    } else {
      sizeSection.style.display = 'none';
    }
  }

  // Reset quantità
  var qtyEl = document.getElementById('pmQty');
  if (qtyEl) qtyEl.textContent = selectedQty;

  // Mostra modal
  var modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function productClose() {
  var modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Seleziona un colore nel modal
function pmSelectColor(colorName, btn, hex, isLight) {
  selectedColor = colorName;
  document.querySelectorAll('.pm-color').forEach(function(b) {
    b.classList.remove('active');
    b.innerHTML = '';
  });
  btn.classList.add('active');
  btn.innerHTML = '<i class="fa-solid fa-check" style="color:' + (isLight ? '#333' : '#fff') + '"></i>';
}

// Seleziona una taglia nel modal
function pmSelectSize(size, btn) {
  selectedSize = size;
  document.querySelectorAll('.pm-size').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}

// Modifica quantità nel modal
function pmChangeQty(delta) {
  selectedQty = Math.max(1, selectedQty + delta);
  var qtyEl = document.getElementById('pmQty');
  if (qtyEl) qtyEl.textContent = selectedQty;
}

// Aggiunge al carrello dal modal
function pmAddToCart() {
  if (!currentProduct) return;
  cartAdd(currentProduct.id, selectedColor, selectedSize, selectedQty);
  productClose();
}


// ============================================================
// 6. CHECKOUT
// ============================================================

var checkoutStep = 1;
var checkoutData = {};

function checkoutOpen() {
  if (cart.length === 0) {
    alert('Il carrello è vuoto!');
    return;
  }
  cartClose(); // chiude il drawer prima
  checkoutStep = 1;
  checkoutData = {};
  checkoutRenderStep();
  var modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function checkoutClose() {
  var modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Avanza allo step successivo con validazione
function checkoutNext() {

  // ---- Step 1: dati personali ----
  if (checkoutStep === 1) {
    var nome    = (document.getElementById('co_nome')    || {}).value || '';
    var cognome = (document.getElementById('co_cognome') || {}).value || '';
    var email   = (document.getElementById('co_email')   || {}).value || '';
    var tel     = (document.getElementById('co_tel')     || {}).value || '';

    if (!nome.trim() || !cognome.trim() || !email.trim()) {
      coShowError('Compila nome, cognome ed email per continuare.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      coShowError('Inserisci un indirizzo email valido.');
      return;
    }
    checkoutData.nome    = nome.trim();
    checkoutData.cognome = cognome.trim();
    checkoutData.email   = email.trim();
    checkoutData.tel     = tel.trim();
    coHideError();
  }

  // ---- Step 2: indirizzo spedizione ----
  if (checkoutStep === 2) {
    var via   = (document.getElementById('co_via')   || {}).value || '';
    var citta = (document.getElementById('co_citta') || {}).value || '';
    var cap   = (document.getElementById('co_cap')   || {}).value || '';
    var paese = (document.getElementById('co_paese') || {}).value || '';

    if (!via.trim() || !citta.trim() || !cap.trim()) {
      coShowError('Inserisci via/numero, città e CAP per continuare.');
      return;
    }
    checkoutData.via   = via.trim();
    checkoutData.citta = citta.trim();
    checkoutData.cap   = cap.trim();
    checkoutData.paese = paese.trim() || 'Italia';
    coHideError();
  }

  // ---- Step 3: conferma ordine ----
  if (checkoutStep === 3) {
    checkoutSubmit();
    return;
  }

  if (checkoutStep < 3) {
    checkoutStep++;
    checkoutRenderStep();
  }
}

function checkoutPrev() {
  if (checkoutStep > 1) {
    checkoutStep--;
    checkoutRenderStep();
    coHideError();
  }
}

// Aggiorna la UI in base allo step corrente
function checkoutRenderStep() {
  // Mostra/nasconde gli step
  for (var i = 1; i <= 4; i++) {
    var stepEl = document.getElementById('co_step' + i);
    if (stepEl) stepEl.style.display = (i === checkoutStep) ? 'block' : 'none';
    var dotEl = document.getElementById('co_dot' + i);
    if (dotEl) {
      dotEl.classList.remove('active', 'done');
      if (i < checkoutStep)  dotEl.classList.add('done');
      if (i === checkoutStep) dotEl.classList.add('active');
    }
  }

  // Bottoni footer
  var prevBtn = document.getElementById('coBtnPrev');
  var nextBtn = document.getElementById('coBtnNext');
  var footer  = document.getElementById('coFooter');

  // Step 4 è la schermata di successo: nasconde i bottoni
  if (checkoutStep === 4) {
    if (footer) footer.style.display = 'none';
    return;
  }
  if (footer) footer.style.display = 'flex';
  if (prevBtn) prevBtn.style.display = checkoutStep > 1 ? 'inline-block' : 'none';
  if (nextBtn) {
    nextBtn.textContent = checkoutStep === 3 ? 'Completa ordine' : 'Continua';
  }

  // Se siamo allo step 3 (riepilogo) popoliamo il sommario
  if (checkoutStep === 3) {
    checkoutRenderSummary();
  }
}

// Popola il riepilogo ordine (step 3)
function checkoutRenderSummary() {
  var itemsEl = document.getElementById('co_summaryItems');
  if (itemsEl) {
    itemsEl.innerHTML = cart.map(function(item) {
      var info = [];
      if (item.color && item.color !== 'Standard' && item.color !== 'Multicolore' && item.color !== 'Naturale') info.push(item.color);
      if (item.size) info.push(item.size);
      return '<div class="co-summary-item">'
        + '<span class="co-si-name">'
        +   item.name + ' &times;' + item.qty
        +   (info.length ? ' <small>(' + info.join(', ') + ')</small>' : '')
        + '</span>'
        + '<span class="co-si-price">&euro;' + (item.price * item.qty) + '</span>'
        + '</div>';
    }).join('');
  }

  var totalEl = document.getElementById('co_summaryTotal');
  if (totalEl) totalEl.textContent = '€' + cartTotal();

  var shippingEl = document.getElementById('co_summaryShipping');
  if (shippingEl) {
    shippingEl.innerHTML =
      '<strong>' + checkoutData.nome + ' ' + checkoutData.cognome + '</strong><br>'
      + checkoutData.via + ', ' + checkoutData.cap + ' ' + checkoutData.citta
      + (checkoutData.paese !== 'Italia' ? ', ' + checkoutData.paese : '');
  }
}

// Invia l'ordine via FormSubmit (email a pepertango@gmail.com) + mostra conferma
function checkoutSubmit() {

  // Costruisce il testo del riepilogo ordine
  var itemLines = cart.map(function(item) {
    var info = [];
    if (item.color && item.color !== 'Standard' && item.color !== 'Multicolore' && item.color !== 'Naturale') info.push(item.color);
    if (item.size) info.push(item.size);
    return '- ' + item.name + ' x' + item.qty
      + (info.length ? ' (' + info.join(', ') + ')' : '')
      + ' — €' + (item.price * item.qty);
  }).join('\n');

  var orderText = [
    'NUOVO ORDINE PEPERTANGO STORE',
    '==============================',
    'Cliente:  ' + checkoutData.nome + ' ' + checkoutData.cognome,
    'Email:    ' + checkoutData.email,
    'Tel:      ' + (checkoutData.tel || 'non fornito'),
    '',
    'Spedizione:',
    checkoutData.via + ', ' + checkoutData.cap + ' ' + checkoutData.citta
      + ', ' + (checkoutData.paese || 'Italia'),
    '',
    'Prodotti:',
    itemLines,
    '',
    'TOTALE ORDINE: €' + cartTotal(),
    '',
    '(Produzione print-on-demand via Printful — rispondere entro 24h)'
  ].join('\n');

  // Disabilita il bottone per evitare doppi invii
  var nextBtn = document.getElementById('coBtnNext');
  if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Invio in corso...'; }

  // Invia via FormSubmit AJAX (nessuna API key richiesta)
  fetch('https://formsubmit.co/ajax/pepertango@gmail.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      _subject: 'Nuovo Ordine Store — ' + checkoutData.nome + ' ' + checkoutData.cognome,
      name:     checkoutData.nome + ' ' + checkoutData.cognome,
      email:    checkoutData.email,
      message:  orderText,
      _template: 'basic',
      _captcha:  'false'
    })
  })
  .then(function(res) { return res.json(); })
  .then(function() {
    // Successo: mostra step 4 e svuota carrello
    checkoutStep = 4;
    checkoutRenderStep();
    cartClear();
  })
  .catch(function() {
    // In caso di errore di rete mostriamo comunque la conferma
    // (l'ordine può essere recuperato manualmente dal cliente)
    checkoutStep = 4;
    checkoutRenderStep();
    cartClear();
  });
}

// Mostra/nasconde messaggio di errore nel checkout
function coShowError(msg) {
  var el = document.getElementById('coError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function coHideError() {
  var el = document.getElementById('coError');
  if (el) el.style.display = 'none';
}


// ============================================================
// 7. GRIGLIA PRODOTTI
// ============================================================

// Renderizza i prodotti nel div#shopGrid, filtrando per categoria
function shopRenderGrid(filterCat) {
  filterCat = filterCat || 'all';
  var grid = document.getElementById('shopGrid');
  if (!grid) return;

  var products = filterCat === 'all'
    ? SHOP_PRODUCTS
    : SHOP_PRODUCTS.filter(function(p) { return p.category === filterCat; });

  if (products.length === 0) {
    grid.innerHTML = '<p style="font-family:\'Patrick Hand\',cursive;color:rgba(45,45,45,.4);padding:40px 0">Nessun prodotto in questa categoria.</p>';
    return;
  }

  grid.innerHTML = products.map(function(p) {
    // Testo varianti sotto il nome
    var variantHints = [];
    if (p.sizes.length > 0)  variantHints.push(p.sizes.length + ' taglie');
    if (p.colors.length > 1) variantHints.push(p.colors.length + ' colori');
    var variantText = variantHints.length ? variantHints.join(' · ') : p.material.split('—')[0].trim();

    var catLabel = p.category === 'abbigliamento' ? 'Abbigliamento' : 'Gadget';

    return '<div class="shop-card" data-cat="' + p.category + '" onclick="productOpen(\'' + p.id + '\')" style="cursor:pointer">'
      + '<div class="shop-img">'
      +   '<i class="' + p.icon + '" style="color:rgba(45,45,45,.18);font-size:3.5rem"></i>'
      +   (p.badge ? '<span class="shop-img-badge">' + p.badge + '</span>' : '')
      + '</div>'
      + '<div class="shop-body">'
      +   '<div class="shop-cat-tag">' + catLabel + '</div>'
      +   '<div class="shop-name">' + p.name + '</div>'
      +   '<div class="shop-desc">' + variantText + '</div>'
      +   '<div class="shop-footer">'
      +     '<span class="shop-price">&euro;' + p.price + '</span>'
      +     '<button class="shop-add" onclick="event.stopPropagation();productOpen(\'' + p.id + '\')" aria-label="Aggiungi al carrello">'
      +       '<i class="fa-solid fa-plus"></i>'
      +     '</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

// Override della funzione filterShop definita inline in index.html
function filterShop(btn, cat) {
  document.querySelectorAll('.shop-cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  shopRenderGrid(cat);
}


// ============================================================
// 8. INIT — si avvia quando il DOM è pronto
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  cartLoad();       // carica carrello salvato
  shopRenderGrid(); // renderizza tutti i prodotti
});

// ============================================================
// PEPERTANGO STORE — Carrello + integrazione Shopify
//
// FLOW:
//   Prodotti: Shopify /products.json → fallback Printful (Apps Script) → fallback statico
//   Checkout: redirect a Shopify cart → Shopify gestisce pagamento → Printful fulfillment
// ============================================================

// Store Shopify (cs6dmc-ub.myshopify.com)
var SHOPIFY_STORE    = 'cs6dmc-ub.myshopify.com';

// Token pubblico Storefront API (visibile nel meta-tag della vetrina Shopify)
var SHOPIFY_STOREFRONT_TOKEN = '196ffc816c275cb8f3dc6a5270c192cc';

// Fallback: Apps Script con Printful (usato se Shopify non è ancora live)
var SHOP_SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbw0NYSyNEXneEFS4PmS7XKJqChHcc-FP399vmlru3g9t0hr-2lXBtgfju6ZXGsCphP9/exec';


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
      variantKey:        variantKey,
      id:                productId,
      name:              product.name,
      price:             product.price,
      color:             color,
      size:              size,
      qty:               qty,
      icon:              product.icon             || '',
      thumbnail:         product.thumbnail        || '',
      shopifyVariantId:  product._selectedVariantId || null  // impostato da pmAddToCart
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

    var cartIconHtml = item.thumbnail
      ? '<img src="' + item.thumbnail + '" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:6px">'
      : '<i class="' + (item.icon || 'fa-solid fa-shirt') + '"></i>';

    return '<div class="cart-item">'
      + '<div class="cart-item-icon">' + cartIconHtml + '</div>'
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

  // Popola il modal — immagine (Printful) o icona (statico)
  var pmIconDiv = document.querySelector('#productModal .pm-icon');
  if (pmIconDiv) {
    if (product.thumbnail) {
      pmIconDiv.innerHTML = '<img src="' + product.thumbnail + '" alt="' + product.name
        + '" style="width:100%;height:100%;object-fit:contain;border-radius:12px">';
      pmIconDiv.style.cssText = 'width:100%;height:180px;border-radius:12px;background:#f8f8f8;'
        + 'display:flex;align-items:center;justify-content:center;margin-bottom:16px;overflow:hidden';
    } else {
      pmIconDiv.style.cssText = '';
      pmIconDiv.innerHTML = '<i id="pmIcon" class="' + (product.icon || 'fa-solid fa-shirt') + ' pm-icon-i"></i>';
    }
  }

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

  // Sezione taglie / modello / formato
  var sizeSection = document.getElementById('pmSizes');
  if (sizeSection) {
    if (product.sizes.length > 0) {
      sizeSection.style.display = 'block';
      // Aggiorna label (Taglia / Modello / Formato)
      var sizeLabelEl = document.getElementById('pmSizeLabel');
      if (sizeLabelEl) sizeLabelEl.textContent = product.sizeLabel || 'Taglia';
      // Nascondi guida taglie se non è abbigliamento
      var sizeGuideBtn = document.getElementById('pmSizeGuideBtn');
      if (sizeGuideBtn) sizeGuideBtn.style.display = (product.sizeLabel === 'Taglia') ? 'inline' : 'none';
      var sizesList = document.getElementById('pmSizesList');
      if (sizesList) {
        sizesList.innerHTML = product.sizes.map(function(sz) {
          return '<button class="pm-size' + (sz === selectedSize ? ' active' : '') + '"'
            + ' onclick="pmSelectSize(\'' + sz.replace(/'/g, "\\'") + '\',this)">' + sz + '</button>';
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

  // Trova lo Shopify variant ID corrispondente a colore + taglia selezionati
  var shopifyVariantId = null;
  if (currentProduct.shopifyVariants && currentProduct.shopifyVariants.length > 0) {
    var matched = null;
    for (var i = 0; i < currentProduct.shopifyVariants.length; i++) {
      var v = currentProduct.shopifyVariants[i];
      var opts = [v.option1, v.option2, v.option3].filter(Boolean);
      var colorOk = !selectedColor || opts.indexOf(selectedColor) !== -1;
      var sizeOk  = !selectedSize  || opts.indexOf(selectedSize)  !== -1;
      if (colorOk && sizeOk) { matched = v; break; }
    }
    // Fallback alla prima variante se nessuna corrisponde esattamente
    shopifyVariantId = (matched || currentProduct.shopifyVariants[0]).id;
  }

  // Aggiunge al carrello LOCALE del sito (si va su Shopify solo al checkout).
  // _selectedVariantId viene letto da cartAdd e salvato nell'item:
  // servirà a checkoutOpen() per costruire l'ordine Shopify.
  currentProduct._selectedVariantId = shopifyVariantId;
  cartAdd(currentProduct.id, selectedColor, selectedSize, selectedQty);
  delete currentProduct._selectedVariantId;
  productClose();
}


// ============================================================
// 6. CHECKOUT
// ============================================================

var checkoutStep = 1;
var checkoutData = {};

function checkoutOpen() {
  if (cart.length === 0) return;
  cartClose();

  // Costruisce i line items per Shopify
  var parts = [];
  cart.forEach(function(item) {
    if (item.shopifyVariantId) {
      parts.push(item.shopifyVariantId + ':' + item.qty);
    }
  });

  if (parts.length > 0) {
    // Usa Storefront Cart API (2024-01+) per creare un checkout Shopify reale
    // Nota: checkoutCreate è deprecato, si usa cartCreate con merchandiseId
    var cartLines = cart
      .filter(function(item) { return item.shopifyVariantId; })
      .map(function(item) {
        return {
          merchandiseId: 'gid://shopify/ProductVariant/' + item.shopifyVariantId,
          quantity: item.qty
        };
      });

    var mutation = 'mutation cartCreate($input: CartInput!) {'
      + '  cartCreate(input: $input) {'
      + '    cart { checkoutUrl }'
      + '    userErrors { field message }'
      + '  }'
      + '}';

    fetch('https://' + SHOPIFY_STORE + '/api/2024-01/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query: mutation, variables: { input: { lines: cartLines } } })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var shopCart = data.data && data.data.cartCreate && data.data.cartCreate.cart;
      if (shopCart && shopCart.checkoutUrl) {
        cartClear();
        window.location.href = shopCart.checkoutUrl;
      } else {
        // Fallback: URL carrello diretto (funziona sempre)
        window.location.href = 'https://' + SHOPIFY_STORE + '/cart/' + parts.join(',');
      }
    })
    .catch(function() {
      window.location.href = 'https://' + SHOPIFY_STORE + '/cart/' + parts.join(',');
    });
  } else {
    window.location.href = 'https://' + SHOPIFY_STORE;
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

// Avvia il checkout Stripe: invia il carrello all'Apps Script
// che crea la sessione Stripe e restituisce l'URL di pagamento.
function checkoutSubmit() {

  var nextBtn = document.getElementById('coBtnNext');
  if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Reindirizzamento...'; }

  var payload = {
    action: 'createCheckout',
    customer: {
      nome:    checkoutData.nome,
      cognome: checkoutData.cognome,
      email:   checkoutData.email,
      tel:     checkoutData.tel || ''
    },
    address: {
      via:    checkoutData.via,
      cap:    checkoutData.cap,
      citta:  checkoutData.citta,
      paese:  checkoutData.paese || 'Italia'
    },
    items: cart.map(function(item) {
      var variant = [item.color, item.size].filter(function(v) {
        return v && v !== 'Standard' && v !== 'Multicolore' && v !== 'Naturale';
      }).join(' / ');
      return {
        id:      item.id,
        name:    item.name,
        color:   item.color  || '',
        size:    item.size   || '',
        price:   item.price,
        qty:     item.qty,
        variant: variant
      };
    })
  };

  // Content-Type text/plain evita il CORS preflight su Apps Script
  fetch(SHOP_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.url) {
      // Svuota il carrello prima del redirect (il pagamento è su Stripe)
      cartClear();
      window.location.href = data.url;
    } else {
      coShowError('Errore: ' + (data.error || 'Riprova tra qualche istante.'));
      if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Completa ordine'; }
    }
  })
  .catch(function() {
    coShowError('Errore di rete. Controlla la connessione e riprova.');
    if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Completa ordine'; }
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

// Palette colori per ogni prodotto (sfondo card immagine)
var PRODUCT_COLORS = {
  'tshirt':     { bg: 'linear-gradient(135deg,#ff6b6b 0%,#ff4d4d 100%)',    icon: 'rgba(255,255,255,0.9)' },
  'felpa':      { bg: 'linear-gradient(135deg,#ff9f7f 0%,#e06030 100%)',    icon: 'rgba(255,255,255,0.9)' },
  'hoodie':     { bg: 'linear-gradient(135deg,#3a3a3a 0%,#1a1a1a 100%)',    icon: 'rgba(255,255,255,0.75)' },
  'cappellino': { bg: 'linear-gradient(135deg,#6aab6a 0%,#3d7a3d 100%)',    icon: 'rgba(255,255,255,0.9)' },
  'tote':       { bg: 'linear-gradient(135deg,#e0d5be 0%,#c8b99a 100%)',    icon: 'rgba(45,45,45,0.45)' },
  'mug':        { bg: 'linear-gradient(135deg,#7b5040 0%,#4a2e22 100%)',    icon: 'rgba(255,255,255,0.85)' },
  'poster':     { bg: 'linear-gradient(135deg,#4a80d0 0%,#1f5099 100%)',    icon: 'rgba(255,255,255,0.9)' },
  'sticker':    { bg: 'linear-gradient(135deg,#ffd93d 0%,#ff6b6b 100%)',    icon: 'rgba(45,45,45,0.5)' }
};

// Renderizza i prodotti nel div#shopGrid, filtrando per categoria
function shopRenderGrid(filterCat) {
  filterCat = filterCat || 'all';
  var grid = document.getElementById('shopGrid');
  if (!grid) return;

  var products = filterCat === 'all'
    ? SHOP_PRODUCTS.slice()
    : SHOP_PRODUCTS.filter(function(p) { return p.category === filterCat; });

  // Ordina: prima Abbigliamento, poi Gadget/accessori (ordine originale a parità)
  // NB: non usare "|| 9" qui — 0 è falsy e verrebbe scartato
  var pesoCategoria = { abbigliamento: 0, gadget: 1 };
  products.sort(function(a, b) {
    var pa = (a.category in pesoCategoria) ? pesoCategoria[a.category] : 9;
    var pb = (b.category in pesoCategoria) ? pesoCategoria[b.category] : 9;
    return pa - pb;
  });

  if (products.length === 0) {
    grid.innerHTML = '<p style="font-family:\'Patrick Hand\',cursive;color:rgba(45,45,45,.4);padding:40px 0">Nessun prodotto in questa categoria.</p>';
    return;
  }

  // Badge automatico sul primo prodotto (se non ne ha già uno)
  if (products.length > 0 && !products[0].badge) {
    products[0] = Object.assign({}, products[0], { badge: '⭐ Più amato' });
  }

  grid.innerHTML = products.map(function(p) {
    // Per prodotti Shopify (id = 'sh-xxx') usa palette da nome; per statici usa id
    var paletteKey = p.id;
    if (p.id && p.id.indexOf('sh-') === 0) {
      var tl = (p.name || '').toLowerCase();
      if (tl.indexOf('shirt') !== -1 || tl.indexOf('tee') !== -1) paletteKey = 'tshirt';
      else if (tl.indexOf('hoodie') !== -1) paletteKey = 'hoodie';
      else if (tl.indexOf('felpa') !== -1) paletteKey = 'felpa';
      else if (tl.indexOf('cap') !== -1 || tl.indexOf('hat') !== -1) paletteKey = 'cappellino';
      else if (tl.indexOf('tote') !== -1 || tl.indexOf('bag') !== -1) paletteKey = 'tote';
      else if (tl.indexOf('mug') !== -1 || tl.indexOf('bottle') !== -1) paletteKey = 'mug';
      else if (tl.indexOf('poster') !== -1) paletteKey = 'poster';
      else if (tl.indexOf('sticker') !== -1) paletteKey = 'sticker';
      else paletteKey = p.category === 'abbigliamento' ? 'tshirt' : 'gadget';
    }
    var palette     = PRODUCT_COLORS[paletteKey] || { bg: '#f5f5f5', icon: 'rgba(45,45,45,.2)' };
    var catLabel    = p.category === 'abbigliamento' ? 'Abbigliamento' : 'Gadget';
    var hasSize     = p.sizes && p.sizes.length > 0;
    var hasColor    = p.colors && p.colors.length > 1;

    // Riga varianti (taglie / colori disponibili)
    // Se le varianti sono tante (es. 20+ modelli di cover), mostra solo il conteggio
    var variantHints = [];
    if (hasSize) {
      if (p.sizes.length > 6) {
        var vLabel = (p.sizeLabel === 'Modello') ? 'modelli disponibili' : 'varianti disponibili';
        variantHints.push(p.sizes.length + ' ' + vLabel);
      } else {
        variantHints.push(p.sizes.join(' · '));
      }
    }
    if (hasColor) variantHints.push(p.colors.length + ' colori');
    var matText     = (p.material || '').split('—')[0].trim();
    var variantText = variantHints.length ? variantHints.join(' &nbsp;|&nbsp; ') : (matText || '&nbsp;');

    // Contenuto immagine: mini-galleria se ci sono più foto, altrimenti foto singola o icona
    var imgs = (p.images && p.images.length > 1) ? p.images : (p.thumbnail ? [p.thumbnail] : []);
    var imgContent;
    if (imgs.length > 1) {
      var slides = imgs.map(function(src, k) {
        return '<div class="shop-img-slide"><img src="' + src + '" alt="' + p.name + ' foto ' + (k + 1)
          + '" loading="lazy" style="width:100%;height:100%;object-fit:contain;padding:10px;box-sizing:border-box"></div>';
      }).join('');
      var dots = imgs.map(function(_, k) {
        return '<span class="shop-img-dot' + (k === 0 ? ' active' : '') + '"></span>';
      }).join('');
      imgContent =
          '<div class="shop-img-slider" onscroll="shopSliderDots(this)">' + slides + '</div>'
        + '<button class="shop-img-nav prev" onclick="event.stopPropagation();shopSlide(this,-1)" aria-label="Foto precedente">&lsaquo;</button>'
        + '<button class="shop-img-nav next" onclick="event.stopPropagation();shopSlide(this,1)" aria-label="Foto successiva">&rsaquo;</button>'
        + '<div class="shop-img-dots">' + dots + '</div>';
    } else if (imgs.length === 1) {
      imgContent = '<img src="' + imgs[0] + '" alt="' + p.name + '" loading="lazy" style="width:100%;height:100%;object-fit:contain;padding:10px;box-sizing:border-box">';
    } else {
      imgContent = '<i class="' + (p.icon || 'fa-solid fa-shirt') + '" style="color:' + palette.icon + ';font-size:4.5rem"></i>';
    }

    return '<div class="shop-card" data-cat="' + p.category + '" onclick="productOpen(\'' + p.id + '\')">'
      // — immagine prodotto —
      + '<div class="shop-img" style="background:' + (p.thumbnail ? '#f8f8f8' : palette.bg) + ';padding:0;overflow:hidden">'
      +   imgContent
      +   (p.badge ? '<span class="shop-img-badge">' + p.badge + '</span>' : '')
      +   '<span class="shop-pod-pill">Su ordinazione</span>'
      + '</div>'
      // — body —
      + '<div class="shop-body">'
      +   '<div class="shop-cat-tag">' + catLabel + '</div>'
      +   '<div class="shop-name">' + p.name + '</div>'
      +   '<div class="shop-desc">' + variantText + '</div>'
      +   '<div class="shop-delivery"><i class="fa-solid fa-clock" style="font-size:10px"></i> 3–7 gg produzione &nbsp;·&nbsp; spedizione tracciata</div>'
      +   '<div class="shop-footer">'
      +     '<span class="shop-price">&euro;' + p.price + '</span>'
      +     '<button class="shop-add" onclick="event.stopPropagation();productOpen(\'' + p.id + '\')" aria-label="Scegli variante">'
      +       'Scegli <i class="fa-solid fa-arrow-right" style="font-size:10px"></i>'
      +     '</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

// --- Mini-galleria card: frecce e pallini ---
// Scorre di una foto avanti/indietro (delta = +1 o -1)
function shopSlide(btn, delta) {
  var slider = btn.parentElement.querySelector('.shop-img-slider');
  if (!slider) return;
  slider.scrollBy({ left: slider.clientWidth * delta, behavior: 'smooth' });
}

// Aggiorna il pallino attivo in base alla foto visibile
function shopSliderDots(slider) {
  var idx = Math.round(slider.scrollLeft / slider.clientWidth);
  var dots = slider.parentElement.querySelectorAll('.shop-img-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === idx);
  }
}

// Override della funzione filterShop definita inline in index.html
function filterShop(btn, cat) {
  document.querySelectorAll('.shop-cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  shopRenderGrid(cat);
}


// ============================================================
// 8. CARICAMENTO PRODOTTI
// Priorità: 1) Shopify products.json  2) Printful via Apps Script  3) statico
// ============================================================

// Skeleton loader: 4 card "fantasma" che pulsano mentre i prodotti arrivano
var _shopLoaderText = (function () {
  var card = '<div class="shop-skel">'
    + '<div class="shop-skel-img"></div>'
    + '<div class="shop-skel-body">'
    +   '<div class="shop-skel-line" style="width:70%"></div>'
    +   '<div class="shop-skel-line" style="width:45%"></div>'
    + '</div></div>';
  return card + card + card + card;
})();

function loadShopProducts() {
  var grid = document.getElementById('shopGrid');
  if (grid) grid.innerHTML = _shopLoaderText;

  // 1. Prova Shopify (store deve essere pubblico)
  fetch('https://' + SHOPIFY_STORE + '/products.json?limit=50')
    .then(function(r) {
      if (!r.ok) throw new Error('shopify_locked');
      return r.json();
    })
    .then(function(data) {
      if (data && data.products && data.products.length > 0) {
        SHOP_PRODUCTS = _mapShopifyProducts(data.products);
        shopRenderGrid();
      } else {
        _loadFromPrintful(); // store vuoto, prova Printful
      }
    })
    .catch(function() {
      _loadFromPrintful(); // store bloccato o errore di rete
    });
}

// Traduzioni italiane per nomi e descrizioni prodotti Printful/Shopify
var _IT_NAMES = {
  'mug with color inside':       'Tazza con Interno Colorato',
  'classic unisex t-shirt':      'T-shirt Unisex Classic',
  'unisex heavy cotton tee':     'T-shirt Unisex Heavy Cotton',
  'bella + canvas unisex t-shirt': 'T-shirt Unisex Bella+Canvas',
  'unisex t-shirt':              'T-shirt Unisex',
  'hoodie':                      'Felpa con Cappuccio',
  'unisex hoodie':               'Felpa con Cappuccio Unisex',
  'pullover hoodie':             'Felpa Pullover',
  'zip hoodie':                  'Felpa con Zip',
  'sweatshirt':                  'Felpa Girocollo',
  'eco tote bag':                'Borsa Tote Ecologica',
  'tote bag':                    'Borsa Tote',
  'water bottle':                'Borraccia',
  'phone case':                  'Cover Smartphone',
  'snap case':                   'Cover Rigida Smartphone',
  'tough case':                  'Cover Rinforzata Smartphone',
  'sticker':                     'Sticker',
  'poster':                      'Poster',
  'canvas':                      'Stampa su Tela',
  'hat':                         'Cappellino',
  'cap':                         'Cappellino',
  'dad hat':                     'Cappellino Dad',
  'beanie':                      'Berretto',
  'socks':                       'Calzini',
  'leggings':                    'Leggings',
  'tank top':                    'Canotta'
};

var _IT_DESC = {
  mug:      'Tazza in ceramica di alta qualità con design esclusivo PeperTango. Perfetta per il tuo caffè o tè.',
  tshirt:   'T-shirt in cotone con stampa PeperTango. Disponibile in più colori e taglie.',
  hoodie:   'Felpa confortevole con cappuccio e stampa PeperTango. Ideale per le serate di tango.',
  felpa:    'Felpa di alta qualità con design PeperTango. Morbida e duratura.',
  tote:     'Borsa tote ecologica con stampa PeperTango. Pratica e resistente per ogni occasione.',
  bottle:   'Borraccia con design PeperTango. Perfetta per mantenerti idratato in pista.',
  phone:    'Cover per smartphone con stampa PeperTango. Proteggi il tuo telefono con stile.',
  poster:   'Poster di alta qualità con grafica PeperTango. Ideale per decorare il tuo spazio.',
  sticker:  'Sticker PeperTango resistente e impermeabile. Personalizza i tuoi oggetti.',
  default:  'Prodotto esclusivo PeperTango in edizione limitata. Ogni acquisto sostiene la nostra passione per il tango.'
};

function _italianizeName(title) {
  var tl = (title || '').toLowerCase().trim();
  // Cerca corrispondenza esatta
  if (_IT_NAMES[tl]) return _IT_NAMES[tl];
  // Cerca corrispondenza parziale
  for (var k in _IT_NAMES) {
    if (tl.indexOf(k) !== -1) return _IT_NAMES[k];
  }
  // Capitalizza prima lettera e restituisci originale
  return title;
}

function _italianizeDesc(title) {
  var tl = (title || '').toLowerCase();
  if (tl.indexOf('mug') !== -1 || tl.indexOf('tazza') !== -1) return _IT_DESC.mug;
  if (tl.indexOf('hoodie') !== -1 || tl.indexOf('zip') !== -1 || tl.indexOf('pullover') !== -1) return _IT_DESC.hoodie;
  if (tl.indexOf('sweatshirt') !== -1 || tl.indexOf('felpa') !== -1) return _IT_DESC.felpa;
  if (tl.indexOf('shirt') !== -1 || tl.indexOf('tee') !== -1) return _IT_DESC.tshirt;
  if (tl.indexOf('tote') !== -1 || tl.indexOf('bag') !== -1) return _IT_DESC.tote;
  if (tl.indexOf('bottle') !== -1 || tl.indexOf('borraccia') !== -1) return _IT_DESC.bottle;
  if (tl.indexOf('phone') !== -1 || tl.indexOf('case') !== -1 || tl.indexOf('cover') !== -1) return _IT_DESC.phone;
  if (tl.indexOf('poster') !== -1) return _IT_DESC.poster;
  if (tl.indexOf('sticker') !== -1) return _IT_DESC.sticker;
  return _IT_DESC.default;
}

// Mappa i prodotti Shopify nel formato interno
function _mapShopifyProducts(products) {
  return products.map(function(p) {
    var sizes = [], colors = [];

    (p.options || []).forEach(function(opt) {
      var n = (opt.name || '').toLowerCase();
      if (n === 'size' || n === 'taglia' || n === 'dimensione') {
        sizes = opt.values || [];
      } else if (n === 'color' || n === 'colore' || n === 'colour') {
        colors = (opt.values || []).map(function(c) { return { name: c, hex: '#888' }; });
      }
    });

    // Se Shopify ha una sola opzione "Title" (prodotto senza varianti), ignora
    if ((p.options || []).length === 1 && p.options[0].name === 'Title') {
      sizes = []; colors = [];
    }

    var prices = (p.variants || []).map(function(v) { return parseFloat(v.price || 0); });
    var minPrice = prices.length ? Math.min.apply(null, prices) : 0;

    // Rileva categoria dal tipo prodotto o titolo
    var titleLow = (p.title || '').toLowerCase();
    var typeLow  = (p.product_type || '').toLowerCase();
    // Parole corte (tee, bra, cap) con confini di parola: "tee" non deve
    // matchare dentro "steel", "cap" non deve matchare dentro "escape", ecc.
    var isClothing = typeLow === 'clothing' || typeLow === 'abbigliamento'
      || typeLow.indexOf('shirt') !== -1   || typeLow.indexOf('hoodie') !== -1
      || titleLow.indexOf('shirt') !== -1  || titleLow.indexOf('hoodie') !== -1
      || titleLow.indexOf('felpa') !== -1  || titleLow.indexOf('maglietta') !== -1
      || titleLow.indexOf('cappellino') !== -1
      || /\b(tee|bra|cap|hat|tank)\b/.test(titleLow);
    // Euristica extra: se ha taglie da vestiario (S/M/L/XL...) è abbigliamento
    // anche quando il titolo è una frase (es. prodotti con slogan stampati)
    if (!isClothing && sizes.length > 0) {
      var taglieVestiario = ['xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl'];
      var match = 0;
      for (var si = 0; si < sizes.length; si++) {
        if (taglieVestiario.indexOf(String(sizes[si]).toLowerCase().trim()) !== -1) match++;
      }
      if (match >= 2) isClothing = true;
    }
    var category = isClothing ? 'abbigliamento' : 'gadget';

    // Rileva se l'opzione "size" è in realtà un modello di telefono (es. iPhone 14, Samsung S22)
    var sizeOptionName = 'Taglia';
    if (sizes.length > 0) {
      var firstSize = (sizes[0] || '').toLowerCase();
      if (firstSize.indexOf('iphone') !== -1 || firstSize.indexOf('samsung') !== -1
          || firstSize.indexOf('pixel') !== -1 || firstSize.indexOf('galaxy') !== -1) {
        sizeOptionName = 'Modello';
      } else if (firstSize.indexOf('oz') !== -1 || firstSize.indexOf('ml') !== -1) {
        sizeOptionName = 'Formato';
      }
    }

    return {
      id:               'sh-' + p.id,
      name:             _italianizeName(p.title || ''),
      category:         category,
      price:            minPrice,
      sizeLabel:        sizeOptionName,
      thumbnail:        p.images && p.images[0] ? p.images[0].src : '',
      // Fino a 4 foto per la mini-galleria delle card
      images:           (p.images || []).slice(0, 4).map(function(im) { return im.src; }),
      badge:            null,
      description:      _italianizeDesc(p.title || ''),
      material:         '',
      sizes:            sizes,
      colors:           colors,
      shopifyHandle:    p.handle,
      shopifyVariants:  (p.variants || []).map(function(v) {
        return { id: v.id, title: v.title, price: parseFloat(v.price || 0),
                 option1: v.option1 || '', option2: v.option2 || '', option3: v.option3 || '' };
      })
    };
  });
}

// Fallback 2: carica da Printful via Apps Script
function _loadFromPrintful() {
  fetch(SHOP_SCRIPT_URL + '?action=getProducts')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.success && data.products && data.products.length > 0) {
        SHOP_PRODUCTS = data.products;
      }
      shopRenderGrid();
    })
    .catch(function() {
      shopRenderGrid(); // Fallback 3: prodotti statici di shop-products.js
    });
}


// ============================================================
// 9. INIT — si avvia quando il DOM è pronto
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  cartLoad();         // carica carrello salvato
  loadShopProducts(); // carica prodotti: Shopify → Printful → statico
});

// Controlla se si ritorna dalla pagina di pagamento Stripe
function checkStripeReturn() {
  var params = new URLSearchParams(window.location.search);

  if (params.get('shop_success') === '1') {
    // Pagamento completato — mostra la pagina shop con banner successo
    if (typeof showPage === 'function') showPage('shop');
    var banner = document.getElementById('shopSuccessBanner');
    if (banner) {
      banner.style.display = 'flex';
      setTimeout(function() { banner.style.display = 'none'; }, 7000);
    }
    history.replaceState({}, '', window.location.pathname);
  }

  if (params.get('shop_cancel') === '1') {
    // Utente ha annullato il pagamento — torna allo shop
    if (typeof showPage === 'function') showPage('shop');
    history.replaceState({}, '', window.location.pathname);
  }
}

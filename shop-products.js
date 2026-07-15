// ============================================================
// PEPERTANGO STORE — Catalogo prodotti
// Modifica qui per aggiungere, rimuovere o cambiare prodotti.
// Ogni prodotto verrà renderizzato automaticamente nello shop.
// ============================================================

var SHOP_PRODUCTS = [

  // ---- ABBIGLIAMENTO ----

  {
    id: 'tshirt',
    name: 'T-Shirt PeperTango',
    category: 'abbigliamento',
    price: 35,
    badge: 'Best seller',
    description: '100% cotone organico certificato GOTS. Logo PeperTango serigrafato sul petto. Taglio unisex morbido, lavabile a 30°.',
    material: 'Cotone organico 180g/m²',
    icon: 'fa-solid fa-shirt',
    // Taglie disponibili. Lascia [] se non applicabile.
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    // Colori disponibili. Se c'è un solo colore non compare il selettore.
    colors: [
      { name: 'Nero',   hex: '#1a1a1a' },
      { name: 'Bianco', hex: '#f0f0f0' },
      { name: 'Rosso',  hex: '#ff4d4d' }
    ]
  },

  {
    id: 'felpa',
    name: 'Felpa Girocollo',
    category: 'abbigliamento',
    price: 55,
    badge: null,
    description: 'Felpa girocollo unisex in cotone felpato pesante. Logo PeperTango stampato a trasferimento. Perfetta per le notti di milonga.',
    material: 'Cotone felpato 320g/m²',
    icon: 'fa-solid fa-vest',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Nero',   hex: '#1a1a1a' },
      { name: 'Grigio', hex: '#888888' }
    ]
  },

  {
    id: 'hoodie',
    name: 'Hoodie con Cappuccio',
    category: 'abbigliamento',
    price: 68,
    badge: 'Nuovo',
    description: 'Hoodie unisex premium con cappuccio doppio e tasca a marsupio. Logo PeperTango ricamato. Cerniera in metallo YKK.',
    material: 'Cotone felpato premium 350g/m²',
    icon: 'fa-solid fa-shirt',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Nero',        hex: '#1a1a1a' },
      { name: 'Verde oliva', hex: '#5a6b3a' }
    ]
  },

  {
    id: 'cappellino',
    name: 'Cappellino PeperTango',
    category: 'abbigliamento',
    price: 28,
    badge: null,
    description: 'Berretto con visiera regolabile in cotone twill. Logo PeperTango ricamato frontalmente. Taglia unica, chiusura in velcro.',
    material: 'Cotone twill — taglia unica',
    icon: 'fa-solid fa-hat-cowboy',
    sizes: [], // taglia unica
    colors: [
      { name: 'Nero',  hex: '#1a1a1a' },
      { name: 'Rosso', hex: '#ff4d4d' }
    ]
  },

  // ---- GADGET ----

  {
    id: 'tote',
    name: 'Tote Bag PeperTango',
    category: 'gadget',
    price: 18,
    badge: null,
    description: 'Shopper in cotone naturale non trattato. Logo serigrafato con inchiostri a base d\'acqua. Manici lunghi da spalla. Capiente e resistente.',
    material: 'Cotone naturale 140g — 38×42 cm',
    icon: 'fa-solid fa-bag-shopping',
    sizes: [],
    colors: [
      { name: 'Naturale', hex: '#d4c5a9' }
    ]
  },

  {
    id: 'mug',
    name: 'Mug PeperTango',
    category: 'gadget',
    price: 16,
    badge: null,
    description: 'Tazza in ceramica 330ml con logo PeperTango stampato su entrambi i lati. Lavabile in lavastoviglie. Perfetta per il caffè pre-milonga.',
    material: 'Ceramica — 330ml',
    icon: 'fa-solid fa-mug-hot',
    sizes: [],
    colors: [
      { name: 'Bianco', hex: '#f0f0f0' },
      { name: 'Nero',   hex: '#1a1a1a' }
    ]
  },

  {
    id: 'poster',
    name: 'Poster Festival',
    category: 'gadget',
    price: 25,
    badge: 'Ed. limitata',
    description: 'Stampa artistica 50×70 cm con illustrazione esclusiva MTP27. Carta opaca FSC® 200g. Spedita in tubo rigido. Edizione numerata.',
    material: 'Carta opaca FSC® 200g — 50×70 cm',
    icon: 'fa-solid fa-image',
    sizes: [],
    colors: [
      { name: 'Standard', hex: '#fff9c4' }
    ]
  },

  {
    id: 'sticker',
    name: 'Sticker Pack (5 pz)',
    category: 'gadget',
    price: 9,
    badge: null,
    description: '5 sticker in vinile impermeabile resistenti agli UV. Loghi e illustrazioni PeperTango. Ideali per laptop, bottiglie e borsette. Non lasciano residui.',
    material: 'Vinile impermeabile — set da 5',
    icon: 'fa-solid fa-star',
    sizes: [],
    colors: [
      { name: 'Multicolore', hex: '#ff4d4d' }
    ]
  }

];

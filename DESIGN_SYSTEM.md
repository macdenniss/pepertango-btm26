# 🎨 DESIGN SYSTEM — Dashboard Gestione Camere & Accettazione Ospiti

## 1. PANORAMICA GENERALE

**Filosofia:** Minimalismo funzionale + chiarezza informativa
**Tipo:** SaaS Dashboard per gestione hotel/B&B
**Utenti:** Receptionist, Manager, Staff accettazione
**Obiettivo Primario:** Gestire camere e accettare ospiti con il minor numero di click

---

## 2. PALETTE COLORI

### Colori Primari (Bianco/Grigio)
```
Background Principale:    #FFFFFF (bianco puro)
Superficie Card:         #F8F9FA (grigio molto chiaro)
Testo Primario:          #1A1A1A (grigio scuro quasi nero)
Testo Secondario:        #6B7280 (grigio medio)
Bordi/Linee:             #E5E7EB (grigio leggero)
```

### Colore d'Accento (Non aggressivo)
```
Accento Principale:      #059669 (verde salvia/teale soft)
Accento Hover:           #047857 (verde più scuro)
Accento Light:           #D1FAE5 (verde molto chiaro per background)
```

### Colori Semantici
```
Success/Check-in:        #10B981 (verde brillante ma soft)
Occupato/Alert:          #F59E0B (arancione caldo)
Vuota/Disponibile:       #3B82F6 (blu soft)
In Arrivo/Info:          #8B5CF6 (viola soft)
Manutenzione/Warning:    #EF4444 (rosso soft)
```

### Sfumature di Grigio (Gerarchia)
```
G-100:  #F9FAFB (sfondo molto chiaro)
G-200:  #F3F4F6 (divisori leggeri)
G-300:  #E5E7EB (bordi normali)
G-400:  #D1D5DB (bordi enfatizzati)
G-500:  #6B7280 (testo secondario)
G-600:  #4B5563 (testo terziario)
```

---

## 3. TIPOGRAFIA

### Font Stack (Web-safe + Modern)
```
Titoli/Heading:     -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
Corpo/Body:         'Inter', -apple-system, 'Segoe UI', sans-serif
Monospazio (dati):  'Fira Code', 'SF Mono', monospace
```

### Scale Tipografica
```
H1 (Page Title):     32px | 700 weight | 38px line-height
H2 (Section):        24px | 700 weight | 30px line-height
H3 (Subsection):     18px | 600 weight | 24px line-height
Body (Regular):      14px | 400 weight | 20px line-height
Label (Small):       12px | 500 weight | 16px line-height
Caption (Tiny):      11px | 400 weight | 14px line-height
```

### Kerning & Letter-spacing
```
Titoli:     letter-spacing: -0.5px (compatto, professionali)
Body:       letter-spacing: 0
Labels:     letter-spacing: 0.3px (leggibile)
```

---

## 4. LAYOUT WIREFRAME TESTUALE

```
┌─────────────────────────────────────────────────────────────────┐
│ BRUTIA TANGO FEST 2026 — Dashboard Gestione                 ≡   │
│ (Sidebar toggle minimizzato)                                    │
├──────────┬────────────────────────────────────────────────────────┤
│          │                                                        │
│ SIDEBAR  │  ╔════════════════════════════════════════════════╗   │
│ (280px)  │  ║           KPI INDICATORS (TOP)                ║   │
│          │  ║  ┌──────────┐  ┌──────────┐  ┌──────────┐   ║   │
│          │  ║  │ 87%      │  │ 14 Ospiti│  │ 3 da     │   ║   │
│          │  ║  │ Occupaz. │  │ Attesi   │  │ Preparare│   ║   │
│          │  ║  └──────────┘  └──────────┘  └──────────┘   ║   │
│ ┌──────┐ │  ╚════════════════════════════════════════════════╝   │
│ │ 🏠   │ │                                                        │
│ │ Home │ │  ┌────────────────────────────────────────────────┐   │
│ └──────┘ │  │  📊 VISTA STATO CAMERE                         │   │
│          │  │  [Cerca camera......]  [Filtri ▼]             │   │
│ ┌──────┐ │  │                                                │   │
│ │ 🔑   │ │  │  🛏️ DOPPIA                  🛌 MATRIMONIALE  │   │
│ │Camere│ │  │  ┌─────────────────┐  ┌──────────────────┐  │   │
│ └──────┘ │  │  │ 201 - Libera    │  │ 301 - Occupata   │  │   │
│          │  │  │ ✓ Pulita        │  │ Alessia Rossi    │  │   │
│ ┌──────┐ │  │  │ Arrivo: 15:00   │  │ Check-out: 11:00 │  │   │
│ │ 👥   │ │  │  └─────────────────┘  └──────────────────┘  │   │
│ │Eventi│ │  │  ┌─────────────────┐  ┌──────────────────┐  │   │
│ └──────┘ │  │  │ 202 - Libera    │  │ 302 - In arrivo  │  │   │
│          │  │  │ ⚠️ Manutenzione │  │ Marco Bianchi    │  │   │
│ ┌──────┐ │  │  │ ETA: 14:30      │  │ Arrivo: 16:45    │  │   │
│ │ ✅   │ │  │  └─────────────────┘  └──────────────────┘  │   │
│ │Accett.│ │  │  ┌─────────────────┐  ┌──────────────────┐  │   │
│ └──────┘ │  │  │ 203 - Libera    │  │ 303 - Libera     │  │   │
│          │  │  │ ✓ Pulita        │  │ ✓ Pulita         │  │   │
│ ┌──────┐ │  │  │ Arrivo: 17:00   │  │ Pronta           │  │   │
│ │📊    │ │  │  └─────────────────┘  └──────────────────┘  │   │
│ │Report│ │  │                                                │   │
│ └──────┘ │  └────────────────────────────────────────────────┘   │
│          │                                                        │
│          │  ┌────────────────────────────────────────────────┐   │
│          │  │  ⚡ ACCETTAZIONE RAPIDA EVENTO                │   │
│          │  │                                                │   │
│          │  │  [Cerca ospite/nome...]                        │   │
│          │  │                                                │   │
│          │  │  📋 RISULTATI                                  │   │
│          │  │  ┌──────────────────────────────────────────┐ │   │
│          │  │  │ Luca Rossi (Full Pass 4 giorni)         │ │   │
│          │  │  │ Camera: 201 | Check-in: 15:00           │ │   │
│          │  │  │ [CHECK-IN ✓] [DETTAGLI]                 │ │   │
│          │  │  └──────────────────────────────────────────┘ │   │
│          │  │  ┌──────────────────────────────────────────┐ │   │
│          │  │  │ Marco Bianchi (Weekend 2 giorni)        │ │   │
│          │  │  │ Camera: 302 | Check-in: 16:45           │ │   │
│          │  │  │ [CHECK-IN ✓] [DETTAGLI]                 │ │   │
│          │  │  └──────────────────────────────────────────┘ │   │
│          │  │                                                │   │
│          │  └────────────────────────────────────────────────┘   │
│          │                                                        │
└──────────┴────────────────────────────────────────────────────────┘
```

---

## 5. COMPONENTI SPECIFICI

### 5.1 SIDEBAR NAVIGAZIONE (280px Fixed)
```
┌──────────────────────┐
│ BRUTIA 2026          │ ← Logo/Titolo (18px bold)
│ Tango Fest           │ ← Sottotitolo (11px, G-500)
├──────────────────────┤
│                      │
│ 🏠 Home              │ ← 14px body, hover: G-100 bg + accento colore
│ 🔑 Camere            │
│ 👥 Eventi            │
│ ✅ Accettazione      │
│ 📊 Report            │
│ ⚙️ Impostazioni      │
│                      │
├──────────────────────┤
│ Logout               │ ← 12px, G-500, hover underline
└──────────────────────┘

Spacing: 16px padding (left/right)
Item height: 44px
Icon size: 20px
Separators: 1px G-200
```

### 5.2 KPI INDICATORS (Top Section)
```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│                │ │                │ │                │
│ 87%            │ │ 14 Ospiti      │ │ 3 Camere       │
│ Occupazione    │ │ Attesi         │ │ da Preparare   │
│                │ │                │ │                │
│ Oggi: 12 camere│ │ Per l'evento   │ │ Check-in: 16:00│
│ Occupate       │ │ Brutia         │ │ in avanti      │
└────────────────┘ └────────────────┘ └────────────────┘

Stile KPI:
- Background: F8F9FA (G-100)
- Bordo: 1px G-300
- Padding: 20px
- Border-radius: 8px
- H3 title: 18px 600, G-900
- Subtitle: 13px 400, G-500

Number: 32px 700, Accento (G-059669)
```

### 5.3 ROOM CARDS (Griglia)
```
┌─────────────────────────┐
│ 201                     │ ← Room number (16px bold, G-900)
│ 🛏️ Doppia              │ ← Room type (12px, G-500)
├─────────────────────────┤
│                         │
│ STATUS: LIBERA ✓        │ ← Verde soft, 12px 600
│                         │
│ Pulita                  │ ← 13px, G-600
│ Arrivo: 15:00           │ ← 13px, G-600
│                         │
│ [Assegna] [Modifica]    │ ← Button group
└─────────────────────────┘

Dimensioni:
- Card: 240px width, 200px height
- Padding: 16px
- Gap tra card: 16px
- Bordo: 1px G-300
- Hover: ombra leggera, bordo G-400

Button Assegna:
- Background: Accento (#059669)
- Color: Bianco
- Padding: 8px 16px
- Font: 12px 600
- Border-radius: 6px
- Hover: Accento darker (#047857)
```

### 5.4 ACCETTAZIONE RAPIDA (Search + Results)
```
SEARCH BAR:
┌────────────────────────────────┐
│ 🔍 Cerca ospite/nome...        │
└────────────────────────────────┘
- Padding: 12px 16px
- Border: 1px G-300
- Placeholder: 12px, G-400
- Focus: border Accento, box-shadow leggera

RISULTATI:
┌─────────────────────────────────────────────┐
│ Luca Rossi                                  │ ← 14px 600, G-900
│ Full Pass 4 giorni | Camera 201             │ ← 12px, G-600
│                                             │
│ Check-in: 15:00 | Status: In arrivo        │ ← Badge: arancione soft
│                                             │
│ [CHECK-IN ✓]  [DETTAGLI]                   │ ← Button CTA
└─────────────────────────────────────────────┘

Risultato Item:
- Padding: 16px
- Bordo: 1px G-300
- Margin-bottom: 12px
- Background: bianco
- Hover: G-100 background
```

---

## 6. SPAZIATURA & GRIGLIA

### Sistema di Spacing (8px base)
```
8px   = xs
12px  = sm
16px  = md
20px  = lg
24px  = xl
32px  = 2xl
```

### Griglia
- Max width: 1440px
- Padding contenitore: 24px
- Colonne: Flex (automatico su 3+ colonne card)
- Gap: 16px (standard)

---

## 7. COMPORTAMENTI INTERATTIVI

### Button States
```
Default:  Background Accento, testo bianco
Hover:    Background più scuro, cursore pointer
Active:   Leggera shadow interna
Disabled: Opacity 50%, cursore not-allowed
Loading:  Spinner animato (0.6s rotation)
```

### Animazioni
```
Transizione standard: 150ms ease-out
Hover card: 200ms ease-out (shadow + scale 1.02)
Button click: 100ms ease-out (feedback visivo)
Search results: Fade-in 200ms
```

### Focus & Accessibility
```
Focus rings: 2px outset Accento
Tab order: logico, left→right, top→bottom
Contrast ratio: minimo 4.5:1 (WCAG AA)
```

---

## 8. COMPONENTI RICORRENTI

### Badge Status
```
✓ Libera     → Verde (#10B981)
◐ Occupata   → Arancione (#F59E0B)
⚠ Manutenzione → Rosso (#EF4444)
→ In arrivo  → Viola (#8B5CF6)
? Contattare → Grigio (#6B7280)
```

### Search & Filter
```
Search:   Icona lente, placeholder chiaro, border morbido
Filter:   Dropdown con opzioni (Tipo stanza, Status, Orario)
Reset:    Link grigio sotto filtri
```

### Modals/Dialogs
```
Backdrop: Overlay grigio scuro (40% opacity)
Modal box: 480px max width, border-radius 12px
Padding: 24px
Shadow: Ombra profonda per elevazione
Chiudi (X): Icona G-400, hover accento
```

---

## 9. PALETTE RIASSUNTIVA (QUICK REFERENCE)

| Elemento | Colore | Hex |
|----------|--------|-----|
| Background Principale | Bianco | #FFFFFF |
| Surface | Grigio Chiaro | #F8F9FA |
| Testo Primario | Grigio Scuro | #1A1A1A |
| Testo Secondario | Grigio Medio | #6B7280 |
| Bordi | Grigio Leggero | #E5E7EB |
| Accento CTA | Verde Salvia | #059669 |
| Success/Libera | Verde Brillante | #10B981 |
| Occupato/Alert | Arancione | #F59E0B |
| Disponibile | Blu Soft | #3B82F6 |
| In Arrivo | Viola | #8B5CF6 |
| Manutenzione | Rosso Soft | #EF4444 |

---

## 10. LINEE GUIDA IMPLEMENTATIVE

### ✅ DO (Minimalist Clean)
- Usa whitespace generoso (minimo 16px tra sezioni)
- Una azione primaria per elemento (il resto secondario)
- Icone + testo per chiarezza
- Badge colorate per status immediato
- Transizioni fluide ma brevi (150-200ms)

### ❌ DON'T (Sovraccarico Visivo)
- Non usare più di 2 colori per elemento
- Non mettere più di 3 KPI per riga
- Non usare font size < 11px per body text
- Non usare drop shadow > 8px di blur
- Non fare card > 300px di width
- Non usare animazioni > 400ms

---

## 11. RESPONSIVE BEHAVIOR

### Mobile (< 768px)
- Sidebar: Hamburger menu (collassa)
- KPI: Stack verticale, 100% width
- Room Cards: 1 colonna, full width - 24px
- Font: Aumenta line-height del 20%

### Tablet (768px - 1024px)
- Sidebar: 240px (ridotto)
- Room Cards: 2 colonne
- KPI: Rimane 3 colonne se spazio

### Desktop (> 1024px)
- Sidebar: 280px (standard)
- Room Cards: 3+ colonne auto
- Max container width: 1440px

---

## 12. ESEMPIO CODICE CSS (SNIPPET)

```css
:root {
  --bg-primary: #FFFFFF;
  --bg-surface: #F8F9FA;
  --text-primary: #1A1A1A;
  --text-secondary: #6B7280;
  --border: #E5E7EB;
  --accent: #059669;
  --accent-dark: #047857;
  --success: #10B981;
  --warning: #F59E0B;
  --alert: #EF4444;
  
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  
  --transition: 150ms ease-out;
}

body {
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.btn-primary {
  background-color: var(--accent);
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition);
}

.btn-primary:hover {
  background-color: var(--accent-dark);
}

.card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  transition: box-shadow var(--transition);
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
}

.badge.success {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.badge.warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}
```

---

## CONCLUSIONE

Questo design system enfatizza:
✨ **Chiarezza**: Informazioni ben organizzate, gerarchia visiva forte
🎨 **Semplicità**: Palette limitata, componenti riutilizzabili
⚡ **Velocità**: Accesso rapido alle azioni critiche (check-in, assegnazione)
🌿 **Tranquillità**: Colori soft, spaziatura generosa, niente sovraccarico

Implementando queste linee guida avrai una dashboard professionale, moderna e facilissima da usare per il tuo team.

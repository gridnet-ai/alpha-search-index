# Alpha Search Design System
## Comprehensive UI/UX Design Guide

**Version:** 1.0  
**Last Updated:** March 11, 2026  
**Design Philosophy:** Neomorphic minimalism with conversational UI patterns

---

## Table of Contents

1. [Design Philosophy & Principles](#design-philosophy--principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spatial System](#spatial-system)
5. [Elevation & Shadows (Neomorphism)](#elevation--shadows-neomorphism)
6. [Component Library](#component-library)
7. [Layout States & Transitions](#layout-states--transitions)
8. [Animation & Motion Design](#animation--motion-design)
9. [Conversational UI Patterns](#conversational-ui-patterns)
10. [Responsive Behavior](#responsive-behavior)
11. [Interaction States](#interaction-states)
12. [Accessibility Considerations](#accessibility-considerations)

---

## Design Philosophy & Principles

### Core Concept: **Conversational Search Interface**

Alpha Search employs a **chat-based interaction model** where:
- The interface **transforms** from a centered hero state to a conversation layout
- Results appear as **system messages** in a chat stream
- The search bar **persists at the bottom** after first use
- **Progressive disclosure** through collapsible cards
- **Narrative feedback** during async operations (search, crawl, score)

### Design Pillars

1. **Neomorphic Aesthetics** — Soft, tactile surfaces with subtle depth
2. **Conversational Flow** — Chat-like interaction patterns
3. **Progressive Disclosure** — Information revealed contextually
4. **Kinetic Feedback** — Smooth transitions and micro-animations
5. **Semantic Hierarchy** — Clear visual prioritization of information

---

## Color System

### Base Palette

```css
:root {
  /* Background & Surfaces */
  --bg: #e8eaf0;                    /* Primary background (light gray-blue) */
  --shadow-light: #ffffff;          /* Highlight for neomorphic effects */
  --shadow-dark: #c8cad4;           /* Shadow for neomorphic effects */
  
  /* Accent Colors */
  --accent-blue: #4a8fff;           /* Primary interactive color */
  --accent-green: #34c78a;          /* Success, positive signals */
  --accent-orange: #f0704a;         /* Warning, loading states */
  
  /* Text Hierarchy */
  --text-primary: #1a1c2e;          /* Primary text (dark blue-black) */
  --text-secondary: #5a5f7a;        /* Secondary text (medium gray) */
  --text-tertiary: #8890aa;         /* Tertiary text (light gray) */
}
```

### Semantic Color Assignments

| Color Token | Hex | Usage |
|-------------|-----|-------|
| `--bg` | `#e8eaf0` | Background, card surfaces, button backgrounds |
| `--shadow-light` | `#ffffff` | Top-left neomorphic highlights |
| `--shadow-dark` | `#c8cad4` | Bottom-right neomorphic shadows |
| `--accent-blue` | `#4a8fff` | Primary CTA, links, "Alpha" brand text |
| `--accent-green` | `#34c78a` | Success states, positive scores, live indicators |
| `--accent-orange` | `#f0704a` | Loading states, connecting indicators |
| `--text-primary` | `#1a1c2e` | Headings, domain names, primary labels |
| `--text-secondary` | `#5a5f7a` | Body text, descriptions, secondary labels |
| `--text-tertiary` | `#8890aa` | Hints, metadata, timestamps, placeholders |

### Grade Pill Color System

```css
/* AI Readiness Grade Pills */
.score-grade-pill.ai-native     { background: #e8f5e9; color: #2e7d32; } /* 85-100 */
.score-grade-pill.ai-ready      { background: #e3f2fd; color: #1565c0; } /* 70-84 */
.score-grade-pill.machine-ready { background: #f3e5f5; color: #6a1b9a; } /* 50-69 */
.score-grade-pill.listed        { background: #fff3e0; color: #e65100; } /* 20-49 */
.score-grade-pill.not-ready     { background: #fce4ec; color: #c62828; } /* 0-19 */
.score-grade-pill.error         { background: #f5f5f5; color: #757575; } /* Error state */
```

### Gradient Applications

```css
/* Progress Bar Fill */
background: linear-gradient(90deg, var(--accent-blue), var(--accent-green));

/* Bottom Search Bar Fade */
background: linear-gradient(to top, var(--bg) 70%, transparent);

/* Session Separator */
background: linear-gradient(90deg, transparent, var(--shadow-dark), transparent);
```

---

## Typography

### Font Families

**Primary Font:** `DM Sans` — Geometric sans-serif for UI text  
**Monospace Font:** `DM Mono` — Monospace for technical content, metadata

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Font Family | Size | Weight | Line Height | Letter Spacing | Color |
|---------|-------------|------|--------|-------------|----------------|-------|
| **Hero Logo (Desktop)** | DM Sans | 48px | 300 (Search), 500 (Alpha) | 1 | -0.02em | Blue + Primary |
| **Hero Logo (Mobile)** | DM Sans | 36px | 300/500 | 1 | -0.02em | Blue + Primary |
| **Hero Logo (Shifted)** | DM Sans | 28px | 300/500 | 1 | -0.02em | Blue + Primary |
| **Tagline** | DM Mono | 11px | 400 | — | 0.18em | Tertiary |
| **Status Pill** | DM Mono | 11px | 400 | — | 0.02em | Secondary |
| **Score Big Number** | DM Mono | 44px | 500 | 1 | — | Primary |
| **Score Big (Compact)** | DM Mono | 28px | 500 | 1 | — | Primary |
| **Score Big (Mobile)** | DM Mono | 18px | 500 | 1 | — | Primary |
| **Score Label** | DM Mono | 10px | 400 | — | — | Tertiary |
| **Domain Name** | DM Sans | 17px | 600 | — | — | Primary |
| **Domain (Mobile)** | DM Sans | 11px | 600 | 1.2 | — | Primary |
| **Aggregate Query** | DM Sans | 19px | 600 | — | — | Primary |
| **Check Name** | DM Sans | 13px | 500 | — | — | Primary |
| **Check Sub** | DM Mono | 10px | 400 | — | — | Tertiary |
| **Check Points** | DM Mono | 11px | 500 | — | — | Green/Tertiary |
| **Search Input** | DM Mono | 14px | 400 | — | — | Primary |
| **Search Button** | DM Sans | 14px | 500 | — | — | White |
| **Card Button** | DM Sans | 12px | 400 | — | — | Secondary |
| **Hint Text** | DM Mono | 11px | 400 | — | 0.06em | Tertiary |
| **Footer** | DM Mono | 11px | 400 | — | 0.06em | Tertiary |
| **Breakdown Title** | DM Mono | 10px | 400 | — | 0.12em | Tertiary |
| **Suggestion Text** | DM Sans | 13px | 400 | — | — | Secondary |
| **Suggestion Boost** | DM Mono | 11px | 400 | — | — | Green |

### Text Transforms

- **Tagline:** `text-transform: uppercase;`
- **Breakdown Titles:** `text-transform: uppercase;`
- **Status Pills:** No transform

---

## Spatial System

### Spacing Scale (8px base unit)

```
4px   → Micro spacing (gaps in pills, icon margins)
6px   → Pill padding vertical
8px   → Small gaps (favicon-to-text)
10px  → Check row padding vertical
12px  → Medium gaps, card internal spacing
14px  → Inset padding for suggestions
16px  → Standard card padding (mobile)
18px  → Bubble padding, score header margin
20px  → Input horizontal padding, card padding (desktop)
24px  → Large card padding, page padding
28px  → Status bar top padding, hero bottom padding
32px  → Hero top padding (shifted), session separator margin
48px  → Hero logo to search spacing
```

### Container Widths

```css
/* Chat Area & Search Container */
max-width: 660px;

/* Search Wrap (Center State) */
width: calc(100% - 48px);  /* Desktop */
width: calc(100% - 32px);  /* Mobile */

/* Score Cards */
width: 100%;  /* Full width within chat area */
```

### Border Radius Scale

```
4px   → Progress bar inner fill
8px   → Favicon border radius
10px  → Check rows, search button
12px  → Suggestions container, status bubble
14px  → Search box
18px  → User bubble, typing indicator
20px  → Score cards, aggregate cards, pills, card buttons
```

---

## Elevation & Shadows (Neomorphism)

### Shadow Definitions

```css
/* Raised Elements (buttons, cards) */
--neu-raised: 6px 6px 14px #c8cad4, -6px -6px 14px #ffffff;

/* Inset Elements (search box, progress bar) */
--neu-inset: inset 4px 4px 10px #c8cad4, inset -4px -4px 10px #ffffff;

/* Flat Elements (check rows) */
--neu-flat: 2px 2px 6px #c8cad4, -2px -2px 6px #ffffff;

/* Small Raised (status pills, card buttons) */
--neu-sm: 3px 3px 8px #c8cad4, -3px -3px 8px #ffffff;

/* Primary Button Shadow (blue glow) */
box-shadow: 3px 3px 8px rgba(74,143,255,0.35);
```

### Elevation Hierarchy (Z-Index)

```
z-index: 1   → Default layer (content)
z-index: 10  → Search bar (fixed bottom)
z-index: 100 → Modals, overlays (future use)
```

### Surface Applications

| Element | Shadow Type | Background | Use Case |
|---------|-------------|------------|----------|
| Score Cards | `--neu-raised` | `var(--bg)` | Primary content cards |
| Search Box | `--neu-inset` | `var(--bg)` | Input field container |
| Search Button | Custom blue glow | `--accent-blue` | Primary CTA |
| Status Pills | `--neu-sm` | `var(--bg)` | Metadata badges |
| Check Rows | `--neu-flat` | `var(--bg)` | List items |
| Card Buttons | `--neu-sm` | `var(--bg)` | Secondary actions |
| User Bubbles | `--neu-raised` | `var(--bg)` | User input display |

---

## Component Library

### 1. Status Bar

**Location:** Top of viewport  
**State:** Persistent  
**Purpose:** System status indicator

```css
.status-bar {
  display: flex;
  justify-content: center;
  padding: 28px 0 0;
  transition: opacity 0.4s;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 16px;
  border-radius: 20px;
  box-shadow: var(--neu-sm);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-orange);  /* Loading */
  animation: pulse 2s infinite;
}

.status-dot.live {
  background: var(--accent-green);  /* Connected */
}
```

**States:**
- **Connecting:** Orange dot, pulsing, "Connecting..."
- **Live:** Green dot, pulsing, "Index live · 2.4M domains"

**Animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
```

---

### 2. Hero Logo

**Location:** Center (initial), Top (after first search)  
**State:** Transforms on first interaction  
**Purpose:** Brand identity and spatial anchor

```css
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero.shifted {
  flex: 0;
  padding-top: 32px;
  padding-bottom: 0;
  justify-content: flex-start;
}

.logo {
  font-size: 48px;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 12px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero.shifted .logo {
  font-size: 28px;
  margin-bottom: 6px;
}

.logo .alpha { color: var(--accent-blue); font-weight: 500; }
.logo .search { color: var(--text-primary); font-weight: 300; }
```

**Responsive Sizes:**
- **Desktop:** 48px → 28px (shifted)
- **Mobile:** 36px → 28px (shifted)
- **Extra Small:** 32px

---

### 3. Search Bar

**Location:** Center (hero state), Fixed bottom (conversation state)  
**State:** Transforms after first use  
**Purpose:** Primary input mechanism

```css
/* Container States */
.search-wrap.center {
  max-width: 660px;
  width: calc(100% - 48px);
  margin: 32px auto 0;
}

.search-wrap.bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  max-width: 100%;
  padding: 12px 24px 20px;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}

/* Search Box */
.search-box {
  display: flex;
  align-items: center;
  border-radius: 14px;
  box-shadow: var(--neu-inset);
  padding: 4px 4px 4px 20px;
  gap: 8px;
  background: var(--bg);
}

/* Input Field */
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  padding: 14px 0;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  font-family: 'DM Mono', monospace;
}

/* Primary Button */
.search-btn {
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 28px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 3px 3px 8px rgba(74,143,255,0.35);
  transition: all 0.15s;
  white-space: nowrap;
}

.search-btn:hover {
  background: #3d7fee;
  transform: translateY(-1px);
}

.search-btn:active {
  transform: translateY(0);
  box-shadow: inset 2px 2px 6px rgba(0,0,0,0.15);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Scanning State */
.search-btn.scanning {
  background: var(--bg);
  color: var(--accent-blue);
  box-shadow: var(--neu-inset);
}
```

**Button Text States:**
- **Default:** "Check"
- **URL Scanning:** "Scanning..."
- **Name Searching:** "Searching..."

**Gradient Overlay:**
The bottom-fixed search bar has a gradient fade to prevent content from appearing behind it abruptly:
```css
background: linear-gradient(to top, var(--bg) 70%, transparent);
```

---

### 4. Chat Area

**Location:** Below hero, above fixed search bar  
**State:** Hidden initially, fades in after first search  
**Purpose:** Conversational output stream

```css
.chat-area {
  max-width: 660px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 24px 120px;  /* Bottom padding for fixed search bar */
  display: flex;
  flex-direction: column;
  gap: 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.chat-area.visible {
  opacity: 1;
  pointer-events: all;
}
```

**Child Elements:**
- User bubbles (input echo)
- System bubbles (results)
- Typing indicators
- Session separators

---

### 5. User Bubble

**Purpose:** Echo user input in chat stream

```css
.bubble-user {
  align-self: flex-end;
  background: var(--bg);
  box-shadow: var(--neu-raised);
  border-radius: 18px 18px 4px 18px;  /* Tail on bottom-right */
  padding: 10px 18px;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 80%;
  word-break: break-all;
}
```

**Characteristics:**
- Aligned to right
- Rounded corners with tail (4px) on bottom-right
- Monospace font for URLs/names
- Neomorphic raised shadow

---

### 6. Typing Indicator

**Purpose:** Loading state during async operations

```css
.typing-indicator {
  display: none;
  align-self: flex-start;
  padding: 12px 18px;
  background: var(--bg);
  box-shadow: var(--neu-raised);
  border-radius: 18px 18px 18px 4px;  /* Tail on bottom-left */
}

.typing-indicator.visible {
  display: flex;
  gap: 5px;
  align-items: center;
}

.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-blue);
  opacity: 0.4;
  animation: typedot 1.2s ease infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typedot {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
```

**Usage:**
- Appears while waiting for API response
- Three dots with staggered animation
- Removed when result arrives

---

### 7. Score Card (URL Check)

**Purpose:** Display AI readiness score for a single domain

**Structure:**
```
┌─────────────────────────────────────────┐
│ [Favicon] Domain Name                   │
│           Grade Pill                    │  ← Header
│           Cached Badge                  │
│                                    85   │
│                                   /100  │
│                          AI Readiness   │
├─────────────────────────────────────────┤
│ ████████████████░░░░░░░░░░░░░░░░░░░░   │  ← Progress Bar
├─────────────────────────────────────────┤
│ MACHINE PROFILE                         │
│ ✓ JSON-LD          +10 pts              │
│ ✓ llms.txt         +12 pts              │  ← Check Rows
│ ✓ OpenAPI Spec     +13 pts              │
│ ✗ MCP Endpoint      0 pts               │
├─────────────────────────────────────────┤
│ WHAT TO DO NEXT                         │
│ → Deploy an MCP endpoint  +15 pts       │  ← Suggestions
├─────────────────────────────────────────┤
│ [↗ Share Score] [✦ Claim Listing]      │  ← Actions
└─────────────────────────────────────────┘
```

**CSS:**
```css
.score-card {
  background: var(--bg);
  border-radius: 20px;
  box-shadow: var(--neu-raised);
  padding: 24px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.domain-favicon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  box-shadow: var(--neu-sm);
  object-fit: cover;
}

.score-domain {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.score-grade-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.score-number {
  text-align: right;
}

.score-big {
  font-family: 'DM Mono', monospace;
  font-size: 44px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}

.score-big span {
  font-size: 18px;
  color: var(--text-tertiary);
}

.score-label {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 3px;
  font-family: 'DM Mono', monospace;
}
```

**"Could Not Score" State:**
When a domain times out or is unreachable:
```html
<div class="score-big">
  <span style="font-size: 24px;">—</span>
</div>
<div class="score-label">Could Not Score</div>
```

---

### 8. Score Card (Collapsible - Name Search)

**Purpose:** Compact, expandable cards for name search results

**Collapsed State:**
```
┌─────────────────────────────────────────┐
│ [Fav] Page Title                    28  │
│       domain.com                   /100 │
│       ● AI Ready  [cached]           ▼  │
└─────────────────────────────────────────┘
```

**Expanded State:**
```
┌─────────────────────────────────────────┐
│ [Fav] Page Title                    28  │
│       domain.com                   /100 │
│       ● AI Ready  [cached]           ▲  │
├─────────────────────────────────────────┤
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│ MACHINE PROFILE                         │
│ ✓ JSON-LD          +10 pts              │
│ ...                                     │
└─────────────────────────────────────────┘
```

**CSS:**
```css
.score-card.collapsible {
  cursor: pointer;
}

.score-header-compact {
  padding: 10px 16px;
  transition: all 0.3s ease;
}

.score-header-compact:hover {
  background: rgba(255,255,255,0.3);
  border-radius: 16px;
}

.expand-icon {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.3s ease;
  margin-left: 8px;
}

.score-card.collapsible[data-expanded="true"] .expand-icon {
  transform: rotate(180deg);
}

.score-details {
  padding: 0 20px 20px;
  overflow: hidden;
  transition: all 0.4s ease;
}
```

**Interaction:**
- Click anywhere on header to toggle
- Hover shows subtle background highlight
- Expand icon rotates 180° when open
- Progress bar animates on first expand

---

### 9. Aggregate Card (Name Search Summary)

**Purpose:** Display average AI readiness across all found pages

**Structure:**
```
┌─────────────────────────────────────────┐
│ "Laterrance French"                     │
│ 7 pages found across the web            │
│                                    15   │
│                                   /100  │
│                     Avg. AI Readiness   │
├─────────────────────────────────────────┤
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
├─────────────────────────────────────────┤
│ ● Not AI Ready — AI Presence            │
├─────────────────────────────────────────┤
│ 💡 TO REACH 50+ ("MACHINE READY")       │
│ Add llms.txt (+12 pts), JSON-LD         │
│ (+10 pts), or OpenAPI spec (+13 pts)... │
├─────────────────────────────────────────┤
│ [↗ Share Score]                         │
└─────────────────────────────────────────┘
```

**CSS:**
```css
.aggregate-card {
  background: var(--bg);
  border-radius: 20px;
  box-shadow: var(--neu-raised);
  padding: 24px;
}

.aggregate-query {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.aggregate-sub {
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  color: var(--text-secondary);
}
```

**Recommendations:**
Contextual advice based on score range:
- **< 50:** "To Reach 50+ (Machine Ready)"
- **50-69:** "To Reach 70+ (AI Ready)"
- **70+:** "Leading the AI-Native Web"

---

### 10. Progress Bar

**Purpose:** Visual representation of score

```css
.score-bar-bg {
  height: 7px;
  border-radius: 4px;
  box-shadow: var(--neu-inset);
  overflow: hidden;
  margin-bottom: 20px;
}

.score-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-green));
  transition: width 1.2s cubic-bezier(0.4,0,0.2,1);
}
```

**Animation:**
- Initial width: `0%`
- Animates to score percentage after 100ms delay
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out)
- Duration: `1.2s`

---

### 11. Check Rows

**Purpose:** Display individual machine profile checks

```css
.check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 10px;
  margin-bottom: 5px;
  box-shadow: var(--neu-flat);
}

.check-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.check-icon.pass {
  background: #e8f5e9;
  color: #2e7d32;
}

.check-icon.fail {
  background: #fce4ec;
  color: #c62828;
}

.check-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.check-sub {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: 'DM Mono', monospace;
}

.check-pts {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
}

.check-pts.pos {
  color: var(--accent-green);
}

.check-pts.zero {
  color: var(--text-tertiary);
}
```

**Check Definitions:**
| Check | Name | Description | Points |
|-------|------|-------------|--------|
| `jsonLd` | JSON-LD | Structured data in page `<head>` | +10 pts |
| `llmsTxt` | llms.txt | AI welcome file at `/llms.txt` | +12 pts |
| `openApi` | OpenAPI Spec | Machine-readable API docs | +13 pts |
| `mcp` | MCP Endpoint | Live agent-callable endpoint | +15 pts |

---

### 12. Suggestions Panel

**Purpose:** Actionable recommendations for improvement

```css
.suggestions {
  border-radius: 12px;
  box-shadow: var(--neu-inset);
  padding: 14px 16px;
  margin-top: 14px;
}

.suggestions-title {
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(90,95,122,0.08);
  font-size: 13px;
  color: var(--text-secondary);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-arrow {
  color: var(--accent-blue);
  font-size: 13px;
  flex-shrink: 0;
}

.suggestion-boost {
  margin-left: auto;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--accent-green);
  white-space: nowrap;
}
```

**Logic:**
- Only shows for missing checks
- Displays corresponding suggestion from `suggestions` object
- Shows potential point gain

---

### 13. Card Actions

**Purpose:** Secondary actions on score cards

```css
.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: 20px;
  border: none;
  background: var(--bg);
  box-shadow: var(--neu-sm);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.card-btn:hover {
  box-shadow: var(--neu-raised);
  color: var(--accent-blue);
}
```

**Button Types:**
- **Share Score:** `↗ Share Score` — Triggers native share or clipboard copy
- **Claim Listing:** `✦ Claim Listing` — (Future functionality)
- **View Page:** `↗ View Page` — Opens source URL in new tab

---

### 14. Status Narrative Bubble

**Purpose:** Real-time progress updates during name search

```html
<div class="bubble-system status-narrative" style="padding: 16px 20px; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <div class="typing-indicator visible" style="margin: 0;">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
    <div>
      <div class="status-main" style="font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">
        Finding pages for "query"...
      </div>
      <div class="status-sub" style="font-size: 11px; color: var(--text-tertiary); font-family: 'DM Mono', monospace;">
        Searching the web
      </div>
    </div>
  </div>
</div>
```

**Narrative Progression:**
1. **"Finding pages for [query]..."** — "Searching the web"
2. **"Found X pages"** — "Crawling each site for AI readiness signals..."
3. **"Analyzing X sites"** — "Checking for JSON-LD, llms.txt, OpenAPI, MCP"
4. **"✓ Scored X sites"** — "Average AI Readiness: X/100"

**Duration:**
- Step 1 → 2: Immediate (API response)
- Step 2 → 3: 600ms delay
- Step 3 → 4: 800ms delay
- Step 4 → Remove: 400ms delay

---

### 15. Session Separator

**Purpose:** Visual divider between multiple searches

```javascript
const separator = document.createElement('div');
separator.style.cssText = 'margin: 32px 0; height: 1px; background: linear-gradient(90deg, transparent, var(--shadow-dark), transparent); opacity: 0.3;';
chatArea.appendChild(separator);
```

**Characteristics:**
- 1px height
- Gradient fade (transparent → shadow-dark → transparent)
- 30% opacity
- 32px vertical margin

---

### 16. Crawled Badge

**Purpose:** Indicate data freshness

```css
.crawled-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(52,199,138,0.1);
  border: 1px solid rgba(52,199,138,0.2);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--accent-green);
  margin-top: 6px;
}

.crawled-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-green);
}
```

**States:**
- **"just now"** — Fresh crawl
- **"cached"** — Retrieved from Firestore

---

### 17. Favicon Display

**Purpose:** Visual domain identification

```html
<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" 
     alt="${domain}" 
     class="domain-favicon" 
     onerror="this.style.display='none'">
```

```css
.domain-favicon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  box-shadow: var(--neu-sm);
  object-fit: cover;
}
```

**Fallback:**
- If favicon fails to load, `onerror` hides the element
- Uses Google's favicon service

---

## Layout States & Transitions

### State 1: Hero (Initial)

**Characteristics:**
- Logo centered vertically and horizontally
- Search bar below logo (centered)
- Hint text visible
- Footer visible
- Chat area hidden

**CSS:**
```css
.hero {
  flex: 1;  /* Takes up available vertical space */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.search-wrap.center {
  max-width: 660px;
  width: calc(100% - 48px);
  margin: 32px auto 0;
}

.chat-area {
  opacity: 0;
  pointer-events: none;
}
```

---

### State 2: Conversation (After First Search)

**Characteristics:**
- Logo shifted to top (smaller)
- Search bar fixed to bottom with gradient fade
- Hint text hidden
- Footer hidden
- Chat area visible

**Transition Function:**
```javascript
function shiftLayout() {
  if (shifted) return;
  shifted = true;

  const hero = document.getElementById('hero');
  const searchWrap = document.getElementById('searchWrap');
  const hintText = document.getElementById('hintText');
  const footer = document.getElementById('footer');
  const chatArea = document.getElementById('chatArea');

  hero.classList.add('shifted');

  // Detach search from heroBottom, fix to bottom
  searchWrap.classList.remove('center');
  searchWrap.classList.add('bottom');
  document.body.appendChild(searchWrap);

  hintText.style.display = 'none';
  footer.style.opacity = '0';
  footer.style.pointerEvents = 'none';

  chatArea.classList.add('visible');
}
```

**CSS:**
```css
.hero.shifted {
  flex: 0;  /* No longer takes vertical space */
  padding-top: 32px;
  padding-bottom: 0;
  justify-content: flex-start;
}

.search-wrap.bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px 20px;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}

.chat-area.visible {
  opacity: 1;
  pointer-events: all;
}
```

**Transition Properties:**
- **Hero:** `all 0.6s cubic-bezier(0.4, 0, 0.2, 1)`
- **Logo:** `all 0.5s cubic-bezier(0.4, 0, 0.2, 1)`
- **Chat Area:** `opacity 0.3s`
- **Footer:** `opacity 0.4s`

---

## Animation & Motion Design

### Easing Functions

```css
/* Standard ease-out (most transitions) */
cubic-bezier(0.4, 0, 0.2, 1)

/* Linear (progress bars, rotations) */
linear

/* Ease (default for simple fades) */
ease

/* Infinite loops (pulse, typing dots) */
infinite
```

---

### Micro-Animations

#### 1. Status Dot Pulse

```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.status-dot {
  animation: pulse 2s infinite;
}
```

**Duration:** 2s  
**Loop:** Infinite  
**Effect:** Opacity 1 → 0.5 → 1, Scale 1 → 0.8 → 1

---

#### 2. Typing Dots

```css
@keyframes typedot {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}

.typing-dot {
  animation: typedot 1.2s ease infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
```

**Duration:** 1.2s  
**Loop:** Infinite  
**Stagger:** 0.2s delay between dots  
**Effect:** Opacity 0.4 → 1 → 0.4, Scale 0.8 → 1.1 → 0.8

---

#### 3. Card Slide-Up

```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bubble-system {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}
```

**Duration:** 0.4s  
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`  
**Effect:** Fades in while sliding up 12px

---

#### 4. Progress Bar Fill

```css
.score-bar-fill {
  transition: width 1.2s cubic-bezier(0.4,0,0.2,1);
}
```

**Trigger:**
```javascript
setTimeout(() => {
  const bar = document.getElementById(barId);
  if (bar) bar.style.width = data.score + '%';
}, 100);
```

**Duration:** 1.2s  
**Delay:** 100ms after card render  
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`

---

#### 5. Button Hover

```css
.search-btn {
  transition: all 0.15s;
}

.search-btn:hover {
  background: #3d7fee;
  transform: translateY(-1px);
}

.search-btn:active {
  transform: translateY(0);
  box-shadow: inset 2px 2px 6px rgba(0,0,0,0.15);
}
```

**Hover:** Darkens blue, lifts 1px  
**Active:** Returns to baseline, inset shadow (pressed effect)  
**Duration:** 0.15s

---

#### 6. Card Button Hover

```css
.card-btn {
  transition: all 0.2s;
}

.card-btn:hover {
  box-shadow: var(--neu-raised);
  color: var(--accent-blue);
}
```

**Hover:** Elevates shadow, changes text to blue  
**Duration:** 0.2s

---

#### 7. Collapsible Card Expand Icon

```css
.expand-icon {
  transition: transform 0.3s ease;
}

.score-card.collapsible[data-expanded="true"] .expand-icon {
  transform: rotate(180deg);
}
```

**Effect:** Rotates 180° when card expands  
**Duration:** 0.3s

---

#### 8. Collapsible Card Hover

```css
.score-header-compact {
  transition: all 0.3s ease;
}

.score-header-compact:hover {
  background: rgba(255,255,255,0.3);
  border-radius: 16px;
}
```

**Effect:** Subtle white overlay on hover  
**Duration:** 0.3s

---

#### 9. Staggered Card Reveal (Name Search)

```javascript
data.results.forEach((result, i) => {
  setTimeout(() => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble-system';
    bubble.innerHTML = buildScoreCard(result.domain, result, result.pageTitle, result.pageUrl, true);
    chatArea.appendChild(bubble);
    scrollBottom();
  }, i * 80);
});
```

**Delay:** 80ms between each card  
**Effect:** Cards appear sequentially, not all at once

---

## Conversational UI Patterns

### Pattern 1: User Input Echo

**Flow:**
1. User enters query
2. Query is echoed as a user bubble (right-aligned)
3. System responds below

**Purpose:** Provides context in scrollable chat history

---

### Pattern 2: Typing Indicator

**Flow:**
1. User submits query
2. Typing indicator appears immediately
3. Indicator removed when result arrives

**Purpose:** Communicates system is processing

---

### Pattern 3: Status Narrative (Name Search)

**Flow:**
1. User submits name query
2. Status bubble appears with typing dots
3. Status updates in real-time:
   - "Finding pages..."
   - "Found X pages"
   - "Analyzing X sites"
   - "✓ Scored X sites"
4. Status bubble removed
5. Results appear

**Purpose:** Transparency into multi-step async process

---

### Pattern 4: Progressive Disclosure (Collapsible Cards)

**Flow:**
1. Multiple results appear collapsed
2. User clicks to expand individual cards
3. Details revealed with animation

**Purpose:** Reduce cognitive load, allow user-driven exploration

---

### Pattern 5: Session Separation

**Flow:**
1. User completes first search
2. User initiates second search
3. Separator line added before new user bubble

**Purpose:** Visual grouping of search sessions

---

## Responsive Behavior

### Breakpoints

```css
/* Tablet and below */
@media (max-width: 768px) { ... }

/* Extra small devices (iPhone SE, small phones) */
@media (max-width: 400px) { ... }
```

---

### Mobile Adjustments (≤768px)

| Element | Desktop | Mobile |
|---------|---------|--------|
| **Hero Padding** | `flex: 1` (centered) | `padding-top: 60px` |
| **Logo Size** | 48px | 36px |
| **Status Pill Font** | 11px | 10px |
| **Search Wrap Width** | `calc(100% - 48px)` | `calc(100% - 32px)` |
| **Search Input Font** | 14px | 13px |
| **Search Button Padding** | 12px 28px | 10px 20px |
| **Chat Area Padding** | 24px 24px 120px | 16px 16px 100px |
| **Score Card Padding** | 24px | 16px |
| **Score Header** | Row | Column |
| **Domain Favicon** | 32px | 18px |
| **Domain Name Font** | 17px | 11px |
| **Grade Pill Font** | 12px | 8px |
| **Score Big (Compact)** | 28px | 18px |
| **Expand Icon Margin** | 8px | 2px |

---

### Extra Small Adjustments (≤400px)

| Element | Mobile | Extra Small |
|---------|--------|-------------|
| **Hero Padding Top** | 60px | 40px |
| **Logo Size** | 36px | 32px |
| **Search Button Padding** | 10px 20px | 10px 16px |
| **Search Button Font** | 13px | 12px |

---

### Mobile-Specific Fixes

#### Issue: Score Numbers Overflow

**Solution:**
```css
@media (max-width: 768px) {
  .score-number-compact {
    flex-shrink: 0;
    min-width: 60px;
    max-width: 60px;
    text-align: right;
  }

  .score-number-compact .score-big {
    font-size: 18px;
    white-space: nowrap;
    line-height: 1;
  }

  .score-domain {
    font-size: 11px !important;
    word-break: break-word;
    line-height: 1.2;
  }
}
```

**Techniques:**
- `flex-shrink: 0` — Prevents score number from shrinking
- `min-width` / `max-width` — Guarantees space for score
- `white-space: nowrap` — Prevents score from wrapping
- `word-break: break-word` — Allows long domains to wrap

---

## Interaction States

### Search Input

| State | Appearance |
|-------|------------|
| **Default** | Placeholder: "enter a url or name to search..." |
| **Focus** | Outline: none (no visible change) |
| **Disabled** | `disabled: true` during search |
| **After Search** | Value cleared, re-enabled |

---

### Search Button

| State | Text | Background | Shadow |
|-------|------|------------|--------|
| **Default** | "Check" | Blue | Blue glow |
| **Hover** | "Check" | Darker blue | Blue glow |
| **Active** | "Check" | Blue | Inset shadow |
| **Scanning (URL)** | "Scanning..." | Background | Inset |
| **Searching (Name)** | "Searching..." | Background | Inset |
| **Disabled** | (varies) | Blue | Blue glow (60% opacity) |

---

### Card Buttons

| State | Shadow | Text Color |
|-------|--------|------------|
| **Default** | `--neu-sm` | Secondary |
| **Hover** | `--neu-raised` | Blue |
| **Active** | (no change) | Blue |

---

### Collapsible Cards

| State | Expand Icon | Details |
|-------|-------------|---------|
| **Collapsed** | ▼ (0°) | `display: none` |
| **Expanded** | ▼ (180°) | `display: block` |
| **Hover** | (no change) | Background highlight |

---

## Accessibility Considerations

### Semantic HTML

```html
<!-- Proper heading hierarchy -->
<h1 class="logo">Alpha Search</h1>

<!-- Form semantics -->
<input type="text" placeholder="..." autocomplete="off" spellcheck="false">
<button type="button" onclick="handleSearch()">Check</button>

<!-- Alt text for images -->
<img src="..." alt="${domain}" onerror="this.style.display='none'">
```

---

### Keyboard Navigation

- **Enter key:** Triggers search from input field
- **Tab:** Navigates through buttons and links
- **Focus states:** Default browser focus (no custom outline removal on buttons)

---

### Color Contrast

All text meets WCAG AA standards:
- **Primary text** (`#1a1c2e`) on background (`#e8eaf0`): 10.8:1 ✓
- **Secondary text** (`#5a5f7a`) on background: 5.2:1 ✓
- **Tertiary text** (`#8890aa`) on background: 3.1:1 ✓
- **White text** on blue button (`#4a8fff`): 4.8:1 ✓

---

### Motion Preferences

**Future Enhancement:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Checklist

### New Feature: Conversational UI

When adding a new conversational element:

- [ ] Add to chat area (`#chatArea`)
- [ ] Use `.bubble-user` or `.bubble-system` class
- [ ] Apply `slideUp` animation to system bubbles
- [ ] Call `scrollBottom()` after appending
- [ ] Add session separator if not first search
- [ ] Ensure mobile responsiveness

---

### New Feature: Score Card Variant

When creating a new card type:

- [ ] Use `.score-card` base class
- [ ] Apply `--neu-raised` shadow
- [ ] Include header, body, actions structure
- [ ] Add progress bar with animated fill
- [ ] Implement grade pill with semantic color
- [ ] Test collapsible behavior if applicable
- [ ] Verify mobile layout (column stacking)

---

### New Feature: Button or CTA

When adding a new button:

- [ ] Use `.card-btn` or `.search-btn` class
- [ ] Apply appropriate shadow (`--neu-sm` or custom)
- [ ] Add hover state (shadow + color change)
- [ ] Add active state (inset shadow or transform)
- [ ] Include transition (`all 0.2s`)
- [ ] Test disabled state if applicable
- [ ] Verify mobile touch target size (min 44x44px)

---

## Design Tokens (CSS Variables)

For easy theming and consistency, all design tokens are centralized:

```css
:root {
  /* Colors */
  --bg: #e8eaf0;
  --shadow-light: #ffffff;
  --shadow-dark: #c8cad4;
  --accent-blue: #4a8fff;
  --accent-green: #34c78a;
  --accent-orange: #f0704a;
  --text-primary: #1a1c2e;
  --text-secondary: #5a5f7a;
  --text-tertiary: #8890aa;

  /* Shadows */
  --neu-raised: 6px 6px 14px #c8cad4, -6px -6px 14px #ffffff;
  --neu-inset: inset 4px 4px 10px #c8cad4, inset -4px -4px 10px #ffffff;
  --neu-flat: 2px 2px 6px #c8cad4, -2px -2px 6px #ffffff;
  --neu-sm: 3px 3px 8px #c8cad4, -3px -3px 8px #ffffff;
}
```

---

## File Structure

```
alpha-search-index/
├── public/
│   ├── index.html          ← All UI/UX code
│   ├── favicon.svg         ← Brand icon
│   ├── llms.txt            ← AI readiness signal
│   ├── robots.txt          ← Crawler guidance
│   └── sitemap.xml         ← Site structure
├── functions/
│   ├── index.js            ← API endpoints
│   ├── scraper.js          ← Search & crawl logic
│   └── crawler.js          ← Domain scoring logic
└── ALPHA_SEARCH_DESIGN_GUIDE.md  ← This document
```

---

## Gradient Overlay Detail

**Location:** Fixed bottom search bar  
**Purpose:** Smooth visual transition between scrollable content and fixed input

```css
.search-wrap.bottom {
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
```

**Breakdown:**
- **Direction:** `to top` (bottom → top)
- **Color stops:**
  - 0% (bottom): `var(--bg)` at 100% opacity
  - 70%: `var(--bg)` at 100% opacity
  - 100% (top): `transparent`

**Effect:**
- Bottom 70% of the search bar container is solid background
- Top 30% fades to transparent
- Creates soft "lift" effect where content scrolls under the search bar

---

## Brand Identity

### Logo Composition

```html
<div class="logo">
  <span class="alpha">Alpha</span> <span class="search">Search</span>
</div>
```

- **"Alpha":** Blue (`--accent-blue`), bold (500 weight)
- **"Search":** Dark (`--text-primary`), light (300 weight)
- **Space:** Single space character between words

### Voice & Tone

- **Conversational:** Chat-like interaction, friendly feedback
- **Technical:** Monospace for URLs, metadata, scores
- **Transparent:** Real-time status updates, no hidden processes
- **Empowering:** Actionable suggestions, clear next steps

---

## Future Enhancements

### Planned Features

1. **Dark Mode**
   - Invert color palette
   - Adjust shadow directions
   - Maintain neomorphic depth

2. **Keyboard Shortcuts**
   - `/` to focus search
   - `Esc` to clear input
   - `Cmd+K` for command palette

3. **Shareable Result URLs**
   - Deep link to specific search
   - Persist query in URL params

4. **Export Results**
   - Download as JSON
   - Copy as markdown table

5. **Comparison Mode**
   - Side-by-side score comparison
   - Diff view for machine profiles

---

## Conclusion

This design system prioritizes:
- **Clarity** through visual hierarchy
- **Delight** through smooth animations
- **Transparency** through conversational feedback
- **Accessibility** through semantic HTML and contrast
- **Consistency** through design tokens and reusable components

Every pixel, transition, and interaction is intentional. This guide serves as the single source of truth for maintaining and evolving the Alpha Search UI/UX.

---

**Document Version:** 1.0  
**Last Updated:** March 11, 2026  
**Maintained By:** Gridnet Design Team  
**Contact:** design@gridnetai.com

# Alpha Browser Design Guide

> **🚀 Quick Links**  
> - [Complete Production Code](#code-examples) - Full `GridnetOnboarding.tsx` implementation (606 lines)
> - [Required CSS](#required-css-variables--animations) - All animations and variables needed
> - [Color Palette](#color-palette) - Grid Grey™ and complete color system
> - [UZ Depth Levels](#uz-depth-levels-reverse-flow) - Reverse neumorphic flow explained
> - [Component Specifications](#component-specifications) - All UI patterns documented

---

## Design Philosophy: UII (Universal Intelligent Interface)

Alpha Browser pioneers the **Universal Intelligent Interface (UII)** - a revolutionary design paradigm that transcends traditional GUI and TUI boundaries. By combining **Neumorphism**, **Glassmorphism**, and **Skeuomorphism** with AI-native interactions, we create a tactile, depth-rich, and universally accessible experience.

### The Three Dimensions: UI + UX + UZ

- **UI (Y-axis)**: Visual interface elements and layout
- **UX (X-axis)**: User experience flow and interactions  
- **UZ (Z-axis)**: User Agentic Dimension - depth, state, and tactile feedback

### UII Core Principles

1. **Brand-Agnostic AI**: Universal model access without vendor lock-in or branding clutter
2. **Terminal-Inspired Clarity**: Clean, functional TUI aesthetics merged with modern GUI
3. **Depth-Rich Interactions**: Neumorphic UZ flow provides tactile, intuitive feedback
4. **Universal Access**: One interface for all AI models, all use cases, all users

---

## Color Palette

### Grid Grey™ - The Foundation

**Grid Grey** (`#e0e5ec`) is the signature color of Alpha Browser and the GridNet ecosystem. This carefully calibrated neutral serves as the perfect canvas for neumorphic depth effects while maintaining infrastructure-grade professionalism.

```css
/* Grid Grey - Primary Background */
--grid-grey: #e0e5ec;
--neomorph-bg: #e0e5ec; /* Alias for Grid Grey */

/* Grid Grey Shadow System */
--grid-grey-shadow-dark: rgba(163, 177, 198, 0.6);  /* #a3b1c6 at 60% */
--grid-grey-shadow-light: rgba(255, 255, 255, 0.9); /* Pure white at 90% */

/* Grid Grey Variants */
--grid-grey-darker: #d0d5db;   /* Hover/pressed states */
--grid-grey-lighter: #f0f0f0;  /* Highlights */
```

**Why Grid Grey Works:**
- Perfect neutral for neumorphic shadows (not too warm, not too cool)
- Professional infrastructure aesthetic
- Reduces eye strain during extended use
- Provides excellent contrast for both light and dark text
- Matches the "utility-scale" positioning of GridNet

### Metallic Grey Palette (Infrastructure Grade)

```css
--color-metal-50: #f8f9fa;
--color-metal-100: #f1f3f5;
--color-metal-150: #e9ecef;
--color-metal-200: #dee2e6;
--color-metal-300: #ced4da;
--color-metal-400: #adb5bd;
--color-metal-500: #868e96;
--color-metal-600: #495057;
--color-metal-700: #343a40;
--color-metal-800: #212529;
--color-metal-900: #16191d;
```

### Terminal-Inspired Dark Elements

Alpha Browser incorporates TUI (Terminal User Interface) aesthetics for the input/prompt area, creating a familiar, developer-friendly experience.

```css
/* Terminal Dark Background */
--terminal-bg: #1a1a1a;          /* Deep charcoal for prompt area */
--terminal-border: #2d2d2d;      /* Subtle border */
--terminal-text: #ffffff;        /* Pure white text */
--terminal-placeholder: #6b7280; /* Muted gray for placeholders */

/* Terminal Backdrop */
--terminal-backdrop-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5); /* Upward shadow */
```

### Brand Colors

```css
/* GridNet Brand Gradient */
--gradient-gridnet: linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #4f46e5 100%);

/* Button Gradients */
--gradient-blue-button: linear-gradient(145deg, #4a90e2, #357abd);
--gradient-purple-button: linear-gradient(145deg, #9333ea, #7e22ce);
--gradient-globe-icon: linear-gradient(145deg, #5b9bd5, #4a7fb8);
--gradient-user-icon: linear-gradient(145deg, #94a3b8, #64748b);
```

### Text Colors

```css
/* Primary Text */
--text-primary: #374151;      /* Gray-700 */
--text-secondary: #6b7280;    /* Gray-600 */
--text-tertiary: #9ca3af;     /* Gray-400 */

/* Active State Text */
--text-active: #ef4444;       /* Red-500 - Used for active/selected states */
--text-inactive: #333333;     /* Dark Gray - Used for inactive states */

/* Text Shadows for Depth */
--text-shadow-light: 0 1px 2px rgba(255, 255, 255, 0.8);
--text-shadow-dark: 0 1px 2px rgba(0, 0, 0, 0.3);
```

### Active State Pattern

Throughout the app, active/selected states use **red text** (`#ef4444`) instead of background color changes. This creates a consistent visual language:

```css
/* Active State - Red Text */
.element-active {
  color: #ef4444;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

/* Inactive State - Dark Gray Text */
.element-inactive {
  color: #374151;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}
```

**Examples:**
- Toolbar buttons (Home, Chat, Explore, etc.)
- Agent/Model selector menu items
- Navigation tabs
- Filter options

---

## UZ Depth Levels (Reverse Flow)

The **Reverse Neumorphic UZ Flow** is a unique interaction pattern where elements start elevated and press inward on interaction, creating an innovative tactile feedback system.

### UZ State Definitions

```css
/* Level +2: Extruded (Inactive/Default State) */
--uz-extruded: 8px 8px 16px var(--neomorph-shadow-dark), 
               -8px -8px 16px var(--neomorph-shadow-light);

/* Level +1: Flat (Transition State) */
--uz-flat: 4px 4px 8px var(--neomorph-shadow-dark), 
           -4px -4px 8px var(--neomorph-shadow-light);

/* Level -1: Inset (Hover/Pressed State) */
--uz-inset: inset 6px 6px 12px var(--neomorph-shadow-dark), 
            inset -6px -6px 12px var(--neomorph-shadow-light);

/* Level +3: Deep Extruded (Active/Expanded State) */
--uz-deep-extruded: 12px 12px 24px var(--neomorph-shadow-dark), 
                    -12px -12px 24px var(--neomorph-shadow-light);
```

### UZ State Flow Diagram

```
Inactive (Default)     →     Hover          →     Active/Expanded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Extruded                  Inset                Deep Extruded
   UZ: +2                    UZ: -1               UZ: +3
   Floating                  Pressed In           Maximum Float
   scale(1)                  scale(0.96-0.98)     scale(1.02)
```

---

## Component Specifications

### 1. Neumorphic Cards/Boxes

#### Default State (Extruded)

```css
.neomorph-card {
  background: #e0e5ec;
  border-radius: 16px;
  box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.6), 
              -8px -8px 16px rgba(255, 255, 255, 0.9);
  transition: all 600ms cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* Glossy Highlight Overlay */
.neomorph-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
  opacity: 0.4;
  pointer-events: none;
  border-radius: inherit;
}
```

#### Hover State (Inset)

```css
.neomorph-card:hover {
  box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.6), 
              inset -6px -6px 12px rgba(255, 255, 255, 0.9);
  transform: scale(0.98);
}
```

#### Active/Expanded State (Deep Extruded)

```css
.neomorph-card-active {
  box-shadow: 12px 12px 24px rgba(163, 177, 198, 0.6), 
              -12px -12px 24px rgba(255, 255, 255, 0.9);
  transform: scale(1.02);
}

/* Enhanced Highlight for Active State */
.neomorph-card-active::before {
  height: 33%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent);
  opacity: 1;
}
```

### 1a. Hover-to-Expand Neumorphic Cards

This micro-animation pattern creates a smooth, tactile expansion effect on hover, revealing additional content. Used in onboarding cards, selector menus, and interactive panels.

#### Base Structure (Collapsed State)

```css
.neomorph-expand-card {
  width: 190px;
  height: 120px;
  background: #eee;
  text-align: center;
  border: 10px solid #eee;
  border-radius: 20px;
  box-shadow: inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff;
  transition: height 0.5s ease-in-out;
  overflow: hidden;
}

/* Icon Container - Neumorphic Circle */
.neomorph-expand-card .icon {
  width: 60px;
  height: 60px;
  background: #eee;
  margin: 20px auto;
  padding: 5px;
  border-radius: 50%;
  box-shadow: 8px 8px 10px #ddd, -8px -8px 10px #fff;
}
```

#### Expanded State (On Hover)

```css
.neomorph-expand-card:hover {
  height: 380px; /* Or appropriate expanded height */
}

/* Hidden Content - Revealed on Hover */
.neomorph-expand-card .content {
  background: #eee;
  padding: 10px;
  margin: 5px 20px;
  border-radius: 8px;
  box-shadow: 8px 8px 10px #ddd, -8px -8px 10px #fff;
  transform: translateY(-80px) scale(0);
  transition: transform 0.5s ease-in-out;
}

.neomorph-expand-card:hover .content {
  transform: translateY(0) scale(1);
}

/* Enhanced Text Styling */
.neomorph-expand-card .content h3 {
  text-shadow: 2px 2px 0px #fff;
}
```

#### React/TypeScript Implementation

```tsx
// Hover-to-Expand Card Component
<div
  className="neomorph-expand-card"
  style={{
    width: '190px',
    height: '120px',
    background: '#eee',
    textAlign: 'center',
    border: '10px solid #eee',
    borderRadius: '20px',
    boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
    transition: 'height 0.5s ease-in-out',
    overflow: 'hidden',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.height = '380px';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.height = '120px';
  }}
>
  {/* Icon */}
  <div
    className="icon"
    style={{
      width: '60px',
      height: '60px',
      background: '#eee',
      margin: '20px auto',
      padding: '5px',
      borderRadius: '50%',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
    }}
  >
    {/* Icon content */}
  </div>

  {/* Expandable Content */}
  <div
    className="content"
    style={{
      background: '#eee',
      padding: '10px',
      margin: '5px 20px',
      borderRadius: '8px',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
      transform: 'translateY(-80px) scale(0)',
      transition: 'transform 0.5s ease-in-out',
    }}
  >
    {/* Content revealed on hover */}
  </div>
</div>

// CSS for hover state
<style jsx>{`
  .neomorph-expand-card:hover {
    height: 380px !important;
  }
  
  .neomorph-expand-card:hover .content {
    transform: translateY(0) scale(1) !important;
  }
`}</style>
```

#### Menu Item Variant (Compact)

For dropdown menus and list items:

```tsx
<button
  className="menu-option"
  style={{
    background: '#e0e5ec',
    borderRadius: '12px',
    boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.2), inset -2px -2px 4px rgba(255, 255, 255, 0.4)',
    height: '48px',
    transition: 'height 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.height = '72px';
    e.currentTarget.style.boxShadow = 'inset 5px 5px 10px rgba(163, 177, 198, 0.5), inset -5px -5px 10px rgba(255, 255, 255, 0.7)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.height = '48px';
    e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(163, 177, 198, 0.2), inset -2px -2px 4px rgba(255, 255, 255, 0.4)';
  }}
>
  <div style={{
    transform: 'translateY(0) scale(1)',
    transition: 'transform 0.3s ease-in-out',
  }}>
    {/* Content */}
  </div>
</button>
```

#### Key Animation Principles

1. **Height Transition**: Smooth expansion from collapsed to expanded state
   - Duration: 0.5s for cards, 0.3s for menu items
   - Easing: `ease-in-out` for natural feel

2. **Content Scaling**: Hidden content scales from 0 to 1 while translating into view
   - Initial: `transform: translateY(-80px) scale(0)`
   - Final: `transform: translateY(0) scale(1)`

3. **Shadow Depth**: Inset shadows deepen on hover for tactile feedback
   - Default: Subtle inset (2px)
   - Hover: Deep inset (5px-10px)

4. **Overflow Management**: Always set `overflow: hidden` to prevent content bleeding during animation

5. **Thick Border Technique**: For prominent cards (onboarding, feature cards)
   - Use `border: 10px solid #eee` to create a thick neumorphic frame
   - Border color matches background for seamless integration
   - Creates a "framed" effect that enhances depth perception

6. **Use Cases**:
   - Onboarding/authentication cards
   - Dropdown menu items
   - Settings panels
   - Feature discovery cards
   - Interactive tooltips
   - Selection menus
   - Expandable panels

#### Complete Onboarding Card Pattern

Full implementation with thick border, icon, title, and expandable content:

```tsx
<div
  className="auth-card"
  style={{
    width: '190px',
    height: '120px',
    background: '#eee',
    textAlign: 'center',
    border: '10px solid #eee',
    borderRadius: '20px',
    boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
    transition: 'height 0.5s',
    overflow: 'hidden',
  }}
>
  {/* Icon - Neumorphic Circle */}
  <div
    style={{
      width: '60px',
      height: '60px',
      background: '#eee',
      margin: '20px auto',
      padding: '5px',
      borderRadius: '50%',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      {/* Icon SVG */}
    </svg>
  </div>

  {/* Title */}
  <h3 style={{
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    textShadow: '2px 2px 0px #fff',
    marginBottom: '10px',
  }}>
    Card Title
  </h3>

  {/* Expandable Content */}
  <div
    className="content"
    style={{
      background: '#eee',
      padding: '10px',
      margin: '5px 20px',
      borderRadius: '8px',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
      transform: 'translateY(-80px) scale(0)',
      transition: 'transform 0.5s',
    }}
  >
    {/* Forms, buttons, or other interactive content */}
  </div>
</div>

<style jsx>{`
  .auth-card:hover {
    height: 380px !important;
  }
  
  .auth-card:hover .content {
    transform: translateY(0) scale(1) !important;
  }
`}</style>
```

**Design Features:**
- **10px thick border** creates a substantial frame
- **Circular icon** with extruded neumorphic shadow
- **Text shadow** (`2px 2px 0px #fff`) for embossed effect
- **Content area** with inset shadow for depth
- **Smooth 0.5s transitions** for all state changes

### 2. Neumorphic Buttons

#### Primary Button (Extruded)

```css
.neomorph-button {
  background: #e0e5ec;
  border-radius: 12px;
  padding: 12px 24px;
  box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.6), 
              -8px -8px 16px rgba(255, 255, 255, 0.9);
  transition: all 500ms cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: none;
}

.neomorph-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
  opacity: 0.6;
  pointer-events: none;
}
```

#### Button Hover (Inset)

```css
.neomorph-button:hover {
  box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.6), 
              inset -6px -6px 12px rgba(255, 255, 255, 0.9);
  transform: scale(0.98);
}
```

#### Button Active (Deep Inset)

```css
.neomorph-button:active {
  box-shadow: inset 8px 8px 16px rgba(163, 177, 198, 0.7), 
              inset -8px -8px 16px rgba(255, 255, 255, 0.8);
  transform: scale(0.96);
}
```

### 3. Colored Action Buttons (Skeuomorphic)

#### Blue Action Button (Gridnet)

```css
.button-blue-action {
  background: linear-gradient(145deg, #4a90e2, #357abd);
  border-radius: 12px;
  padding: 14px 24px;
  box-shadow: 6px 6px 12px rgba(163, 177, 198, 0.6), 
              -6px -6px 12px rgba(255, 255, 255, 0.5), 
              inset 0 1px 2px rgba(255, 255, 255, 0.5);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-weight: 700;
  transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.button-blue-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  pointer-events: none;
}

.button-blue-action:hover {
  box-shadow: inset 4px 4px 8px rgba(53, 122, 189, 0.8), 
              inset -4px -4px 8px rgba(74, 144, 226, 0.4);
  transform: scale(0.98);
}
```

#### Purple Action Button (Internet)

```css
.button-purple-action {
  background: linear-gradient(145deg, #9333ea, #7e22ce);
  border-radius: 12px;
  padding: 14px 24px;
  box-shadow: 6px 6px 12px rgba(163, 177, 198, 0.6), 
              -6px -6px 12px rgba(255, 255, 255, 0.5), 
              inset 0 1px 2px rgba(255, 255, 255, 0.5);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-weight: 700;
  transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.button-purple-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  pointer-events: none;
}

.button-purple-action:hover {
  box-shadow: inset 4px 4px 8px rgba(126, 34, 206, 0.8), 
              inset -4px -4px 8px rgba(147, 51, 234, 0.4);
  transform: scale(0.98);
}
```

### 4. Input Fields (Inset)

```css
.neomorph-input {
  background: #e0e5ec;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: inset 4px 4px 8px rgba(163, 177, 198, 0.5), 
              inset -4px -4px 8px rgba(255, 255, 255, 0.8);
  border: none;
  outline: none;
  color: #374151;
  font-weight: 500;
  transition: all 300ms ease;
}

.neomorph-input::placeholder {
  color: #9ca3af;
}

.neomorph-input:focus {
  box-shadow: inset 5px 5px 10px rgba(163, 177, 198, 0.6), 
              inset -5px -5px 10px rgba(255, 255, 255, 0.9);
}
```

### 5. Neumorphic Pills (Status Indicators)

```css
.neomorph-pill {
  background: #e0e5ec;
  border-radius: 9999px;
  padding: 8px 16px;
  box-shadow: inset 3px 3px 6px rgba(163, 177, 198, 0.4), 
              inset -3px -3px 6px rgba(255, 255, 255, 0.8);
  position: relative;
}

.neomorph-pill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  border-radius: 9999px;
  pointer-events: none;
}
```

### 6. Neumorphic Tab Bar (Chrome-Inspired)

The tab bar uses neumorphic rectangle "bricks" with no rounded corners, creating a clean, modern tab system inspired by Chrome but with depth-rich neumorphic styling.

#### Tab Bar Container

```css
.neomorph-tab-bar {
  background: #e0e5ec; /* Grid Grey */
  box-shadow: inset 2px 2px 5px #a3b1c6, inset -2px -2px 5px #ffffff;
  padding-top: 2px;
  height: 28px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
```

#### Inactive Tab (Neumorphic Raised)

```css
.neomorph-tab-inactive {
  background: #e0e5ec;
  color: #4a5568;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 0; /* No rounded corners */
  box-shadow: 3px 3px 6px #a3b1c6, -3px -3px 6px #ffffff;
  transition: all 200ms ease;
  min-width: 112px;
  max-width: 160px;
}

.neomorph-tab-inactive:hover {
  background: #d0d5db;
}
```

#### Active Tab (Neumorphic Pressed/Concave)

```css
.neomorph-tab-active {
  background: #ffffff; /* White for active */
  color: #1a202c;
  font-weight: 600;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 0; /* No rounded corners */
  box-shadow: inset 2px 2px 4px #a3b1c6, inset -2px -2px 4px #ffffff;
  z-index: 10;
  min-width: 112px;
  max-width: 160px;
}
```

#### Tab Design Principles

1. **No Rounded Corners**: Sharp, rectangular tabs for a modern, technical aesthetic
2. **Neumorphic Depth**: Inactive tabs are raised, active tab is concave (pressed in)
3. **Color Contrast**: Active tab uses white background with dark text for clear indication
4. **Skeuomorphic Text**: Bold font weight on active tab mimics physical tab selection
5. **Minimal Height**: 28px total height keeps UI compact and efficient
6. **Variable Width**: Tabs adjust width based on title length (112px-160px range)

#### Complete Tab Implementation

```tsx
// Inactive Tab
<div
  className="neomorph-tab-inactive"
  style={{
    background: '#e0e5ec',
    color: '#4a5568',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '0',
    boxShadow: '3px 3px 6px #a3b1c6, -3px -3px 6px #ffffff',
    transition: 'all 200ms ease',
    minWidth: '112px',
    maxWidth: '160px',
  }}
>
  Tab Title
</div>

// Active Tab
<div
  className="neomorph-tab-active"
  style={{
    background: '#ffffff',
    color: '#1a202c',
    fontWeight: 600,
    padding: '4px 12px',
    fontSize: '12px',
    borderRadius: '0',
    boxShadow: 'inset 2px 2px 4px #a3b1c6, inset -2px -2px 4px #ffffff',
    zIndex: 10,
    minWidth: '112px',
    maxWidth: '160px',
  }}
>
  Active Tab
</div>
```

---

## Skeuomorphic Icon Treatment

### Icon Container Specifications

#### Circular Icon Button (Default)

```css
.skeuo-icon-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(145deg, #5b9bd5, #4a7fb8);
  box-shadow: 4px 4px 8px rgba(163, 177, 198, 0.6), 
              -4px -4px 8px rgba(255, 255, 255, 0.5), 
              inset 0 2px 4px rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 300ms ease;
}

.skeuo-icon-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
  border-radius: 50%;
  pointer-events: none;
}

.skeuo-icon-button svg {
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.4));
  transition: transform 300ms ease;
}

.skeuo-icon-button:hover svg {
  transform: scale(1.1);
}
```

#### Icon Color Variants

```css
/* Blue Icon (Internet/Globe) */
.skeuo-icon-blue {
  background: linear-gradient(145deg, #5b9bd5, #4a7fb8);
}

/* Gray Icon (User/Guest) */
.skeuo-icon-gray {
  background: linear-gradient(145deg, #94a3b8, #64748b);
}

/* Green Icon (Success) */
.skeuo-icon-green {
  background: linear-gradient(145deg, #10b981, #059669);
}
```

### Flat Icon with Drop Shadow

```css
.skeuo-icon-flat {
  filter: drop-shadow(3px 3px 4px rgba(0, 0, 0, 0.3)) 
          drop-shadow(0px 1px 1px rgba(255, 255, 255, 0.6));
  transition: filter 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.skeuo-icon-flat:hover {
  filter: drop-shadow(4px 4px 6px rgba(0, 0, 0, 0.4)) 
          drop-shadow(0px 2px 2px rgba(255, 255, 255, 0.7));
}
```

---

## Animation & Transitions

### Timing Functions

```css
/* Standard Easing */
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);

/* Quick Snap */
--ease-snap: cubic-bezier(0.25, 0.1, 0.25, 1);

/* Bounce */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Transition Durations

```css
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-smooth: 500ms;
--duration-slow: 600ms;
```

### Morphing Animations

#### Extrude to Inset

```css
@keyframes morphExtrudedToInset {
  0% {
    box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.6), 
                -8px -8px 16px rgba(255, 255, 255, 0.9);
    transform: scale(1);
  }
  50% {
    box-shadow: 4px 4px 8px rgba(163, 177, 198, 0.6), 
                -4px -4px 8px rgba(255, 255, 255, 0.9);
    transform: scale(0.98);
  }
  100% {
    box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.6), 
                inset -6px -6px 12px rgba(255, 255, 255, 0.9);
    transform: scale(0.96);
  }
}
```

#### Inset to Extrude

```css
@keyframes morphInsetToExtruded {
  0% {
    box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.6), 
                inset -6px -6px 12px rgba(255, 255, 255, 0.9);
    transform: scale(0.96);
  }
  50% {
    box-shadow: 4px 4px 8px rgba(163, 177, 198, 0.6), 
                -4px -4px 8px rgba(255, 255, 255, 0.9);
    transform: scale(0.98);
  }
  100% {
    box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.6), 
                -8px -8px 16px rgba(255, 255, 255, 0.9);
    transform: scale(1);
  }
}
```

#### Expand to Deep Extrude

```css
@keyframes morphToDeepExtruded {
  0% {
    box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.6), 
                -8px -8px 16px rgba(255, 255, 255, 0.9);
    transform: scale(1);
  }
  100% {
    box-shadow: 12px 12px 24px rgba(163, 177, 198, 0.6), 
                -12px -12px 24px rgba(255, 255, 255, 0.9);
    transform: scale(1.02);
  }
}
```

### Content Fade In

```css
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-slide {
  animation: fadeInSlide 500ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}
```

---

## Typography

### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Text Styles

#### Primary Heading

```css
.text-heading {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  letter-spacing: -0.01em;
}
```

#### Secondary Text

```css
.text-secondary {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  letter-spacing: 0.02em;
}
```

#### Label Text

```css
.text-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}
```

#### Button Text

```css
.text-button {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
```

---

## Border Radius Standards

```css
--radius-sm: 8px;      /* Small elements */
--radius-md: 12px;     /* Buttons, inputs */
--radius-lg: 16px;     /* Cards */
--radius-xl: 20px;     /* Large cards */
--radius-2xl: 24px;    /* Hero elements */
--radius-full: 9999px; /* Pills, circular */
```

---

## Spacing System

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## AI Chat Output Design

### Brand-Agnostic Philosophy

Alpha Browser's chat interface is intentionally **free of vendor branding and model badges**. This creates a clean, universal experience that puts focus on the content, not the provider.

#### Design Principles

```css
/* Clean Message Bubbles - No Brand Colors */
.ai-message {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 2px 2px 4px rgba(163, 177, 198, 0.3),
              -2px -2px 4px rgba(255, 255, 255, 0.5);
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
}

/* User Message */
.user-message {
  background: #e0e5ec; /* Grid Grey */
  border-radius: 12px;
  padding: 16px;
  box-shadow: inset 2px 2px 4px rgba(163, 177, 198, 0.3),
              inset -2px -2px 4px rgba(255, 255, 255, 0.5);
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
}
```

#### No Branding Elements

**What We DON'T Show:**
- ❌ Model provider logos (OpenAI, Anthropic, etc.)
- ❌ Brand color schemes in messages
- ❌ "Powered by" badges
- ❌ Model name watermarks in chat

**What We DO Show:**
- ✅ Clean, neutral message bubbles
- ✅ Optional model selector (user choice)
- ✅ Universal AI interface aesthetic
- ✅ Content-first design

### Model Selection UI

Users can optionally select specific models via a dropdown, but the chat output remains brand-neutral:

```tsx
// Model Selector - Neumorphic Dropdown
<select
  className="neomorph-select"
  style={{
    background: '#e0e5ec',
    borderRadius: '12px',
    padding: '8px 12px',
    boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.4), inset -2px -2px 4px rgba(255, 255, 255, 0.8)',
    border: 'none',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
  }}
>
  <option>GPT-4</option>
  <option>Claude 3.5 Sonnet</option>
  <option>Gemini Pro</option>
</select>
```

**Key Point**: Model selection is available but subtle - not forced into every message.

---

## Usage Guidelines

### When to Use Each Style

#### Neumorphism (Base Layer)
- **Use for**: Background surfaces, container cards, primary interactive elements
- **Characteristics**: Soft, subtle, monochromatic
- **Best for**: Creating depth hierarchy and tactile feedback

#### Glassmorphism (Overlay Layer)
- **Use for**: Modals, floating panels, temporary overlays
- **Characteristics**: Transparent, blurred, ethereal
- **Best for**: Layering information without blocking content

#### Skeuomorphism (Detail Layer)
- **Use for**: Icons, buttons, interactive controls
- **Characteristics**: Realistic, material-like, glossy
- **Best for**: Making affordances clear and interactions intuitive

#### Terminal UI (TUI) Elements
- **Use for**: Input areas, command prompts, developer-focused interfaces
- **Characteristics**: Dark, high-contrast, functional
- **Best for**: Creating familiar, efficient input experiences

### Reverse UZ Flow Best Practices

1. **Default State**: Always start with extruded (elevated) appearance
2. **Hover Feedback**: Transition to inset (pressed) to indicate interactivity
3. **Active State**: Use deep extrusion for expanded/selected states
4. **Smooth Transitions**: Use 500-600ms duration for morphing effects
5. **Scale Subtly**: Combine shadow changes with slight scale transforms (0.96-1.02)

### Accessibility Considerations

- Maintain minimum 4.5:1 contrast ratio for text
- Use text shadows to enhance readability on neumorphic surfaces
- Ensure interactive elements have clear hover/focus states
- Provide alternative visual cues beyond depth alone
- Test with reduced motion preferences

---

## Code Examples

> **📦 Production-Ready Code Included**  
> This section contains the complete, working implementation of the Alpha Browser onboarding screen with all micro-animations, hover effects, and neumorphic styling. Copy-paste ready for your website or application.

### Complete Production Implementation: GridnetOnboarding Component

**Location**: `components/GridnetOnboarding.tsx` (606 lines)  
**CSS Location**: `app/globals.css` (820 lines)

This is the full production-ready implementation of the neumorphic onboarding screen with all features:

✅ **Complete neumorphic onboarding screen**  
✅ **Three authentication boxes** (Gridnet, Internet, Guest)  
✅ **Reverse UZ flow micro-animations**  
✅ **Skeuomorphic icons with gradients**  
✅ **Smooth morphing transitions**  
✅ **Click-to-expand login forms**  
✅ **Hover-reveal animations**  

#### Full Component Code

```tsx
'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/lib/firebase/client'

interface GridnetOnboardingProps {
  onComplete: () => void
  onShowAuth?: (authType: 'gridnet' | 'internet') => void
}

// Minimal connection messages
const CONNECTION_MESSAGES = [
  'Initializing Gridnet Protocol',
  'Discovering Grid Nodes',
  'Authenticating Grid Access',
  'Configuring Intelligent Routing',
  'Calibrating aiWh Metering',
  'Connected to Gridnet'
]

export default function GridnetOnboarding({ onComplete, onShowAuth }: GridnetOnboardingProps) {
  const { signInAsGuest, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [currentMessage, setCurrentMessage] = useState(0)
  const [showAuthChoice, setShowAuthChoice] = useState(false)
  const [morphProgress, setMorphProgress] = useState(0)
  const [isSigningInAsGuest, setIsSigningInAsGuest] = useState(false)

  // Cycle through connection messages with smooth morphing transitions
  useEffect(() => {
    if (currentMessage >= CONNECTION_MESSAGES.length) {
      // Show auth choice after all messages with smooth transition
      setTimeout(() => {
        setShowAuthChoice(true)
      }, 1200)
      return
    }

    // Hold the message for 2.5 seconds before starting morph
    const holdTimer = setTimeout(() => {
      // Start morphing animation
      let progress = 0
      const morphInterval = setInterval(() => {
        progress += 0.02 // Slower increment for smoother transition
        setMorphProgress(progress)
        
        if (progress >= 1) {
          clearInterval(morphInterval)
          // Move to next message and reset morph
          setTimeout(() => {
            setCurrentMessage(prev => prev + 1)
            setMorphProgress(0)
          }, 100)
        }
      }, 20) // 20ms intervals for smooth 60fps animation
      
      return () => clearInterval(morphInterval)
    }, 2500)

    return () => {
      clearTimeout(holdTimer)
    }
  }, [currentMessage])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleContinueAsGuest = async () => {
    setIsSigningInAsGuest(true)
    try {
      await signInAsGuest()
      console.log('Signed in as guest (anonymous user)')
      onComplete()
    } catch (error: any) {
      console.error('Failed to sign in as guest:', error)
      setIsSigningInAsGuest(false)
      
      // Show user-friendly error message
      if (error.code === 'auth/operation-not-allowed') {
        alert('Guest mode is not enabled. Please enable Anonymous Authentication in Firebase Console.')
      } else {
        alert(`Failed to sign in as guest: ${error.message}`)
      }
    }
  }

  const handleGridnetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')
    
    try {
      // Convert username to email format for Firebase
      const gridEmail = username.includes('@') ? username : `${username}@gridnet.local`
      await signInWithEmail(gridEmail, password)
      onComplete()
    } catch (error: any) {
      console.error('Login error:', error)
      setLoginError(error.message || 'Failed to sign in')
      setIsLoggingIn(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true)
    setLoginError('')
    
    try {
      await signInWithGoogle()
      onComplete()
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setLoginError(error.message || 'Failed to sign in with Google')
      setIsLoggingIn(false)
    }
  }

  if (showAuthChoice) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center neomorph-base" 
        style={{ 
          WebkitAppRegion: 'drag',
          animation: 'fadeInScale 1200ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards'
        } as any}
      >
        <style jsx>{`
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.95);
              filter: blur(10px);
            }
            100% {
              opacity: 1;
              transform: scale(1);
              filter: blur(0px);
            }
          }
          
          .auth-card:hover {
            height: 380px !important;
          }
          
          .auth-card:hover .content {
            transform: translateY(0) scale(1) !important;
          }
        `}</style>
        
        {/* Subtle neumorphic ambient elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(224, 229, 236, 0.8) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(200, 210, 220, 0.6) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}></div>
        </div>

        <div className="flex flex-col items-center gap-12 relative z-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Gridnet Connection Status - Neumorphic Pill */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-full relative"
            style={{
              background: 'var(--neomorph-bg)',
              boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.8)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse relative z-10"></div>
            <span className="text-xs font-semibold text-gray-700 tracking-wide relative z-10">
              Connected to Gridnet
            </span>
            {/* Subtle highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-full pointer-events-none"></div>
          </div>

          {/* Auth Options - Three hover-expandable cards */}
          <div className="flex gap-6 items-center justify-center">
            {/* Gridnet Account Card - Expands to show login form */}
            <div
              className="auth-card text-center"
              style={{
                width: '190px',
                height: '120px',
                background: '#eee',
                padding: '10px',
                borderRadius: '20px',
                border: '10px solid #eee',
                boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
                transition: 'height 0.5s',
              }}
            >
              {/* Icon - Neumorphic Circle */}
              <div 
                className="icon"
                style={{
                  width: '60px',
                  height: '60px',
                  background: '#eee',
                  margin: '20px auto',
                  padding: '5px',
                  borderRadius: '50%',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image 
                  src="/icons/gridnet-waffle-black.png" 
                  alt="Gridnet" 
                  width={32} 
                  height={32}
                  style={{
                    filter: 'contrast(1.1) brightness(0.9)',
                  }}
                />
              </div>
              
              {/* Content - Login Form appears on hover */}
              <div 
                className="content"
                style={{
                  color: '#999',
                  background: '#eee',
                  padding: '10px',
                  margin: '5px 20px',
                  borderRadius: '8px',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  transform: 'translateY(-80px) scale(0)',
                  transition: 'all 0.5s',
                  textAlign: 'center',
                }}
              >
                <h3 style={{
                  textShadow: '2px 2px 0px #fff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '8px',
                }}>
                  Gridnet Account
                </h3>
                
                <form onSubmit={handleGridnetSubmit} className="space-y-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 rounded-lg outline-none text-xs"
                    style={{
                      background: '#eee',
                      boxShadow: 'inset 4px 4px 8px #ddd, inset -4px -4px 8px #fff',
                      border: 'none',
                      color: '#333',
                    }}
                    required
                  />
                  
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded-lg outline-none text-xs"
                    style={{
                      background: '#eee',
                      boxShadow: 'inset 4px 4px 8px #ddd, inset -4px -4px 8px #fff',
                      border: 'none',
                      color: '#333',
                    }}
                    required
                  />
                  
                  {loginError && (
                    <div className="text-[10px] text-red-600">{loginError}</div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(145deg, #4a90e2, #357abd)',
                      color: 'white',
                      border: 'none',
                      boxShadow: '4px 4px 8px #ddd, -4px -4px 8px #fff',
                      cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoggingIn ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Internet Account Card - Expands to show provider buttons */}
            <div
              className="auth-card text-center"
              style={{
                width: '190px',
                height: '120px',
                background: '#eee',
                padding: '10px',
                borderRadius: '20px',
                border: '10px solid #eee',
                boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
                transition: 'height 0.5s',
              }}
            >
              {/* Icon - Neumorphic Circle */}
              <div 
                className="icon"
                style={{
                  width: '60px',
                  height: '60px',
                  background: '#eee',
                  margin: '20px auto',
                  padding: '5px',
                  borderRadius: '50%',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5b9bd5',
                }}
              >
                <svg className="w-7 h-7" strokeWidth={2} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              
              {/* Content - Provider buttons appear on hover */}
              <div 
                className="content"
                style={{
                  color: '#999',
                  background: '#eee',
                  padding: '10px',
                  margin: '5px 20px',
                  borderRadius: '8px',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  transform: 'translateY(-80px) scale(0)',
                  transition: 'all 0.5s',
                  textAlign: 'center',
                }}
              >
                <h3 style={{
                  textShadow: '2px 2px 0px #fff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '12px',
                }}>
                  Internet Account
                </h3>
                
                {/* Provider Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Google */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: '#eee',
                      color: '#333',
                      border: 'none',
                      boxShadow: '4px 4px 8px #ddd, -4px -4px 8px #fff',
                      cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  
                  {/* Microsoft */}
                  <button
                    onClick={() => alert('Microsoft sign-in coming soon!')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: '#eee',
                      color: '#333',
                      border: 'none',
                      boxShadow: '4px 4px 8px #ddd, -4px -4px 8px #fff',
                      cursor: 'pointer',
                    }}
                  >
                    <svg viewBox="0 0 23 23" className="w-5 h-5">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    Microsoft
                  </button>
                  
                  {/* Apple */}
                  <button
                    onClick={() => alert('Apple sign-in coming soon!')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: '#eee',
                      color: '#333',
                      border: 'none',
                      boxShadow: '4px 4px 8px #ddd, -4px -4px 8px #fff',
                      cursor: 'pointer',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Apple
                  </button>
                </div>
              </div>
            </div>

            {/* Guest Mode Card - Direct action button */}
            <div
              className="auth-card text-center"
              style={{
                width: '190px',
                height: '120px',
                background: '#eee',
                padding: '10px',
                borderRadius: '20px',
                border: '10px solid #eee',
                boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
                transition: 'height 0.5s',
              }}
            >
              {/* Icon - Neumorphic Circle */}
              <div 
                className="icon"
                style={{
                  width: '60px',
                  height: '60px',
                  background: '#eee',
                  margin: '20px auto',
                  padding: '5px',
                  borderRadius: '50%',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                {isSigningInAsGuest ? (
                  <div className="w-6 h-6 border-3 rounded-full animate-spin" style={{
                    borderColor: 'rgba(163, 177, 198, 0.3)',
                    borderTopColor: 'rgba(100, 116, 139, 0.8)',
                    borderWidth: '3px',
                  }}></div>
                ) : (
                  <User className="w-7 h-7" strokeWidth={2} />
                )}
              </div>
              
              {/* Content - Action button appears on hover */}
              <div 
                className="content"
                style={{
                  color: '#999',
                  background: '#eee',
                  padding: '10px',
                  margin: '5px 20px',
                  borderRadius: '8px',
                  boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
                  transform: 'translateY(-80px) scale(0)',
                  transition: 'all 0.5s',
                  textAlign: 'center',
                }}
              >
                <h3 style={{
                  textShadow: '2px 2px 0px #fff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '8px',
                }}>
                  Guest Mode
                </h3>
                <p style={{
                  fontSize: '11px',
                  lineHeight: '1.4',
                  marginBottom: '12px',
                  color: '#666',
                }}>
                  {isSigningInAsGuest ? 'Connecting...' : 'Private browsing, no data saved'}
                </p>
                <button
                  onClick={handleContinueAsGuest}
                  disabled={isSigningInAsGuest}
                  className="w-full py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(145deg, #94a3b8, #64748b)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '4px 4px 8px #ddd, -4px -4px 8px #fff',
                    cursor: isSigningInAsGuest ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSigningInAsGuest ? 'Please wait...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>

          {/* Subtle info - Neumorphic Pill */}
          <div className="text-center px-6 py-3 rounded-full relative" style={{
            background: 'var(--neomorph-bg)',
            boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.8)',
          }}>
            {/* Subtle highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-full pointer-events-none"></div>
            <p className="text-xs font-semibold text-gray-600 tracking-wide relative z-10" style={{
              textShadow: '0 1px 1px rgba(255, 255, 255, 0.8)',
            }}>
              Guest mode: Private browsing • No data saved
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentMsg = CONNECTION_MESSAGES[currentMessage]
  const nextMsg = CONNECTION_MESSAGES[currentMessage + 1] || currentMsg
  
  // Calculate morphing effect - blend between current and next message
  const getMorphedText = () => {
    if (morphProgress === 0) return currentMsg
    
    // Use blur and opacity to create smooth morphing effect
    return (
      <span className="relative inline-block">
        <span 
          className="absolute inset-0 whitespace-nowrap"
          style={{
            opacity: 1 - morphProgress,
            filter: `blur(${morphProgress * 8}px)`,
            transform: `scale(${1 - morphProgress * 0.1})`,
            transition: 'all 0.1s ease-out',
            color: '#374151',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
          }}
        >
          {currentMsg}
        </span>
        <span 
          className="whitespace-nowrap"
          style={{
            opacity: morphProgress,
            filter: `blur(${(1 - morphProgress) * 8}px)`,
            transform: `scale(${0.9 + morphProgress * 0.1})`,
            transition: 'all 0.1s ease-out',
            color: '#374151',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
          }}
        >
          {nextMsg}
        </span>
      </span>
    )
  }

  return (
    <div 
      className="h-screen w-screen flex items-center justify-center neomorph-base" 
      style={{ 
        WebkitAppRegion: 'drag',
        background: 'var(--neomorph-bg)'
      } as any}
    >
      <div className="text-center px-8">
        <div 
          className="min-h-[2rem] flex items-center justify-center"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#374151',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
            letterSpacing: '-0.01em',
            transition: 'all 600ms cubic-bezier(0.4, 0.0, 0.2, 1)'
          }}
        >
          {getMorphedText()}
        </div>
      </div>
    </div>
  )
}
```

#### Key Features Breakdown

**1. Smooth Text Morphing Animation**
- Messages cycle every 2.5 seconds
- Blur + opacity + scale transition creates smooth morph effect
- 60fps animation (20ms intervals)

**2. Hover-to-Expand Cards**
- Default: 190px × 120px collapsed state
- Hover: Expands to 380px height
- Content scales from `translateY(-80px) scale(0)` to `translateY(0) scale(1)`
- 0.5s smooth transition

**3. Neumorphic Styling**
- **Thick Border Frame**: `border: 10px solid #eee` creates substantial depth
- **Inset Shadows**: `inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff`
- **Icon Circles**: Extruded neumorphic shadows `8px 8px 10px #ddd, -8px -8px 10px #fff`
- **Input Fields**: Deep inset for pressed-in effect

**4. Skeuomorphic Icons**
- Circular gradient backgrounds
- Drop shadows on SVG icons
- Text embossing with `textShadow: '2px 2px 0px #fff'`

**5. Ambient Background Effects**
- Radial gradient blurred circles
- Subtle depth without distraction

**6. Authentication Options**
- **Gridnet**: Username/password form
- **Internet**: Google, Microsoft, Apple OAuth
- **Guest**: Anonymous sign-in with loading spinner

#### Usage for Website

To adapt this for your marketing website:

1. **Remove Firebase dependencies** - replace `useAuth()` with your own auth system
2. **Adjust card content** - customize forms and provider buttons
3. **Keep all animations** - the hover-expand, morphing, and neumorphic styles are framework-agnostic
4. **Use CSS variables** - ensure `--neomorph-bg` and shadow variables are defined in your global CSS

#### Simplified Onboarding Box (No Auth)

For marketing pages or feature showcases without authentication:

```tsx
<div
  className="auth-card text-center"
  style={{
    width: '190px',
    height: '120px',
    background: '#eee',
    padding: '10px',
    borderRadius: '20px',
    border: '10px solid #eee',
    boxShadow: 'inset 5px 5px 10px #bbb, inset -5px -5px 10px #fff',
    transition: 'height 0.5s',
    overflow: 'hidden',
  }}
>
  {/* Icon - Neumorphic Circle */}
  <div 
    style={{
      width: '60px',
      height: '60px',
      background: '#eee',
      margin: '20px auto',
      padding: '5px',
      borderRadius: '50%',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {/* Your icon here */}
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      {/* Icon path */}
    </svg>
  </div>
  
  {/* Expandable Content */}
  <div 
    className="content"
    style={{
      background: '#eee',
      padding: '10px',
      margin: '5px 20px',
      borderRadius: '8px',
      boxShadow: '8px 8px 10px #ddd, -8px -8px 10px #fff',
      transform: 'translateY(-80px) scale(0)',
      transition: 'all 0.5s',
      textAlign: 'center',
    }}
  >
    <h3 style={{
      textShadow: '2px 2px 0px #fff',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '8px',
    }}>
      Feature Title
    </h3>
    <p style={{
      fontSize: '11px',
      lineHeight: '1.4',
      color: '#666',
    }}>
      Feature description or call-to-action
    </p>
  </div>
</div>

<style jsx>{`
  .auth-card:hover {
    height: 380px !important;
  }
  
  .auth-card:hover .content {
    transform: translateY(0) scale(1) !important;
  }
`}</style>
```

### Skeuomorphic Icon Button

```tsx
<div 
  className="w-12 h-12 flex items-center justify-center rounded-full relative"
  style={{
    background: 'linear-gradient(145deg, #5b9bd5, #4a7fb8)',
    boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.6), -4px -4px 8px rgba(255, 255, 255, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
  }}
>
  <svg 
    className="w-7 h-7 text-white relative z-10"
    style={{
      filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.4))',
    }}
  >
    {/* SVG path */}
  </svg>
  
  {/* Glossy highlight */}
  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none"></div>
</div>
```

---

## Design System Checklist

- [ ] Use classic neumorphic gray (#e0e5ec) for all base surfaces
- [ ] Implement reverse UZ flow (extruded → inset → deep extruded)
- [ ] Apply glossy highlights to all extruded surfaces
- [ ] Use skeuomorphic treatment for all icons
- [ ] Add text shadows for depth on neumorphic backgrounds
- [ ] Ensure smooth transitions (500-600ms)
- [ ] Include hover states for all interactive elements
- [ ] Test contrast ratios for accessibility
- [ ] Apply consistent border radius standards
- [ ] Use proper spacing system

---

## Design System Summary

### What Makes Alpha Browser Unique

1. **Grid Grey™ Foundation** (`#e0e5ec`)
   - Signature color across all GridNet products
   - Perfect neutral for neumorphic depth effects
   - Infrastructure-grade professional aesthetic

2. **UII - Universal Intelligent Interface**
   - Transcends traditional GUI/TUI boundaries
   - AI-native design without vendor lock-in
   - Clean, brand-agnostic chat output

3. **UI + UX + UZ Three-Dimensional Design**
   - Y-axis (UI): Visual layout
   - X-axis (UX): User flow
   - Z-axis (UZ): Depth and tactile feedback

4. **Reverse Neumorphic Flow**
   - Default: Extruded (raised)
   - Hover: Inset (pressed)
   - Active: Deep extruded (maximum float)

5. **Terminal-Inspired Input**
   - Dark terminal aesthetic (#1a1a1a)
   - TUI familiarity for power users
   - Clean separation from content area

6. **Chrome-Style Neumorphic Tabs**
   - No rounded corners (sharp rectangles)
   - Active tab: white + concave
   - Inactive tabs: Grid Grey + raised

7. **Hover-to-Expand Micro-Animations**
   - Smooth height transitions (0.5s)
   - Content scaling (translateY + scale)
   - Deep inset shadows on hover

8. **Brand-Agnostic AI Output**
   - No model logos in chat
   - No "powered by" badges
   - Universal AI interface aesthetic

### Quick Reference: Key Colors

```css
/* Grid Grey System */
--grid-grey: #e0e5ec;
--grid-grey-shadow-dark: rgba(163, 177, 198, 0.6);
--grid-grey-shadow-light: rgba(255, 255, 255, 0.9);
--grid-grey-darker: #d0d5db;

/* Terminal Dark */
--terminal-bg: #1a1a1a;
--terminal-text: #ffffff;

/* Text Colors */
--text-primary: #374151;
--text-active: #ef4444;

/* Tab System */
--tab-active-bg: #ffffff;
--tab-active-text: #1a202c;
--tab-inactive-bg: #e0e5ec;
--tab-inactive-text: #4a5568;
```

### Quick Reference: Key Animations

```css
/* Hover-to-Expand */
transition: height 0.5s ease-in-out;
transform: translateY(-80px) scale(0); /* Hidden */
transform: translateY(0) scale(1);     /* Revealed */

/* Neumorphic Morph */
transition: all 500ms cubic-bezier(0.4, 0.0, 0.2, 1);

/* Tab Transitions */
transition: all 200ms ease;

/* Button Press */
transform: scale(0.98); /* Hover */
transform: scale(0.96); /* Active */
```

---

## Implementation Checklist for Company-Wide Use

### For Website & Marketing

- [ ] Use Grid Grey (#e0e5ec) as primary background
- [ ] Implement neumorphic cards with glossy highlights
- [ ] Apply hover-to-expand animations on feature cards
- [ ] Use brand-agnostic AI messaging (no vendor logos)
- [ ] Implement reverse UZ flow on interactive elements
- [ ] Add terminal-style code blocks/examples
- [ ] Use skeuomorphic icons with drop shadows
- [ ] Apply text shadows for depth on Grid Grey backgrounds

### For Product UI

- [ ] Grid Grey base for all surfaces
- [ ] Neumorphic tab bars (no rounded corners)
- [ ] Terminal-dark input areas (#1a1a1a)
- [ ] Clean AI chat output (no branding)
- [ ] Model selector dropdown (optional, subtle)
- [ ] Hover-to-expand menus and panels
- [ ] Consistent 500-600ms transitions
- [ ] Active state = red text (#ef4444)

### For Brand Identity

- [ ] Grid Grey as signature color
- [ ] UII positioning (Universal Intelligent Interface)
- [ ] UI + UX + UZ messaging
- [ ] Infrastructure-grade aesthetic
- [ ] Universal AI access (no vendor lock-in)
- [ ] Terminal-inspired professionalism
- [ ] Depth-rich, tactile interactions

---

## Version History

- **v1.3** (March 8, 2026) - Complete production implementation code
  - Added full `GridnetOnboarding.tsx` component (606 lines)
  - Documented all three authentication boxes with hover-expand animations
  - Included smooth text morphing transition code
  - Added Firebase authentication integration examples
  - Provided simplified versions for marketing/website use
  - Complete working implementation for developers

- **v1.2** (March 6, 2026) - Grid Grey™ naming, UII philosophy, tab bar design
  - Renamed primary color to "Grid Grey"
  - Introduced UII (Universal Intelligent Interface) concept
  - Added Chrome-inspired neumorphic tab system
  - Documented terminal-dark input styling
  - Added brand-agnostic AI chat design principles
  - Comprehensive company-wide implementation guide

- **v1.1** (March 5, 2026) - Hover-to-expand animations and onboarding patterns
  - Added hover-to-expand card specifications
  - Documented thick-border onboarding cards
  - Enhanced micro-animation guidelines

- **v1.0** (March 2026) - Initial neumorphic design system with reverse UZ flow
  - Introduced three-layer design approach (Neumorphism + Glassmorphism + Skeuomorphism)
  - Implemented classic neumorphic gray palette
  - Established reverse UZ interaction pattern

---

## Resources & References

- Neumorphism.io - Design generator and reference
- Material Design 3 - Elevation and shadow principles
- Apple Human Interface Guidelines - Visual design foundations
- CSS-Tricks - Advanced shadow techniques
- Terminal.sexy - Terminal color scheme inspiration

---

**Maintained by**: Alpha Browser Design Team  
**Last Updated**: March 8, 2026  
**Status**: Active Development  
**License**: Proprietary - GridNet/Layer 0 Internal Use

---

## Quick Start for Website Integration

To use this onboarding design on your website:

1. **Copy the component code** from the "Complete Production Implementation" section above
2. **Install dependencies**: `npm install lucide-react` (for icons)
3. **Add CSS variables** to your global stylesheet (see Color Palette section)
4. **Replace Firebase auth** with your own authentication system
5. **Customize content** for your specific use case
6. **Test hover animations** across different browsers

**File Location**: `components/GridnetOnboarding.tsx` (606 lines)  
**Dependencies**: React, Next.js (optional), Lucide Icons  
**Browser Support**: Chrome, Firefox, Safari, Edge (all modern versions)

---

## Required CSS Variables & Animations

To use the onboarding component on your website, add these CSS variables and animations to your global stylesheet:

### CSS Variables (Add to `:root`)

```css
:root {
  /* Neumorphism Design System */
  --neomorph-bg: #e0e5ec;
  --neomorph-shadow-dark: rgba(163, 177, 198, 0.6);
  --neomorph-shadow-light: rgba(255, 255, 255, 0.9);
  
  /* UZ (User Agentic) Depth Levels - Reverse Flow */
  --uz-extruded: 8px 8px 16px var(--neomorph-shadow-dark), 
                 -8px -8px 16px var(--neomorph-shadow-light);
  --uz-flat: 4px 4px 8px var(--neomorph-shadow-dark), 
             -4px -4px 8px var(--neomorph-shadow-light);
  --uz-inset: inset 6px 6px 12px var(--neomorph-shadow-dark), 
              inset -6px -6px 12px var(--neomorph-shadow-light);
  --uz-deep-extruded: 12px 12px 24px var(--neomorph-shadow-dark), 
                      -12px -12px 24px var(--neomorph-shadow-light);
  
  /* Skeuomorphic Depth Effects */
  --skeuo-icon-shadow: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.25)) 
                       drop-shadow(0px 1px 1px rgba(255, 255, 255, 0.5));
}
```

### Required Animations

```css
/* Onboarding box content fade-in */
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth page entrance animation */
@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.95);
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0px);
  }
}

/* Neumorphic morphing animations */
@keyframes morphExtrudedToInset {
  0% {
    box-shadow: var(--uz-extruded);
    transform: scale(1);
  }
  50% {
    box-shadow: var(--uz-flat);
    transform: scale(0.98);
  }
  100% {
    box-shadow: var(--uz-inset);
    transform: scale(0.96);
  }
}

@keyframes morphInsetToExtruded {
  0% {
    box-shadow: var(--uz-inset);
    transform: scale(0.96);
  }
  50% {
    box-shadow: var(--uz-flat);
    transform: scale(0.98);
  }
  100% {
    box-shadow: var(--uz-extruded);
    transform: scale(1);
  }
}

@keyframes morphToDeepExtruded {
  0% {
    box-shadow: var(--uz-extruded);
  }
  100% {
    box-shadow: var(--uz-deep-extruded);
  }
}
```

### Utility Classes

```css
/* Neumorphic base background */
.neomorph-base {
  background: var(--neomorph-bg);
}

/* Neumorphic shadow states */
.neomorph-extruded {
  box-shadow: var(--uz-extruded);
}

.neomorph-flat {
  box-shadow: var(--uz-flat);
}

.neomorph-inset {
  box-shadow: var(--uz-inset);
}

.neomorph-deep-extruded {
  box-shadow: var(--uz-deep-extruded);
}

/* Neumorphic button with glossy highlight */
.neomorph-button {
  background: var(--neomorph-bg);
  box-shadow: var(--uz-extruded);
  transition: all 500ms cubic-bezier(0.4, 0.0, 0.2, 1);
  border: none;
  position: relative;
  overflow: hidden;
}

.neomorph-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
  opacity: 0.6;
  pointer-events: none;
}

.neomorph-button:hover {
  box-shadow: var(--uz-inset);
  transform: scale(0.98);
}

.neomorph-button:active {
  box-shadow: var(--uz-inset);
  transform: scale(0.96);
}

/* Neumorphic card with expansion */
.neomorph-card {
  background: var(--neomorph-bg);
  box-shadow: var(--uz-extruded);
  transition: all 600ms cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
}

.neomorph-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent);
  opacity: 0.4;
  pointer-events: none;
  border-radius: inherit;
}

.neomorph-card:hover {
  box-shadow: var(--uz-inset);
}

.neomorph-card-active {
  box-shadow: var(--uz-deep-extruded);
  transform: scale(1.02);
}

/* Skeuomorphic icon effects */
.skeuo-icon {
  filter: var(--skeuo-icon-shadow);
  transition: filter 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.skeuo-icon:hover {
  filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.35)) 
          drop-shadow(0px 2px 2px rgba(255, 255, 255, 0.6));
}
```

### Complete `globals.css` Reference

**Full file location**: `app/globals.css` (820 lines)

This file contains:
- All CSS variables for neumorphism, glassmorphism, and skeuomorphism
- Complete animation keyframes
- Utility classes for all design patterns
- Weather widget styles (neumorphic)
- AIX ticker styles (skeuomorphic terminal)
- Chat message animations
- Responsive utilities

**Key sections**:
1. **Lines 29-48**: Neumorphism & UZ depth variables
2. **Lines 619-628**: `fadeInSlide` animation (used in onboarding)
3. **Lines 692-729**: Neumorphic morphing animations
4. **Lines 732-741**: Skeuomorphic icon effects
5. **Lines 743-803**: Neumorphic button & card utilities

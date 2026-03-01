# Preventli Brand Guidelines
*Employee Health Intelligence Platform*

## Brand Overview

**Mission Statement:** To transform employee health management through comprehensive lifecycle intelligence, enabling employers to predict, prevent, and protect their workforce from hire to retire.

**Brand Promise:** Complete employee health intelligence that creates competitive advantage through longitudinal data insights, regulatory compliance automation, and predictive health analytics.

**Target Audience:** Enterprise HR directors, safety managers, and executive leadership responsible for workforce health and compliance in Australian organizations.

---

## Logo & Visual Identity

### Primary Logo

**Files:**
- SVG: `client/src/assets/preventli-logo.svg`
- Usage: Digital applications, web, app interface

**Design Elements:**
- **Shield Symbol:** Represents protection and security
- **Heart + Cross:** Health and medical care
- **Emerald Green:** Trust, growth, health, compliance
- **Clean Typography:** Professional, modern, enterprise-ready

### Logo Variations

**Primary Logo:** Full logo with text and tagline
- Use: Marketing materials, websites, presentations
- Minimum width: 120px digital, 1.5" print

**Icon Only:** Shield symbol without text
- Use: Favicons, app icons, small spaces
- Minimum size: 16x16px

**Horizontal Logo:** Logo + "Employee Health Intelligence" tagline
- Use: Headers, business cards, email signatures

### Color Usage

**Primary Brand Colors:**
```css
/* Emerald Green (Primary) */
--emerald-500: #10B981
--emerald-600: #059669
--emerald-700: #047857

/* Supporting Colors */
--emerald-50: #ECFDF5   /* Light backgrounds */
--emerald-100: #D1FAE5  /* Subtle highlights */
--emerald-900: #064E3B  /* Dark text on light */
```

**Secondary Palette:**
```css
/* Blue (Active Employment) */
--blue-500: #3B82F6
--blue-100: #DBEAFE

/* Purple (Exit Documentation) */
--purple-500: #8B5CF6
--purple-100: #EDE9FE

/* Orange (Injury Management) */
--orange-500: #F97316
--orange-100: #FED7AA

/* Neutral Grays */
--gray-50: #F9FAFB
--gray-900: #111827
```

---

## Typography System

**Primary Font:** Inter
- **Usage:** All digital interfaces, web, applications
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **CDN:** Google Fonts

**Secondary Font:** System fonts for fallback
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Hierarchy:**
- **Heading 1:** 36px/48px, Semibold - Main page titles
- **Heading 2:** 30px/36px, Semibold - Section headers
- **Heading 3:** 24px/32px, Medium - Subsection titles
- **Body Large:** 18px/28px, Regular - Intro text, descriptions
- **Body:** 16px/24px, Regular - Standard text, forms
- **Small:** 14px/20px, Regular - Secondary text, labels
- **Caption:** 12px/16px, Medium - Metadata, status badges

---

## Iconography

**Style:** Heroicons v2 (Solid and Outline)
- **Stroke Width:** 1.5px for outline icons
- **Corner Radius:** Slightly rounded (consistent with brand)
- **Size:** 16px, 20px, 24px standard sizes

**Key Icons:**
- **Shield:** Primary brand icon, protection, security
- **Heart:** Health, wellbeing, care
- **Users:** Teams, employees, groups
- **Check Circle:** Completion, success, compliance
- **Alert Triangle:** Warnings, attention needed
- **Document:** Reports, certificates, records

---

## User Interface Design

### Layout Principles

**Grid System:**
- **Desktop:** 12-column grid, 24px gutters
- **Mobile:** Single column, 16px margins
- **Container:** max-width: 1280px

**Spacing Scale:** 4px base unit
```css
/* Tailwind spacing scale */
0.5 = 2px    /* Micro spacing */
1 = 4px      /* Tight spacing */
2 = 8px      /* Small spacing */
3 = 12px     /* Medium spacing */
4 = 16px     /* Standard spacing */
6 = 24px     /* Large spacing */
8 = 32px     /* Section spacing */
12 = 48px    /* Component spacing */
16 = 64px    /* Layout spacing */
```

### Component Styling

**Cards:**
- Border radius: 12px (rounded-xl)
- Shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)
- Padding: 24px (p-6)
- Background: White with subtle border

**Buttons:**
```css
/* Primary Button */
background: #10B981
color: white
padding: 12px 24px
border-radius: 8px
font-weight: 500

/* Secondary Button */
background: transparent
border: 1px solid #10B981
color: #10B981
```

**Forms:**
- Input height: 40px (h-10)
- Border radius: 6px (rounded-md)
- Focus ring: 2px emerald-500
- Label: 14px medium weight, above input

**Status Indicators:**
- **Success:** Emerald green (#10B981)
- **Warning:** Orange (#F97316)
- **Error:** Red (#EF4444)
- **Info:** Blue (#3B82F6)
- **Neutral:** Gray (#6B7280)

---

## Application Patterns

### Employee Lifecycle Visualization

**Stage Colors:**
1. **Pre-Employment:** Emerald (#10B981) - New, growth, potential
2. **Active Health:** Blue (#3B82F6) - Ongoing, stability, monitoring
3. **Injury Management:** Orange (#F97316) - Attention, action required
4. **Mental Health:** Purple (#8B5CF6) - Care, support, wellness
5. **Exit Documentation:** Gray (#6B7280) - Closure, completion

**Progress Indicators:**
- Circle icons with connecting lines
- Filled circles for completed stages
- Outlined circles for future stages
- Current stage highlighted with glow effect

### Dashboard Design

**Metrics Cards:**
```css
/* Statistics display */
Large number: 36px/40px, Bold
Label: 14px/20px, Medium
Trend: 12px with colored arrow icon
Background: White with colored left border
```

**Data Tables:**
- Sticky headers with sort indicators
- Row hover: subtle gray background
- Alternating row colors for readability
- Actions column right-aligned

---

## Voice & Tone

### Brand Voice

**Professional but Human:** Expert knowledge delivered with empathy and clarity. We understand the critical nature of employee health while making complex compliance simple.

**Key Attributes:**
- **Authoritative:** Deep expertise in Australian workplace health
- **Empathetic:** Understanding the human impact of workplace injuries
- **Clear:** Complex regulations made simple and actionable
- **Proactive:** Anticipating needs before they become problems

### Messaging Framework

**Primary Value Propositions:**
1. **Complete Lifecycle Coverage** - "Hire to retire health intelligence"
2. **Predictive Protection** - "Prevent injuries before they happen"
3. **Compliance Confidence** - "WorkSafe Victoria requirements handled automatically"
4. **Data-Driven Decisions** - "Longitudinal insights impossible to replicate"

**Key Messaging:**
- "Transform reactive injury management into proactive health intelligence"
- "Australia's first comprehensive employee lifecycle platform"
- "Blue ocean opportunity with unbreachable competitive moats"
- "Enterprise-grade security with consumer-grade experience"

---

## Application Examples

### Website Implementation
- **File:** `marketing/preventli-website-mockup.html`
- **Features:** Full brand implementation, responsive design, lifecycle visualization
- **CTA Strategy:** Demo-focused with trial options

### App Interface
- **Navigation:** Updated sidebar with proper logo and tagline
- **Color System:** Emerald primary with lifecycle stage colors
- **Typography:** Inter font family throughout

### Marketing Materials
- **PowerPoint Templates:** Available in `marketing/presentations/`
- **Business Cards:** Horizontal logo with contact details
- **Email Signatures:** Logo + tagline + contact information

---

## Brand Protection

### Logo Don'ts
- Don't modify the logo colors
- Don't separate the shield from the text
- Don't place on busy backgrounds without white container
- Don't stretch or distort proportions
- Don't use in sizes smaller than minimum specifications

### Color Usage
- Always use official hex values
- Maintain sufficient contrast ratios (WCAG AA)
- Don't use brand colors for error states (use red #EF4444)
- Don't use more than 3 colors in a single component

### Typography
- Don't use decorative fonts for body text
- Don't use all caps except for small labels
- Maintain line height ratios for readability
- Don't use Inter below 12px size

---

## Technical Implementation

### CSS Custom Properties
```css
:root {
  /* Brand Colors */
  --preventli-primary: #10B981;
  --preventli-primary-dark: #059669;
  --preventli-primary-light: #D1FAE5;

  /* Typography */
  --font-primary: 'Inter', -apple-system, sans-serif;
  --font-size-base: 16px;
  --line-height-base: 1.5;

  /* Spacing */
  --space-unit: 4px;
  --space-sm: calc(var(--space-unit) * 2);
  --space-md: calc(var(--space-unit) * 4);
  --space-lg: calc(var(--space-unit) * 6);
}
```

### Component Library Integration
- **shadcn/ui components:** Configured with Preventli color palette
- **Tailwind CSS:** Custom theme extending default colors
- **React Icons:** Heroicons v2 for consistency

---

## File Organization

```
client/src/assets/
├── preventli-logo.svg          # Primary logo file
├── preventli-icon.svg          # Icon-only version
├── brand/
│   ├── logos/                  # Logo variations
│   ├── icons/                  # Brand icons
│   └── graphics/               # Illustrations

marketing/
├── preventli-website-mockup.html    # Website design
├── presentations/                   # PowerPoint templates
└── brand-assets/                    # Marketing materials

docs/
└── PREVENTLI_BRAND_GUIDELINES.md   # This document
```

---

## Version History

**v1.0** - February 2026
- Initial brand identity creation
- Logo design and color palette
- Website mockup development
- Application interface updates
- Comprehensive brand guidelines

---

*These guidelines ensure consistent brand experience across all touchpoints while supporting Preventli's mission to transform employee health intelligence in Australian workplaces.*
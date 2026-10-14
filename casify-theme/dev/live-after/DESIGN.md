---
name: Casify Candy Shop
description: A warm 1920s candy-shop storefront that frames real phone-case products with tactile, trustworthy commerce UI.
colors:
  candy-red: "#C4302B"
  candy-red-hover: "#A8231F"
  candy-red-deep: "#7E1A17"
  muted-teal: "#6C9E9C"
  muted-teal-deep: "#4E7C7B"
  aged-gold: "#D2B57C"
  ticket-gold: "#F0E2C2"
  paper: "#FDF9F1"
  page-cream: "#FBF3E4"
  inset-cream: "#F5E9D3"
  cocoa-ink: "#33231A"
  cocoa-body: "#4A3324"
  cocoa-muted: "#8A5A3C"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, Times New Roman, serif"
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  script:
    fontFamily: "Parisienne, Snell Roundhand, cursive"
    fontSize: "clamp(2.3rem, 5vw, 4.2rem)"
    fontWeight: 400
    lineHeight: 1.05
  label:
    fontFamily: "Special Elite, Courier New, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  ticket: "6px"
  card: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.candy-red}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "17px 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.candy-red-hover}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "17px 22px"
  ticket-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.cocoa-ink}"
    rounded: "{rounded.ticket}"
    padding: "16px"
---

# Design System: Casify Candy Shop

## Overview

**Creative North Star: "Candy Shop Matinee"**

Casify presents modern phone cases through the material language of a warmly lit 1920s confectionery: cream paper, painted wood, enamel red, oxidized teal, aged brass, striped awnings, glass sheen, and small handcrafted details. The theatrical shop dressing creates recognition and delight, while the product photograph, model choice, price, and service facts remain direct and authoritative.

The experience should feel tactile and slightly imperfect, never generic or synthetic. Editorial display type supplies confidence, the script face adds a sparing handwritten flourish, and typewriter labels make controls feel tagged and catalogued. Decoration frames decisions; it never replaces them.

**Key Characteristics:**

- Warm paper-and-cocoa foundation with red as the primary commercial signal.
- Real product imagery centered inside crafted shop displays.
- Die-cut tickets, striped trims, brass accents, and glass highlights used as recurring material cues.
- Expressive motion that settles into a readable state and fully respects reduced-motion preferences.

## Colors

The palette is warm, edible, and slightly aged rather than bright or digitally saturated.

### Primary

- **Candy Red:** Primary calls to action, active states, awning stripes, and the strongest brand marks.
- **Deep Candy Red:** Hover, pressed, and dark-edge treatments that make red controls feel enamelled and physical.

### Secondary

- **Muted Teal:** Secondary emphasis, success states, focus rings, selected accents, and the counterpoint to red.

### Tertiary

- **Aged Gold:** Ornamental trim, premium emphasis, and warm reflected light; use it as a supporting material, not a competing CTA.

### Neutral

- **Paper and Page Cream:** The primary canvas and raised card surfaces.
- **Inset Cream and Ticket Gold:** Recessed panels, selected tickets, and quiet grouping surfaces.
- **Cocoa Ink:** Headlines and high-contrast copy.
- **Cocoa Body and Muted Cocoa:** Reading text, metadata, borders, and low-priority labels.

**The Red Means Action Rule.** Preserve candy red for brand structure and high-value action so it remains immediately legible.

## Typography

**Display Font:** Playfair Display with Georgia fallbacks  
**Body Font:** Libre Baskerville with Georgia fallback  
**Script Font:** Parisienne with Snell Roundhand fallback  
**Label Font:** Special Elite with Courier New fallback

**Character:** The pairing combines confident editorial merchandising with the shopkeeper warmth of printed tickets and handwritten signage.

### Hierarchy

- **Display:** Heavy, tightly tracked Playfair for one dominant message per surface.
- **Headline:** Playfair at a calmer scale for section titles, benefit cards, and product names.
- **Script:** Parisienne for short emotional phrases only; keep it readable, never use it for essential controls or facts.
- **Body:** Libre Baskerville with generous leading and a practical 52–70 character measure.
- **Label:** Special Elite in restrained uppercase for buttons, tabs, prices, tags, and operational metadata; keep mobile labels at approximately 11–12px or larger.

**The One Flourish Rule.** A composition may use one script-led flourish; all decisions and evidence stay in display, body, or label type.

## Layout

Use a centered maximum content width of 1160px with flexible outer gutters. Desktop commerce surfaces may use an asymmetrical copy/product split; below roughly 900px they become a single reading column, with decision controls remaining adjacent to the product they affect. Mobile gutters are normally 16–24px, and touch targets should be at least 44px high.

Space follows a compact 8px rhythm, expanding to 16px, 24px, and 36px for component, section, and scene-level separation. Decorative elements may cross a frame edge, but the page itself must never create horizontal scroll. Keep the first decision, real product, and its relevant evidence visually connected.

## Elevation & Depth

Depth is tactile and structural: inset highlights suggest cut paper, small cocoa shadows lift tickets, and deeper ambient shadows are reserved for floating signs, product stages, and active merchandise. Glass uses a warm cream tint and a fine top-edge sheen rather than cold blue blur.

### Shadow Vocabulary

- **Die-cut:** Paired inset highlights with a short soft shadow for tickets and punched-paper controls.
- **Small / Medium:** Quiet separation for navigation, cards, and resting controls.
- **Lifted:** Broad cocoa shadow for the product stage or a deliberately floating object.

**The Physical Cause Rule.** Every shadow should imply a real edge, hanging object, glass pane, or lifted card; never add glow solely for decoration.

## Shapes

The system mixes practical soft rectangles with specific shop silhouettes. Use 6px corners for tickets and selectors, 14px corners for substantial cards, and full pills for primary commerce buttons or compact status controls. Dashed borders, clipped ticket corners, scalloped awnings, wax-seal circles, and striped trims are preferred signatures. Avoid anonymous rounded cards repeated everywhere.

## Components

### Buttons

- **Primary:** Candy-red pill, cream label text, tactile darker lower edge, and a short upward response on hover.
- **Hover / Focus:** Deepen red, strengthen the physical shadow, and use a visible muted-teal focus ring.
- **Ghost:** Transparent cream/cocoa treatment with a strong cocoa border; invert to cocoa on hover.

### Tickets and Cards

- **Corner Style:** Small ticket corners or medium card rounding based on scale.
- **Background:** Paper cream, ticket gold for selected states, cocoa for rare dark panels.
- **Border:** Hairline or dashed cocoa rules; do not combine every border treatment at once.
- **Internal Padding:** Usually 16–24px, with denser 8–12px controls where the label remains readable.

### Inputs and Selectors

- **Style:** Warm paper or lightly transparent cream, cocoa text, a clear hairline border, and at least a 44px target.
- **Focus:** Muted-teal outline or ring with sufficient separation from the border.
- **State:** Selected options may use ticket gold plus a red or teal edge; unavailable options must remain visibly distinct without relying on color alone.

### Navigation

Navigation is a cream glass shelf beneath the striped awning. The hanging sign is the brand anchor; links use compact typewriter labels and simple active cues. On mobile, simplify secondary actions before shrinking tap targets.

### Motion

Motion should behave like physical shop dressing: signs swing from their cords, tickets stamp or lift, sweets drift gently, and product transitions follow a short staged reveal. Use the standard 160/240/420ms timing set for state changes, the soft-out curve for entrances, and the candy spring only for small moments of delight. Long-running ambient motion pauses offscreen or when the page is hidden, and reduced motion removes nonessential animation and WebGL.

## Do's and Don'ts

### Do:

- **Do** let real product photography remain the sharpest and most authoritative object in each shopping scene.
- **Do** use the established cream, cocoa, candy red, muted teal, and aged-gold palette before introducing a new hue.
- **Do** make model, price, shipping, returns, and dispatch facts readable before decorative detail.
- **Do** give animation an explicit pause path when it auto-runs and a complete static fallback when JavaScript is unavailable.

### Don't:

- **Don't** use generic gradient-heavy tech styling, neon glows, or a dark campaign world that detaches from the header and footer.
- **Don't** invent product performance, review, shipping, or guarantee claims to fill a composition.
- **Don't** place an eyebrow label above every heading; hierarchy should come from the heading, spacing, and content itself.
- **Don't** shrink core mobile labels below practical reading size or truncate model-fit information.

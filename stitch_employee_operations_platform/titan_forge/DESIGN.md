# Design System Specification: Industrial Authority & Precision

## 1. Overview & Creative North Star
**Creative North Star: "The Tactical Command Center"**

This design system moves away from the "flat web" aesthetic and toward a high-performance, industrial-grade interface. The vision is to create a digital tool that feels as durable and reliable as the heavy machinery PT Chitra Paratama operates. We achieve this through **Organic Brutalism**: a philosophy where structural strength (heavy weights, deep blues, clear boundaries) meets modern sophistication (layered glass, tonal depth, and airy typography).

The system breaks the "template" look by using intentional asymmetry—such as right-aligned data points against left-aligned labels—and overlapping "floating" panels that suggest a modular, high-tech dashboard rather than a static webpage.

## 2. Color Strategy: Tonal Depth over Borders
The palette is rooted in `primary` (#003461) to establish authority, with `tertiary` (#5a2200) reserved for high-visibility alerts and "Safety Orange" moments.

### The "No-Line" Rule
To achieve a premium, custom feel, **1px solid borders are strictly prohibited for sectioning.** Physical boundaries must be defined solely through background color shifts.
*   **Implementation:** Place a `surface_container_lowest` card on top of a `surface_container_low` background. The shift in hex value provides all the separation the eye needs without the "cheapening" effect of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers.
*   **Base:** `surface` (#f3faff)
*   **Sections:** `surface_container_low` (#e6f6ff)
*   **Primary Cards:** `surface_container_lowest` (#ffffff)
*   **Overlays/Modals:** `surface_bright` (#f3faff)

### The "Glass & Gradient" Rule
For "Hero" elements or mission-critical data, use a linear gradient: `primary` (#003461) transitioning to `primary_container` (#004b87) at a 135-degree angle. Use Glassmorphism for floating navigation bars or quick-action menus by applying `surface_container_highest` at 70% opacity with a `24px` backdrop-blur.

## 3. Typography: Authority & Legibility
We utilize a dual-font strategy to balance industrial "Display" impact with "Body" readability.

*   **The Display Choice (Manrope):** Chosen for its geometric, authoritative structure. Use `display-lg` and `headline-md` for high-level KPIs and machine status. It commands attention in high-glare outdoor environments.
*   **The Body Choice (Inter):** The workhorse for data. Inter’s tall x-height ensures that even `body-sm` (0.75rem) remains legible for technicians reading logs on mobile devices under direct sunlight.

**Typography Hierarchy:**
*   **KPI Values:** `display-md` (Manrope) — Bold and undeniable.
*   **Field Labels:** `label-md` (Inter) — Uppercase with 5% letter spacing to enhance clarity against slate grays.
*   **Primary Reading:** `body-lg` (Inter) — High contrast (`on_surface`) for maximum accessibility.

## 4. Elevation & Depth: Tonal Layering
Traditional material shadows are too "soft" for an industrial app. We define depth through **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface_container_highest` element should be used for the most interactive, "closest" elements to the user, while `surface_dim` is used for background utility areas.
*   **Ambient Shadows:** When a card must float (e.g., a "Start Shift" button), use a diffused shadow: `Y: 12px, Blur: 24px, Color: primary_fixed_variant (at 8% opacity)`. This mimics natural light reflecting off a deep blue surface.
*   **The "Ghost Border" Fallback:** If a border is required for high-glare accessibility, use `outline_variant` at **15% opacity**. Never use 100% opaque outlines.

## 5. Components & Interaction Patterns

### Buttons (Tactile Command)
*   **Primary:** Gradient of `primary` to `primary_container`. Radius: `md` (0.75rem). Text: `label-md` bold, all-caps.
*   **Tertiary (Alerts):** Background of `tertiary_container` with `on_tertiary_container` text. Use for "Stop Machine" or "Report Incident."

### Data Cards & Lists
*   **Rule:** Forbid divider lines. Use `1.5rem` (xl) vertical spacing between list items.
*   **The "Active" State:** An active list item should shift from `surface_container` to a subtle gradient of `surface_container_highest` with a `primary` left-accent bar (4px wide).

### Industrial Input Fields
*   **Styling:** Inputs use `surface_container_low` with a `2px` bottom-only focus bar in `primary`. This provides a "heavy" feel suitable for rugged hardware.
*   **Touch Targets:** Every input and button must maintain a minimum height of `48px` to accommodate gloved hands or shaky outdoor environments.

### Gamification Elements (The "Pulse")
*   **Progress Rings:** Use `tertiary_fixed_dim` for the track and `primary` for the progress. Add a subtle `surface_tint` outer glow to represent an "active" or "running" state.

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts for data. (e.g., Large KPI on the left, small trend sparkline on the top right).
*   **Do** use `8px` (DEFAULT) to `12px` (md) corner radii for a "durable" feel that isn't too bubbly.
*   **Do** use `on_surface_variant` (#424750) for secondary metadata to reduce visual noise.

### Don’t:
*   **Don't** use pure black (#000000). Use `on_surface` (#071e27) for text to maintain the deep blue brand soul.
*   **Don't** use standard "Material Design" cards with 1px gray borders. It breaks the premium "Tactical Command" vibe.
*   **Don't** use red for warnings unless it's a critical error. Use the "Safety Orange" `tertiary` palette for operational alerts to keep the user motivated rather than panicked.
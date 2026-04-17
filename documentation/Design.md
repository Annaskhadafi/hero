# HERO Design Template

## Industrial Authority & Precision

This document defines the shared visual language for HERO. The design direction is "The Tactical Command Center": an interface that feels durable, precise, and operationally trustworthy, like a modern industrial control room rather than a generic web app.

## Creative Principles

1. Build authority through tonal depth, not heavy outlines.
2. Use asymmetry intentionally: labels can sit left while values, status chips, or trends anchor right.
3. Treat the UI as stacked physical layers. Surfaces should feel nested and modular.
4. Reserve the strongest visual energy for mission-critical actions and KPIs.
5. Avoid the "flat template" look by using gradients, floating panels, and atmospheric backgrounds.

## Core Palette

| Token | Value | Usage |
| --- | --- | --- |
| `primary` | `#003461` | Main authority color, shell accents, CTA base |
| `primary_container` | `#004b87` | Gradient pair for hero panels and primary buttons |
| `tertiary` | `#5a2200` | Safety orange family for operational alerts |
| `surface` | `#f3faff` | Global canvas |
| `surface_container_low` | `#e6f6ff` | Section backgrounds |
| `surface_container_lowest` | `#ffffff` | Primary cards |
| `surface_bright` | `#f3faff` | Overlays and elevated panels |
| `on_surface` | `#071e27` | Main text |
| `on_surface_variant` | `#424750` | Secondary text and metadata |

## Surface Rules

### No-Line Rule

Do not use opaque 1px borders to separate major sections. Create boundaries through surface contrast:

- Put `surface_container_lowest` cards on top of `surface_container_low`.
- Use subtle ghost outlines only as accessibility fallback.
- If an outline is needed, use 15% opacity of `outline_variant`, never a full solid border.

### Layer Hierarchy

1. `surface`: page canvas
2. `surface_container_low`: sections and table wraps
3. `surface_container_lowest`: cards and active content blocks
4. `surface_bright`: overlays, drawers, and modal interiors

## Typography

- Display font: `Manrope`
- Body font: `Inter`
- Monospace: `Geist Mono`

### Scale Guidance

- KPI values: large `Manrope`, bold, tight tracking
- Page titles: `Manrope`, strong weight, negative tracking
- Labels and metadata: uppercase `Inter` with expanded letter spacing
- Reading copy: `Inter` with strong contrast on `on_surface`

## Components

### Buttons

- Primary buttons use a `primary -> primary_container` 135-degree gradient.
- Button text is bold, uppercase, and command-like.
- Minimum touch height is `48px`.
- Alert actions use the tertiary container palette instead of default red.

### Cards

- Cards float through tonal layering and soft ambient shadow.
- Avoid section divider lines inside cards when spacing can do the job.
- Use rounded corners in the `8px` to `12px` range.

### Inputs

- Inputs sit on `surface_container_low`.
- Use a bottom-only focus bar in `primary`.
- Keep the field body substantial, with minimum `48px` height.

### Tables and Lists

- No row divider lines.
- Use generous vertical spacing to separate items.
- Active rows can use a stronger card tone and a left accent strip in `primary`.

### Glass Panels

- Navigation bars and floating command surfaces should use 70% opacity containers with strong backdrop blur.
- Pair glass with tonal shadows, not hard outlines.

## Interaction Patterns

- Use gradients only where hierarchy or action emphasis matters.
- Keep informational surfaces calm and readable.
- Use tertiary/orange for operational warning states, not generic danger by default.
- Avoid pure black text. Use `on_surface` to retain the blue industrial character.

## Implementation Mapping

The current codebase applies this system through:

- `app/globals.css`: tokens, atmospheric background, utility classes
- `app/layout.tsx`: Manrope + Inter font stack
- `components/ui/*`: shared primitives for buttons, cards, inputs, tabs, tables, and sidebar
- `components/admin-page-shell.tsx`: shared dashboard page framing
- `components/auth/auth-shell.tsx`: shared auth surface styling

## Page Checklist

When adding or updating a page:

1. Start with `surface_container_low` as the section base.
2. Place content modules in `surface_container_lowest` cards.
3. Use `Manrope` for page title and KPI moments.
4. Prefer spacing over divider lines.
5. Use `primary` gradients only for key command surfaces.
6. Use tertiary/orange for operational alerts, escalations, or stop-state actions.

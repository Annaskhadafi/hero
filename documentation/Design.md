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
- Exception: dense table toolbar controls use compact `32px` to `36px` height with normal-case labels.
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

- Every operational table must use a minimal command-bar layout before the grid.
- The table command bar must include these controls in one horizontal flow:
  - Search input for quick filtering.
  - Filter area for contextual filters.
  - Date range action only when the dataset has a meaningful date/time context.
  - Action menu for quick presets and reset.
  - Export button for `Excel`.
- Use soft surface layering instead of hard boxed outlines.
- Table header sits on `surface_container_low` with subtle contrast from the row area.
- Rows use thin ghost separators only. Avoid heavy full borders.
- Hover states should stay calm: light tonal shift, no dramatic glow.
- Action cells should stay compact and icon-led, never visually noisy.
- Show a lightweight summary line above the table body: visible rows versus total rows.
- Search, filters, and Excel export actions must be reusable and consistent across every page-level table.
- Date actions are optional and should be omitted when they do not match the table context.
- Table command controls should stay compact/minimal (`~36px` height target) and avoid oversized buttons.
- Export controls in table toolbars should use a short `Excel` label with an icon; avoid large `Export ...` buttons in dense tables.
- Search inputs in table toolbars should stay compact (`~220px` desktop target) and must not stretch so far that actions wrap awkwardly.

## Layout Strategy

### Table-first Workspace

- Default layout for data-heavy pages is table-first, not card-grid-heavy dashboards.
- Avoid stacking many large grids/cards on one screen (especially in operational pages like `My Day` and `Team Board`).
- Keep one clear primary workspace per tab with focused table surfaces.
- Do not place multiple independent list/table cards side-by-side in a grid when they represent related features. Put them into tabs instead.
- KPI or summary values may be compact chips in a header, but should not become a 3-4 column card grid unless the page is a true analytics dashboard.

### Forms as Modal

- Forms for create/update workflows should open in modal/dialog by default.
- Avoid long inline forms beside table content unless the page is explicitly a dedicated form page.
- Keep the base page focused on reading/monitoring data; editing happens in dialog layers.

### Tabs for Related Features

- Related feature groups should be split into tabs instead of long multi-section pages.
- Each tab should represent one operational context (for example queue, history, dispute, settings).
- Tab content should stay clean: compact summary + command bar + table or focused content block.
- When two related lists would otherwise sit beside each other, convert them into sibling tabs.

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
7. Use tabs for related lists/tables instead of side-by-side grid panels.
8. Put create/update forms in dialogs unless the route is specifically dedicated to form entry.

## Table Blueprint

Use this as the default blueprint for every table in HERO:

1. Toolbar layer:
   Search on the left, optional filter chips/selects in the middle, then action menu and export actions on the right. Keep controls compact and add date action only when date context exists.
2. Summary layer:
   Show `Showing X of Y ...` in a compact capsule-like strip before the table body.
3. Table layer:
   Clean header, soft separators, compact actions, and clear hover state.
4. Export behavior:
   Every page-level table should support Excel export only.
5. Date behavior:
   Expose a date-range action only for time-based datasets (e.g. created, updated, submitted, due, event time).
   Do not show date range for static master data, leaderboard/ranking snapshots, role lists, category summaries, or tables without a meaningful date field.
6. Action behavior:
   Every page-level table should include a table-level action menu for reset/preset behavior, while row-level actions remain in the `Aksi` or `Action` column when relevant.

# HERO Design Template

## Clean Operational Workspace

This document defines the shared visual language for HERO desktop and mobile. The current desktop direction is a clean operational workspace inspired by the usability of `one-chitra`: bright surfaces, light structure, compact table tooling, and low-noise CRUD screens. Mobile keeps its dedicated app-shell behavior and should not be redesigned by desktop shell changes.

## Creative Principles

1. Keep desktop bright, clean, and calm.
2. Let tables and CRUD actions dominate the workspace, not decorative panels.
3. Use soft borders and subtle shadows instead of heavy gradients or industrial textures.
4. Make filters, search, sort, import, and export feel compact and obvious.
5. Preserve dedicated mobile structure and avoid desktop token changes that visually break `/mobile`.

## Core Palette

| Token | Value | Usage |
| --- | --- | --- |
| `primary` | `#0f172a` | Main desktop accent, text emphasis, strong actions |
| `primary_container` | `#334155` | Secondary dark accent |
| `tertiary` | `#92400e` | Operational warning family |
| `surface` | `#f5f7fb` | Global desktop canvas |
| `surface_container_low` | `#eef2f7` | Toolbar bands, muted shells |
| `surface_container_lowest` | `#ffffff` | Primary cards |
| `surface_bright` | `#ffffff` | Overlays and elevated panels |
| `on_surface` | `#0f172a` | Main text |
| `on_surface_variant` | `#64748b` | Secondary text and metadata |

## Surface Rules

### No-Line Rule

Do not rely on hard dark borders. Create boundaries through white surfaces, light grey bands, and subtle shadows:

- Put `surface_container_lowest` cards on top of `surface_container_low`.
- Use subtle ghost outlines only as accessibility fallback.
- If an outline is needed, use 15% opacity of `outline_variant`, never a full solid border.

### Layer Hierarchy

1. `surface`: page canvas
2. `surface_container_low`: toolbar strips and muted wrappers
3. `surface_container_lowest`: cards, tables, dialogs, active content blocks
4. `surface_bright`: overlays, popovers, modal interiors

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

- Primary buttons use solid dark contrast or restrained gradient only when emphasis is needed.
- Button text should stay compact and readable, not oversized.
- Minimum touch height is `48px`.
- Exception: dense table toolbar controls use compact `32px` to `36px` height with normal-case labels.
- Alert actions use the tertiary container palette instead of default red.

### Cards

- Cards should look like clean application surfaces: white background, soft border, light shadow.
- Avoid section divider lines inside cards when spacing can do the job.
- Use rounded corners in the `10px` to `16px` range.

### Inputs

- Inputs sit on white or muted-light surfaces.
- Focus style should be clean and understated.
- Dense toolbar controls should default to `36px` height on desktop.

### Tables and Lists

- Every operational table must use a compact command-bar layout before the grid.
- The table command bar must include these controls in one horizontal flow:
  - Search input for quick filtering.
  - Filter area for contextual filters. Prefer searchable multi-select filters over plain select where practical.
  - Date range action only when the dataset has a meaningful date/time context.
  - Action menu for quick presets and reset.
  - Import button that supports field mapping when the page has import behavior.
  - Export button for `Excel`.
- Use clean white wrappers and subtle borders like `one-chitra`.
- Table header sits on a light muted band with subtle contrast from the row area.
- Rows use thin soft separators only.
- Hover states should stay calm: light tonal shift, no dramatic glow.
- Every sortable column should show a visible sort affordance.
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

### CRUD Surfaces

- CRUD pages should feel like operational admin workspaces, not marketing panels.
- Use one clean primary surface for list/table, then dialogs/drawers for create and update.
- Avoid decorative hero blocks above CRUD unless they add operational value.
- Page headers should be compact. Avoid decorative eyebrow chips, top-performer badges, or explanatory subtitles by default.
- Default desktop page header content is the title plus actions only.

### Forms as Modal

- Forms for create/update workflows should open in modal/dialog by default.
- Avoid long inline forms beside table content unless the page is explicitly a dedicated form page.
- Keep the base page focused on reading/monitoring data; editing happens in dialog layers.

### Tabs for Related Features

- Related feature groups should be split into tabs instead of long multi-section pages.
- Each tab should represent one operational context (for example queue, history, dispute, settings).
- Tab content should stay clean: compact summary + command bar + table or focused content block.
- When two related lists would otherwise sit beside each other, convert them into sibling tabs.

### Mobile App Router

- Phone users should enter a dedicated mobile route (`/mobile`) instead of receiving a squeezed desktop dashboard.
- Mobile screens should use app-native structure: compact top bar, hamburger sheet menu, bottom tab navigation, safe-area spacing, and large touch targets.
- Mobile pages should prioritize one primary task per screen, with short cards and action buttons instead of dense desktop tables.
- Desktop admin routes remain table-first; mobile routes may use focused cards when they behave like native app task surfaces.

### Glass Panels

- Desktop navigation bars and command surfaces should be light, crisp, and low-noise.
- Use blur sparingly. Prefer clean white surfaces first.
- Mobile top navigation must stay single-row and compact: menu trigger, truncated title, notification, and theme action should align horizontally.
- Mobile navbar icon buttons should use compact touch targets (`36px` to `40px`) and must not wrap into a second row unless a page adds a truly critical action.

## Interaction Patterns

- Use gradients only where hierarchy or action emphasis matters.
- Keep informational surfaces calm and readable.
- Use tertiary/orange for operational warning states, not generic danger by default.
- Avoid harsh black text. Use `on_surface` and `on_surface_variant`.

## Implementation Mapping

The current codebase applies this system through:

- `app/globals.css`: desktop tokens, background, utility classes
- `app/layout.tsx`: Manrope + Inter font stack
- `components/ui/*`: shared primitives for buttons, cards, inputs, tabs, tables, and sidebar
- `components/admin-page-shell.tsx`: shared dashboard page framing
- `components/auth/auth-shell.tsx`: shared auth surface styling

## Required Reuse Stack

Desktop dashboard pages must reuse the shared CRUD and table building blocks instead of creating new standalone shells.

1. Page shell:
   Use `components/admin-page-shell.tsx` for desktop admin/dashboard page framing.
2. Table shell:
   Use `components/ui/minimal-table-shell.tsx` directly, or use wrappers built on top of it such as `components/admin-table-card.tsx` or `components/admin/admin-data-table-shell.tsx`.
3. Table primitive:
   Use the shared `components/ui/table.tsx` primitives inside the shell.
4. Import flow:
   Use `components/admin/admin-import-dialog.tsx` or a page-specific wrapper built on top of it when a table supports import.
5. Filters:
   Use shared filter patterns such as searchable multi-select and `data-table-filter-key` wiring so search/reset/sort/import/export stay connected.
6. CRUD create/update:
   Keep list pages table-first, and place create/update flows in shared dialogs/drawers instead of inventing new inline marketing-style layouts.

### Forbidden Patterns

- Do not create a new page-level table toolbar from scratch when `MinimalTableShell` can be used.
- Do not render a dashboard/admin table directly with `Table` alone without wrapping it in `MinimalTableShell`, `AdminTableCard`, or `AdminDataTableShell`.
- Do not add decorative placeholder import buttons. Import must point to a real flow.
- Do not build a separate desktop CRUD shell that bypasses `AdminPageShell` unless there is a proven route-specific reason.

## Page Checklist

When adding or updating a page:

1. Start with a calm desktop surface.
2. Place content modules in white `surface_container_lowest` cards.
3. Use `Manrope` for page title and KPI moments.
4. Prefer spacing over divider lines.
5. Use dark accents or restrained gradients only for key command surfaces.
6. Use tertiary/orange for operational alerts, escalations, or stop-state actions.
7. Use tabs for related lists/tables instead of side-by-side grid panels.
8. Put create/update forms in dialogs unless the route is specifically dedicated to form entry.
9. Do not change mobile visual behavior when adjusting desktop shell/tokens.

## Table Blueprint

Use this as the default blueprint for every desktop table in HERO:

1. Toolbar layer:
   Search on the left, optional searchable multi-select filters in the same row, then date action when relevant, action menu, import, and export actions on the right. Keep controls compact and aligned like `one-chitra`.
2. Summary layer:
   Show `Showing X of Y ...` in a compact capsule-like strip before the table body.
3. Table layer:
   Clean muted header, visible sort affordance on sortable columns, soft separators, compact actions, and clear hover state.
4. Export behavior:
   Every page-level table should support Excel export only.
5. Import behavior:
   If a page supports import, provide an import dialog with field mapping and clear validation status.
   Do not show a decorative or placeholder import button on tables that do not have a real import flow behind them.
6. Date behavior:
   Expose a date-range action only for time-based datasets (e.g. created, updated, submitted, due, event time).
   Do not show date range for static master data, leaderboard/ranking snapshots, role lists, category summaries, or tables without a meaningful date field.
7. Action behavior:
   Every page-level table should include a table-level action menu for reset/preset behavior, while row-level actions remain in the `Aksi` or `Action` column when relevant.

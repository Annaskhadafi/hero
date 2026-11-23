# Proposal

## Why

On HERO mobile, the quick menu search opens, but the screenshot shows its lower content clipped: only the tops of category controls are visible and no results can be seen. This prevents users from reliably selecting a menu from search.

## What Changes

- Keep the mobile search panel's input, category filters, and results usable in the visible area, including when the on-screen keyboard opens.
- Keep existing search, category filtering, and menu navigation behavior unchanged.
- Add real-browser regression coverage on a small mobile viewport.

## Capabilities

### New Capabilities

- `mobile-quick-menu-search`: First spec for the existing mobile dashboard search, covering layout, filtering, and menu selection.

### Modified Capabilities

None; there is no existing OpenSpec capability for this feature.

## Impact

HERO's `/mobile` dashboard search sheet and its regression test. No changes to permissions, data sources, API, or desktop UI.

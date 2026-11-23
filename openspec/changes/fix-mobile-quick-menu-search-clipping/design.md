# Design

## Context

`MobileDashboardSearch` uses a portaled bottom `SheetContent` constrained to `90vh`, with results separately capped at `50vh`. The component also focuses the input shortly after opening. Neither height limit explicitly models keyboard-reduced visual viewport space. The shared sheet is already above HERO's bottom nav in the current source (z-50 vs z-40); the screenshot alone cannot prove whether the original clipping is from viewport geometry, stacking, or both.

## Goals / Non-Goals

**Goals:** Distinguish clipping from layering with a browser regression before changing the component; keep the fix local to mobile quick search.

**Non-goals:** Redesign the mobile shell, change shared sheets for other features, or modify menu data and authorization.

## Decisions

- Keep the existing accessible sheet primitive. Use one available-height limit for the sheet with safe-area padding and a scrollable inner region that can shrink, instead of independent viewport caps or raising the z-index without evidence.
- Prefer dynamic viewport sizing. Use `visualViewport` resize and offset only if browser or WebView evidence shows it is needed to keep the sheet above the keyboard; clean up listeners when closed. Check actual element geometry and hit testing, not only DOM visibility.

## Risks / Trade-offs

- Desktop mobile emulation does not prove native keyboard behavior → exercise a reduced viewport in browser automation and verify Android WebView keyboard behavior separately if a device is available.
- Very short screens may not fit all controls at once → preserve scrolling within the panel rather than hiding controls.

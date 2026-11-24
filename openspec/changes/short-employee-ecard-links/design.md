# Design

## Context
The current e-card page and vCard resolve legacy opaque tokens. The share control relies on opt-in in the authoritative employee record.

## Goals / Non-Goals
Provide a stable, readable URL; keep full display names and contact fields unchanged. No changes to Expo Scanner, no public directory.

## Decisions
Store a distinct unique alias on the employee record. Normalize name parts to lowercase ASCII with hyphens. Keep a name that fits within 24 characters; otherwise try the first and last words, then shorten while preserving whole words where possible. Use a short unique suffix for collisions, with database uniqueness enforced on allocation. Keep issued aliases stable, do not recycle them, and preserve legacy tokens. Use one server-side resolver for both public routes and enforce active/opt-in checks before returning data. Backfill opted-in records without changing opt-in status. Generate links with the alias when available and preserve the legacy route.

## Risks / Trade-offs
Readable aliases are guessable. Do not expose an index or permit lookup of non-shared employees. Malformed aliases, unknown records and revoked links return 404. Test same-name allocation concurrently, and verify no release depends on the unrelated install-prompt fix.

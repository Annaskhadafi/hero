# Design

## Context
The approved visual reference is `Chitra-Executive-English.html` in the TKT-0004 mockup set. The older light-card candidate in the isolated ticket worktree is not approved for release. The existing public page and vCard route authorize through an opaque employee token, active status and opt-in.

## Goals / Non-Goals
**Goals:** A compact, person-first profile with company information progressively disclosed. **Non-goals:** Expo scanning, persistence changes, or changing what employee data may be published.

## Decisions
- Share a small profile presentation between owner preview and public card where practical. Use the real employee name, job title and authorized photo or initials. Keep sharing controls in the owner surface. Use HERO components where applicable.
- Derive QR and vCard targets from the existing public token route. Never substitute the company homepage or demo token in production.
- Use the verified headquarters details from MahaDasha. Preserve the three verified Chitra operations photos from MahaDasha and the four verified manufacturer references (Michelin XDR3, Jantsa industrial wheels, IMT TireHand, Haltec inflation tools), with attribution and source links. Treat models as references, not stock promises. Use optimized public assets, not expiring social CDN URLs, with an explicit provenance record.
- Show the official Instagram profile iframe only after explicit activation in Gallery; retain post and profile links independently. Do not include the employee token in the third-party referrer.

## Risks / Trade-offs
Third-party content may be blocked; identity and contact controls must still work. Validate at narrow mobile width, with long names and keyboard navigation. Test both public read paths after revocation and verify no effect on Expo Scanner.

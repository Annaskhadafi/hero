# Tasks

## 1. Approval request and Telegram decision
- [ ] 1.1 Add request and audit storage, HERO email preset and active SMTP wiring; verify recipient lookup, idempotent delivery and delivery-log readback.
- [ ] 1.2 Verify authorized Telegram confirmation tied to one package, with cancellation, expiry, and replay rejection.

## 2. Scoped Git publication
- [ ] 2.1 Add exact-package publisher and align the Git guard; verify commit, non-force push, remote readback, drift and crash recovery against a disposable remote.
- [ ] 2.2 Exercise end-to-end email notification and Telegram confirmation to push with sanitized evidence and production activation checks before resuming ticketing.

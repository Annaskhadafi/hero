# Design

## Email notification and Telegram decision
Use HERO workflow email, active SMTP transport, template registry, delivery logs, and the registered employee address. Email is informational and cannot authorize Git; no dedicated inbound mailbox or personal Gmail connection is required. Use the Hermes clarification button in the designated user's Telegram DM, showing the immutable release package and explicitly naming both commit and push. Bind the decision to that live package, reject timeouts/cancellation and do not carry it across revisions. Do not expose an approval endpoint accepting arbitrary email or text.

## Publication
Use a dedicated release worktree and restricted publisher. Persist trusted test evidence and approved repository, ref, base commit and staged tree hash. Lock one release attempt at a time; revalidate local and remote bindings, commit using trusted metadata, record the exact resulting commit, then push without force. A partially completed attempt may only reconcile/resume the same recorded commit if remote preconditions still hold. Abort on any drift. Keep credentials from the email parser and do not execute any free text. Align AGENTS.md with the verified package approval contract before activation; it does not authorize this feature's own first release retroactively.

## Rollout
Start with a controlled test mailbox and disposable Git remote. Keep the ticket workflow paused until delivery, valid Telegram decision, replay rejection, approved publication and audit readback are verified. This does not close a ticket until release health and evidence are independently verified.

## ADDED Requirements

### Requirement: One authenticated Telegram decision for the release package
HERO SHALL send one centralized email to the active designated employee's registered address for each eligible tested release package. The request SHALL identify the ticket, repository, target branch, base revision, staged tree fingerprint, and verification summary. The owner’s explicit Telegram decision SHALL authorize both commit and push as one decision without opening HERO.

#### Scenario: Approver presses the Telegram confirmation button
- **WHEN** the registered owner submits the explicit commit-and-push choice on the matching live confirmation in the authorized Telegram DM
- **THEN** HERO atomically records the approval of that exact package
- **AND** email replies, forwarded messages, mismatched recipients, expired confirmations, and replayed decisions cannot approve the package

### Requirement: Publication cannot exceed the approved scope
The publisher SHALL execute only one approved package, without running commands from a ticket or email. Publication SHALL require an exact staged tree, base revision, repository and destination match and successful checks for that package.

#### Scenario: Publish once after approval
- **WHEN** a worker claims an eligible approval and all bindings match
- **THEN** it commits the approved tree and pushes only that commit without force
- **AND** it verifies the remote and records the outcome and hash

#### Scenario: Stale or replayed request
- **WHEN** the base, destination or staged tree changes, the approval expires, or a consumed request is presented again
- **THEN** the worker does not publish a different or duplicate release and a changed package requires fresh approval

### Requirement: Notifications are auditable and separate from execution
HERO SHALL track email delivery, decision, and workflow outcome independently. Ticket completion SHALL require verified rollout and evidence, not merely a push.

#### Scenario: Delivery fails or approval is rejected
- **WHEN** SMTP delivery fails or the approver rejects the request
- **THEN** it is recorded and no Git write is authorized

type PendingRelease = {
  state: string
  expiresAt: number
  telegramChatId: string
  confirmationId: string
}

// Only the trusted Telegram confirmation handler may construct this decision.
type TelegramDecision = {
  telegramChatId: string
  confirmationId: string
  outcome: 'submitted' | 'cancelled' | 'timed_out'
  choice: 'commit-and-push' | 'reject' | null
}

export function matchReleaseApproval(request: PendingRelease, decision: TelegramDecision, now: number): boolean {
  return request.state === 'pending'
    && Number.isFinite(now) && Number.isFinite(request.expiresAt) && now < request.expiresAt
    && Boolean(request.telegramChatId && request.confirmationId)
    && decision.telegramChatId === request.telegramChatId
    && decision.confirmationId === request.confirmationId
    && decision.outcome === 'submitted'
    && decision.choice === 'commit-and-push'
}

type ReleasePackage = { repository: string; ref: string; base: string; tree: string }

export function releasePackageMatches(approved: ReleasePackage, current: ReleasePackage): boolean {
  const oid = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/
  return Boolean(approved.repository) && approved.repository === current.repository
    && approved.ref === 'refs/heads/main' && approved.ref === current.ref
    && oid.test(approved.base) && approved.base === current.base
    && oid.test(approved.tree) && approved.tree === current.tree
}

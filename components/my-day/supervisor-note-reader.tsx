'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { getDailyActivitySupervisorNotes } from '@/app/actions/daily-activity-supervisor-notes'
import { HeroDetailModal, HeroEmptyState } from '@/components/templates'

type Note = { id: number; note: string; createdAt: Date | string; authorName: string }

export function SupervisorNoteReader() {
  const searchParams = useSearchParams()
  const rawSessionId = searchParams.get('noteSessionId')
  const rawItemId = searchParams.get('noteItemId')
  const sessionId = rawSessionId && /^\d+$/.test(rawSessionId) ? Number(rawSessionId) : NaN
  const itemId = rawItemId && /^\d+$/.test(rawItemId) ? Number(rawItemId) : NaN
  const open = Number.isSafeInteger(sessionId) && sessionId > 0 && Number.isSafeInteger(itemId) && itemId > 0
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    let active = true
    setNotes([])
    if (open) {
      void getDailyActivitySupervisorNotes(sessionId, itemId).then((result) => {
        if (active && result.ok) setNotes(result.notes)
      }).catch(() => {
        if (active) setNotes([])
      })
    }
    return () => { active = false }
  }, [open, sessionId, itemId])

  if (!open) return null

  return (
    <HeroDetailModal
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) window.location.assign('/dashboard/activity-hub/my-day')
      }}
      title="Supervisor activity notes"
      subtitle="Read-only notes for this activity"
      statusBadge={<span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Read only</span>}
    >
      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="size-4 text-blue-600" />
                <span>{entry.authorName}</span>
                <time className="ml-auto text-xs font-normal text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('en-GB')}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{entry.note}</p>
            </li>
          ))}
        </ul>
      ) : (
        <HeroEmptyState icon={<MessageSquareText className="size-8 text-slate-400" />} title="No notes available" description="No supervisor notes are available for this activity." />
      )}
    </HeroDetailModal>
  )
}

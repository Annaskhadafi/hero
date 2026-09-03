'use client'

import React from 'react'
import { InboxTab, HistoryTab } from '@/components/approval-workbench'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>

export function MobileApprovalCenter({ data }: { data: ApprovalCenterData }) {
  const dailyCount =
    (data.dailyActivityInboxItems?.length ?? 0) +
    (data.inboxGroups || []).reduce(
      (sum, g) => sum + (g.activityCount || g.items.length),
      0
    )
  const totalPending =
    dailyCount +
    (data.overtimeInboxItems?.length ?? 0) +
    (data.ptwInboxItems?.length ?? 0) +
    (data.rfrInboxItems?.length ?? 0) +
    (data.sopWinRequestInboxItems?.length ?? 0) +
    (data.contractReviewInboxItems?.length ?? 0)

  const totalGroups =
    (data.inboxGroups?.length ?? 0) +
    (data.dailyActivityInboxItems?.length ?? 0) +
    (data.overtimeInboxItems?.length ?? 0) +
    (data.ptwInboxItems?.length ?? 0) +
    (data.rfrInboxItems?.length ?? 0) +
    (data.sopWinRequestInboxItems?.length ?? 0) +
    (data.contractReviewInboxItems?.length ?? 0)

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-[10px] font-black tracking-[0.28em] text-[#486275] uppercase">
          Approval Inbox
        </p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Approval</h1>
        <p className="text-sm font-semibold text-[#486275]">
          Inbox per requester dan riwayat hasil approval pengajuan Anda.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            Inbox Group
          </p>
          <p className="mt-3 text-2xl font-black text-[#082033]">
            {totalGroups}
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            Pending Item
          </p>
          <p className="mt-3 text-2xl font-black text-[#082033]">
            {totalPending}
          </p>
        </div>
      </section>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[1rem] bg-[#dcebf6] p-1">
          <TabsTrigger value="inbox" className="rounded-[0.8rem] font-bold">
            Inbox {totalPending > 0 ? `(${totalPending})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-[0.8rem] font-bold">
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          <InboxTab
            groups={data.inboxGroups || []}
            contractReviewItems={data.contractReviewInboxItems || []}
            rfrItems={data.rfrInboxItems || []}
            overtimeItems={data.overtimeInboxItems || []}
            ptwItems={data.ptwInboxItems || []}
            sopWinRequestItems={data.sopWinRequestInboxItems || []}
            dailyActivityItems={data.dailyActivityInboxItems || []}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <HistoryTab groups={data.historyGroups || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

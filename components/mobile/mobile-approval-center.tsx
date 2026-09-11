'use client'

import React from 'react'
import { InboxTab, HistoryTab } from '@/components/approval-workbench'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>

export function MobileApprovalCenter({
  data,
  categoryFilter,
  hideHeader = false,
  hideScorecards = false,
  hideTabs = false,
}: {
  data: ApprovalCenterData
  categoryFilter?: string
  hideHeader?: boolean
  hideScorecards?: boolean
  hideTabs?: boolean
}) {
  const isOvertimeOnly = categoryFilter === 'OVERTIME'
  const isDailyOnly = categoryFilter === 'DAILY_ACTIVITY'
  const isSingleCategory = isOvertimeOnly || isDailyOnly
  const shouldHideScorecards = hideScorecards || isSingleCategory
  const shouldHideTabs = hideTabs || isSingleCategory

  const overtimeCount = data.overtimeInboxItems?.length ?? 0
  const dailyCount = isOvertimeOnly
    ? 0
    : (data.dailyActivityInboxItems?.length ?? 0) +
      (data.inboxGroups || []).reduce(
        (sum, g) => sum + (g.activityCount || g.items.length),
        0
      )
  const ptwCount = isSingleCategory ? 0 : data.ptwInboxItems?.length ?? 0
  const rfrCount = isSingleCategory ? 0 : data.rfrInboxItems?.length ?? 0
  const sopWinCount = isSingleCategory ? 0 : data.sopWinRequestInboxItems?.length ?? 0
  const contractReviewCount = isSingleCategory ? 0 : data.contractReviewInboxItems?.length ?? 0

  const totalPending = isOvertimeOnly
    ? overtimeCount
    : isDailyOnly
      ? dailyCount
      : dailyCount + overtimeCount + ptwCount + rfrCount + sopWinCount + contractReviewCount

  const totalGroups = isOvertimeOnly
    ? overtimeCount
    : isDailyOnly
      ? (data.inboxGroups?.length ?? 0) + (data.dailyActivityInboxItems?.length ?? 0)
      : (data.inboxGroups?.length ?? 0) +
        (data.dailyActivityInboxItems?.length ?? 0) +
        overtimeCount +
        ptwCount +
        rfrCount +
        sopWinCount +
        contractReviewCount

  const inboxTabContent = (
    <InboxTab
      viewMode="mobile"
      filterCategory={categoryFilter}
      groups={isOvertimeOnly ? [] : (data.inboxGroups || [])}
      contractReviewItems={isSingleCategory ? [] : (data.contractReviewInboxItems || [])}
      rfrItems={isSingleCategory ? [] : (data.rfrInboxItems || [])}
      overtimeItems={isDailyOnly ? [] : (data.overtimeInboxItems || [])}
      ptwItems={isSingleCategory ? [] : (data.ptwInboxItems || [])}
      sopWinRequestItems={isSingleCategory ? [] : (data.sopWinRequestInboxItems || [])}
      dailyActivityItems={isOvertimeOnly ? [] : (data.dailyActivityInboxItems || [])}
    />
  )

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <section className="space-y-1">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#486275] uppercase">
            {isOvertimeOnly ? 'Approval SPL' : 'Approval Inbox'}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-[#003461]">
            {isOvertimeOnly ? 'Persetujuan SPL' : 'Approval'}
          </h1>
          <p className="text-sm font-semibold text-[#486275]">
            {isOvertimeOnly
              ? 'Inbox persetujuan Surat Perintah Lembur (SPL) yang menunggu tindakan Anda.'
              : 'Inbox per requester dan riwayat hasil approval pengajuan Anda.'}
          </p>
        </section>
      )}

      {!shouldHideScorecards && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)] border border-slate-100">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
              {isOvertimeOnly ? 'SPL Pending' : 'Inbox Group'}
            </p>
            <p className="mt-3 text-2xl font-black text-[#082033]">
              {totalGroups}
            </p>
          </div>
          <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)] border border-slate-100">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
              {isOvertimeOnly ? 'Item Lembur' : 'Pending Item'}
            </p>
            <p className="mt-3 text-2xl font-black text-[#082033]">
              {totalPending}
            </p>
          </div>
        </section>
      )}

      {shouldHideTabs ? (
        <div className="space-y-3">{inboxTabContent}</div>
      ) : (
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
            {inboxTabContent}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <HistoryTab
              viewMode="mobile"
              filterCategory={categoryFilter}
              groups={
                isOvertimeOnly
                  ? (data.historyGroups || []).filter((g) =>
                      g.items.some(
                        (i: any) =>
                          i.activityType?.toLowerCase().includes('lembur') ||
                          i.activityType?.toLowerCase().includes('overtime') ||
                          i.activityType?.toLowerCase().includes('spl') ||
                          i.title?.toLowerCase().includes('lembur') ||
                          i.title?.toLowerCase().includes('spl')
                      )
                    )
                  : (data.historyGroups || [])
              }
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}


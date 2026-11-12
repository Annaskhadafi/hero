import fs from 'fs'

let code = fs.readFileSync('components/approval-workbench.tsx', 'utf8')

// 1. Add imports
const importTarget = "import { approveApprovalGroupAction, reviewApprovalAction } from '@/app/dashboard/admin-actions'"
const newImports = `${importTarget}\r
import { AssetApprovalDialog } from '@/components/asset-approval-dialog'\r
import { approveAssetManagementItemAction, rejectAssetManagementItemAction } from '@/lib/approval-workspace'`

if (!code.includes(importTarget)) {
  console.error('Import target not found!')
  process.exit(1)
}
code = code.replace(importTarget, newImports)

// 2. Add assetManagementItems to InboxTab parameters and type
const inboxTabParamTarget = `  trainingRequestItems = [],\r
  filterCategory,\r
  viewMode = 'desktop',`

const inboxTabParamReplacement = `  trainingRequestItems = [],\r
  assetManagementItems = [],\r
  filterCategory,\r
  viewMode = 'desktop',`

code = code.replace(inboxTabParamTarget, inboxTabParamReplacement)

const inboxTabTypeTarget = `  trainingRequestItems?: any[]\r
  filterCategory?: string`

const inboxTabTypeReplacement = `  trainingRequestItems?: any[]\r
  assetManagementItems?: any[]\r
  filterCategory?: string`

code = code.replace(inboxTabTypeTarget, inboxTabTypeReplacement)

// 3. Add asset approval modal states inside InboxTab
const stateTarget = `  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
const stateReplacement = `  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())\r
  const [isAssetApprovalOpen, setIsAssetApprovalOpen] = useState(false)\r
  const [selectedAssetItem, setSelectedAssetItem] = useState<any | null>(null)\r
  const [isAssetSubmitting, setIsAssetSubmitting] = useState(false)`

code = code.replace(stateTarget, stateReplacement)

// 4. In allUnifiedItems, add loop for assetManagementItems
const listTarget = `    const sopWinItems = sopWinRequestItems || []\r
    for (const sr of sopWinItems) {`

const listReplacement = `    const assetItems = assetManagementItems || []\r
    for (const am of assetItems) {\r
      list.push({\r
        ...am,\r
        rawAssetItem: am.rawAssetItem,\r
      })\r
    }\r
\r
    const sopWinItems = sopWinRequestItems || []\r
    for (const sr of sopWinItems) {`

code = code.replace(listTarget, listReplacement)

// And update useMemo dependencies for allUnifiedItems
const memoDepsTarget = `sopWinRequestItems, rfrItems, trainingRequestItems, groups, filterCategory, processedBatchIds])`
const memoDepsReplacement = `sopWinRequestItems, rfrItems, trainingRequestItems, assetManagementItems, groups, filterCategory, processedBatchIds])`
code = code.replace(memoDepsTarget, memoDepsReplacement)

// 5. In Mobile view card action button
const mobileActionTarget = `                {item.category === 'RFR' && item.rawRfr ? (`
const mobileActionReplacement = `                {item.category === 'ASSET_MANAGEMENT' ? (\r
                  <Button\r
                    size="sm"\r
                    onClick={() => {\r
                      setSelectedAssetItem(item)\r
                      setIsAssetApprovalOpen(true)\r
                    }}\r
                    className="w-full h-11 text-sm font-black bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99]"\r
                  >\r
                    BUKA TTD ASSET ↗\r
                  </Button>\r
                ) : item.category === 'RFR' && item.rawRfr ? (`

code = code.replace(mobileActionTarget, mobileActionReplacement)

// 6. In Desktop table category badge
const badgeTarget = `item.category === 'GENERAL' && 'bg-slate-100 text-slate-700 border-slate-200'`
const badgeReplacement = `item.category === 'ASSET_MANAGEMENT' && 'bg-blue-50 text-blue-700 border-blue-200',\r
                            item.category === 'GENERAL' && 'bg-slate-100 text-slate-700 border-slate-200'`

code = code.replace(badgeTarget, badgeReplacement)

// In Desktop table title / department cell, add subTypeLabel badge
const titleCellTarget = `<p className="text-foreground font-medium">{item.title}</p>`
const titleCellReplacement = `<div className="flex items-center gap-1.5 flex-wrap">\r
                          <p className="text-foreground font-medium">{item.title}</p>\r
                          {item.subTypeLabel && (\r
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">\r
                              {item.subTypeLabel}\r
                            </span>\r
                          )}\r
                        </div>`

code = code.replace(titleCellTarget, titleCellReplacement)

// In Desktop table action cell
const desktopActionTarget = `                      {item.category === 'RFR' && item.rawRfr ? (`
const desktopActionReplacement = `                      {item.category === 'ASSET_MANAGEMENT' ? (\r
                        <Button\r
                          size="sm"\r
                          variant="outline"\r
                          onClick={() => {\r
                            setSelectedAssetItem(item)\r
                            setIsAssetApprovalOpen(true)\r
                          }}\r
                          className="h-8 text-xs font-bold text-blue-700 hover:bg-blue-50 border-blue-200 cursor-pointer shadow-xs"\r
                        >\r
                          Buka TTD ↗\r
                        </Button>\r
                      ) : item.category === 'RFR' && item.rawRfr ? (`

code = code.replace(desktopActionTarget, desktopActionReplacement)

// 7. Render AssetApprovalDialog before the closing tag of InboxTab (before line 5169: </>)
const endInboxTabTarget = `          </DialogContent>\r
        </Dialog>\r
    </>`

const endInboxTabReplacement = `          </DialogContent>\r
        </Dialog>\r
\r
        <AssetApprovalDialog\r
          open={isAssetApprovalOpen}\r
          onOpenChange={setIsAssetApprovalOpen}\r
          item={selectedAssetItem ? selectedAssetItem.rawAssetItem : null}\r
          isSubmitting={isAssetSubmitting}\r
          onApprove={async ({ decisionNote, signatureUrl }) => {\r
            if (!selectedAssetItem) return\r
            setIsAssetSubmitting(true)\r
            try {\r
              const res = await approveAssetManagementItemAction({\r
                subType: selectedAssetItem.subType,\r
                targetId: selectedAssetItem.targetId,\r
                approvalId: selectedAssetItem.approvalId,\r
                decisionNote,\r
                signatureUrl,\r
              })\r
              if (res.success) {\r
                toast.success(res.message || 'Persetujuan aset berhasil dicatat.')\r
                setIsAssetApprovalOpen(false)\r
                router.refresh()\r
              } else {\r
                toast.error(res.message || 'Gagal menyetujui pengajuan aset.')\r
              }\r
            } catch (err: any) {\r
              toast.error(err?.message || 'Terjadi kesalahan sistem.')\r
            } finally {\r
              setIsAssetSubmitting(false)\r
            }\r
          }}\r
          onReject={async ({ rejectionReason }) => {\r
            if (!selectedAssetItem) return\r
            setIsAssetSubmitting(true)\r
            try {\r
              const res = await rejectAssetManagementItemAction({\r
                subType: selectedAssetItem.subType,\r
                targetId: selectedAssetItem.targetId,\r
                approvalId: selectedAssetItem.approvalId,\r
                rejectionReason,\r
              })\r
              if (res.success) {\r
                toast.success(res.message || 'Penolakan aset berhasil dicatat.')\r
                setIsAssetApprovalOpen(false)\r
                router.refresh()\r
              } else {\r
                toast.error(res.message || 'Gagal menolak pengajuan aset.')\r
              }\r
            } catch (err: any) {\r
              toast.error(err?.message || 'Terjadi kesalahan sistem.')\r
            } finally {\r
              setIsAssetSubmitting(false)\r
            }\r
          }}\r
        />\r
    </>`

code = code.replace(endInboxTabTarget, endInboxTabReplacement)

// 8. In ApprovalWorkbench component, pass assetManagementItems into InboxTab
const workbenchPassTarget = `            trainingRequestItems={isDailyOnly ? [] : safeData.trainingRequestInboxItems || []}\r
            filterCategory={filterCategory}`

const workbenchPassReplacement = `            trainingRequestItems={isDailyOnly ? [] : safeData.trainingRequestInboxItems || []}\r
            assetManagementItems={isDailyOnly ? [] : (safeData as any).assetManagementInboxItems || []}\r
            filterCategory={filterCategory}`

code = code.replace(workbenchPassTarget, workbenchPassReplacement)

fs.writeFileSync('components/approval-workbench.tsx', code, 'utf8')
console.log('Successfully patched components/approval-workbench.tsx')

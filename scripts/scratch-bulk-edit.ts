import fs from 'fs'

const filePath = 'app/dashboard/hc/employee/client-page.tsx'
let code = fs.readFileSync(filePath, 'utf-8')

// 1. Import Checkbox and bulkUpdateEmployees
if (!code.includes('import { Checkbox }')) {
  code = code.replace(
    'import { Button } from "@/components/ui/button";',
    'import { Button } from "@/components/ui/button";\nimport { Checkbox } from "@/components/ui/checkbox";'
  )
}

if (!code.includes('bulkUpdateEmployees')) {
  code = code.replace(
    '  deleteEmployee,\n} from "@/app/actions/employee";',
    '  deleteEmployee,\n  bulkUpdateEmployees,\n} from "@/app/actions/employee";'
  )
}

// 2. Add state
const stateToInsert = `
  // Bulk Edit state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    workLocationId: "",
    positionId: "",
    expMinePermit: "",
    lastMcuDate: "",
  });
`

if (!code.includes('const [selectedIds, setSelectedIds]')) {
  code = code.replace(
    '  const [isSubmitting, setIsSubmitting] = useState(false);',
    '  const [isSubmitting, setIsSubmitting] = useState(false);\n' + stateToInsert
  )
}

// 3. Add handleSelectAll and handleSelectRow
const handlersToInsert = `
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkUpdate = async () => {
    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateEmployees(ids, bulkFormData);
      
      // Update local state blindly for simplicity, or just refresh page data.
      // Easiest is to force a soft refresh or reload data via router.refresh(), but we already have revalidatePath on server.
      // Let's just update local state where possible, but since we rely on external data for mapping names, router.refresh is best.
      toast.success(\`Berhasil memperbarui \${ids.length} karyawan.\`);
      setBulkEditOpen(false);
      setSelectedIds(new Set());
      router.refresh();
      // wait a bit and force window reload if needed
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error("Terjadi kesalahan saat bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  };
`

if (!code.includes('const handleSelectAll')) {
  code = code.replace(
    '  async function handleConfirmDelete() {',
    handlersToInsert + '\n  async function handleConfirmDelete() {'
  )
}

// 4. Update Table headers
if (!code.includes('<TableHead className="w-12 text-center">')) {
  code = code.replace(
    '<TableHead className="w-14 text-center">No</TableHead>',
    `<TableHead className="w-12 text-center">
                <Checkbox 
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-14 text-center">No</TableHead>`
  )
}

// 5. Update Table body
if (!code.includes('<TableCell className="text-center">\\n                      <Checkbox')) {
  code = code.replace(
    '<TableCell className="text-center text-muted-foreground">\\n                      {index + 1}',
    `<TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.has(emp.id)}
                        onCheckedChange={(c) => handleSelectRow(emp.id, c === true)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}`
  )
}

// 6. Add bulk edit button to actions of MinimalTableShell
if (!code.includes('Bulk Edit')) {
  code = code.replace(
    '<MinimalTableShell',
    `<MinimalTableShell
        actions={
          selectedIds.size > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setBulkEditOpen(true)}>
              Bulk Edit ({selectedIds.size})
            </Button>
          ) : null
        }`
  )
}

// 7. Add Bulk Edit Dialog at the end
const dialogToInsert = `
      {/* Bulk Edit Dialog */}
      <EnterpriseRecordDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title={\`Bulk Edit Karyawan (\${selectedIds.size} dipilih)\`}
        description="Pilih kolom yang ingin diubah. Kosongkan kolom yang tidak ingin diubah."
        footer={
          <EnterpriseActionButtons
            onCancel={() => setBulkEditOpen(false)}
            onSubmit={handleBulkUpdate}
            isSubmitting={isSubmitting}
            submitText="Simpan Perubahan"
          />
        }
      >
        <EnterpriseFormGrid>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Lokasi Kerja</label>
            <select
              value={bulkFormData.workLocationId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, workLocationId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Tidak Diubah --</option>
              {filterOptions.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job Title</label>
            <select
              value={bulkFormData.positionId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, positionId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Tidak Diubah --</option>
              {filterOptions.positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Exp Mine Permit</label>
            <input
              type="date"
              value={bulkFormData.expMinePermit}
              onChange={(e) => setBulkFormData({ ...bulkFormData, expMinePermit: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Terakhir MCU</label>
            <input
              type="date"
              value={bulkFormData.lastMcuDate}
              onChange={(e) => setBulkFormData({ ...bulkFormData, lastMcuDate: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </EnterpriseFormGrid>
      </EnterpriseRecordDialog>
`

if (!code.includes('Bulk Edit Dialog')) {
  code = code.replace('    </div>\n  );\n}\n', dialogToInsert + '    </div>\n  );\n}\n')
}

fs.writeFileSync(filePath, code, 'utf-8')
console.log('Successfully added bulk edit functionality!')

import { getItems, deleteItem, getEmployeeLabours, getRateSettings, getCentralServiceSections, duplicateItem } from "@/app/actions/service360"
import { Button } from "@/components/ui/button"
import { Copy, Trash2, Edit } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { db } from "@/db"
import { sites } from "@/db/schema/hero"
import { CreateItemDialog } from "./create-item-dialog"
import { EditItemDialog } from "./edit-item-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LabourTab } from "./labour-tab"
import { RateSettingsTab } from "./rate-settings-tab"

export const dynamic = 'force-dynamic'

export default async function ItemsPage() {
  const items = await getItems()
  const siteList = await db.select().from(sites)
  const employeeLabours = await getEmployeeLabours()
  const rateSettings = await getRateSettings()
  const centralServiceSections = await getCentralServiceSections()

  const uniqueLocations = Array.from(new Set(employeeLabours.map(e => e.siteName || "Unassigned"))).sort()

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Master Data Barang / Service</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">Import Data</Button>
          <CreateItemDialog siteList={siteList} />
        </div>
      </div>
      
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="items">Master Data</TabsTrigger>
          <TabsTrigger value="labour">Labour List</TabsTrigger>
          <TabsTrigger value="rate-settings">Pricing Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Item List</CardTitle>
            </CardHeader>
            <CardContent>
              <MinimalTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.siteName || "-"}</TableCell>
                        <TableCell>{item.jobTitle || "-"}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{Number(item.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.id < 1000000 ? (
                              <>
                                <EditItemDialog item={item} siteList={siteList} />
                                <form action={async () => {
                                  "use server"
                                  await duplicateItem(item.id)
                                }}>
                                  <Button variant="outline" size="icon" className="h-8 w-8" title="Duplicate">
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </form>
                                <form action={async () => {
                                  "use server"
                                  await deleteItem(item.id)
                                }}>
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </form>
                              </>
                            ) : (
                              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-full text-center">Synced</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labour">
          <Card>
            <CardHeader>
              <CardTitle>Labour List (Synced from User Management)</CardTitle>
            </CardHeader>
            <CardContent>
              <LabourTab employees={employeeLabours} sections={centralServiceSections} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-settings">
          <Card>
            <CardHeader>
              <CardTitle>Labour Pricing Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <RateSettingsTab settings={rateSettings} locations={uniqueLocations} sections={centralServiceSections} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

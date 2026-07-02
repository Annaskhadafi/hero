"use client";

import { useState, useEffect } from "react";
import { 
  createForecastPeriod, 
  getForecastItems, 
  updateForecastPeriodStatus,
  upsertForecastItem,
  deleteForecastItem,
  deleteForecastPeriod
} from "@/app/actions/central-service-forecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Lock, Trash2, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { bulkImportForecastItems } from "@/app/actions/central-service-forecast";
import { ImportExportButtons } from "./import-export-buttons";
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

const displayMonthYear = (val: string) => {
  if (/^\d{4,5}-\d{2}$/.test(val)) {
    const [y, m] = val.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }
  return val;
};

export function MonthlyClientPage({ initialPeriods, salesEmployees = [] }: { initialPeriods: any[], salesEmployees?: any[] }) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const selectedPeriod = periods.find(p => p.id.toString() === selectedPeriodId);
  const isLocked = selectedPeriod?.status === "Locked";

  // New period form state
  const [newMonthYear, setNewMonthYear] = useState("");
  const [newExchangeRate, setNewExchangeRate] = useState("15000");
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);

  // Item form state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const defaultItem = {
    customer: "",
    picSales: "",
    osInvoicePrevMonth: "0",
    repairForecast: "0",
    retreadForecast: "0",
    serviceForecast: "0",
    isProductAccessories: false,
    accessoriesAmountIdr: "0",
    accessoriesAmountUsd: "0",
    remark: ""
  };
  const [formsData, setFormsData] = useState<any[]>([defaultItem]);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id.toString());
    }
  }, [periods]);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchItems(Number(selectedPeriodId));
    }
  }, [selectedPeriodId]);

  const fetchItems = async (periodId: number) => {
    setIsLoading(true);
    try {
      const data = await getForecastItems(periodId);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      let formattedMonthYear = newMonthYear;
      if (/^\d{4,5}-\d{2}$/.test(newMonthYear)) {
        const [y, m] = newMonthYear.split("-");
        const d = new Date(parseInt(y), parseInt(m) - 1);
        formattedMonthYear = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }

      await createForecastPeriod({ monthYear: formattedMonthYear, exchangeRateIdrToUsd: newExchangeRate });
      toast.success("Period created");
      setIsPeriodDialogOpen(false);
      // Need a hard refresh or server action with revalidatePath handles it, but since we use initialProps we might just reload
      window.location.reload();
    } catch (e) {
      toast.error("Failed to create period");
    }
  };

  const handleLockPeriod = async () => {
    if (!selectedPeriodId) return;
    try {
      await updateForecastPeriodStatus(Number(selectedPeriodId), "Locked");
      toast.success("Period locked");
      window.location.reload();
    } catch (e) {
      toast.error("Failed to lock period");
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriodId) return;
    if (!confirm("Are you sure you want to delete this entire period and all its data?")) return;
    try {
      await deleteForecastPeriod(Number(selectedPeriodId));
      toast.success("Period deleted");
      window.location.reload();
    } catch (e) {
      toast.error("Failed to delete period");
    }
  };

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        const formData = formsData[0];
        const totalIdr = Number(formData.repairForecast) + Number(formData.retreadForecast) + Number(formData.serviceForecast);
        const dataToSave = {
          ...formData,
          periodId: Number(selectedPeriodId),
          totalForecastIdr: totalIdr.toString(),
          remainingRepair: formData.repairForecast,
          remainingRetread: formData.retreadForecast,
          remainingService: formData.serviceForecast,
          remainingTotalIdr: totalIdr.toString(),
          remainingAccessoriesIdr: formData.accessoriesAmountIdr,
          remainingAccessoriesUsd: formData.accessoriesAmountUsd,
        };
        await upsertForecastItem(dataToSave);
      } else {
        await bulkImportForecastItems(Number(selectedPeriodId), formsData);
      }

      toast.success(editingItem ? "Item updated" : `${formsData.length} items added`);
      setIsItemDialogOpen(false);
      fetchItems(Number(selectedPeriodId));
    } catch (e) {
      toast.error("Failed to save item(s)");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteForecastItem(id);
      toast.success("Item deleted");
      fetchItems(Number(selectedPeriodId));
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormsData([item]);
    setIsItemDialogOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormsData([defaultItem]);
    setIsItemDialogOpen(true);
  };

  const updateForm = (index: number, field: string, value: any) => {
    const newForms = [...formsData];
    newForms[index] = { ...newForms[index], [field]: value };
    setFormsData(newForms);
  };

  const removeForm = (index: number) => {
    setFormsData(formsData.filter((_, i) => i !== index));
  };

  const totalRepair = items.reduce((sum, item) => sum + Number(item.repairForecast || 0), 0);
  const totalRetread = items.reduce((sum, item) => sum + Number(item.retreadForecast || 0), 0);
  const totalService = items.reduce((sum, item) => sum + Number(item.serviceForecast || 0), 0);
  const grandTotalIdr = items.reduce((sum, item) => sum + Number(item.totalForecastIdr || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {displayMonthYear(p.monthYear)} {p.status === "Locked" ? "🔒" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedPeriod && (
            <Badge variant={selectedPeriod.status === "Locked" ? "secondary" : "default"}>
              {selectedPeriod.status}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isLocked && selectedPeriod && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleLockPeriod}>
                <Lock className="w-4 h-4 mr-2" />
                Lock Period
              </Button>
              <Button variant="destructive" onClick={handleDeletePeriod}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Period
              </Button>
            </div>
          )}
          
          <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Forecast Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Month / Year</Label>
                  <Input type="month" value={newMonthYear} onChange={e => setNewMonthYear(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Exchange Rate (IDR to 1 USD)</Label>
                  <Input type="number" value={newExchangeRate} onChange={e => setNewExchangeRate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreatePeriod}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!isLocked && selectedPeriod && (
            <div className="flex items-center gap-2">
              <ImportExportButtons periodId={selectedPeriodId} items={items} salesEmployees={salesEmployees} />
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedPeriodId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(grandTotalIdr)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Repair</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRepair)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Retread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRetread)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalService)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Core Services Forecast (IDR)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>PIC Sales</TableHead>
                  <TableHead className="text-right">O/S Prev Month</TableHead>
                  <TableHead className="text-right">Repair</TableHead>
                  <TableHead className="text-right">Retread</TableHead>
                  <TableHead className="text-right">Service</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Remark</TableHead>
                  {!isLocked && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : items.filter(i => !i.isProductAccessories).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">No core service items.</TableCell></TableRow>
                ) : (
                  items.filter(i => !i.isProductAccessories).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.customer}</TableCell>
                      <TableCell>{item.picSales}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.osInvoicePrevMonth))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.repairForecast))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.retreadForecast))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.serviceForecast))}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(Number(item.totalForecastIdr))}</TableCell>
                      <TableCell>{item.remark}</TableCell>
                      {!isLocked && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(item.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Accessories Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>PIC Sales</TableHead>
                  <TableHead className="text-right">Amount IDR</TableHead>
                  <TableHead className="text-right">Amount USD</TableHead>
                  <TableHead>Remark</TableHead>
                  {!isLocked && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : items.filter(i => i.isProductAccessories).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">No accessories items.</TableCell></TableRow>
                ) : (
                  items.filter(i => i.isProductAccessories).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.customer}</TableCell>
                      <TableCell>{item.picSales}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.accessoriesAmountIdr))}</TableCell>
                      <TableCell className="text-right">${Number(item.accessoriesAmountUsd).toLocaleString()}</TableCell>
                      <TableCell>{item.remark}</TableCell>
                      {!isLocked && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(item.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Forecast Item</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            {formsData.map((formData, index) => (
              <div key={index} className="relative border rounded-md p-4 bg-muted/20">
                {!editingItem && formsData.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeForm(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {formsData.length > 1 && <h4 className="font-semibold text-sm mb-4">Item #{index + 1}</h4>}
                <div className="grid gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id={`isAcc-${index}`} 
                      checked={formData.isProductAccessories}
                      onChange={e => updateForm(index, "isProductAccessories", e.target.checked)}
                    />
                    <Label htmlFor={`isAcc-${index}`}>Is Product Accessories?</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Input value={formData.customer} onChange={e => updateForm(index, "customer", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>PIC Sales</Label>
                      <Select 
                        value={formData.picSales} 
                        onValueChange={v => updateForm(index, "picSales", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sales PIC" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesEmployees.map(emp => (
                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!formData.isProductAccessories ? (
                    <>
                      <div className="space-y-2">
                        <Label>O/S Invoice Prev Month (IDR)</Label>
                        <Input type="number" value={formData.osInvoicePrevMonth} onChange={e => updateForm(index, "osInvoicePrevMonth", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Repair (IDR)</Label>
                          <Input type="number" value={formData.repairForecast} onChange={e => updateForm(index, "repairForecast", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Retread (IDR)</Label>
                          <Input type="number" value={formData.retreadForecast} onChange={e => updateForm(index, "retreadForecast", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Service (IDR)</Label>
                          <Input type="number" value={formData.serviceForecast} onChange={e => updateForm(index, "serviceForecast", e.target.value)} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amount (IDR)</Label>
                        <Input type="number" value={formData.accessoriesAmountIdr} onChange={e => updateForm(index, "accessoriesAmountIdr", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (USD)</Label>
                        <Input type="number" value={formData.accessoriesAmountUsd} onChange={e => updateForm(index, "accessoriesAmountUsd", e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Remark</Label>
                    <Input value={formData.remark} onChange={e => updateForm(index, "remark", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            {!editingItem && (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setFormsData([...formsData, defaultItem])}>
                <Plus className="w-4 h-4 mr-2" /> Add Another Row
              </Button>
            )}
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button onClick={handleSaveItem}><Save className="w-4 h-4 mr-2" /> Save {formsData.length > 1 ? `(${formsData.length} items)` : ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

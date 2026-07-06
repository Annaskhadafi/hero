"use client";

import React, { useState, useEffect } from "react";
import { getRealtimeExchangeRate, updateForecastItemStatus, addForecastActual, updateForecastActual, deleteForecastActual } from "@/app/actions/central-service-forecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};
import { Calendar, FileText, Banknote, RefreshCw, ChevronDown, ChevronUp, ArrowUpDown, TrendingUp, Wallet, Trophy, Target } from "lucide-react";

export function DailyClientPage({ initialItems, periods }: { initialItems: any[], periods: any[] }) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isActualsDialogOpen, setIsActualsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [globalRate, setGlobalRate] = useState<string>("15000");
  const [isFetchingGlobalRate, setIsFetchingGlobalRate] = useState(false);
  const [isFetchingActualRate, setIsFetchingActualRate] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods.length > 0 ? periods[0].id.toString() : "");

  const filteredItems = React.useMemo(() => {
    return initialItems.filter(wrapper => wrapper.period.id.toString() === selectedPeriodId);
  }, [initialItems, selectedPeriodId]);

  useEffect(() => {
    const saved = localStorage.getItem("daily_usd_rate");
    if (saved) setGlobalRate(saved);
  }, []);

  const handleFetchGlobalRate = async () => {
    setIsFetchingGlobalRate(true);
    try {
      const result = await getRealtimeExchangeRate();
      if (result.success && result.rate) {
        setGlobalRate(result.rate.toString());
        toast.success("Realtime rate fetched: " + result.rate);
      } else {
        toast.error(result.error || "Failed to fetch API");
      }
    } catch (_error) {
      toast.error("Failed to fetch API");
    } finally {
      setIsFetchingGlobalRate(false);
    }
  };

  const handleSaveGlobalRate = () => {
    localStorage.setItem("daily_usd_rate", globalRate);
    toast.success("Rate saved locally");
  };

  const [statusForm, setStatusForm] = useState({ status: "", remark: "" });
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [editingActualId, setEditingActualId] = useState<number | null>(null);
  
  const [actualsForm, setActualsForm] = useState({
    updateDate: new Date().toISOString().split("T")[0],
    amountIdr: "0",
    amountUsd: "0",
    exchangeRate: "15000",
    remark: "",
    customer: "",
    periodId: "",
  });

  type SortField = 'customer' | 'forecast' | 'actual' | 'sisa';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };



  const handleUpdateStatus = async () => {
    if (!selectedItem || !statusForm.status) return;
    try {
      await updateForecastItemStatus(selectedItem.item.id, statusForm.status, statusForm.remark);
      toast.success("Status updated");
      setIsStatusDialogOpen(false);
      window.location.reload();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleAmountIdrChange = (val: string) => {
    const amountIdr = Number(val);
    const rate = Number(actualsForm.exchangeRate) || 15000;
    const amountUsd = rate && amountIdr > 0 ? (amountIdr / rate).toFixed(2) : "0";
    setActualsForm({ ...actualsForm, amountIdr: val, amountUsd });
  };

  const handleActualRateChange = (val: string) => {
    const amountIdr = Number(actualsForm.amountIdr);
    const rate = Number(val) || 0;
    const amountUsd = rate && amountIdr > 0 ? (amountIdr / rate).toFixed(2) : actualsForm.amountUsd;
    setActualsForm({ ...actualsForm, exchangeRate: val, amountUsd });
  };

  const handleFetchActualRate = async () => {
    setIsFetchingActualRate(true);
    try {
      const result = await getRealtimeExchangeRate();
      if (result.success && result.rate) {
        const rate = result.rate.toString();
        setActualsForm((prev) => {
          const amountIdr = Number(prev.amountIdr);
          return {
            ...prev,
            exchangeRate: rate,
            amountUsd: amountIdr > 0 ? (amountIdr / Number(rate)).toFixed(2) : prev.amountUsd,
          };
        });
        toast.success("Kurs API terbaru: " + result.rate);
      } else {
        toast.error(result.error || "Failed to fetch API");
      }
    } catch (_error) {
      toast.error("Failed to fetch API");
    } finally {
      setIsFetchingActualRate(false);
    }
  };

  const handleSaveActuals = async () => {
    if (!actualsForm.updateDate) return;
    if (!selectedItem && (!actualsForm.customer || !actualsForm.periodId)) {
      toast.error("Customer dan period wajib diisi");
      return;
    }
    try {
      if (editingActualId) {
        await updateForecastActual(editingActualId, {
          ...actualsForm,
          updateDate: new Date(actualsForm.updateDate),
          category: "Service",
          jobCode: "",
          forecastItemId: selectedItem.item.id,
          periodId: selectedItem.period.id
        });
        toast.success("Actuals updated and remaining recalculated");
      } else {
        await addForecastActual({
          ...actualsForm,
          updateDate: new Date(actualsForm.updateDate),
          category: "Service",
          jobCode: "",
          forecastItemId: selectedItem ? selectedItem.item.id : null,
          periodId: selectedItem ? selectedItem.period.id : Number(actualsForm.periodId),
          customer: selectedItem ? selectedItem.item.customer : actualsForm.customer,
        });
        toast.success("Actuals saved and remaining recalculated");
      }
      setIsActualsDialogOpen(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to save actuals");
    }
  };

  const handleDeleteActual = async (actualId: number) => {
    if (!confirm("Are you sure you want to delete this SAP Actual?")) return;
    try {
      await deleteForecastActual(actualId);
      toast.success("Actual deleted and remaining recalculated");
      window.location.reload();
    } catch (e) {
      toast.error("Failed to delete actual");
    }
  };

  const openStatusDialog = (item: any) => {
    setSelectedItem(item);
    setStatusForm({ status: item.item.status, remark: item.item.remark || "" });
    setIsStatusDialogOpen(true);
  };

  const openActualsDialog = (item: any, actual?: any) => {
    setSelectedItem(item);
    if (actual) {
      setEditingActualId(actual.id);
      setActualsForm({
        updateDate: new Date(actual.updateDate).toISOString().split("T")[0],
          amountIdr: actual.amountIdr.toString(),
          amountUsd: actual.amountUsd.toString(),
          exchangeRate:
            Number(actual.amountUsd) > 0
              ? (Number(actual.amountIdr) / Number(actual.amountUsd)).toFixed(2)
              : globalRate,
          remark: actual.remark || "",
          customer: item?.item.customer || actual.customer || "",
          periodId: item?.period.id?.toString() || actual.periodId?.toString() || "",
      });
    } else {
      setEditingActualId(null);
      const defaultPeriodId = item?.period.id?.toString() || (periods.length > 0 ? periods[0].id.toString() : "");
      setActualsForm({
        updateDate: new Date().toISOString().split("T")[0],
        amountIdr: "0",
        amountUsd: "0",
        exchangeRate: globalRate,
        remark: "",
        customer: "",
        periodId: defaultPeriodId,
      });
      void handleFetchActualRate();
    }
    setIsActualsDialogOpen(true);
  };

  let totalForecast = 0;
  let totalActual = 0;
  let totalRemaining = 0;

  filteredItems.forEach((wrapper: any) => {
    const isAcc = wrapper.item.isProductAccessories;
    const forecastIdr = Number(isAcc ? wrapper.item.accessoriesAmountIdr : wrapper.item.totalForecastIdr);
    const remainIdr = Number(isAcc ? wrapper.item.remainingAccessoriesIdr : wrapper.item.remainingTotalIdr);
    const actualIdr = wrapper.actuals ? wrapper.actuals.reduce((sum: number, a: any) => sum + Number(a.amountIdr), 0) : 0;
    
    totalForecast += forecastIdr;
    totalRemaining += remainIdr;
    totalActual += actualIdr;
  });

  const getSortValue = (wrapper: any, field: SortField) => {
    const isAcc = wrapper.item.isProductAccessories;
    if (field === 'customer') return wrapper.item.customer.toLowerCase();
    if (field === 'forecast') return Number(isAcc ? wrapper.item.accessoriesAmountIdr : wrapper.item.totalForecastIdr);
    if (field === 'sisa') return Number(isAcc ? wrapper.item.remainingAccessoriesIdr : wrapper.item.remainingTotalIdr);
    if (field === 'actual') return wrapper.actuals ? wrapper.actuals.reduce((sum: number, a: any) => sum + Number(a.amountIdr), 0) : 0;
    return 0;
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;
    const valA = getSortValue(a, sortField);
    const valB = getSortValue(b, sortField);
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Daily Update</h2>
          <div className="w-[180px]">
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.monthYear}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-2 px-3 rounded-md border">
          <Label className="whitespace-nowrap text-xs">Kurs USD (View Only)</Label>
          <Input 
            type="number" 
            className="w-24 h-8 text-xs bg-background" 
            value={globalRate} 
            onChange={(e) => setGlobalRate(e.target.value)} 
          />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleFetchGlobalRate} disabled={isFetchingGlobalRate}>
            <RefreshCw className="w-3 h-3 mr-1"/> {isFetchingGlobalRate ? "Fetching" : "Fetch"}
          </Button>
          <Button variant="default" size="sm" className="h-8 text-xs" onClick={handleSaveGlobalRate}>
            Save
          </Button>
          <div className="w-px h-6 bg-border mx-2"></div>
          <Button onClick={() => openActualsDialog(null)} variant="secondary" size="sm" className="h-8">
            <Banknote className="w-4 h-4 mr-2" />
            Unplanned SAP Actual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Forecast</CardTitle>
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex flex-wrap items-center gap-2">
              <span>{formatCurrency(totalForecast)}</span>
              <span className="text-muted-foreground font-light text-xl">|</span>
              <span className="text-blue-600">${(totalForecast / (Number(globalRate) || 15000)).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Actual (SAP)</CardTitle>
            <Banknote className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold flex flex-wrap items-center gap-2">
                <span className="text-green-600">{formatCurrency(totalActual)}</span>
                <span className="text-muted-foreground font-light text-xl">|</span>
                <span className="text-emerald-600">${(totalActual / (Number(globalRate) || 15000)).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
              </div>
              {totalForecast > 0 && (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-blue-500" />
                    Achiev.
                  </div>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 font-bold rounded-md text-sm border border-blue-200">
                    {((totalActual / totalForecast) * 100).toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sisa (Remaining)</CardTitle>
            <Wallet className="h-6 w-6 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex flex-wrap items-center gap-2">
              <span className="text-orange-600">{formatCurrency(totalRemaining)}</span>
              <span className="text-muted-foreground font-light text-xl">|</span>
              <span className="text-amber-600">${(totalRemaining / (Number(globalRate) || 15000)).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[40px]">No.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('customer')}>
                    <div className="flex items-center">Customer <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('forecast')}>
                    <div className="flex items-center justify-end">Forecast <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('actual')}>
                    <div className="flex items-center justify-end">Actual <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('sisa')}>
                    <div className="flex items-center justify-end">Sisa <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">No waiting items.</TableCell></TableRow>
                ) : (
                  sortedItems.map((wrapper: any, index: number) => (
                    <React.Fragment key={wrapper.item.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="p-0 h-6 w-6" onClick={() => toggleExpand(wrapper.item.id)}>
                            {expandedItems.has(wrapper.item.id) ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{wrapper.period.monthYear}</TableCell>
                        <TableCell>
                          <div className="font-bold">{wrapper.item.customer}</div>
                          <div className="text-xs text-muted-foreground">{wrapper.item.picSales}</div>
                        </TableCell>
                        <TableCell>
                          {wrapper.item.isProductAccessories ? "Accessories" : "Core Services"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(wrapper.item.isProductAccessories ? wrapper.item.accessoriesAmountIdr : wrapper.item.totalForecastIdr))}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(wrapper.actuals ? wrapper.actuals.reduce((sum: number, a: any) => sum + Number(a.amountIdr), 0) : 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {formatCurrency(Number(wrapper.item.isProductAccessories ? wrapper.item.remainingAccessoriesIdr : wrapper.item.remainingTotalIdr))}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium">
                            {wrapper.item.status}
                          </span>
                        </TableCell>
                        <TableCell>{wrapper.item.remark}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openStatusDialog(wrapper)}>
                              <RefreshCw className="w-4 h-4 mr-1" /> Status
                            </Button>
                            <Button size="sm" onClick={() => openActualsDialog(wrapper)}>
                              <FileText className="w-4 h-4 mr-1" /> SAP Actual
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedItems.has(wrapper.item.id) && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8} className="p-0 border-b">
                            <div className="p-4 pl-14">
                              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-primary" /> SAP Actuals Progress
                              </h4>
                              {wrapper.actuals && wrapper.actuals.length > 0 ? (
                                <div className="border rounded-md bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount IDR</TableHead>
                                        <TableHead className="text-right">Amount USD</TableHead>
                                        <TableHead>Remark</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {wrapper.actuals.map((act: any) => (
                                        <TableRow key={act.id}>
                                          <TableCell>{new Date(act.updateDate).toLocaleDateString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-medium text-green-600">{formatCurrency(Number(act.amountIdr))}</TableCell>
                                          <TableCell className="text-right font-medium">${Number(act.amountUsd).toLocaleString("id-ID")}</TableCell>
                                          <TableCell>{act.remark}</TableCell>
                                          <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openActualsDialog(wrapper, act)}>Edit</Button>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteActual(act.id)}>Delete</Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic py-2">No actuals recorded yet.</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status for {selectedItem?.item.customer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={val => setStatusForm({...statusForm, status: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Waiting">Waiting</SelectItem>
                  <SelectItem value="Invoiced">Invoiced</SelectItem>
                  <SelectItem value="Cancel">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remark</Label>
              <Input 
                value={statusForm.remark} 
                onChange={e => setStatusForm({...statusForm, remark: e.target.value})} 
                placeholder="e.g. Waiting PO, Done PO"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAP Actuals Input Dialog */}
      <Dialog open={isActualsDialogOpen} onOpenChange={setIsActualsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActualId ? `Edit SAP Actual for ${selectedItem?.item.customer}` : (selectedItem ? `SAP Actual for ${selectedItem.item.customer}` : "Unplanned SAP Actual")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedItem && !editingActualId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input value={actualsForm.customer} onChange={e => setActualsForm({...actualsForm, customer: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select value={actualsForm.periodId} onValueChange={val => {
                    setActualsForm({...actualsForm, periodId: val});
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.monthYear}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={actualsForm.updateDate} onChange={e => setActualsForm({...actualsForm, updateDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Kurs USD API / Manual</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={actualsForm.exchangeRate}
                  onChange={e => handleActualRateChange(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleFetchActualRate} disabled={isFetchingActualRate}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isFetchingActualRate ? "Fetching" : "API"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                USD tersimpan mengikuti kurs saat submit. Edit manual jika kurs SAP berbeda.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount IDR</Label>
                <Input type="number" value={actualsForm.amountIdr} onChange={e => handleAmountIdrChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount USD</Label>
                <Input type="number" value={actualsForm.amountUsd} onChange={e => setActualsForm({...actualsForm, amountUsd: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remark</Label>
              <Input value={actualsForm.remark} onChange={e => setActualsForm({...actualsForm, remark: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveActuals}>Save Actuals</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

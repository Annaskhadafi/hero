"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createQuotation, createCustomer, saveItemToMaster, updateQuotation, getFormHistory, deleteFormHistory } from "@/app/actions/service360"
import { uploadFile } from "@/app/actions/upload"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { GripVertical, Save, X } from "lucide-react"
import { HistoryCombobox } from "@/components/ui/history-combobox"

const itemSchema = z.object({
  id: z.number(),
  itemId: z.number().nullable(),
  category: z.string(),
  monthPeriod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  extraDateRanges: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  level: z.string().optional(),
  customDescription: z.string(),
  quantity: z.number().min(0.01, "Quantity > 0"),
  price: z.number().min(0, "Price cannot be negative"),
  isBackup: z.boolean().optional(),
  backupStartDate: z.string().optional(),
  backupEndDate: z.string().optional(),
  backupLevel: z.string().optional(),
  backupDescription: z.string().optional(),
  backupPrice: z.number().min(0, "Cannot be negative").optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, { message: "End Date must be >= Start Date", path: ["endDate"] })
.refine(data => {
  if (data.isBackup && data.backupStartDate && data.backupEndDate) {
    return new Date(data.backupEndDate) >= new Date(data.backupStartDate)
  }
  return true
}, { message: "Backup End Date must be >= Start Date", path: ["backupEndDate"] })
const quotationSchema = z.object({
  quotationNumber: z.string().min(1, "Quotation Number is required"),
  quotationDate: z.string().min(1, "Date is required"),
  customerId: z.string().min(1, "Customer is required"),
  manualCustomerName: z.string().optional(),
  attn: z.string().optional(),
  cc: z.string().optional(),
  fromName: z.string().optional(),
  fromSignatureUrl: z.string().optional(),
  subject: z.string().optional(),
  poNumber: z.string().optional(),
  selectedProjectSite: z.string().optional(),
  projectName: z.string().optional(),
  poPeriodStart: z.string().optional(),
  poPeriodEnd: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  showLevel: z.boolean(),
  showQty: z.boolean(),
  hideBackupPrice: z.boolean().optional(),
  showDays: z.boolean().optional(),
  showIntro: z.boolean().optional(),
  customIntro: z.string().optional(),
  notes: z.string().optional(),
  includeBast: z.boolean().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required")
}).refine(data => {
  if (data.customerId === "manual" && !data.manualCustomerName) {
    return false
  }
  return true
}, { message: "Manual Customer Name is required", path: ["manualCustomerName"] })

export type SelectedItem = z.infer<typeof itemSchema>;

export type QuotationFormValues = z.infer<typeof quotationSchema>;

function SortableQuotationItemRow({
  id,
  children,
}: {
  id: number
  children: (props: { attributes: any; listeners: any }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-10 bg-muted/70" : undefined}>
      {children({ attributes, listeners })}
    </TableRow>
  )
}

const parseFormattedDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseMonthPeriod = (periodStr: string) => {
  if (!periodStr) return { start: "", end: "", extras: [] };
  const parts = periodStr.split(" & ");
  let start = "", end = "";
  const extras: {start: string, end: string}[] = [];
  
  if (parts.length > 0) {
    const primary = parts[0].split(" - ");
    if (primary.length === 2) {
      const s = parseFormattedDate(primary[0].trim());
      const e = parseFormattedDate(primary[1].trim());
      if (s && e) { start = s; end = e; }
    }
  }
  
  for (let i = 1; i < parts.length; i++) {
    const extra = parts[i].split(" - ");
    if (extra.length === 2) {
      const s = parseFormattedDate(extra[0].trim());
      const e = parseFormattedDate(extra[1].trim());
      if (s && e) {
        extras.push({ start: s, end: e });
      }
    }
  }
  
  return { start, end, extras };
};

const parsePoPeriod = (periodStr?: string | null) => {
  if (!periodStr) return { start: "", end: "" };
  const [startText, endText] = periodStr.split(" - ");
  return {
    start: parseFormattedDate(startText?.trim() || ""),
    end: parseFormattedDate(endText?.trim() || ""),
  };
};

export function QuotationForm({ customers: initialCustomers, items, siteList, initialQuotationNumber, initialData, initialSignatureReadableUrl, isEdit = false }: { customers: any[]; items: any[]; siteList?: any[]; initialQuotationNumber?: string; initialData?: any; initialSignatureReadableUrl?: string | null; isEdit?: boolean }) {
const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState(initialCustomers)
  const [signatureDisplayUrl, setSignatureDisplayUrl] = useState(initialSignatureReadableUrl || initialData?.fromSignatureUrl || "")
  const parsedPoPeriod = parsePoPeriod(initialData?.poPeriod)
  const initialProjectSiteId =
    siteList?.find((site) => site.name === initialData?.projectName)?.id?.toString() ||
    (initialData?.projectName ? "manual" : "")

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      quotationNumber: isEdit ? (initialData?.quotationNumber || initialQuotationNumber || "") : (initialQuotationNumber || ""),
      quotationDate: initialData?.quotationDate ? new Date(initialData.quotationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      customerId: initialData?.customerId?.toString() || "",
      manualCustomerName: "",
      taxRate: initialData?.taxRate ? Number(initialData.taxRate) : 11,
      showLevel: initialData?.showLevel ?? true,
      showQty: initialData?.showQty ?? false,
      hideBackupPrice: initialData?.hideBackupPrice ?? false,
      showDays: initialData?.showDays ?? true,
      attn: initialData?.attn || "",
      cc: initialData?.cc || "",
      fromName: initialData?.fromName || "",
      fromSignatureUrl: initialData?.fromSignatureUrl || "",
      subject: initialData?.subject || "",
      poNumber: initialData?.poNumber || "",
      selectedProjectSite: initialProjectSiteId,
      projectName: initialData?.projectName || "",
      poPeriodStart: parsedPoPeriod.start,
      poPeriodEnd: parsedPoPeriod.end,
      notes: initialData?.notes || "",
      showIntro: initialData?.showIntro ?? true,
      customIntro: initialData?.customIntro || "",
      includeBast: initialData?.includeBast ?? false,
      items: initialData?.items?.map((i: any, idx: number) => {
        const parsedPrimary = parseMonthPeriod(i.quotationItem.monthPeriod || "");
        const parsedBackup = parseMonthPeriod(i.quotationItem.backupMonthPeriod || "");
        return {
        id: idx,
        itemId: i.quotationItem.itemId,
        category: i.item?.category || (i.quotationItem.isBackup ? "Labour Cost" : "General"),
        monthPeriod: i.quotationItem.monthPeriod || "",
        startDate: parsedPrimary.start, 
        endDate: parsedPrimary.end,
        extraDateRanges: parsedPrimary.extras,
        level: i.quotationItem.level || "",
        customDescription: i.quotationItem.customDescription || i.item?.name || "",
        quantity: Number(i.quotationItem.quantity) || 1,
        price: Number(i.quotationItem.price) || 0,
        isBackup: i.quotationItem.isBackup || false,
        backupMonthPeriod: i.quotationItem.backupMonthPeriod || "",
        backupStartDate: parsedBackup.start,
        backupEndDate: parsedBackup.end,
        backupLevel: i.quotationItem.backupLevel || "",
        backupDescription: i.quotationItem.backupDescription || "",
        backupPrice: Number(i.quotationItem.backupPrice) || 0,
      }}) || []
    }
  })

  const formItems = watch("items") || []
  const taxRate = watch("taxRate")
  const selectedProjectSite = watch("selectedProjectSite")
  const poPeriodStart = watch("poPeriodStart")
  const showIntro = watch("showIntro")
  const customIntro = watch("customIntro")
  const hideBackupPrice = watch("hideBackupPrice")
  const showDays = watch("showDays")
  const poPeriodEnd = watch("poPeriodEnd")
  const selectedCustomerId = watch("customerId")
  const manualCustomerName = watch("manualCustomerName")
  const showLevel = watch("showLevel")
  const showQty = watch("showQty")
  const includeBast = watch("includeBast")
  const attn = watch("attn") || ""
  const cc = watch("cc") || ""
  const fromName = watch("fromName") || ""
  const fromSignatureUrl = watch("fromSignatureUrl") || ""
  const subject = watch("subject") || ""

  const [historyAttn, setHistoryAttn] = useState<string[]>([])
  const [historyCc, setHistoryCc] = useState<string[]>([])
  const [historyFrom, setHistoryFrom] = useState<string[]>([])
  const [historySubject, setHistorySubject] = useState<string[]>([])
  const dragSensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (selectedCustomerId && selectedCustomerId !== "manual") {
      getFormHistory(parseInt(selectedCustomerId)).then(data => {
        setHistoryAttn(data.filter(d => d.field === 'attn').map(d => d.value))
        setHistoryCc(data.filter(d => d.field === 'cc').map(d => d.value))
        setHistoryFrom(data.filter(d => d.field === 'fromName').map(d => d.value))
        setHistorySubject(data.filter(d => d.field === 'subject').map(d => d.value))
      })
    } else {
      setHistoryAttn([])
      setHistoryCc([])
      setHistoryFrom([])
      setHistorySubject([])
    }
  }, [selectedCustomerId])

  useEffect(() => {
    if (!fromName) return;
    const timer = setTimeout(async () => {
      if (isEdit && fromName === initialData?.fromName && initialData?.fromSignatureUrl) {
         return;
      }
      
      const { getLatestSignatureByFromName } = await import('@/app/actions/service360');
      const sigData = await getLatestSignatureByFromName(fromName);
      if (sigData && sigData.signatureUrl) {
        setValue("fromSignatureUrl", sigData.signatureUrl);
        setSignatureDisplayUrl(sigData.readableUrl);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fromName, isEdit, initialData, setValue]);

  const handleDeleteHistory = async (field: string, value: string) => {
    if (selectedCustomerId && selectedCustomerId !== "manual") {
      const data = await getFormHistory(parseInt(selectedCustomerId))
      const target = data.find(d => d.field === field && d.value === value)
      if (target) {
        await deleteFormHistory(target.id)
        if (field === 'attn') setHistoryAttn(prev => prev.filter(v => v !== value))
        if (field === 'cc') setHistoryCc(prev => prev.filter(v => v !== value))
        if (field === 'fromName') setHistoryFrom(prev => prev.filter(v => v !== value))
        if (field === 'subject') setHistorySubject(prev => prev.filter(v => v !== value))
      }
    }
  }

  const handlePoPeriodChange = (start: string, end: string) => {
    setValue("poPeriodStart", start)
    setValue("poPeriodEnd", end)
    setValue("items", formItems.map(item => ({ ...item, startDate: start, endDate: end })))
  }

  const calculateDays = (start?: string, end?: string) => {
    if (!start || !end) return 31;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  const getDaysInMonthOfStartDate = (start?: string) => {
    if (!start) return 31;
    const date = new Date(start);
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }

  const getRowSubtotal = (item: SelectedItem) => {
    return getPrimaryProrate(item) + getBackupProrate(item)
  }

  const PRORATE_CATEGORIES = ["Labour Cost", "Rental & Tools", "Rental", "Tools"];
  const isProrateEligible = (cat: string) => PRORATE_CATEGORIES.includes(cat) || cat === "";

  const getPrimaryProrate = (item: SelectedItem) => {
    if (isProrateEligible(item.category)) {
      let totalProrate = 0;
      if (item.startDate && item.endDate) {
        const primaryDays = calculateDays(item.startDate, item.endDate)
        const daysInMonth = getDaysInMonthOfStartDate(item.startDate)
        totalProrate += (primaryDays / daysInMonth) * item.price * item.quantity
      }
      if (item.extraDateRanges && item.extraDateRanges.length > 0) {
        item.extraDateRanges.forEach(range => {
          if (range.start && range.end) {
            const extraDays = calculateDays(range.start, range.end)
            const extraDaysInMonth = getDaysInMonthOfStartDate(range.start)
            totalProrate += (extraDays / extraDaysInMonth) * item.price * item.quantity
          }
        })
      }
      return totalProrate || (item.price * item.quantity)
    }
    return item.price * item.quantity
  }

  const getBackupProrate = (item: SelectedItem) => {
    if (isProrateEligible(item.category) && item.isBackup) {
      const backupDays = calculateDays(item.backupStartDate, item.backupEndDate)
      const daysInMonth = getDaysInMonthOfStartDate(item.backupStartDate)
      return (backupDays / daysInMonth) * (item.backupPrice || 0) * item.quantity
    }
    return 0
  }

  const handleAddBlankRow = () => {
    setValue("items", [...formItems, {
        id: Date.now(),
        itemId: null,
        category: "",
        monthPeriod: "",
        startDate: "",
        endDate: "",
        extraDateRanges: [],
        level: "",
        customDescription: "",
        quantity: 1,
        price: 0
      }])
  }

  const handleAddItem = (itemIdStr: string) => {
    if (!itemIdStr) return
    const itemId = parseInt(itemIdStr)
    const itemDef = items.find(i => i.id === itemId)
    if (!itemDef) return

    setValue("items", [...formItems, {
        id: Date.now(),
        itemId,
        category: itemDef.category,
        monthPeriod: "",
        startDate: poPeriodStart,
        endDate: poPeriodEnd,
        level: itemDef.level?.toString() || "",
        customDescription: itemDef.category === "Labour Cost" 
          ? `Labour cost ${itemDef.jobTitle || ''} (${itemDef.name})`.replace('  ', ' ')
          : itemDef.name,
        quantity: 1,
        price: Number(itemDef.price)
      }])
  }

  const handleAddAllLabour = () => {
    if (!selectedProjectSite || selectedProjectSite === "manual") {
      alert("Please select a Site Location (Project) first from the Header Details.")
      return
    }
    
    const site = siteList?.find(s => s.id.toString() === selectedProjectSite)
    const projectName = site?.name || ""

    const projectItems = items.filter(i => ['Labour Cost', 'Rental', 'Rental & Tools'].includes(i.category) && i.siteName === projectName)

    if (projectItems.length === 0) {
      alert(`No labour or rental items found for project: ${projectName}`)
      return
    }

    const newItems = projectItems.map((itemDef, idx) => ({
      id: Date.now() + idx,
      itemId: itemDef.id,
      category: itemDef.category,
      monthPeriod: "",
      startDate: poPeriodStart,
      endDate: poPeriodEnd,
      extraDateRanges: [],
      level: itemDef.level?.toString() || "",
      customDescription: itemDef.category === 'Labour Cost'
        ? `Labour cost ${itemDef.jobTitle || ''} (${itemDef.name})`
        : itemDef.name,
      quantity: 1,
      price: Number(itemDef.price)
    }))

    setValue("items", [...formItems, ...newItems])
  }

  const updateItem = (id: number, field: keyof SelectedItem, value: any) => {
    setValue("items", formItems.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: number) => {
    setValue("items", formItems.filter(item => item.id !== id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = formItems.findIndex((item) => item.id === active.id)
    const newIndex = formItems.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    setValue("items", arrayMove(formItems, oldIndex, newIndex), { shouldDirty: true })
  }

  const handleSaveItemToMaster = async (selItem: SelectedItem) => {
    if (!selItem.customDescription) {
      toast.error("Please enter a description before saving")
      return
    }
    
    try {
      const res = await saveItemToMaster({
        name: selItem.customDescription,
        category: selItem.category || "General",
        price: selItem.price
      });
      
      if (res.success && res.item) {
        updateItem(selItem.id, 'itemId', res.item.id);
        toast.success("Item saved to Master Data");
      } else {
        toast.error("Failed to save item to master");
      }
    } catch (e) {
      toast.error("Error saving item to master");
    }
  }
  const submitHandler = async (data: QuotationFormValues, isDraft = false) => {
    setLoading(true);
    try {
      // Calculate totals for the payload
      const calculatedSubTotal = data.items.reduce((acc, item) => acc + getRowSubtotal(item), 0);
      const calculatedTaxAmount = (calculatedSubTotal * data.taxRate) / 100;
      const calculatedTotalAmount = calculatedSubTotal + calculatedTaxAmount;
      
      let finalProjectName = data.projectName;
      if (data.selectedProjectSite && data.selectedProjectSite !== "manual") {
        const site = siteList?.find(s => s.id.toString() === data.selectedProjectSite);
        if (site) {
          finalProjectName = site.name;
        }
      }

      const payload = {
        ...data,
        projectName: finalProjectName,
        status: isDraft ? 'Draft' : 'Sent',
        poPeriod: (data.poPeriodStart && data.poPeriodEnd) ? `${data.poPeriodStart} - ${data.poPeriodEnd}` : null,
        subTotal: calculatedSubTotal,
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotalAmount,
        items: data.items.map(item => ({
          ...item,
          subtotal: getRowSubtotal(item),
          monthPeriod: (item.startDate && item.endDate) ? `${item.startDate} - ${item.endDate}` : null,
          backupMonthPeriod: (item.backupStartDate && item.backupEndDate) ? `${item.backupStartDate} - ${item.backupEndDate}` : null
        }))
      };
      
      const res = isEdit && initialData 
        ? await updateQuotation(initialData.id, payload)
        : await createQuotation(payload);
        
      if (res && res.id) {
        toast.success(isEdit ? "Quotation updated" : "Quotation created");
        // Open the download link in a new tab
        window.open(`/dashboard/360-service/quotations/${res.id}?download=true`, '_blank');
        // Return to the list page
        router.push("/dashboard/360-service/quotations");
      } else {
        toast.error("Error saving quotation: Unknown error");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: QuotationFormValues) => submitHandler(data, false);
  const onInvalid = (errors: any) => {
    console.error("Form Errors:", errors);
    
    // Extract all error messages recursively
    const extractErrors = (obj: any): string[] => {
      if (!obj) return [];
      if (obj.message && typeof obj.message === 'string') return [obj.message];
      
      let messages: string[] = [];
      Object.values(obj).forEach(val => {
        if (typeof val === 'object') {
          messages = [...messages, ...extractErrors(val)];
        }
      });
      return messages;
    };
    
    const errorMessages = extractErrors(errors);
    toast.error("Validation Error: " + [...new Set(errorMessages)].join(", "));
  };

  const subTotal = formItems.reduce((acc, item) => acc + getRowSubtotal(item), 0)
  const taxAmount = (subTotal * taxRate) / 100
  const totalAmount = subTotal + taxAmount
  const lineItemColumnCount = 7 + (showLevel ? 1 : 0)
  return (
    <div className="w-full pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create Quotation</h1>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Header Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Quotation Number</label>
              <Input {...register("quotationNumber")} placeholder="e.g. 001/TM/VI/2026" className="mt-1.5" />
              {errors.quotationNumber && <p className="text-red-500 text-xs mt-1">{errors.quotationNumber.message}</p>}
            </div>
            
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" {...register("quotationDate")} className="mt-1.5" />
              {errors.quotationDate && <p className="text-red-500 text-xs mt-1">{errors.quotationDate.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Customer</label>
              <SearchableSelect
                label="Customer"
                value={watch("customerId")}
                onValueChange={(val) => {
                  setValue("customerId", val, { shouldValidate: true })
                  if (val !== "manual") {
                    const c = customers.find(x => x.id.toString() === val)
                    if (c) setValue("manualCustomerName", c.customerName)
                  } else {
                    setValue("manualCustomerName", "")
                  }
                }}
                placeholder="Select a customer..."
                options={[
                  ...customers.map(c => ({ value: c.id.toString(), label: c.customerName })),
                  { value: "manual", label: "Manual Input..." }
                ]}
                widthClassName="w-full"
              />
              {watch("customerId") === "manual" && (
                <Input {...register("manualCustomerName")} placeholder="Enter customer name manually" className="mt-2" />
              )}
              {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Attn (To)</label>
              <Input {...register("attn")} placeholder="e.g. Mr. John Doe" className="mt-1.5" />
            </div>

            <div>
              <label className="text-sm font-medium">Cc</label>
              <Input {...register("cc")} placeholder="e.g. Mr. Jane Doe" className="mt-1.5" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">From (Sender Name)</label>
              <HistoryCombobox
                value={watch("fromName") || ""}
                onValueChange={(val) => setValue("fromName", val)}
                onDeleteHistory={(val) => handleDeleteHistory("fromName", val)}
                history={historyFrom}
                placeholder="e.g. Nur Sabrina F.U"
                className="mb-3"
              />
              <label className="text-sm font-medium mb-1.5 block">Signature (TTD)</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="text-xs"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append("file", file)
                    toast.info("Uploading signature...")
                    const res = await uploadFile(formData)
                    if (res.success) {
                      setValue("fromSignatureUrl", res.url)
                      setSignatureDisplayUrl(res.readableUrl)
                      toast.success("Signature uploaded")
                    } else {
                      toast.error("Upload failed")
                    }
                  }}
                />
                {signatureDisplayUrl && (
                  <img src={signatureDisplayUrl} alt="Signature" className="h-8 object-contain" />
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <HistoryCombobox
                value={watch("subject") || ""}
                onValueChange={(val) => setValue("subject", val)}
                onDeleteHistory={(val) => handleDeleteHistory("subject", val)}
                history={historySubject}
                placeholder="e.g. Penawaran Harga Jasa Tire Maintenance"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">PO Number</label>
              <Input {...register("poNumber")} placeholder="e.g. 4600010041" className="mt-1.5" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tax</label>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2 w-24">
                  <Input type="number" {...register("taxRate", { valueAsNumber: true })} />
                  <span className="text-sm">%</span>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch checked={showLevel} onCheckedChange={(v) => setValue("showLevel", v)} />
                    <label className="text-xs leading-tight">Show<br/>Level<br/>Column</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showQty} onCheckedChange={(v) => setValue("showQty", v)} />
                    <label className="text-xs leading-tight">Show<br/>QTY<br/>Column</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={hideBackupPrice} onCheckedChange={(v) => setValue("hideBackupPrice", v)} />
                    <label className="text-xs leading-tight">Hide Backup<br/>Price/Mo<br/>(PDF)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showDays} onCheckedChange={(v) => setValue("showDays", v)} />
                    <label className="text-xs leading-tight">Show<br/>Hari<br/>(PDF)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={includeBast} onCheckedChange={(v) => setValue("includeBast", v)} />
                    <label className="text-xs leading-tight text-primary font-bold">Include<br/>BAST</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-medium block mb-1.5">Project Name (for intro text)</label>
              <select 
                {...register("selectedProjectSite")}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mb-2"
              >
                <option value="">Select Site Location (Optional)</option>
                {siteList?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="manual">Manual Input</option>
              </select>
              {watch("selectedProjectSite") === "manual" && (
                <Input {...register("projectName")} placeholder="e.g. CK BMB Project" className="mt-2" />
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">PO Period (Date Range)</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={poPeriodStart || ""}
                  onChange={e => handlePoPeriodChange(e.target.value, poPeriodEnd || "")}
                  className="flex-1"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  type="date" 
                  value={poPeriodEnd || ""}
                  onChange={e => handlePoPeriodChange(poPeriodStart || "", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="lg:col-span-3 border-t pt-4 mt-2">
              <div className="flex items-center gap-2 mb-4">
                <Switch 
                  checked={showIntro} 
                  onCheckedChange={(val) => setValue("showIntro", val)} 
                />
                <label className="text-sm font-medium">Show Custom Intro Message</label>
              </div>
              {showIntro && (
                <div className="space-y-2">
                  <Textarea 
                    {...register("customIntro")} 
                    placeholder="Dear Mr. - / Mr. -,

As you are aware, Tire Maintenance is performing services at CK BMB..." 
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    If you turn this off, the intro text will not appear in the PDF. If on, this exact text will be displayed. You can use standard text.
                  </p>
                </div>
              )}
            </div>
</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Add Item from Master Data</label>
                <SearchableSelect
                  label="Item"
                  value=""
                  onValueChange={(val) => {
                    if (val) handleAddItem(val);
                  }}
                  placeholder="Select an item to add..."
                  options={items.map(item => ({
                    value: item.id.toString(),
                    label: `[${item.category}] ${item.name} - ${Number(item.price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleAddAllLabour}>
                  + Add All Labour & Rental for Project
                </Button>
                <Button type="button" variant="outline" onClick={handleAddBlankRow}>
                  + Add Blank Row
                </Button>
              </div>
            </div>

            <div className="border rounded-md mt-4 overflow-x-auto">
              <DndContext
                id="quotation-dnd-context"
                sensors={dragSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]"></TableHead>
                      <TableHead className="w-[160px]">Month</TableHead>
                      <TableHead className="min-w-[250px] w-auto">Description</TableHead>
                      {showLevel && <TableHead className="w-[120px]">Level</TableHead>}
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="min-w-[180px]">Price / Month</TableHead>
                      <TableHead className="w-[150px]">Labor Price</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={formItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                      {formItems.map((selItem) => {
                        return (
                          <SortableQuotationItemRow key={selItem.id} id={selItem.id}>
                            {({ attributes, listeners }) => (
                              <>
                                <TableCell className="align-top pt-3">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 cursor-grab text-muted-foreground active:cursor-grabbing"
                                    aria-label="Drag item"
                                    {...attributes}
                                    {...listeners}
                                  >
                                    <GripVertical className="size-4" />
                                  </Button>
                                </TableCell>
                        <TableCell className="min-w-[150px] align-top">
                          <div className="flex flex-col gap-1">
                            <Input 
                              type="date" 
                              value={selItem.startDate || ''} 
                              onChange={(e) => updateItem(selItem.id, 'startDate', e.target.value)} 
                              title="Start Date"
                            />
                            <Input 
                              type="date" 
                              value={selItem.endDate || ''} 
                              onChange={(e) => updateItem(selItem.id, 'endDate', e.target.value)} 
                              title="End Date"
                            />
                            
                            {selItem.extraDateRanges?.map((range, rangeIdx) => (
                              <div key={rangeIdx} className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Rentang Tambahan</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 rounded-md shrink-0"
                                    onClick={() => {
                                      const updatedExtras = [...(selItem.extraDateRanges || [])];
                                      updatedExtras.splice(rangeIdx, 1);
                                      updateItem(selItem.id, 'extraDateRanges', updatedExtras);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Input 
                                  type="date" 
                                  value={range.start || ''} 
                                  onChange={(e) => {
                                    const updatedExtras = [...(selItem.extraDateRanges || [])];
                                    updatedExtras[rangeIdx] = { ...updatedExtras[rangeIdx], start: e.target.value };
                                    updateItem(selItem.id, 'extraDateRanges', updatedExtras);
                                  }} 
                                  title="Extra Start Date"
                                />
                                <Input 
                                  type="date" 
                                  value={range.end || ''} 
                                  onChange={(e) => {
                                    const updatedExtras = [...(selItem.extraDateRanges || [])];
                                    updatedExtras[rangeIdx] = { ...updatedExtras[rangeIdx], end: e.target.value };
                                    updateItem(selItem.id, 'extraDateRanges', updatedExtras);
                                  }} 
                                  title="Extra End Date"
                                />
                              </div>
                            ))}

                            <div className="flex justify-center mt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-slate-500 w-full"
                                onClick={() => {
                                  const updatedExtras = [...(selItem.extraDateRanges || []), { start: "", end: "" }];
                                  updateItem(selItem.id, 'extraDateRanges', updatedExtras);
                                }}
                              >
                                + Tanggal
                              </Button>
                            </div>

                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-1 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Date</span>
                                <Input type="date" value={selItem.backupStartDate || ''} onChange={(e) => updateItem(selItem.id, 'backupStartDate', e.target.value)} />
                                <Input type="date" value={selItem.backupEndDate || ''} onChange={(e) => updateItem(selItem.id, 'backupEndDate', e.target.value)} />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[250px] align-top">
                          <div className="flex flex-col h-full">
                            <Textarea 
                              value={selItem.customDescription} 
                              onChange={(e) => updateItem(selItem.id, 'customDescription', e.target.value)} 
                              placeholder="Description"
                              rows={3}
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 relative flex flex-col gap-2">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Desc</span>
                                <SearchableSelect
                                  label=""
                                  value=""
                                  onValueChange={(val) => {
                                    if (val) {
                                      const itemDef = items.find(i => i.id === parseInt(val));
                                      if (itemDef) {
                                        const newItems = formItems.map(item => {
                                          if (item.id === selItem.id) {
                                            return {
                                              ...item,
                                              backupDescription: itemDef.category === "Labour Cost" 
                                                ? `Labour cost ${itemDef.jobTitle || ''} (${itemDef.name})`.replace('  ', ' ') 
                                                : itemDef.name,
                                              backupLevel: itemDef.level?.toString() || "",
                                              backupPrice: Number(itemDef.price)
                                            }
                                          }
                                          return item;
                                        });
                                        setValue("items", newItems);
                                      }
                                    }
                                  }}
                                  placeholder="Select backup person..."
                                  options={items.map((i) => ({
                                    label: i.category === "Labour Cost" ? `[Labour Cost] ${i.name}` : `[${i.category}] ${i.name}`,
                                    value: i.id.toString(),
                                  }))}
                                />
                                <Textarea 
                                  value={selItem.backupDescription || ''} 
                                  onChange={(e) => updateItem(selItem.id, 'backupDescription', e.target.value)} 
                                  placeholder="Backup Description"
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {showLevel && (
                          <TableCell className="align-top">
                            <div className="flex flex-col">
                              <Input 
                                value={selItem.level} 
                                onChange={(e) => updateItem(selItem.id, 'level', e.target.value)} 
                                placeholder="Level"
                              />
                              {selItem.isBackup && (
                                <div className="mt-4 pt-4 border-t border-slate-200 relative">
                                  <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Lvl</span>
                                  <Input 
                                    value={selItem.backupLevel || ''} 
                                    onChange={(e) => updateItem(selItem.id, 'backupLevel', e.target.value)} 
                                    placeholder="Level"
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="align-top">
                          <Input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={selItem.quantity} 
                            onChange={(e) => updateItem(selItem.id, 'quantity', Number(e.target.value))} 
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <Input 
                              type="number" 
                              min="0" 
                              value={selItem.price} 
                              onChange={(e) => updateItem(selItem.id, 'price', Number(e.target.value))} 
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Price</span>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  value={selItem.backupPrice || 0} 
                                  onChange={(e) => updateItem(selItem.id, 'backupPrice', Number(e.target.value))} 
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top font-semibold text-teal-700">
                          <div className="flex flex-col gap-1">
                            <span>{Number(getPrimaryProrate(selItem)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <span>{Number(getBackupProrate(selItem)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" type="button" onClick={() => removeItem(selItem.id)} className="text-red-500 hover:text-red-700 size-7">
                                <X className="size-4" />
                              </Button>
                              {!selItem.itemId && (
                                <Button variant="ghost" size="icon" type="button" onClick={() => handleSaveItemToMaster(selItem)} className="text-teal-600 hover:text-teal-800 size-7" title="Save to Master Data">
                                  <Save className="size-4" />
                                </Button>
                              )}
                            </div>
                            {selItem.category === "Labour Cost" && (
                              <Button 
                                variant={selItem.isBackup ? "default" : "outline"}
                                size="sm" 
                                type="button" 
                                onClick={() => updateItem(selItem.id, 'isBackup', !selItem.isBackup)}
                                className={selItem.isBackup ? "bg-teal-600 text-white text-[10px] h-6 px-2" : "text-[10px] h-6 px-2"}
                              >
                                {selItem.isBackup ? "Backup On" : "Backup Off"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                              </>
                            )}
                          </SortableQuotationItemRow>
                        )
                      })}
                    </SortableContext>
                    {formItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={lineItemColumnCount} className="text-center text-muted-foreground py-8">
                          No items added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-6 pt-6">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea 
                  {...register("notes")} 
                  placeholder="e.g. Terms and conditions, payment terms, etc." 
                  className="min-h-[100px]"
                />
              </div>
              <div className="w-full md:w-64 space-y-3 shrink-0">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AMOUNT</span>
                  <span className="font-medium">{subTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT TAX {taxRate}%</span>
                  <span className="font-medium">{taxAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg text-primary">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-bold">{totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/360-service/quotations")}>
              Cancel
            </Button>
            <Button variant="secondary" type="button" disabled={loading || formItems.length === 0} onClick={handleSubmit((data) => submitHandler(data, true), onInvalid)}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button type="button" disabled={loading || formItems.length === 0} onClick={handleSubmit((data) => submitHandler(data, false), onInvalid)}>
              {loading ? "Saving..." : (isEdit ? "Update Quotation" : "Create Quotation")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

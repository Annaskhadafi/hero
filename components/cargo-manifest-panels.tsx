"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, Upload, Check, X, Printer } from "lucide-react";
import {
  manageCargoManifestAction,
  importCargoManifestsAction,
  type CargoManifestRecord,
  type CargoManifestMutationState,
  type CargoImportState,
} from "@/app/actions/cargo-manifest";
import {
  getMasterGoods,
  getMasterLocations,
  getMasterRecipients,
  createMasterGoods,
  type MasterGoodsRecord,
  type MasterLocationRecord,
  type MasterRecipientRecord,
} from "@/app/actions/cargo-master";
import { Combobox } from "@/components/ui/combobox";

function OnlineSignatureInput({
  defaultName = "",
  defaultSignature = "",
}: {
  defaultName?: string;
  defaultSignature?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(defaultSignature);
  const isDrawingRef = useRef(false);

  const getPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] ?? event.changedTouches[0] : event;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    isDrawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = getPoint(event);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!isDrawingRef.current || !canvas) return;
    isDrawingRef.current = false;
    setSignatureDataUrl(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !defaultSignature) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = defaultSignature;
  }, [defaultSignature]);

  return (
    <div className="rounded-2xl bg-surface-container-low p-3 ring-1 ring-border/40">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-1.5 text-sm font-medium">
          Nama Signature
          <Input name="signatureName" defaultValue={defaultName} placeholder="Nama penandatangan..." className="h-9" />
        </Label>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">TTD Online</Label>
            <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="h-8 rounded-lg px-3 text-xs">
              Clear
            </Button>
          </div>
          <input type="hidden" name="signatureDataUrl" value={signatureDataUrl} />
          <canvas
            ref={canvasRef}
            width={520}
            height={160}
            className="h-36 w-full touch-none rounded-xl bg-white shadow-inner ring-1 ring-border/60"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="text-xs text-muted-foreground">Tulis tanda tangan langsung di area putih.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemRow = {
  no: number;
  description: string;
  serialNumber: string;
  qty: number;
  brand: string;
  remark: string;
};

const INITIAL_MUTATION: CargoManifestMutationState = { status: "idle", message: "" };
const INITIAL_IMPORT: CargoImportState = { status: "idle", message: "" };

const STATUS_OPTIONS = ["draft", "sent", "delivered", "cancelled"];

// ─── Item Row Editor ──────────────────────────────────────────────────────────

function ItemRowEditor({
  items,
  onChange,
}: {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
}) {
  const [goodsOptions, setGoodsOptions] = useState<string[]>([]);
  const [goodsData, setGoodsData] = useState<MasterGoodsRecord[]>([]);

  useEffect(() => {
    getMasterGoods().then((data) => {
      setGoodsData(data);
      setGoodsOptions(data.map(g => g.goodsName));
    });
  }, []);

  const addRow = () =>
    onChange([
      ...items,
      { no: items.length + 1, description: "", serialNumber: "", qty: 1, brand: "", remark: "" },
    ]);

  const removeRow = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })));

  const updateRow = (idx: number, field: keyof ItemRow, value: string | number) => {
    // If description changed, auto-fill brand from master data
    if (field === "description" && typeof value === "string") {
      const matchedGoods = goodsData.find(g => g.goodsName === value.trim());
      if (matchedGoods && matchedGoods.brand) {
        onChange(items.map((r, i) => (i === idx ? { ...r, description: value, brand: matchedGoods.brand } : r)));
      } else {
        onChange(items.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
      }
      
      // Auto-add to master goods if description is new
      if (value.trim() && !goodsOptions.includes(value.trim())) {
        createMasterGoods({
          goodsName: value.trim(),
          category: "",
          brand: "",
          unit: "pcs",
          weight: "",
          dimensions: "",
          hsCode: "",
          description: "",
          notes: "",
          isActive: true,
        }).then((result) => {
          if (result.status === "success") {
            getMasterGoods().then((data) => {
              setGoodsData(data);
              setGoodsOptions(data.map(g => g.goodsName));
            });
          }
        });
      }
    } else {
      onChange(items.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Item Kargo</p>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={addRow}>
          <Plus className="size-3 mr-1" /> Tambah Baris
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left font-medium w-10">No</th>
              <th className="px-2 py-2 text-left font-medium min-w-[140px]">Description</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">Serial Number</th>
              <th className="px-2 py-2 text-left font-medium w-16">Qty</th>
              <th className="px-2 py-2 text-left font-medium min-w-[100px]">Brand</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">Remark</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted-foreground text-xs">
                  Belum ada item — klik &quot;Tambah Baris&quot;
                </td>
              </tr>
            )}
            {items.map((row, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="px-2 py-1.5 text-center text-muted-foreground">{row.no}</td>
                {/* Description */}
                <td className="px-1 py-1">
                  <Combobox
                    value={row.description}
                    onChange={(val) => updateRow(idx, "description", val)}
                    options={goodsOptions}
                    placeholder="Deskripsi barang..."
                    allowCustom
                    className="h-7 text-xs border-0 bg-transparent"
                  />
                </td>
                {/* Serial Number */}
                <td className="px-1 py-1">
                  <input className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/50" value={row.serialNumber} onChange={(e) => updateRow(idx, "serialNumber", e.target.value)} placeholder="S/N..." />
                </td>
                {/* Qty */}
                <td className="px-1 py-1">
                  <input className="w-14 rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/50" type="number" min={1} value={row.qty} onChange={(e) => updateRow(idx, "qty", parseInt(e.target.value) || 1)} />
                </td>
                {/* Brand */}
                <td className="px-1 py-1">
                  <input className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/50" value={row.brand} onChange={(e) => updateRow(idx, "brand", e.target.value)} placeholder="Brand..." />
                </td>
                {/* Remark — free text */}
                <td className="px-1 py-1">
                  <input className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/50" type="text" value={row.remark} onChange={(e) => updateRow(idx, "remark", e.target.value)} placeholder="Catatan bebas..." />
                </td>
                <td className="px-2 py-1 text-center">
                  <Button type="button" size="icon" variant="ghost" className="size-6 text-red-500 hover:text-red-700" onClick={() => removeRow(idx)}>
                    <X className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Manifest Form Fields ─────────────────────────────────────────────────────

function ManifestFormFields({
  defaultValues,
  items,
  onItemsChange,
}: {
  defaultValues?: Partial<CargoManifestRecord>;
  items: ItemRow[];
  onItemsChange: (items: ItemRow[]) => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [transportHistory, setTransportHistory] = useState<string[]>([]);
  const [shippedViaHistory, setShippedViaHistory] = useState<string[]>([]);
  const [attention, setAttention] = useState(defaultValues?.attention || "");
  const [finalDestination, setFinalDestination] = useState(defaultValues?.finalDestination || "");
  const [transportVia, setTransportVia] = useState(defaultValues?.transportVia || "");
  const [shippedVia, setShippedVia] = useState(defaultValues?.shippedVia || "");

  useEffect(() => {
    // Load master data
    Promise.all([
      getMasterRecipients(),
      getMasterLocations(),
    ]).then(([recipientsData, locationsData]) => {
      setRecipients(recipientsData.map(r => r.recipientName));
      setLocations(locationsData.map(l => l.locationName));
    });

    // Load transport history from localStorage
    const saved = localStorage.getItem("cargo_transport_history");
    if (saved) {
      try {
        setTransportHistory(JSON.parse(saved));
      } catch {}
    }
    
    // Load shipped via history from localStorage
    const savedShipped = localStorage.getItem("cargo_shipped_via_history");
    if (savedShipped) {
      try {
        setShippedViaHistory(JSON.parse(savedShipped));
      } catch {}
    }
  }, []);

  const handleTransportChange = (value: string) => {
    setTransportVia(value);
    // Save to history
    if (value && !transportHistory.includes(value)) {
      const newHistory = [value, ...transportHistory].slice(0, 20);
      setTransportHistory(newHistory);
      localStorage.setItem("cargo_transport_history", JSON.stringify(newHistory));
    }
  };

  const handleShippedViaChange = (value: string) => {
    setShippedVia(value);
    // Save to history
    if (value && !shippedViaHistory.includes(value)) {
      const newHistory = [value, ...shippedViaHistory].slice(0, 20);
      setShippedViaHistory(newHistory);
      localStorage.setItem("cargo_shipped_via_history", JSON.stringify(newHistory));
    }
  };

  return (
    <div className="grid gap-4">
      <input type="hidden" name="attention" value={attention} />
      <input type="hidden" name="finalDestination" value={finalDestination} />
      <input type="hidden" name="transportVia" value={transportVia} />
      <input type="hidden" name="shippedVia" value={shippedVia} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-1.5 text-sm font-medium">
          Tanggal (Date)
          <Input name="date" type="date" defaultValue={defaultValues?.date ?? new Date().toISOString().split("T")[0]} className="h-9" />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Status
          <select name="status" defaultValue={defaultValues?.status ?? "draft"} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Attention <span className="text-xs font-normal text-muted-foreground">(penerima / ditujukan kepada)</span>
          <Combobox
            value={attention}
            onChange={setAttention}
            options={recipients}
            placeholder="Nama penerima..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Final Destination
          <Combobox
            value={finalDestination}
            onChange={setFinalDestination}
            options={locations}
            placeholder="Tujuan akhir pengiriman..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Transport Via
          <Combobox
            value={transportVia}
            onChange={handleTransportChange}
            options={transportHistory}
            placeholder="Nama ekspedisi / moda..."
            allowCustom
          />
        </Label>
        <Label className="grid gap-1.5 text-sm font-medium">
          Note / Catatan
          <Combobox
            value={shippedVia}
            onChange={handleShippedViaChange}
            options={shippedViaHistory}
            placeholder="Catatan pengiriman..."
            allowCustom
          />
        </Label>
      </div>
      <ItemRowEditor items={items} onChange={onItemsChange} />
      <OnlineSignatureInput defaultName={defaultValues?.signatureName} defaultSignature={defaultValues?.signatureDataUrl} />
    </div>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

export function CargoManifestCreateDialog() {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData,
  ) => Promise<CargoManifestMutationState>;
  const [state, dispatch] = useActionState(action, INITIAL_MUTATION);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("intent", "create");
    fd.set("itemsJson", JSON.stringify(items));
    console.log("Submitting items:", items);
    console.log("Items JSON:", JSON.stringify(items));
    dispatch(fd);
  };

  useEffect(() => {
    if (state.status === "success" && open) {
      const timer = setTimeout(() => {
        setOpen(false);
        setItems([]);
        formRef.current?.reset();
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="dense" className="rounded-lg px-3">
          <Plus className="size-4" /> Tambah Manifest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[1.4rem] border-0 bg-surface-bright p-0 shadow-[0_24px_70px_rgba(8,32,51,0.22)]">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Plus className="size-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-semibold">Tambah Cargo Manifest</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Buat dokumen cargo manifest baru dengan detail pengiriman.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <ManifestFormFields items={items} onItemsChange={setItems} />
          {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
          {state.status === "success" && <p className="text-sm text-green-600">{state.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-5">Simpan Manifest</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

export function CargoManifestEditDialog({ row }: { row: CargoManifestRecord }) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData,
  ) => Promise<CargoManifestMutationState>;
  const [state, dispatch] = useActionState(action, INITIAL_MUTATION);
  const [items, setItems] = useState<ItemRow[]>(row.items);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("intent", "update");
    fd.set("id", String(row.id));
    fd.set("itemsJson", JSON.stringify(items));
    dispatch(fd);
  };

  useEffect(() => {
    if (state.status === "success" && open) {
      const timer = setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit manifest">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[1.4rem] border-0 bg-surface-bright p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-xl font-semibold">Edit Manifest {row.manifestNumber}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <ManifestFormFields defaultValues={row} items={items} onItemsChange={setItems} />
          {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
          {state.status === "success" && <p className="text-sm text-green-600">{state.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-5">Simpan Perubahan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Action ────────────────────────────────────────────────────────────

export function CargoManifestDeleteAction({ id }: { id: number }) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData,
  ) => Promise<CargoManifestMutationState>;
  const [, dispatch] = useActionState(action, INITIAL_MUTATION);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm("Hapus manifest ini?")) return;
        const fd = new FormData();
        fd.set("intent", "delete");
        fd.set("id", String(id));
        dispatch(fd);
      }}
    >
      <Button type="submit" variant="ghost" size="icon" className="text-red-500 hover:text-red-700" aria-label="Hapus">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

// ─── Status Inline Update ─────────────────────────────────────────────────────

export function CargoManifestStatusAction({ id, currentStatus }: { id: number; currentStatus: string }) {
  const action = manageCargoManifestAction as (
    prev: CargoManifestMutationState,
    formData: FormData,
  ) => Promise<CargoManifestMutationState>;
  const [, dispatch] = useActionState(action, INITIAL_MUTATION);

  return (
    <form
      className="flex gap-1.5 items-center"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("intent", "update-status");
        fd.set("id", String(id));
        dispatch(fd);
      }}
    >
      <select name="status" defaultValue={currentStatus} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Button type="submit" variant="ghost" size="icon" className="size-8 rounded-lg" aria-label="Update status">
        <Check className="size-4" />
      </Button>
    </form>
  );
}

// ─── PDF Preview Dialog ───────────────────────────────────────────────────────

export function CargoManifestPdfDialog({ row }: { row: CargoManifestRecord }) {
  const [open, setOpen] = useState(false);

  const handleDownloadPdf = () => {
    const content = document.getElementById("cargo-pdf-content");
    if (!content) return;
    
    // Create new window with proper A4 dimensions
    const win = window.open("", "_blank", "width=794,height=1123");
    if (!win) return;
    
    win.document.write(`<!DOCTYPE html><html><head>
      <base href="${window.location.origin}" />
      <title>Cargo Manifest ${row.manifestNumber}</title>
      <style>
        @page { 
          size: A4; 
          margin: 0; 
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          margin: 0; 
          padding: 0;
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
          background: white;
        }
        .no-print { display: none !important; }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    
    // Wait for images to load
    setTimeout(() => {
      win.focus();
      win.print();
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Preview PDF">
          <FileText className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[1.4rem] border-0 bg-white p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-4 pb-2 no-print">
          <DialogTitle className="font-display text-lg">Preview — {row.manifestNumber}</DialogTitle>
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={handleDownloadPdf}>
            <Printer className="size-4" /> Cetak / Download PDF
          </Button>
        </DialogHeader>
        <div
          id="cargo-pdf-content"
          data-print-styles=".pdf-wrapper { padding: 10mm; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 9pt; } th { background: #f5f5f5; font-weight: 600; text-align: left; }"
          className="pdf-wrapper px-8 pb-8 pt-4"
        >
          <PdfContent row={row} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CargoManifestDirectExport({ row }: { row: CargoManifestRecord }) {
  const handleDirectExport = () => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);
    
    const root = document.createElement("div");
    tempDiv.appendChild(root);
    
    // Render PdfContent ke temporary div
    import("react-dom/client").then(({ createRoot }) => {
      const reactRoot = createRoot(root);
      reactRoot.render(<PdfContent row={row} />);
      
      setTimeout(() => {
        const win = window.open("", "_blank");
        if (!win) {
          document.body.removeChild(tempDiv);
          return;
        }
        
        win.document.write(`<!DOCTYPE html><html><head>
          <base href="${window.location.origin}" />
          <title>Cargo Manifest ${row.manifestNumber}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head><body>${root.innerHTML}</body></html>`);
        win.document.close();
        win.focus();
        
        setTimeout(() => {
          win.print();
          win.close();
          document.body.removeChild(tempDiv);
        }, 500);
      }, 100);
    });
  };

  return (
    <Button variant="ghost" size="icon" aria-label="Export PDF" onClick={handleDirectExport}>
      <Printer className="size-4" />
    </Button>
  );
}

function PdfContent({ row }: { row: CargoManifestRecord }) {
  // Split items into pages (max 13 items per page to avoid overflow)
  const itemsPerPage = 13;
  const pages: typeof row.items[] = [];
  
  if (row.items.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < row.items.length; i += itemsPerPage) {
      pages.push(row.items.slice(i, i + itemsPerPage));
    }
  }

  return (
    <>
      {pages.map((pageItems, pageIndex) => (
        <div
          key={pageIndex}
          style={{ 
            fontFamily: "Arial, sans-serif", 
            fontSize: "10pt", 
            color: "#000", 
            minHeight: "297mm",
            height: "297mm",
            width: "210mm",
            backgroundImage: "url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            padding: "50mm 20mm 70mm 20mm",
            position: "relative",
            pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
            pageBreakInside: "avoid"
          }}
        >
          {/* Header - Title Only (Logo sudah di background) */}
          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "18pt", color: "#003366", letterSpacing: "1.5px" }}>CARGO MANIFEST</div>
            <div style={{ fontSize: "9pt", color: "#666", marginTop: "4px" }}>
              Shipping Document {pages.length > 1 && `- Page ${pageIndex + 1} of ${pages.length}`}
            </div>
          </div>

          {/* Document Info */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "10pt" }}>
                <strong>Manifest No:</strong>{" "}
                <span style={{ color: "#c0392b", fontWeight: 700, fontSize: "11pt" }}>{row.manifestNumber}</span>
              </div>
              <div style={{ fontSize: "10pt" }}>
                <strong>Date:</strong> {row.date}
              </div>
            </div>
          </div>

          {/* Shipping Details - Only on first page */}
          {pageIndex === 0 && (
            <div style={{ border: "1px solid #003366", borderRadius: "4px", padding: "12px", marginBottom: "20px", backgroundColor: "rgba(248, 249, 250, 0.95)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "9.5pt" }}>
                <div>
                  <strong>Attention:</strong> {row.attention || "-"}
                </div>
                <div>
                  <strong>Transport Via:</strong> {row.transportVia || "-"}
                </div>
                <div>
                  <strong>Shipped Via:</strong> {row.shippedVia || "-"}
                </div>
                <div>
                  <strong>Final Destination:</strong> <span style={{ fontWeight: 600 }}>{row.finalDestination || "-"}</span>
                </div>
              </div>
            </div>
          )}

      {/* Items table */}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "9pt", marginBottom: "55px", backgroundColor: "rgba(255, 255, 255, 0.95)" }}>
        <thead>
          <tr style={{ backgroundColor: "#003366", color: "#fff" }}>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", width: "35px", textAlign: "center" }}>No</th>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", textAlign: "left" }}>Description of Goods</th>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", width: "110px", textAlign: "left" }}>Serial Number</th>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", width: "45px", textAlign: "center" }}>Qty</th>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", width: "90px", textAlign: "left" }}>Brand</th>
            <th style={{ border: "1px solid #003366", padding: "8px 6px", width: "110px", textAlign: "left" }}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px", textAlign: "center", height: "28px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px", textAlign: "center" }}>&nbsp;</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>&nbsp;</td>
              </tr>
            ))
          ) : (
            pageItems.map((item, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "rgba(255, 255, 255, 0.95)" : "rgba(249, 249, 249, 0.95)" }}>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px", textAlign: "center" }}>{item.no}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>{item.description}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>{item.serialNumber}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px", textAlign: "center" }}>{item.qty}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>{item.brand}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px 6px" }}>{item.remark}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

          {/* Signatures - Only on last page */}
          {pageIndex === pages.length - 1 && (
            <div style={{ position: "absolute", bottom: "48mm", left: "20mm", right: "20mm", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "30px", fontSize: "9.5pt" }}>
        <div style={{ position: "relative", minHeight: "118px", textAlign: "center" }}>
          <div style={{ marginBottom: row.signatureDataUrl ? "18px" : "86px", fontWeight: 600 }}>
            <div>Delivered By</div>
            <div>PT Chitra Paratama</div>
          </div>
          {row.signatureDataUrl && (
            <img
              src={row.signatureDataUrl}
              alt="Signature"
              style={{ height: "62px", maxWidth: "100%", objectFit: "contain", margin: "0 auto 6px" }}
            />
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #000", paddingTop: "6px" }}>
            <div style={{ fontWeight: 600 }}>{row.signatureName || "\u00a0"}</div>
          </div>
        </div>
        <div style={{ position: "relative", minHeight: "118px", textAlign: "center" }}>
          <div style={{ marginBottom: "90px", fontWeight: 600 }}>Forwarder</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #000", paddingTop: "6px" }}>
            <div>&nbsp;</div>
          </div>
        </div>
        <div style={{ position: "relative", minHeight: "118px", textAlign: "center" }}>
          <div style={{ marginBottom: "90px", fontWeight: 600 }}>Received by</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #000", paddingTop: "6px" }}>
            <div style={{ fontWeight: 600 }}>Customer</div>
          </div>
        </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
// ─── Import Dialog ────────────────────────────────────────────────────────────

export function CargoManifestImportDialog() {
  const action = importCargoManifestsAction as (
    prev: CargoImportState,
    formData: FormData,
  ) => Promise<CargoImportState>;
  const [state, dispatch] = useActionState(action, INITIAL_IMPORT);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (state.status === "success") setTimeout(() => setOpen(false), 1500);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const rawCsv = await file.text();
    const fd = new FormData();
    fd.set("rawCsv", rawCsv);
    dispatch(fd);
  };

  const downloadTemplate = () => {
    const csv = "date,attention,transport_via,shipped_via,final_destination,status\n2026-01-01,John Doe,JNE,Darat,Jakarta,draft";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cargo_manifest_template.csv";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="dense" variant="outline" className="rounded-lg px-3">
          <Upload className="size-4 mr-1" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-[1.4rem] border-0 bg-surface-bright p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-xl font-semibold">Import Cargo Manifest</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Upload file CSV untuk import data manifest secara massal.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={downloadTemplate}>
            Download Template CSV
          </Button>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Label className="grid gap-2 text-sm font-medium">
              File CSV
              <input ref={fileRef} type="file" accept=".csv" className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
            </Label>
            {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
            {state.status === "success" && <p className="text-sm text-green-600">{state.message}</p>}
            <div className="flex justify-end">
              <Button type="submit" className="rounded-xl px-5">Import</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row Actions (combined) ───────────────────────────────────────────────────

export function CargoManifestRowActions({ row }: { row: CargoManifestRecord }) {
  return (
    <div className="flex items-center gap-1">
      <CargoManifestPdfDialog row={row} />
      <CargoManifestEditDialog row={row} />
      <CargoManifestDeleteAction id={row.id} />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  CS_FORECAST_EXAMPLE_CSV, 
  parseCsForecastCsv, 
  getCsForecastImportValue, 
  parseCsForecastBoolean, 
  parseCsForecastNumber,
  buildCsForecastCsv
} from "@/lib/cs-forecast-import";
import { bulkImportForecastItems } from "@/app/actions/central-service-forecast";

export function ImportExportButtons({ periodId, items, salesEmployees = [] }: { periodId: string, items: any[], salesEmployees?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedCsv = useMemo(() => parseCsForecastCsv(rawCsv), [rawCsv]);
  const previewHeaders = parsedCsv.headers.slice(0, 8);

  const downloadTemplate = () => {
    downloadCsv(CS_FORECAST_EXAMPLE_CSV, "forecast-template.csv");
  };

  const handleExport = () => {
    const rowsToExport = items.map(item => ({
      customer: item.customer,
      picSales: item.picSales,
      isProductAccessories: item.isProductAccessories,
      osInvoicePrevMonth: item.osInvoicePrevMonth,
      repairForecast: item.repairForecast,
      retreadForecast: item.retreadForecast,
      serviceForecast: item.serviceForecast,
      accessoriesAmountIdr: item.accessoriesAmountIdr,
      accessoriesAmountUsd: item.accessoriesAmountUsd,
      remark: item.remark
    }));
    downloadCsv(buildCsForecastCsv(rowsToExport), "forecast-export.csv");
  };

  const handleImport = async () => {
    if (parsedCsv.records.length === 0) {
      toast.error("No valid data to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const fuse = new Fuse(salesEmployees, { keys: ["name"], threshold: 0.4 });

      const recordsToImport = parsedCsv.records.map(record => {
        const rawPic = getCsForecastImportValue(record, "picSales");
        let matchedPic = rawPic || "Unknown PIC";
        
        if (rawPic && salesEmployees.length > 0) {
          const results = fuse.search(rawPic);
          if (results.length > 0) {
            matchedPic = results[0].item.name;
          }
        }

        return {
          customer: getCsForecastImportValue(record, "customer") || "Unknown Customer",
          picSales: matchedPic,
          isProductAccessories: parseCsForecastBoolean(getCsForecastImportValue(record, "isProductAccessories"), false),
          osInvoicePrevMonth: parseCsForecastNumber(getCsForecastImportValue(record, "osInvoicePrevMonth"), 0).toString(),
          repairForecast: parseCsForecastNumber(getCsForecastImportValue(record, "repairForecast"), 0).toString(),
          retreadForecast: parseCsForecastNumber(getCsForecastImportValue(record, "retreadForecast"), 0).toString(),
          serviceForecast: parseCsForecastNumber(getCsForecastImportValue(record, "serviceForecast"), 0).toString(),
          accessoriesAmountIdr: parseCsForecastNumber(getCsForecastImportValue(record, "accessoriesAmountIdr"), 0).toString(),
          accessoriesAmountUsd: parseCsForecastNumber(getCsForecastImportValue(record, "accessoriesAmountUsd"), 0).toString(),
          remark: getCsForecastImportValue(record, "remark"),
        };
      });

      await bulkImportForecastItems(Number(periodId), recordsToImport);
      toast.success(`${recordsToImport.length} items imported successfully`);
      setIsOpen(false);
      setRawCsv("");
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Failed to import data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setRawCsv(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Forecast Items</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Paste your CSV data below or upload a file. 
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-upload"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Browse File
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            <Textarea
              placeholder="Paste CSV here (e.g. from Excel)..."
              value={rawCsv}
              onChange={(e) => setRawCsv(e.target.value)}
              className="font-mono text-sm min-h-[150px]"
            />

            {parsedCsv.records.length > 0 && (
              <div className="space-y-2 border rounded-md p-4">
                <h3 className="font-semibold flex items-center justify-between">
                  <span>Data Preview</span>
                  <span className="text-sm font-normal text-muted-foreground">{parsedCsv.records.length} records ready</span>
                </h3>
                <div className="rounded-md border overflow-x-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewHeaders.map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedCsv.records.slice(0, 5).map((record, i) => (
                        <TableRow key={i}>
                          {previewHeaders.map((h, j) => (
                            <TableCell key={j} className="whitespace-nowrap max-w-[200px] truncate">
                              {record[h]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedCsv.records.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">... and {parsedCsv.records.length - 5} more rows</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={parsedCsv.records.length === 0 || isSubmitting}>
              {isSubmitting ? "Importing..." : "Process Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

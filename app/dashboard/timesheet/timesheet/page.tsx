"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";

export default function TimesheetPage() {
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [importType, setImportType] = useState<"ot_record" | "spl_record">("ot_record");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", selectedSite);
      formData.append("importType", importType);
      formData.append("periodMonth", String(periodMonth));
      formData.append("periodYear", String(periodYear));
      formData.append("userId", "current-user-id"); // TODO: Get from auth

      const response = await fetch("/api/timesheet/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setUploadResult(result);
    } catch (error) {
      setUploadResult({ error: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setGenerateResult(null);

    try {
      const response = await fetch("/api/timesheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodMonth,
          periodYear,
          userId: "current-user-id", // TODO: Get from auth
        }),
      });

      const result = await response.json();
      setGenerateResult(result);
    } catch (error) {
      setGenerateResult({ error: "Generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timesheet Realisasi</h1>
        <p className="text-muted-foreground">Import OT & SPL records, generate Summary Lemburan</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="generate">Generate Summary</TabsTrigger>
          <TabsTrigger value="review">Review Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Data Timesheet Realisasi</CardTitle>
              <CardDescription>
                Upload OT Record or SPL (Form Tunjangan) Excel files from sites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">VALE Indonesia</SelectItem>
                      <SelectItem value="2">PPA BIB</SelectItem>
                      <SelectItem value="3">AMM MIFA</SelectItem>
                      <SelectItem value="4">AMM IPT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Import Type</Label>
                  <Select value={importType} onValueChange={(v: any) => setImportType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ot_record">OT Record</SelectItem>
                      <SelectItem value="spl_record">SPL (Form Tunjangan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Period Month</Label>
                  <Select value={String(periodMonth)} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {new Date(2026, m - 1).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Period Year</Label>
                  <Input
                    type="number"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Excel File</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={!selectedSite || uploading}
                />
              </div>

              {uploading && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Processing file...</AlertDescription>
                </Alert>
              )}

              {uploadResult && (
                <Alert variant={uploadResult.error ? "destructive" : "default"}>
                  {uploadResult.error ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {uploadResult.error ? (
                      uploadResult.error
                    ) : (
                      <div>
                        <p className="font-semibold">Import successful!</p>
                        <p>Processed {uploadResult.processedSheets} sheets, {uploadResult.totalRecords} records</p>
                        {uploadResult.errorCount > 0 && (
                          <p className="text-yellow-600">Warnings: {uploadResult.errorCount}</p>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Summary Lemburan</CardTitle>
              <CardDescription>
                Create multi-sheet Excel output for all sites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Month</Label>
                  <Select value={String(periodMonth)} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {new Date(2026, m - 1).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Period Year</Label>
                  <Input
                    type="number"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateSummary}
                disabled={generating}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {generating ? "Generating..." : "Generate Summary Excel"}
              </Button>

              {generateResult && (
                <Alert variant={generateResult.error ? "destructive" : "default"}>
                  {generateResult.error ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {generateResult.error ? (
                      generateResult.error
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold">Summary generated successfully!</p>
                        <p>Total sites: {generateResult.totalSites}</p>
                        <p>Filename: {generateResult.filename}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateResult.downloadUrl, "_blank")}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Excel
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Timesheet Realisasi</CardTitle>
              <CardDescription>
                View imported data and validation warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Review interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

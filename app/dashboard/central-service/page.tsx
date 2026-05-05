"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, UserPlus, Mail, CheckCircle, AlertCircle, Edit, Trash2, Download } from "lucide-react";

type Employee = {
  id: number;
  employeeSn: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  siteName: string;
  department: string;
  position: string;
  employmentStatus: string;
  isSyncedToUserManagement: boolean;
};

export default function CentralServicePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncFilter, setSyncFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [search, syncFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (syncFilter !== "all") params.append("syncStatus", syncFilter);

      const response = await fetch(`/api/central-service/employees?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setEmployees(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", "current-user-id"); // TODO: Get from auth

      const response = await fetch("/api/central-service/employees/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setImportResult(result);
      
      if (result.success) {
        fetchEmployees();
      }
    } catch (error) {
      setImportResult({ error: "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async (employeeId: number, email: string) => {
    if (!email) {
      alert("Email is required to sync to User Management");
      return;
    }

    setSyncingId(employeeId);
    try {
      const response = await fetch("/api/central-service/employees/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, email }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchEmployees();
        alert("Employee synced to User Management successfully!");
      } else {
        alert(result.error || "Sync failed");
      }
    } catch (error) {
      alert("Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`/api/central-service/employees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      alert("Delete failed");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Central Service Employees</h1>
        <p className="text-muted-foreground">Manage all employees with or without email</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Synced to User Mgmt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Not Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unsynced}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>Import from Excel or add manually</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                disabled={importing}
                className="w-auto"
              />
              <Button disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : "Import Excel"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by name, SN, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="synced">Synced Only</SelectItem>
                <SelectItem value="unsynced">Not Synced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importResult && (
            <Alert variant={importResult.error ? "destructive" : "default"}>
              {importResult.error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {importResult.error ? (
                  importResult.error
                ) : (
                  <div>
                    <p className="font-semibold">Import completed!</p>
                    <p>Success: {importResult.successCount}, Errors: {importResult.errorCount}, Duplicates: {importResult.duplicateCount}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No employees found</TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.employeeSn}</TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>
                        {emp.email ? (
                          <span className="text-sm">{emp.email}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs">No Email</Badge>
                        )}
                      </TableCell>
                      <TableCell>{emp.siteName}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>
                        <Badge variant={emp.employmentStatus === "active" ? "default" : "secondary"}>
                          {emp.employmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.isSyncedToUserManagement ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Not Synced
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!emp.isSyncedToUserManagement && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSync(emp.id, emp.email || "")}
                              disabled={syncingId === emp.id || !emp.email}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setEditingEmployee(emp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(emp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

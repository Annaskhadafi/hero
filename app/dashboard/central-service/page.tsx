"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Mail, CheckCircle, AlertCircle, Edit, Trash2, Eye } from "lucide-react";

type Employee = {
  id: number;
  employeeSn: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  siteName: string;
  workLocation: string;
  section: string;
  site: string;
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
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => { fetchEmployees(); }, [search, syncFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (syncFilter !== "all") params.append("syncStatus", syncFilter);
      const response = await fetch(`/api/central-service/employees?${params}`);
      const data = await response.json();
      if (data.success) {
          const parsed = data.data.map((emp: Employee) => {
            // section is now a dedicated DB column.
            // Fallback: if still empty and siteName has "Section - Site" format, split it.
            if (!emp.section && emp.siteName.includes(" - ")) {
              const sepIdx = emp.siteName.indexOf(" - ");
              return {
                ...emp,
                section: emp.siteName.slice(0, sepIdx).trim(),
                site: emp.siteName.slice(sepIdx + 3).trim(),
              };
            }
            return { ...emp, site: emp.siteName };
          });
          setEmployees(parsed);
          setStats(data.stats);
        }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const response = await fetch(`/api/central-service/employees/${id}`, { method: "DELETE" });
      if (response.ok) { fetchEmployees(); alert("Employee deleted!"); }
      else { alert("Delete failed"); }
    } catch (error) { alert("Delete failed"); }
  };

  const handleSaveEdit = async () => {
    if (!editEmployee) return;
    try {
      const response = await fetch(`/api/central-service/employees/${editEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editEmployee),
      });
      if (response.ok) { fetchEmployees(); setEditEmployee(null); alert("Employee updated!"); }
      else { alert("Update failed"); }
    } catch (error) { alert("Update failed"); }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Central Service Employees</h1>
        <p className="text-muted-foreground">Manage all employees with or without email</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total Employees</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Synced to User Mgmt</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.synced}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Not Synced</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{stats.unsynced}</div></CardContent>
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
              <Input type="file" accept=".xlsx,.xls" className="w-auto" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("file", file);
                formData.append("userId", "current-user-id");
                try {
                  const response = await fetch("/api/central-service/employees/import", { method: "POST", body: formData });
                  const result = await response.json();
                  if (result.success) { fetchEmployees(); alert(`Import done! Success: ${result.successCount}`); }
                } catch (error) { alert("Import failed"); }
              }} />
              <Button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                <Upload className="mr-2 h-4 w-4" />Import Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Search by name, SN, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="synced">Synced Only</SelectItem>
                <SelectItem value="unsynced">Not Synced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center">Loading...</TableCell></TableRow>
                ) : employees.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center">No employees found</TableCell></TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.employeeSn}</TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>{emp.email || <Badge variant="outline" className="text-xs">No Email</Badge>}</TableCell>
                      <TableCell>{emp.section || <Badge variant="outline" className="text-xs">-</Badge>}</TableCell>
                      <TableCell>{emp.site || <Badge variant="outline" className="text-xs">-</Badge>}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>
                        <Badge variant={emp.employmentStatus === "active" ? "default" : "secondary"}>{emp.employmentStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {emp.isSyncedToUserManagement ? (
                          <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Synced</Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600"><AlertCircle className="mr-1 h-3 w-3" />Not Synced</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onMouseDown={(e) => { e.preventDefault(); setViewEmployee(emp); }} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onMouseDown={(e) => { e.preventDefault(); setEditEmployee(emp); }} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onMouseDown={(e) => { e.preventDefault(); handleDelete(emp.id); }} title="Delete">
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

      {/* View Dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={(open) => !open && setViewEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>View employee information</DialogDescription>
          </DialogHeader>
          {viewEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Employee SN</Label><p className="font-mono">{viewEmployee.employeeSn}</p></div>
              <div><Label className="text-xs text-muted-foreground">Full Name</Label><p className="font-medium">{viewEmployee.fullName}</p></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><p>{viewEmployee.email || "-"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{viewEmployee.phoneNumber || "-"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Section</Label><p>{viewEmployee.section || "-"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Site</Label><p>{viewEmployee.site || "-"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Department</Label><p>{viewEmployee.department}</p></div>
              <div><Label className="text-xs text-muted-foreground">Position</Label><p>{viewEmployee.position}</p></div>
              <div><Label className="text-xs text-muted-foreground">Status</Label><Badge variant={viewEmployee.employmentStatus === "active" ? "default" : "secondary"}>{viewEmployee.employmentStatus}</Badge></div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Sync Status</Label>
                <div className="mt-1">
                  {viewEmployee.isSyncedToUserManagement ? (
                    <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Synced to User Management</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600"><AlertCircle className="mr-1 h-3 w-3" />Not Synced</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onMouseDown={(e) => { e.preventDefault(); setViewEmployee(null); }}>Close</Button>
            <Button onMouseDown={(e) => { e.preventDefault(); setEditEmployee(viewEmployee); setViewEmployee(null); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          {editEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee SN</Label>
                <Input value={editEmployee.employeeSn} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input value={editEmployee.fullName} onChange={(e) => setEditEmployee({ ...editEmployee, fullName: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editEmployee.email || ""} onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={editEmployee.phoneNumber || ""} onChange={(e) => setEditEmployee({ ...editEmployee, phoneNumber: e.target.value })} />
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={editEmployee.section}
                  onChange={(e) => setEditEmployee({ ...editEmployee, section: e.target.value, siteName: `${e.target.value} - ${editEmployee.site}` })}
                />
              </div>
              <div>
                <Label>Site</Label>
                <Input
                  value={editEmployee.site}
                  onChange={(e) => setEditEmployee({ ...editEmployee, site: e.target.value, siteName: `${editEmployee.section} - ${e.target.value}` })}
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input value={editEmployee.position} onChange={(e) => setEditEmployee({ ...editEmployee, position: e.target.value })} />
              </div>
              <div>
                <Label>Employment Status</Label>
                <Select value={editEmployee.employmentStatus} onValueChange={(v) => setEditEmployee({ ...editEmployee, employmentStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onMouseDown={(e) => { e.preventDefault(); setEditEmployee(null); }}>Cancel</Button>
            <Button onMouseDown={(e) => { e.preventDefault(); handleSaveEdit(); }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

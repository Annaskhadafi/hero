"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Eye, Search, ChevronLeft, ChevronRight, User, Trash } from "lucide-react";
import { updateEmployeeContract, deleteEmployee } from "@/app/actions/employee";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  joinDate: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  accountStatus: string;
  genderCode?: string | null;
  jobTitle?: string | null;
  location?: string | null;
};

export function EmployeeClientPage({ employees: initialData }: { employees: Employee[] }) {
  const [data, setData] = useState<Employee[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | null>(null);
  const [viewingItem, setViewingItem] = useState<Employee | null>(null);
  const [deletingItem, setDeletingItem] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [joinDate, setJoinDate] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);

  const handleOpenView = (item: Employee) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (item: Employee) => {
    setEditingItem(item);
    setJoinDate(item.joinDate || "");
    setContractStart(item.contractStart || "");
    setContractEnd(item.contractEnd || "");
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: Employee) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsLoading(true);
    try {
      await deleteEmployee(deletingItem.id);
      setData(data.filter(d => d.id !== deletingItem.id));
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menghapus.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsLoading(true);
    try {
      const payload = {
        joinDate: joinDate || null,
        contractStart: contractStart || null,
        contractEnd: contractEnd || null,
      };

      const updated = await updateEmployeeContract(editingItem.id, payload);
      setData(data.map(d => d.id === editingItem.id ? {
        ...d,
        joinDate: updated.joinDate ? updated.joinDate.toString() : null,
        contractStart: updated.contractStart ? updated.contractStart.toString() : null,
        contractEnd: updated.contractEnd ? updated.contractEnd.toString() : null,
      } : d));
      
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const getContractStatus = (endStr: string | null) => {
    if (!endStr) return { label: "Belum Diatur", type: "NONE" };
    
    const today = new Date();
    const end = new Date(endStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: "Contract Completed", type: "COMPLETED" };
    if (diffDays <= 30) return { label: "Will Expired", type: "EXPIRING" };
    return { label: "Contract Active", type: "ACTIVE" };
  };

  // Stats calculation
  const totalEmployees = data.length;
  
  const activeEmployees = data.filter(e => getContractStatus(e.contractEnd).type === "ACTIVE");
  const activeMale = activeEmployees.filter(e => e.genderCode === "L" || e.genderCode === "M").length;
  const activeFemale = activeEmployees.filter(e => e.genderCode === "P" || e.genderCode === "F").length;
  
  const expiringEmployees = data.filter(e => getContractStatus(e.contractEnd).type === "EXPIRING");
  const expiringMale = expiringEmployees.filter(e => e.genderCode === "L" || e.genderCode === "M").length;
  const expiringFemale = expiringEmployees.filter(e => e.genderCode === "P" || e.genderCode === "F").length;

  const completedEmployees = data.filter(e => getContractStatus(e.contractEnd).type === "COMPLETED");
  const completedMale = completedEmployees.filter(e => e.genderCode === "L" || e.genderCode === "M").length;
  const completedFemale = completedEmployees.filter(e => e.genderCode === "P" || e.genderCode === "F").length;

  // Since we don't have an explicit 'On Progress' status in schema, we mock it or define it.
  // Let's assume On Progress means join date is recent or contract just started. For now mock as 5.
  const onProgressEmployees = data.filter(e => false); // Mocking or adjusting as needed. I'll just put 0 to be safe with real data.
  const onProgressCount = 0;
  
  // Calculate percentage helper
  const calcPct = (count: number, total: number) => total === 0 ? 0 : Math.round((count / total) * 10000) / 100;

  // Months for timeline (Feb - Dec like mockup)
  const months = [
    { name: "February", num: 2 }, { name: "March", num: 3 }, { name: "April", num: 4 },
    { name: "May", num: 5 }, { name: "June", num: 6 }, { name: "July", num: 7 },
    { name: "August", num: 8 }, { name: "September", num: 9 }, { name: "October", num: 10 },
    { name: "November", num: 11 }, { name: "December", num: 12 }
  ];

  const getCountForMonth = (monthNum: number) => {
    return data.filter(e => {
      if (!e.contractEnd) return false;
      return new Date(e.contractEnd).getMonth() + 1 === monthNum;
    }).length;
  };

  // Filtering
  const filteredData = data.filter(emp => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.fullName.toLowerCase().includes(q) || 
        emp.employeeId.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    
    // Filter by selected month based on Contract End (assuming that's what the posts timeline represents)
    if (selectedMonth !== null) {
      if (!emp.contractEnd) return false;
      if (new Date(emp.contractEnd).getMonth() + 1 !== selectedMonth) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Formatting dates
  const today = new Date();
  const dateString = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const joinDateRange = "05 May 1997 - 05 May 2025"; // Placeholder matching the image

  const StatCard = ({ title, total, male, female }: { title: string, total: number, male: number, female: number }) => (
    <Card className="bg-[#0b3c6f] text-white border-0 overflow-hidden shadow-md">
      <CardContent className="p-5 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="font-semibold text-lg max-w-[60%] leading-tight">{title}</div>
          <div className="text-4xl font-light">{total}</div>
        </div>
        <div className="flex justify-between items-center text-xs opacity-90 mt-2">
          <div className="flex items-center gap-1.5">
            <User className="size-5" />
            <span>{male} ({calcPct(male, total)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="size-5 text-pink-200" />
            <span>{female} ({calcPct(female, total)}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Contract Employee Dashboard</h1>
        <div className="text-sm text-muted-foreground mt-2 md:mt-0 flex gap-2">
          <span className="text-primary hover:underline cursor-pointer">Dashboard</span> / 
          <span className="text-primary hover:underline cursor-pointer">Dashboard</span> / 
          <span>Demographics Dashboard</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between text-sm text-muted-foreground">
        <div>Join Date: {joinDateRange}</div>
        <div>{dateString}</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Contract Active" total={activeEmployees.length} male={activeMale} female={activeFemale} />
        <StatCard title="Will Expired" total={expiringEmployees.length} male={expiringMale} female={expiringFemale} />
        <StatCard title="On Progress" total={onProgressCount} male={0} female={0} />
        <StatCard title="Contract Completed" total={completedEmployees.length} male={completedMale} female={completedFemale} />
      </div>

      {/* Posts Timeline */}
      <div className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-2 bg-[#183d6a] rounded-sm"></div>
          <h2 className="text-lg font-semibold text-slate-800">Posts</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">You can manage all posts, such as editing, deleting and more.</p>
        
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm font-medium border-b pb-6">
          {months.map((m) => {
            const count = getCountForMonth(m.num);
            const isActive = selectedMonth === m.num;
            return (
              <div 
                key={m.num}
                onClick={() => setSelectedMonth(isActive ? null : m.num)}
                className={`flex items-center gap-1.5 cursor-pointer transition-all ${
                  isActive ? "bg-[#183d6a] text-white px-3 py-1.5 rounded-full" : "text-[#183d6a] hover:opacity-80"
                }`}
              >
                <span>{m.name}</span>
                <span className={`flex items-center justify-center min-w-5 h-5 rounded-full text-[10px] font-bold px-1.5 ${
                  isActive ? "bg-white text-[#183d6a]" : "bg-[#183d6a] text-white"
                }`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <select 
              className="border rounded p-1"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground font-normal whitespace-nowrap">Search:</Label>
            <Input 
              className="w-[200px] h-8 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="border rounded-md w-full overflow-x-auto bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#183d6a] text-white">
              <tr className="whitespace-nowrap">
                <th className="px-3 py-3 font-medium text-center w-12">No. ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">S/N ↑↓</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium text-center">Join Date</th>
                <th className="px-3 py-3 font-medium text-center">Job Title ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">Contract Start ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">Contract End ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">Location ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">Status ↑↓</th>
                <th className="px-3 py-3 font-medium text-center">Aksi ↑↓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedData.map((emp, idx) => {
                  const no = (currentPage - 1) * pageSize + idx + 1;
                  const status = getContractStatus(emp.contractEnd);
                  
                  // Matching the green highlight from mockup for contract dates
                  const isContractActive = status.type === "ACTIVE" || status.type === "EXPIRING";
                  const dateBgClass = isContractActive ? "bg-[#e8faeb] text-slate-800" : ""; // using a softer green
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-center whitespace-nowrap">{no}</td>
                      <td className="px-3 py-3 text-center text-[#1e9b89] font-medium whitespace-nowrap">{emp.employeeId}</td>
                      <td className="px-3 py-3 text-[#183d6a] font-medium min-w-[150px]">{emp.fullName}</td>
                      <td className="px-3 py-3 text-center text-[#1e9b89] whitespace-nowrap">{emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground min-w-[120px]">{emp.jobTitle || '-'}</td>
                      <td className={`px-3 py-3 text-center text-[#1e9b89] whitespace-nowrap ${dateBgClass}`}>
                        {emp.contractStart ? new Date(emp.contractStart).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className={`px-3 py-3 text-center text-[#1e9b89] whitespace-nowrap ${dateBgClass}`}>
                        {emp.contractEnd ? new Date(emp.contractEnd).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground min-w-[150px]">{emp.location || '-'}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge className="bg-[#183d6a] hover:bg-[#183d6a]/90 text-white border-0 font-normal rounded-full px-3 text-[10px] uppercase tracking-wide">
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="flex items-center justify-center w-7 h-7 rounded bg-[#183d6a] text-white hover:bg-[#183d6a]/80 transition-colors"
                            onClick={() => handleOpenView(emp)}
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button 
                            className="flex items-center justify-center w-7 h-7 rounded bg-amber-400 text-white hover:bg-amber-500 transition-colors"
                            onClick={() => handleOpenEdit(emp)}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button 
                            className="flex items-center justify-center w-7 h-7 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                            onClick={() => handleOpenDelete(emp)}
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground pt-2">
          <div>
            Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
          </div>
          <div className="flex gap-1 mt-4 sm:mt-0">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <div className="flex items-center px-2">
              <span className="bg-[#183d6a] text-white px-3 py-1 rounded">{currentPage}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Data Kontrak</DialogTitle>
          </DialogHeader>
          <div className="py-2 pb-4">
            <h3 className="font-semibold">{editingItem?.fullName}</h3>
            <p className="text-sm text-muted-foreground">S/N: {editingItem?.employeeId}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input 
                type="date" 
                value={joinDate ? new Date(joinDate).toISOString().split('T')[0] : ''} 
                onChange={(e) => setJoinDate(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Contract Start</Label>
                <Input 
                  type="date" 
                  value={contractStart ? new Date(contractStart).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setContractStart(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Contract End</Label>
                <Input 
                  type="date" 
                  value={contractEnd ? new Date(contractEnd).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setContractEnd(e.target.value)} 
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#183d6a] hover:bg-[#183d6a]/90 text-white" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Kontrak Karyawan</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">S/N</span>
                <span className="col-span-2 text-sm font-semibold">{viewingItem.employeeId}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Name</span>
                <span className="col-span-2 text-sm font-semibold">{viewingItem.fullName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Job Title</span>
                <span className="col-span-2 text-sm">{viewingItem.jobTitle || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <span className="col-span-2 text-sm">{viewingItem.location || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Join Date</span>
                <span className="col-span-2 text-sm">
                  {viewingItem.joinDate ? new Date(viewingItem.joinDate).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Contract Start</span>
                <span className="col-span-2 text-sm">
                  {viewingItem.contractStart ? new Date(viewingItem.contractStart).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pb-2">
                <span className="text-sm font-medium text-muted-foreground">Contract End</span>
                <span className="col-span-2 text-sm">
                  {viewingItem.contractEnd ? new Date(viewingItem.contractEnd).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)} className="bg-[#183d6a] hover:bg-[#183d6a]/90 text-white">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data kontrak karyawan ini? Data yang dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium">S/N: {deletingItem?.employeeId}</p>
            <p className="text-sm font-semibold text-red-600">{deletingItem?.fullName}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


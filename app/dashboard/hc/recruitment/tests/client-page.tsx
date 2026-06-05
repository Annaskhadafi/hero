"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOnlineTest, deleteOnlineTest, updateOnlineTest } from "@/app/actions/recruitment-tests";
import { toast } from "sonner";
import { IconPlus, IconSettings, IconTrash, IconLink, IconEdit } from "@tabler/icons-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecruitmentTestsClientPage({ initialTests }: { initialTests: any[] }) {
  const [tests, setTests] = useState(initialTests);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", timeLimitMinutes: 60, passingScore: 70 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyPublicLink = (testId: number) => {
    const link = `${window.location.origin}/test/public/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied to clipboard!");
  };

  const openEditModal = (test: any) => {
    setSelectedTestId(test.id);
    setFormData({
      title: test.title,
      description: test.description,
      timeLimitMinutes: test.timeLimitMinutes,
      passingScore: test.passingScore,
    });
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const newTest = await createOnlineTest(formData);
      setTests([newTest as any, ...tests]);
      toast.success("Online test created!");
      setIsCreateOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTestId) return;
    setIsSubmitting(true);
    try {
      const updatedTest = await updateOnlineTest(selectedTestId, formData);
      setTests(tests.map(t => t.id === selectedTestId ? { ...t, ...updatedTest } : t));
      toast.success("Online test updated!");
      setIsEditOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this test? All assignments and answers will be lost.")) return;
    try {
      await deleteOnlineTest(id);
      setTests(tests.filter((t) => t.id !== id));
      toast.success("Test deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete test");
    }
  };

  return (
    <AdminPageShell
      title="Online Tests"
      description="Create and manage online assessments for candidates."
      breadcrumbs={[
        { label: "Human Capital", href: "/dashboard/hc" },
        { label: "Recruitment", href: "/dashboard/hc/recruitment" },
        { label: "Online Tests", href: "/dashboard/hc/recruitment/tests" },
      ]}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Test Banks</h2>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <IconPlus className="w-4 h-4" /> Create Test
        </Button>
      </div>

      <MinimalTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TITLE</TableHead>
              <TableHead>DESCRIPTION</TableHead>
              <TableHead>TIME LIMIT</TableHead>
              <TableHead>PASSING SCORE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell className="font-medium">{test.title}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">{test.description}</TableCell>
                <TableCell>{test.timeLimitMinutes} Mins</TableCell>
                <TableCell>{test.passingScore}</TableCell>
                <TableCell>
                  <Badge variant={test.isActive ? "default" : "secondary"}>
                    {test.isActive ? "Active" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => copyPublicLink(test.id)} title="Copy Public Link">
                      <IconLink className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(test)} title="Edit Test Details">
                      <IconEdit className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Manage Questions">
                      <Link href={`/dashboard/hc/recruitment/tests/${test.id}`}>
                        <IconSettings className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id)} title="Delete Test">
                      <IconTrash className="w-4 h-4 text-destructive/70 hover:text-destructive transition-colors" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No tests created yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>Define the base configuration for your new assessment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Frontend Developer Logical Test"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief instructions or summary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Limit (Minutes)</Label>
                <Input
                  type="number"
                  value={formData.timeLimitMinutes}
                  onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score</Label>
                <Input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Test"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Test Details</DialogTitle>
            <DialogDescription>Update the configuration for this assessment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Frontend Developer Logical Test"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief instructions or summary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Limit (Minutes)</Label>
                <Input
                  type="number"
                  value={formData.timeLimitMinutes}
                  onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score</Label>
                <Input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

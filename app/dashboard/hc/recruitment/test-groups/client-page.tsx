"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin-page-shell";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTestGroup,
  updateTestGroup,
  deleteTestGroup,
  addTestToGroup,
  removeTestFromGroup,
  setTestsForGroup,
  getGroupWithTests,
} from "@/app/actions/test-group";
import { IconPlus, IconTrash, IconX, IconPencil } from "@tabler/icons-react";
import Link from "next/link";

export function TestGroupsClientPage({
  initialGroups,
  allTests,
}: {
  initialGroups: any[];
  allTests: any[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupDetail, setGroupDetail] = useState<any>(null);
  const [availableTests, setAvailableTests] = useState(allTests);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [isSavingTests, setIsSavingTests] = useState(false);

  const handleExpand = async (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    const detail = await getGroupWithTests(groupId);
    setGroupDetail(detail);
    setExpandedGroupId(groupId);
    // Filter out tests already in the group
    const existingIds = (detail?.items || []).map((i: any) => i.testId);
    setAvailableTests(allTests.filter((t: any) => !existingIds.includes(t.id)));
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createTestGroup(newGroupName.trim());
      setGroups([...groups, created]);
      setNewGroupName("");
      setIsCreateOpen(false);
      toast.success("Test group created");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this test group? All test assignments will be removed.")) return;
    await deleteTestGroup(id);
    setGroups(groups.filter((g) => g.id !== id));
    toast.success("Test group deleted");
  };

  const handleToggleActive = async (group: any) => {
    await updateTestGroup(group.id, { isActive: !group.isActive });
    setGroups(groups.map((g) => (g.id === group.id ? { ...g, isActive: !g.isActive } : g)));
  };

  const handleAddTest = async (testId: number) => {
    if (!expandedGroupId) return;
    await addTestToGroup(expandedGroupId, testId);
    await handleExpand(expandedGroupId);
    toast.success("Test added to group");
  };

  const handleRemoveTest = async (itemId: number) => {
    await removeTestFromGroup(itemId);
    await handleExpand(expandedGroupId!);
    toast.success("Test removed from group");
  };

  const openEditTests = async (group: any) => {
    const detail = await getGroupWithTests(group.id);
    setEditingGroup(detail?.group || group);
    setSelectedTestIds((detail?.items || []).map((item: any) => item.testId));
  };

  const toggleSelectedTest = (testId: number, checked: boolean) => {
    setSelectedTestIds((current) =>
      checked ? [...current, testId] : current.filter((id) => id !== testId),
    );
  };

  const handleSaveTests = async () => {
    if (!editingGroup) return;
    setIsSavingTests(true);
    try {
      await setTestsForGroup(editingGroup.id, selectedTestIds);
      if (expandedGroupId === editingGroup.id) {
        const detail = await getGroupWithTests(editingGroup.id);
        setGroupDetail(detail);
        const existingIds = (detail?.items || []).map((item: any) => item.testId);
        setAvailableTests(allTests.filter((test: any) => !existingIds.includes(test.id)));
      }
      setEditingGroup(null);
      toast.success("Test group updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update test group");
    } finally {
      setIsSavingTests(false);
    }
  };

  return (
    <AdminPageShell eyebrow="Human Capital" title="Test Groups" description="Kelola kelompok tes online (Test 1, Test 2)">
      <RecruitmentTabBar />
      <div className="mt-8 space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/hc/recruitment" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Recruitment
          </Link>
          <Button onClick={() => { setNewGroupName(""); setIsCreateOpen(true); }}>
            <IconPlus className="w-4 h-4 mr-2" /> New Test Group
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No test groups yet. Create "Test 1" and "Test 2".</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id} className={!group.isActive ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditTests(group)}>
                      <IconPencil className="w-4 h-4" />
                      Edit Tests
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(group)}>
                      {group.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(group.id)}>
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {expandedGroupId === group.id && groupDetail ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(groupDetail.items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-sm">
                            {item.testTitle}
                            <button onClick={() => handleRemoveTest(item.id)} className="text-muted-foreground hover:text-destructive">
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {availableTests.length > 0 && (
                        <div className="border-t pt-3">
                          <Label className="text-xs text-muted-foreground mb-2 block">Add test:</Label>
                          <div className="flex flex-wrap gap-2">
                            {availableTests.map((test: any) => (
                              <button
                                key={test.id}
                                onClick={() => handleAddTest(test.id)}
                                className="px-3 py-1 rounded-full border border-dashed text-sm hover:bg-muted/50"
                              >
                                + {test.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => openEditTests(group)} className="text-sm text-muted-foreground hover:text-foreground">
                      {group.slug ? `${group.slug} — edit online tests` : "Edit online tests..."}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Test Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Group Name</Label>
            <Input
              placeholder="Contoh: Test 1"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newGroupName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingGroup)} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Online Tests — {editingGroup?.name}</DialogTitle>
            <DialogDescription>
              Pilih Online Test yang masuk ke Test Group ini. Urutan mengikuti daftar pilihan di bawah.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
            {allTests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Belum ada Online Test aktif yang bisa dipilih.
              </div>
            ) : (
              allTests.map((test: any) => {
                const checked = selectedTestIds.includes(test.id);
                return (
                  <label
                    key={test.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-white p-3 shadow-sm transition-colors hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleSelectedTest(test.id, value === true)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{test.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {test.description || "Tanpa deskripsi"}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)} disabled={isSavingTests}>Cancel</Button>
            <Button onClick={handleSaveTests} disabled={isSavingTests || allTests.length === 0}>
              Save Tests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

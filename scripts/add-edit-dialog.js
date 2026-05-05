const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "dashboard", "central-service", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

const editDialog = fs.readFileSync("temp-edit-dialog.txt", "utf8");

// Add edit dialog before view dialog
content = content.replace(
  /\/\* View Employee Dialog \*\//,
  `/* Edit Employee Dialog */
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee SN</Label>
                <Input value={editingEmployee.employeeSn} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input 
                  value={editingEmployee.fullName} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, fullName: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editingEmployee.email || ""} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={editingEmployee.phoneNumber || ""} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, phoneNumber: e.target.value})}
                />
              </div>
              <div>
                <Label>Site Name</Label>
                <Input 
                  value={editingEmployee.siteName} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, siteName: e.target.value})}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={editingEmployee.department} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})}
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input 
                  value={editingEmployee.position} 
                  onChange={(e) => setEditingEmployee({...editingEmployee, position: e.target.value})}
                />
              </div>
              <div>
                <Label>Employment Status</Label>
                <Select 
                  value={editingEmployee.employmentStatus} 
                  onValueChange={(v) => setEditingEmployee({...editingEmployee, employmentStatus: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingEmployee) return;
              try {
                const response = await fetch(\`/api/central-service/employees/\${editingEmployee.id}\`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(editingEmployee),
                });
                if (response.ok) {
                  fetchEmployees();
                  setEditingEmployee(null);
                  alert("Employee updated successfully!");
                } else {
                  alert("Failed to update employee");
                }
              } catch (error) {
                alert("Failed to update employee");
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      /* View Employee Dialog */`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Added edit employee dialog");

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "dashboard", "central-service", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Add view dialog before closing div
const viewDialog = `

      {/* View Employee Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>View employee information</DialogDescription>
          </DialogHeader>
          {viewingEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Employee SN</Label>
                <p className="font-mono">{viewingEmployee.employeeSn}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <p className="font-medium">{viewingEmployee.fullName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p>{viewingEmployee.email || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <p>{viewingEmployee.phoneNumber || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Site</Label>
                <p>{viewingEmployee.siteName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <p>{viewingEmployee.department}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Position</Label>
                <p>{viewingEmployee.position}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Employment Status</Label>
                <Badge variant={viewingEmployee.employmentStatus === "active" ? "default" : "secondary"}>
                  {viewingEmployee.employmentStatus}
                </Badge>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Sync Status</Label>
                <div className="mt-1">
                  {viewingEmployee.isSyncedToUserManagement ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Synced to User Management
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Synced
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingEmployee(null)}>Close</Button>
            <Button onClick={() => { setEditingEmployee(viewingEmployee); setViewingEmployee(null); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`;

content = content.replace(
  /    <\/div>\s+  \);\s+}$/,
  `    </div>${viewDialog}
    </div>
  );
}`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Added view employee dialog");

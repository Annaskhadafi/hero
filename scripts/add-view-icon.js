const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "dashboard", "central-service", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Add Eye import
content = content.replace(
  /import \{ Upload, UserPlus, Mail, CheckCircle, AlertCircle, Edit, Trash2, Download \} from "lucide-react";/,
  `import { Upload, UserPlus, Mail, CheckCircle, AlertCircle, Edit, Trash2, Download, Eye } from "lucide-react";`
);

// Add view button before edit button
content = content.replace(
  /<Button size="sm" variant="ghost" onClick=\{\(\) => setEditingEmployee\(emp\)\}>/,
  `<Button size="sm" variant="ghost" onClick={() => setEditingEmployee(emp)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingEmployee(emp)} title="Edit">`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Added Eye icon for view employee details");

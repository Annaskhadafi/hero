const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'mobile', 'mobile-daily-activity-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Custom mode
content = content.replace(
  '                />\r\n              </Label>\r\n              <Label className="block space-y-2">\r\n                <div className="flex items-center justify-between">\r\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>',
  '                />\r\n              </Label>\r\n              {renderPhotoWidget("single", false, photoName)}\r\n              <Label className="block space-y-2">\r\n                <div className="flex items-center justify-between">\r\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>'
);
content = content.replace(
  '                />\n              </Label>\n              <Label className="block space-y-2">\n                <div className="flex items-center justify-between">\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>',
  '                />\n              </Label>\n              {renderPhotoWidget("single", false, photoName)}\n              <Label className="block space-y-2">\n                <div className="flex items-center justify-between">\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>'
);

// 2. Library mode (Self Input)
content = content.replace(
  /<\/Label>\r?\n\s*\) : null\}\r?\n\r?\n\s*<Label className="block space-y-2">\r?\n\s*<div className="flex items-center justify-between">\r?\n\s*<span className="text-\[10px\] font-black uppercase tracking-\[0\.16em\] text-\[#486275\]">Catatan item<\/span>/g,
  `</Label>\n                          ) : null}\n\n                          {renderPhotoWidget(\`library:\${libraryId}\`, !!library.requiresPhoto, entry.photoName)}\n                          <Label className="block space-y-2">\n                            <div className="flex items-center justify-between">\n                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Catatan item</span>`
);

// 3. Route Checklist
content = content.replace(
  /<\/div>\r?\n\s*\) : null\}\r?\n\r?\n\s*\{item\.requiresRemark \? \(\r?\n\s*<Label className="block space-y-2">\r?\n\s*<div className="flex items-center justify-between">\r?\n\s*<span className="text-\[10px\] font-black uppercase tracking-\[0\.16em\] text-\[#486275\]">Keterangan<\/span>/g,
  `</div>\n                              ) : null}\n\n                              {renderPhotoWidget(\`route:\${item.id}\`, !!item.requiresPhoto, itemState.photoName)}\n                              {item.requiresRemark ? (\n                                <Label className="block space-y-2">\n                                  <div className="flex items-center justify-between">\n                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Keterangan</span>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully injected missing renderPhotoWidget");

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'mobile', 'mobile-daily-activity-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update RouteItemState
content = content.replace(
  /type RouteItemState = \{([^}]+)\};/,
  (match, inner) => {
    return `type RouteItemState = {${inner}\r\n  photoFile?: File | null;\r\n  photoName?: string;\r\n  restoredPhotoPayload?: QueuedFilePayload | null;\r\n};`;
  }
);

// 2. Update SelfInputEntryState
content = content.replace(
  /type SelfInputEntryState = \{([^}]+)\};/,
  (match, inner) => {
    return `type SelfInputEntryState = {${inner}\r\n  photoFile?: File | null;\r\n  photoName?: string;\r\n  restoredPhotoPayload?: QueuedFilePayload | null;\r\n};`;
  }
);

// 3. Add activePhotoTarget and renderPhotoWidget
content = content.replace(
  'const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");',
  'const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");\r\n  const [activePhotoTarget, setActivePhotoTarget] = useState<string | null>(null);'
);

const photoUploadWidgetCode = `
  const renderPhotoWidget = (targetId: string, requiresPhoto: boolean, currentPhotoName?: string) => (
    <div className="mt-3 space-y-2 rounded-xl bg-[#f6fbff] p-3 border border-[#e9f6fd]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
          <Camera className="size-3.5 text-[#003f78]" />
          Photo Evidence
        </p>
        {requiresPhoto ? (
          <Badge className="border-0 bg-[#fff1cf] px-1.5 py-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a5a00]">
            Wajib
          </Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-0 bg-[#e9f6fd] text-[#003f78] text-xs"
          onClick={() => {
            setActivePhotoTarget(targetId);
            setPhotoCaptureMode("camera");
            document.getElementById("mobile-activity-photo")?.click();
          }}
        >
          <Camera className="size-3.5" />
          Kamera
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-0 bg-[#e9f6fd] text-[#003f78] text-xs"
          onClick={() => {
            setActivePhotoTarget(targetId);
            setPhotoCaptureMode("gallery");
            document.getElementById("mobile-activity-photo")?.click();
          }}
        >
          <ImagePlus className="size-3.5" />
          Galeri
        </Button>
      </div>
      {currentPhotoName ? (
        <p className="text-[11px] font-semibold text-[#003f78] break-words truncate">
          ✓ {currentPhotoName}
        </p>
      ) : null}
    </div>
  );
`;

content = content.replace(
  'const needsAnyPhoto = needsGlobalPhoto || assignmentNeedsPhoto || checkedChecklistNeedsPhoto;',
  photoUploadWidgetCode + '\r\n  const needsAnyPhoto = needsGlobalPhoto || assignmentNeedsPhoto || checkedChecklistNeedsPhoto;'
);

// 4. Update buildSelfInputPayloads to be async and handle photo payload
content = content.replace(
  /function buildSelfInputPayloads\(sharedPhoto: QueuedFilePayload \| null\) \{\r?\n\s+return selectedLibraries\.map\(\(library, index\) => \{[\s\S]+?\}\);\r?\n\s+\}/,
  `async function buildSelfInputPayloads() {
    return Promise.all(selectedLibraries.map(async (library, index) => {
      const libraryId = \`\${library.id}\`;
      const entry = selfInputEntries[libraryId] ?? buildDefaultSelfInputEntry(index, defaultStartTime, defaultEndTime);

      return {
        label: \`\${library.activityCode} - \${library.activityName}\`,
        payload: {
          ...draftPayload,
          sourceMode: "self_input" as const,
          libraryActivityId: libraryId,
          assignmentId: "",
          equipmentNo: entry.equipmentNo,
          startTime: entry.startTime,
          endTime: entry.endTime,
          materialUsed: entry.materialUsed,
          notes: entry.notes,
          routeTemplateId: index === 0 ? draftPayload.routeTemplateId : "",
          overtimeCommandLetterId: index === 0 ? draftPayload.overtimeCommandLetterId : "",
          routeShiftCode: index === 0 ? draftPayload.routeShiftCode : "",
          routeSummaryRemark: "",
          routeSessionItems: index === 0 ? routeSessionItems : [],
          photo: await (async () => {
              if (entry?.photoFile) return await fileToPayload(entry.photoFile);
              if (entry?.restoredPhotoPayload) return entry.restoredPhotoPayload;
              return null;
            })(),
        },
      };
    }));
  }`
);

// 5. Update handleSubmit self_input mode
content = content.replace(
  /const payloads = buildSelfInputPayloads\(sharedPhoto\);/,
  `const payloads = await buildSelfInputPayloads();`
);

// 6. Update handleSubmit route items in general (assigned / custom)
content = content.replace(
  /await sendPayload\(\{\r?\n\s+\.\.\.draftPayload,\r?\n\s+photo: sharedPhoto,\r?\n\s+libraryActivityId: "",\r?\n\s+\}\);/,
  `const payloadToSubmit = {
          ...draftPayload,
          photo: sharedPhoto,
          libraryActivityId: "",
        };

        if (checklistContext && payloadToSubmit.routeSessionItems) {
            payloadToSubmit.routeSessionItems = await Promise.all(
                payloadToSubmit.routeSessionItems.map(async (item) => {
                    const state = routeItemState[item.routeItemId!];
                    let itemPhoto = null;
                    if (state?.photoFile) {
                        itemPhoto = await fileToPayload(state.photoFile);
                    } else if (state?.restoredPhotoPayload) {
                        itemPhoto = state.restoredPhotoPayload;
                    }
                    return { ...item, photo: itemPhoto };
                })
            );
        }

        await sendPayload(payloadToSubmit);`
);

// 7. Update file input handler
const fileInputReplacement = `<input
            id="mobile-activity-photo"
            type="file"
            accept="image/*"
            capture={photoCaptureMode === "camera" ? "environment" : undefined}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (!file || !activePhotoTarget) return;

              if (activePhotoTarget === "single") {
                setPhotoFile(file);
                setPhotoName(file.name);
                setRestoredPhotoPayload(null);
              } else if (activePhotoTarget.startsWith("route:")) {
                const id = parseInt(activePhotoTarget.split(":")[1], 10);
                setRouteItemState((prev) => ({
                  ...prev,
                  [id]: { ...prev[id], photoFile: file, photoName: file.name, restoredPhotoPayload: null },
                }));
              } else if (activePhotoTarget.startsWith("library:")) {
                const id = activePhotoTarget.split(":")[1];
                setSelfInputEntries((prev) => ({
                  ...prev,
                  [id]: { ...prev[id], photoFile: file, photoName: file.name, restoredPhotoPayload: null },
                }));
              }
            }}
          />`;

content = content.replace(
  /<input\s+id="mobile-activity-photo"[\s\S]+?onChange=\{\(event\) => \{[\s\S]+?\}\}\s+\/>/,
  fileInputReplacement
);

// 8. Inject widgets

// a. Assignment
content = content.replace(
  '                  : "Pilih assignment yang sedang dikerjakan."}\r\n              </p>\r\n            </Label>',
  '                  : "Pilih assignment yang sedang dikerjakan."}\r\n              </p>\r\n              {selectedAssignment ? renderPhotoWidget("single", !!selectedAssignment.requiresPhoto, photoName) : null}\r\n            </Label>'
);
content = content.replace(
  '                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n            </Label>',
  '                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n              {selectedAssignment ? renderPhotoWidget("single", !!selectedAssignment.requiresPhoto, photoName) : null}\n            </Label>'
);

// b. Custom Description
content = content.replace(
  '                />\r\n              </Label>\r\n              <Label className="block space-y-2">\r\n                <div className="flex items-center justify-between">\r\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>',
  '                />\r\n              </Label>\r\n              {renderPhotoWidget("single", false, photoName)}\r\n              <Label className="block space-y-2">\r\n                <div className="flex items-center justify-between">\r\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>'
);
content = content.replace(
  '                />\n              </Label>\n              <Label className="block space-y-2">\n                <div className="flex items-center justify-between">\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>',
  '                />\n              </Label>\n              {renderPhotoWidget("single", false, photoName)}\n              <Label className="block space-y-2">\n                <div className="flex items-center justify-between">\n                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>'
);

// c. Library Catatan item
content = content.replace(
  /<\/Label>\r?\n\s*\) : null\}\r?\n\r?\n\s*<Label className="block space-y-2">\r?\n\s*<div className="flex items-center justify-between">\r?\n\s*<span className="text-\[10px\] font-black uppercase tracking-\[0\.16em\] text-\[#486275\]">Catatan item<\/span>/g,
  `</Label>\n                          ) : null}\n\n                          {renderPhotoWidget(\`library:\${libraryId}\`, !!library.requiresPhoto, entry.photoName)}\n                          <Label className="block space-y-2">\n                            <div className="flex items-center justify-between">\n                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Catatan item</span>`
);

// d. Route Keterangan
content = content.replace(
  /<\/div>\r?\n\s*\) : null\}\r?\n\r?\n\s*\{item\.requiresRemark \? \(\r?\n\s*<Label className="block space-y-2">\r?\n\s*<div className="flex items-center justify-between">\r?\n\s*<span className="text-\[10px\] font-black uppercase tracking-\[0\.16em\] text-\[#486275\]">Keterangan<\/span>/g,
  `</div>\n                              ) : null}\n\n                              {renderPhotoWidget(\`route:\${item.id}\`, !!item.requiresPhoto, itemState.photoName)}\n                              {item.requiresRemark ? (\n                                <Label className="block space-y-2">\n                                  <div className="flex items-center justify-between">\n                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Keterangan</span>`
);

// e. Remove global photo section
const globalPhotoSectionRegex = /<section className="space-y-3 rounded-\[1\.25rem\] bg-white p-4 shadow-\[0_16px_34px_rgba\(8,32,51,0\.08\)\]">\s*<div className="flex items-start justify-between gap-3">[\s\S]+?Photo camera \/ galeri[\s\S]+?<\/section>\s*(<div className="grid grid-cols-2 gap-3">)/;
content = content.replace(
  globalPhotoSectionRegex,
  '$1'
);

// 9. Fix validation logic per mode
// a. In assigned mode
content = content.replace(
  /if \(needsAnyPhoto && !photoFile && !restoredPhotoPayload\) \{\r?\n\s+return "Foto wajib diupload karena assignment \/ checklist yang dipilih butuh image evidence.";\r?\n\s+\}/,
  `if (selectedAssignment?.requiresPhoto && !photoFile && !restoredPhotoPayload) {
        return "Foto wajib diupload karena assignment yang dipilih butuh image evidence.";
      }
      if (checklistContext) {
        let missingChecklistPhoto = false;
        checklistContext.groups.forEach(group => group.items.forEach(item => {
          const state = routeItemState[item.id];
          if (state?.isChecked && item.requiresPhoto && !state?.photoFile && !state?.restoredPhotoPayload) missingChecklistPhoto = true;
        }));
        if (missingChecklistPhoto) return "Foto wajib diupload karena checklist yang dipilih butuh image evidence.";
      }`
);

// b. In custom mode
content = content.replace(
  /if \(needsAnyPhoto && !photoFile && !restoredPhotoPayload\) \{\r?\n\s+return "Foto wajib diupload karena checklist yang dipilih butuh image evidence.";\r?\n\s+\}/,
  `if (checklistContext) {
        let missingChecklistPhoto = false;
        checklistContext.groups.forEach(group => group.items.forEach(item => {
          const state = routeItemState[item.id];
          if (state?.isChecked && item.requiresPhoto && !state?.photoFile && !state?.restoredPhotoPayload) missingChecklistPhoto = true;
        }));
        if (missingChecklistPhoto) return "Foto wajib diupload karena checklist yang dipilih butuh image evidence.";
      }`
);

// c. In self_input mode
content = content.replace(
  /if \(needsAnyPhoto && !photoFile && !restoredPhotoPayload\) \{\r?\n\s+return "Minimal satu foto wajib karena ada activity \/ checklist yang butuh image evidence.";\r?\n\s+\}/,
  `let missingLibraryPhoto = false;
    selectedLibraries.forEach(lib => {
      const entry = selfInputEntries[\`\${lib.id}\`];
      if (lib.requiresPhoto && !entry?.photoFile && !entry?.restoredPhotoPayload) missingLibraryPhoto = true;
    });
    if (missingLibraryPhoto) return "Foto wajib diupload karena activity yang dipilih butuh image evidence.";
    
    if (checklistContext) {
      let missingChecklistPhoto = false;
      checklistContext.groups.forEach(group => group.items.forEach(item => {
        const state = routeItemState[item.id];
        if (state?.isChecked && item.requiresPhoto && !state?.photoFile && !state?.restoredPhotoPayload) missingChecklistPhoto = true;
      }));
      if (missingChecklistPhoto) return "Foto wajib diupload karena checklist yang dipilih butuh image evidence.";
    }`
);

// 10. Update draft deserialization cleanly
content = content.replace(
  /if \(draft\.routeItemState\) \{\r?\n\s+setRouteItemState\(draft\.routeItemState\);\r?\n\s+\}/,
  `if (draft.routeItemState) {
        const restored = { ...draft.routeItemState };
        Object.keys(restored).forEach(k => {
          if (restored[k]) restored[k].photoFile = null;
        });
        setRouteItemState(restored);
      }`
);

content = content.replace(
  /if \(draft\.selfInputEntries\) \{\r?\n\s+setSelfInputEntries\(draft\.selfInputEntries\);\r?\n\s+\}/,
  `if (draft.selfInputEntries) {
        const restored = { ...draft.selfInputEntries };
        Object.keys(restored).forEach(k => {
          if (restored[k]) restored[k].photoFile = null;
        });
        setSelfInputEntries(restored);
      }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'mobile', 'mobile-daily-activity-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update buildSelfInputPayloads
content = content.replace(
  /function buildSelfInputPayloads\(sharedPhoto: QueuedFilePayload \| null\) \{\n\s+return selectedLibraries\.map\(\(library, index\) => \{[\s\S]+?\}\);\n\s+\}/,
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

// 2. Update handleSubmit self_input
content = content.replace(
  /const payloads = buildSelfInputPayloads\(sharedPhoto\);/,
  `const payloads = await buildSelfInputPayloads();`
);

// 3. Update handleSubmit route items
content = content.replace(
  /await sendPayload\(\{\n\s+\.\.\.draftPayload,\n\s+photo: sharedPhoto,\n\s+libraryActivityId: "",\n\s+\}\);/,
  `const payloadToSubmit = {
          ...draftPayload,
          photo: sharedPhoto,
          libraryActivityId: "",
        };

        if (sourceMode === "route" && payloadToSubmit.routeSessionItems) {
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

// 4. Also need to update the file handler
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

// 5. Inject widgets
// Into Assignment card
content = content.replace(
  '{selectedAssignment?.requiresPhoto\n                  ? "Assignment ini wajib upload foto evidence."\n                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n            </Label>',
  '{selectedAssignment?.requiresPhoto\n                  ? "Assignment ini wajib upload foto evidence."\n                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n              {selectedAssignment ? renderPhotoWidget("single", !!selectedAssignment.requiresPhoto, photoName) : null}\n            </Label>'
);

// Into Custom Activity card
content = content.replace(
  '<span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes / Laporan Singkat</span>',
  '{renderPhotoWidget("single", false, photoName)}\n            </Label>\n            <Label className="block space-y-2">\n              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes / Laporan Singkat</span>'
);

// Into Library Activity (Self Input) cards
content = content.replace(
  /<SpeechTextarea\n\s+value=\{entryState\.notes\}/g,
  '{renderPhotoWidget(`library:${item.id}`, !!item.requiresPhoto, entryState.photoName)}\n                        <SpeechTextarea\n                          value={entryState.notes}'
);

// Into Route Checklist items
content = content.replace(
  /<SpeechTextarea\n\s+value=\{itemState\.remark\}/g,
  '{renderPhotoWidget(`route:${item.id}`, !!item.requiresPhoto, itemState.photoName)}\n                            <SpeechTextarea\n                              value={itemState.remark}'
);

// Remove the global Photo camera / galeri section
const globalPhotoSectionRegex = /<section className="space-y-3 rounded-\[1\.25rem\] bg-white p-4 shadow-\[0_16px_34px_rgba\(8,32,51,0\.08\)\]">\s*<div className="flex items-start justify-between gap-3">[\s\S]+?Photo camera \/ galeri[\s\S]+?<\/section>\s*(<div className="grid grid-cols-2 gap-3">)/;

content = content.replace(
  globalPhotoSectionRegex,
  '$1'
);

// Update validation logic to check per-item photo requirements
content = content.replace(
  /if \(needsAnyPhoto && !photoFile && !restoredPhotoPayload\) \{/g,
  `
      // Validate per-item photos
      let missingPhoto = false;
      if (sourceMode === "assigned" && selectedAssignment?.requiresPhoto && !photoFile && !restoredPhotoPayload) missingPhoto = true;
      if (sourceMode === "self_input") {
        selectedLibraries.forEach(lib => {
          const entry = selfInputEntries[\`\${lib.id}\`];
          if (lib.requiresPhoto && !entry?.photoFile && !entry?.restoredPhotoPayload) missingPhoto = true;
        });
      }
      if (sourceMode === "route" && checklistContext) {
        checklistContext.items.forEach(item => {
          const state = routeItemState[item.id];
          if (state?.isChecked && item.requiresPhoto && !state?.photoFile && !state?.restoredPhotoPayload) missingPhoto = true;
        });
      }

      if (missingPhoto) {`
);

// Update draft restore logic
content = content.replace(
  /if \(draft\.routeItemState\) \{\n\s+setRouteItemState\(draft\.routeItemState\);\n\s+\}/,
  `if (draft.routeItemState) {
        const restored = { ...draft.routeItemState };
        // Clean up any File references from local storage deserialization
        Object.keys(restored).forEach(k => {
          if (restored[k]) restored[k].photoFile = null;
        });
        setRouteItemState(restored);
      }`
);

content = content.replace(
  /if \(draft\.selfInputEntries\) \{\n\s+setSelfInputEntries\(draft\.selfInputEntries\);\n\s+\}/,
  `if (draft.selfInputEntries) {
        const restored = { ...draft.selfInputEntries };
        // Clean up any File references from local storage deserialization
        Object.keys(restored).forEach(k => {
          if (restored[k]) restored[k].photoFile = null;
        });
        setSelfInputEntries(restored);
      }`
);


fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully refactored mobile-daily-activity-form.tsx");

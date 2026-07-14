const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'mobile', 'mobile-daily-activity-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add activePhotoTarget to state
content = content.replace(
  'const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");',
  'const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");\n  const [activePhotoTarget, setActivePhotoTarget] = useState<string | null>(null);'
);

// We need to inject the PhotoUploadWidget into the rendering flow
const photoUploadWidgetCode = `
  const renderPhotoWidget = (targetId: string, requiresPhoto: boolean, photoName?: string) => (
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
      {photoName ? (
        <p className="text-[11px] font-semibold text-[#003f78] break-words truncate">
          ✓ {photoName}
        </p>
      ) : null}
    </div>
  );
`;

content = content.replace(
  'const needsGlobalPhoto = selectedLibraries.some((item) => item.requiresPhoto);',
  photoUploadWidgetCode + '\n  const needsGlobalPhoto = selectedLibraries.some((item) => item.requiresPhoto);'
);

// Inject into Assignment card
content = content.replace(
  '{selectedAssignment?.requiresPhoto\n                  ? "Assignment ini wajib upload foto evidence."\n                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n            </Label>',
  '{selectedAssignment?.requiresPhoto\n                  ? "Assignment ini wajib upload foto evidence."\n                  : "Pilih assignment yang sedang dikerjakan."}\n              </p>\n              {selectedAssignment ? renderPhotoWidget("single", !!selectedAssignment.requiresPhoto, photoName) : null}\n            </Label>'
);

// Inject into Custom Activity card
content = content.replace(
  '<span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes / Laporan Singkat</span>',
  '{renderPhotoWidget("single", false, photoName)}\n            </Label>\n            <Label className="block space-y-2">\n              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes / Laporan Singkat</span>'
);

// Inject into Library Activity (Self Input) cards
content = content.replace(
  /<SpeechTextarea\n\s+value=\{entryState\.notes\}/g,
  '{renderPhotoWidget(`library:${item.id}`, !!item.requiresPhoto, entryState.photoName)}\n                        <SpeechTextarea\n                          value={entryState.notes}'
);

// Inject into Route Checklist items
content = content.replace(
  /<SpeechTextarea\n\s+value=\{itemState\.remark\}/g,
  '{renderPhotoWidget(`route:${item.id}`, !!item.requiresPhoto, itemState.photoName)}\n                            <SpeechTextarea\n                              value={itemState.remark}'
);

// Now update the hidden file input handler
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

// Remove the global Photo camera / galeri section
// We can use regex to remove the <section>...</section> before the Submit buttons.
// The easiest is replacing between `</section>` of Location and `<div className="grid grid-cols-2 gap-3">` of Submit buttons.
const globalPhotoSectionRegex = /<section className="space-y-3 rounded-\[1\.25rem\] bg-white p-4 shadow-\[0_16px_34px_rgba\(8,32,51,0\.08\)\]">\s*<div className="flex items-start justify-between gap-3">[\s\S]+?Photo camera \/ galeri[\s\S]+?<\/section>\s*(<div className="grid grid-cols-2 gap-3">)/;

content = content.replace(
  globalPhotoSectionRegex,
  '$1'
);

// Handle buildSelfInputPayloads
content = content.replace(
  /function buildSelfInputPayloads\(sharedPhoto: QueuedFilePayload \| null\) \{/,
  `async function buildSelfInputPayloads() {`
);

content = content.replace(
  /photo: sharedPhoto,/g,
  `photo: await (async () => {
              const entry = selfInputEntries[\`\${item.id}\`];
              if (entry?.photoFile) return await fileToPayload(entry.photoFile);
              if (entry?.restoredPhotoPayload) return entry.restoredPhotoPayload;
              return null;
            })(),`
);

// Update calls to buildSelfInputPayloads
content = content.replace(
  /const sharedPhoto = photoFile \? await fileToPayload\(photoFile\) : restoredPhotoPayload;\n\s+const payloads = buildSelfInputPayloads\(sharedPhoto\);/,
  `const payloads = await buildSelfInputPayloads();`
);

// Also need to handle photo per route item in buildSubmitPayload
content = content.replace(
  /const state = routeItemState\[item\.id\] \?\? emptyRouteItemState;\n\s+return \{\n\s+routeItemId: item\.id,[\s\S]+?photo: sharedPhoto,/,
  `const state = routeItemState[item.id] ?? emptyRouteItemState;
            return {
              routeItemId: item.id,
              snapshotLabel: item.lineLabel,
              snapshotGroupName: item.snapshotGroupName,
              unitNumber: state.unitNumber,
              remark: state.remark,
              startedAt: state.startedAt || new Date().toISOString(),
              endedAt: state.endedAt || new Date().toISOString(),
              actualPoints: parseInt(state.actualPoints, 10) || 0,
              isChecked: state.isChecked,
              isCustomItem: item.isCustomLine,
              photo: state.photoFile ? await fileToPayload(state.photoFile) : (state.restoredPhotoPayload || null),`
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

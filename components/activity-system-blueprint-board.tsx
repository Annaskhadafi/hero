import {
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  GitBranch,
  Layers3,
  ListTree,
  MonitorSmartphone,
  Route,
  Smartphone,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const schemaLayers = [
  {
    title: "1. Library Master",
    icon: Layers3,
    description: "Master aktivitas global. Sumber default label, requirement, dan poin awal.",
    tables: [
      "hero_activity_libraries",
      "hero_activity_section_point_overrides",
    ],
  },
  {
    title: "2. Route Builder (Template)",
    icon: Route,
    description: "Template per section + jabatan. Tempat nested group dan item harian dibangun.",
    tables: [
      "hero_activity_route_templates",
      "hero_activity_route_groups",
      "hero_activity_route_items",
    ],
  },
  {
    title: "3. SPL",
    icon: FileSpreadsheet,
    description: "Surat Perintah Lembur sebagai dokumen plan resmi dari atasan ke tim.",
    tables: [
      "hero_overtime_command_letters",
      "hero_overtime_command_letter_items",
    ],
  },
  {
    title: "4. Daily Execution",
    icon: ClipboardCheck,
    description: "Checklist aktual pekerjaan lapangan, snapshot route, unit, waktu, dan poin final.",
    tables: [
      "hero_daily_activity_sessions",
      "hero_daily_activity_session_items",
    ],
  },
];

const relationshipRows = [
  ["Section + Jabatan", "punya banyak", "Route Template"],
  ["Route Template", "punya banyak", "Route Group"],
  ["Route Group", "punya banyak", "Route Item"],
  ["Route Item", "boleh refer", "Library Activity"],
  ["Section Head Override", "menimpa", "Label / Point default"],
  ["SPL", "boleh attach", "Route Template + custom line"],
  ["Daily Session", "snapshot dari", "Route Template atau SPL"],
  ["Daily Session Item", "simpan", "unit, waktu, remark, actual point"],
];

const desktopFlows = [
  {
    title: "Library",
    eyebrow: "Desktop Flow",
    summary: "Admin HO kelola master default. Section Head tidak mengubah global langsung, tapi override per section/jabatan.",
    columns: [
      {
        title: "Filter Rail",
        items: ["Site", "Department", "Section", "Jabatan", "Category", "Status aktif"],
      },
      {
        title: "Tree Workspace",
        items: [
          "Section",
          "Jabatan",
          "Group pekerjaan",
          "Item default",
          "Override badge",
        ],
      },
      {
        title: "Inspector",
        items: [
          "Default point",
          "Requirement unit / waktu / remark / foto",
          "Promote custom item",
          "Audit perubahan",
        ],
      },
    ],
  },
  {
    title: "Route Builder (Template)",
    eyebrow: "Desktop Flow",
    summary: "Builder fokus ke nested route. Satu route untuk satu kombinasi section + jabatan + shift.",
    columns: [
      {
        title: "Template Header",
        items: ["Section", "Jabatan", "Shift", "Version", "Mobile enabled"],
      },
      {
        title: "Nested Canvas",
        items: [
          "Safety Talk",
          "Inspection",
          "Repair",
          "Housekeeping",
          "Add group / add item",
        ],
      },
      {
        title: "Rule Panel",
        items: [
          "Point override",
          "Mandatory / optional",
          "Needs unit",
          "Needs time",
          "Needs remark / photo",
        ],
      },
    ],
  },
  {
    title: "SPL",
    eyebrow: "Desktop Flow",
    summary: "Atasan membuat Surat Perintah Lembur dari route existing atau custom line, lalu submit ke approval engine.",
    columns: [
      {
        title: "Request Header",
        items: ["Nomor SPL", "Tanggal kerja", "Section", "PIC", "Jam plan"],
      },
      {
        title: "Work Lines",
        items: [
          "Import from route",
          "Tambah custom pekerjaan",
          "Target unit",
          "Estimasi menit",
          "Planned points",
        ],
      },
      {
        title: "Approval Strip",
        items: ["Requester", "Approver", "Status", "Request Center sync", "Timesheet sync"],
      },
    ],
  },
  {
    title: "Daily Checklist",
    eyebrow: "Desktop Flow",
    summary: "Supervisor lihat eksekusi per orang, per SPL, dan per session; worker tetap entry utama dari mobile.",
    columns: [
      {
        title: "Session Context",
        items: ["Employee", "Section", "Jabatan", "Route/SPL source", "Shift"],
      },
      {
        title: "Checklist Grid",
        items: [
          "Group expand/collapse",
          "Checked status",
          "Unit no",
          "Start - end",
          "Remark",
        ],
      },
      {
        title: "Review Panel",
        items: ["Actual points", "Missing mandatory", "Photo evidence", "Submit / approve state"],
      },
    ],
  },
];

const mobileFlows = [
  {
    title: "Lookup Section",
    summary: "User masuk dari mobile, lookup atau auto-detect section, lalu pilih jabatan hanya bila punya multi-role.",
    steps: [
      "Top bar ringkas + tanggal kerja",
      "Chip Section aktif",
      "Bottom sheet pilih jabatan bila perlu",
      "CTA lanjut ke route hari ini",
    ],
  },
  {
    title: "Daily Route",
    summary: "Route tampil sebagai accordion group, bukan table. Item belum dicentang tetap ringkas agar cepat discan.",
    steps: [
      "Accordion group pekerjaan",
      "Checkbox per item",
      "Point badge kecil",
      "Expand hanya saat dicentang",
      "Progress strip di bawah",
    ],
  },
  {
    title: "Item Detail",
    summary: "Saat item dicentang, field wajib baru muncul. Ini menjaga mobile tetap simpel.",
    steps: [
      "Unit muncul hanya bila wajib",
      "Start / end time atau quick duration",
      "Remark collapsible",
      "Photo optional / mandatory sesuai rule",
      "Save draft offline",
    ],
  },
  {
    title: "SPL Context",
    summary: "Jika ada SPL aktif, mobile load line dari SPL dulu, lalu gabungkan dengan route section bila diizinkan.",
    steps: [
      "Badge SPL aktif",
      "Line pekerjaan planned",
      "Custom line hanya jika diizinkan",
      "Submit session",
      "Status approval / overtime sync",
    ],
  },
];

const rolloutPhases = [
  "Phase 1: aktifkan tabel v2 additive tanpa mematikan library dan assignment lama.",
  "Phase 2: buat admin workspace Blueprint + Route Builder (Template) sebagai surface review dan alignment.",
  "Phase 3: ganti mobile input dari form flat menjadi checklist route per section.",
  "Phase 4: ganti assignment bisnis menjadi SPL, tetap bridge ke approval engine existing.",
  "Phase 5: pindahkan analytics, leaderboard, dan export ke sumber session v2.",
];

function LayerCard({
  title,
  description,
  tables,
  icon: Icon,
}: {
  title: string;
  description: string;
  tables: string[];
  icon: typeof Layers3;
}) {
  return (
    <Card className="rounded-[1.35rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#003461,#004b87)] text-white shadow-[0_14px_28px_rgba(0,52,97,0.22)]">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {tables.map((table) => (
          <Badge
            key={table}
            className="border-0 bg-[#eaf4fb] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#003f78]"
          >
            {table}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

function FlowCard({
  eyebrow,
  title,
  summary,
  columns,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  columns: Array<{ title: string; items: string[] }>;
}) {
  return (
    <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
      <CardHeader className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#486275]">{eyebrow}</p>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-6">{summary}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className="rounded-[1.15rem] bg-[#f3faff] p-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#003461]">{column.title}</p>
            <div className="mt-3 space-y-2">
              {column.items.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#082033] shadow-[0_10px_24px_rgba(8,32,51,0.05)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MobileFlowCard({
  title,
  summary,
  steps,
}: {
  title: string;
  summary: string;
  steps: string[];
}) {
  return (
    <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-6">{summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-[320px] rounded-[2rem] bg-[linear-gradient(180deg,#082033,#0e2d3b)] p-3 shadow-[0_24px_50px_rgba(8,32,51,0.25)]">
          <div className="rounded-[1.6rem] bg-[#f3faff] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2 w-14 rounded-full bg-[#b9dff6]" />
                <div className="h-2 w-24 rounded-full bg-[#d6edf9]" />
              </div>
              <div className="h-8 w-8 rounded-full bg-[#003461]" />
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-[1rem] bg-white px-3 py-3 text-sm font-semibold text-[#082033] shadow-[0_12px_28px_rgba(8,32,51,0.06)]"
                >
                  <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-[#e6f6ff] text-[11px] font-black text-[#003461]">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivitySystemBlueprintBoard() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[1.7rem] border-0 bg-[linear-gradient(135deg,#003461,#004b87)] text-white shadow-[0_24px_58px_rgba(0,52,97,0.24)]">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1.45fr_1fr] lg:px-8">
          <div className="space-y-4">
            <Badge className="border-0 bg-white/14 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Daily Activity V2
            </Badge>
            <div className="space-y-3">
              <h2 className="font-display text-3xl font-black tracking-tight">
                Blueprint Schema, Wireframe Flow, dan Jalur Implementasi
              </h2>
              <p className="max-w-3xl text-sm font-medium leading-7 text-[#d9efff]">
                Model baru memisahkan library global, route per section + jabatan, Surat Perintah Lembur, dan daily
                checklist aktual. Tujuannya: mobile tetap ringan, admin tetap fleksibel, histori poin tetap aman lewat
                snapshot.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.2rem] bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Arah Data</p>
              <p className="mt-2 text-lg font-black">Library → Route → SPL → Session</p>
            </div>
            <div className="rounded-[1.2rem] bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Arah Mobile</p>
              <p className="mt-2 text-lg font-black">Lookup section → checklist cepat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schema" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-[#e6f6ff] p-1">
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="desktop">Desktop Wireframe</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Wireframe</TabsTrigger>
          <TabsTrigger value="rollout">Rollout</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {schemaLayers.map((layer) => (
              <LayerCard key={layer.title} {...layer} />
            ))}
          </div>

          <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="size-5 text-primary" />
                <CardTitle>Relation Matrix</CardTitle>
              </div>
              <CardDescription>
                Relasi inti supaya poin, override, SPL, dan eksekusi aktual bisa dipisah tapi tetap nyambung.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {relationshipRows.map(([left, middle, right]) => (
                <div
                  key={`${left}-${right}`}
                  className="grid gap-2 rounded-[1rem] bg-[#f3faff] px-4 py-3 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)] lg:grid-cols-[1.1fr_auto_1.1fr]"
                >
                  <span>{left}</span>
                  <span className="text-[#486275]">{middle}</span>
                  <span>{right}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desktop" className="space-y-5">
          <div className="grid gap-5">
            {desktopFlows.map((flow) => (
              <FlowCard key={flow.title} {...flow} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            {mobileFlows.map((flow) => (
              <MobileFlowCard key={flow.title} {...flow} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rollout" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Boxes className="size-5 text-primary" />
                  <CardTitle>Rollout Bertahap</CardTitle>
                </div>
                <CardDescription>
                  Jalur aman supaya route v2 bisa hidup dulu tanpa mematikan library, assignment, dan approval lama.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rolloutPhases.map((phase, index) => (
                  <div
                    key={phase}
                    className="rounded-[1rem] bg-[#f3faff] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Phase {index + 1}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#082033]">{phase}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[1.4rem] border-0 bg-white shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="size-5 text-primary" />
                  <CardTitle>Perubahan UX Utama</CardTitle>
                </div>
                <CardDescription>
                  Fokus utama pindah dari form flat ke route-guided execution yang lebih ringan di mobile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    icon: ListTree,
                    label: "Nested list pindah ke route builder, bukan tabel report datar.",
                  },
                  {
                    icon: Users2,
                    label: "Section jadi entry utama, jabatan jadi variasi route.",
                  },
                  {
                    icon: FileSpreadsheet,
                    label: "Istilah Assignment bisnis diganti jadi SPL, tetap bridge ke approval engine existing.",
                  },
                  {
                    icon: Smartphone,
                    label: "Mobile user cukup centang pekerjaan, isi unit bila wajib, isi waktu, lalu submit.",
                  },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex gap-3 rounded-[1rem] bg-[#f3faff] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.05)]"
                  >
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-[0_10px_22px_rgba(8,32,51,0.06)]">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-sm font-semibold leading-6 text-[#082033]">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

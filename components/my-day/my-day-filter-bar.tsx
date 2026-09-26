import { Button } from "@/components/ui/button";

interface FilterBarProps {
  viewScope: string;
  dataScope: string;
  requestedSiteId?: number;
  requestedSectionId?: number;
  sites: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string }>;
}

export function MyDayFilterBar({
  viewScope,
  dataScope,
  requestedSiteId,
  requestedSectionId,
  sites,
  sections,
}: FilterBarProps) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
    >
      <span className="font-semibold text-slate-500 dark:text-slate-400 pl-1">Scope:</span>

      {/* Tampilan Data */}
      <select
        id="activity-view"
        name="view"
        defaultValue={viewScope}
        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="own">Aktivitas Saya</option>
        <option value="site">Site Saya</option>
        {dataScope === "global" ? <option value="global">Semua Site</option> : null}
      </select>

      {/* Site (hanya tampil jika global) */}
      {dataScope === "global" ? (
        <select
          id="activity-site"
          name="siteId"
          defaultValue={Number.isFinite(requestedSiteId) ? String(requestedSiteId) : ""}
          className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Semua Site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      ) : null}

      {/* Section */}
      <select
        id="activity-section"
        name="sectionId"
        defaultValue={Number.isFinite(requestedSectionId) ? String(requestedSectionId) : ""}
        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="">Semua Section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>

      {/* Action Button */}
      <Button
        type="submit"
        size="sm"
        className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 text-xs font-semibold text-white shadow-xs transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 ml-auto sm:ml-0"
      >
        Terapkan
      </Button>
    </form>
  );
}

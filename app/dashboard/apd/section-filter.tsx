"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { MultiSelectFilterDropdown } from "@/components/ui/multi-select-filter-dropdown";

export function ApdSectionFilter({
  sections,
  activeSections = [],
  activeTab,
}: {
  sections: { id: number; name: string; code?: string }[];
  activeSections?: string[];
  activeTab: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelectionChange = (selectedNames: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab && activeTab !== "all") {
      params.set("tab", activeTab);
    }
    if (selectedNames && selectedNames.length > 0) {
      params.set("section", selectedNames.join(","));
    } else {
      params.delete("section");
    }
    router.push(`/dashboard/apd?${params.toString()}`);
  };

  const options = sections.map((s) => ({
    value: s.name,
    label: s.name,
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
        <Filter className="size-3.5 text-primary" />
        <span>Pilih Section:</span>
      </span>
      <MultiSelectFilterDropdown
        options={options}
        selectedValues={activeSections}
        onSelectionChange={handleSelectionChange}
        placeholder="Semua Section"
        label="Section"
        title="Pilih Section"
        className="h-9 min-w-[200px]"
      />
    </div>
  );
}

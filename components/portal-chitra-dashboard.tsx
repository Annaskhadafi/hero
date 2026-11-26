"use client";

import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import { PortalChitraIcon } from "@/components/portal-chitra-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PortalChitraAppRecord } from "@/lib/portal-chitra";

export function PortalChitraDashboard({
  apps,
}: {
  apps: PortalChitraAppRecord[];
}) {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["Semua", ...Array.from(new Set(apps.map((app) => app.category)))];
  const filteredApps = apps.filter((app) => {
    const matchesCategory = activeCategory === "Semua" || app.category === activeCategory;
    const searchValue = searchQuery.trim().toLowerCase();
    const matchesSearch =
      searchValue.length === 0 ||
      app.name.toLowerCase().includes(searchValue) ||
      app.description.toLowerCase().includes(searchValue) ||
      app.category.toLowerCase().includes(searchValue);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[1.4rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(230,246,255,0.96))] p-5 shadow-[0_20px_48px_rgba(8,32,51,0.08)] ring-1 ring-[#dbe8f1] xl:sticky xl:top-5 xl:h-fit">
        <div className="rounded-[1.15rem] bg-[linear-gradient(135deg,#003461,#004b87)] p-5 text-white shadow-[0_18px_40px_rgba(0,52,97,0.28)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b9dff6]">
            Business Apps
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            Portal Chitra
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#d7ecf9]">
            Gateway lintas sistem operasional Chitra. Cari aplikasi, filter per proses, lalu launch cepat.
          </p>
        </div>

        <div className="rounded-[1.15rem] bg-white p-4 shadow-[0_12px_26px_rgba(8,32,51,0.06)] ring-1 ring-[#e3edf4]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#486275]">
            Ringkasan
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[1rem] bg-[#f3faff] p-3">
              <p className="text-2xl font-black leading-none text-[#082033]">{apps.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                Total Apps
              </p>
            </div>
            <div className="rounded-[1rem] bg-[#f6ede7] p-3">
              <p className="text-2xl font-black leading-none text-[#082033]">{categories.length - 1}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                Kategori
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.15rem] bg-white p-4 shadow-[0_12px_26px_rgba(8,32,51,0.06)] ring-1 ring-[#e3edf4]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#486275]">
            Filter Kategori
          </p>
          <div className="mt-4 flex flex-wrap gap-2 xl:flex-col">
            {categories.map((category) => {
              const total = category === "Semua" ? apps.length : apps.filter((app) => app.category === category).length;
              const active = category === activeCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[0.95rem] px-3 py-3 text-left transition",
                    active
                      ? "bg-[linear-gradient(135deg,#003461,#004b87)] text-white shadow-[0_14px_28px_rgba(0,52,97,0.24)]"
                      : "bg-[#f6fbff] text-[#153249] hover:bg-[#eaf4fb]",
                  )}
                >
                  <span className="text-sm font-semibold">{category}</span>
                  <span
                    className={cn(
                      "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[10px] font-black",
                      active ? "bg-white/16 text-white" : "bg-white text-[#486275]",
                    )}
                  >
                    {total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        <section className="rounded-[1.4rem] bg-white p-5 shadow-[0_20px_48px_rgba(8,32,51,0.07)] ring-1 ring-[#dbe8f1]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#486275]">
                Digital Ecosystem
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#082033]">
                Cari sistem yang ingin diakses
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[#486275]">
                Halaman ini otomatis menampilkan aplikasi sesuai role user. Search bekerja untuk nama, kategori, dan deskripsi.
              </p>
            </div>

            <div className="w-full lg:max-w-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7d8c]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari sistem atau aplikasi..."
                  className="h-12 border-0 bg-[#f3faff] pl-10 shadow-[inset_0_-2px_0_rgba(0,52,97,0.08)] focus-visible:ring-[#003461]/25"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-0 bg-[#e9f6fd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#003f78]">
              Aktif: {activeCategory}
            </Badge>
            <Badge className="rounded-full border-0 bg-[#f6ede7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#5a2200]">
              Tampil: {filteredApps.length}
            </Badge>
          </div>
        </section>

        {filteredApps.length === 0 ? (
          <section className="rounded-[1.4rem] bg-white p-10 text-center shadow-[0_20px_48px_rgba(8,32,51,0.07)] ring-1 ring-[#dbe8f1]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-[1.25rem] bg-[#e9f6fd] text-[#003f78]">
              <Search className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-black text-[#082033]">Tidak ada hasil</h3>
            <p className="mt-2 text-sm text-[#486275]">
              Coba kata kunci lain atau pilih kategori berbeda.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredApps.map((app) => (
              <article
                key={app.id}
                className="group flex h-full flex-col justify-between rounded-[1.4rem] bg-white p-5 shadow-[0_16px_36px_rgba(8,32,51,0.06)] ring-1 ring-[#dbe8f1] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_54px_rgba(8,32,51,0.12)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex size-13 items-center justify-center rounded-[1rem] text-white shadow-[0_14px_28px_rgba(8,32,51,0.18)]"
                      style={{ backgroundColor: app.color }}
                    >
                      <PortalChitraIcon name={app.iconName} className="size-6" />
                    </span>
                    <Badge className="rounded-full border-0 bg-[#f3faff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                      {app.category}
                    </Badge>
                  </div>

                  <h3 className="mt-5 text-xl font-black tracking-tight text-[#082033] transition group-hover:text-[#003f78]">
                    {app.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#486275]">{app.description}</p>
                </div>

                <div className="mt-6">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_32px_rgba(8,32,51,0.16)] transition hover:brightness-110"
                    style={{ backgroundColor: app.color }}
                  >
                    Launch
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

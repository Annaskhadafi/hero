"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Check,
  Building,
  UserCheck,
  Plus,
  X,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DepartmentSelectOption {
  code: string;
  name: string;
  id?: number | null;
  headName?: string | null;
  description?: string;
}

export interface PicSelectOption {
  id: number;
  name: string;
  employeeSn: string | null;
  position: string | null;
  category?: "HEAD_DEPT" | "HEAD_SECTION" | "EMPLOYEE";
  unitLabel?: string;
}

interface SearchableDepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  departments: DepartmentSelectOption[];
  onOpenManage?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableDepartmentSelect({
  value,
  onChange,
  departments,
  onOpenManage,
  placeholder = "Pilih Departemen...",
  disabled = false,
}: SearchableDepartmentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedDept = useMemo(() => {
    return (
      departments.find((d) => d.code.toUpperCase() === (value || "").toUpperCase()) || null
    );
  }, [departments, value]);

  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.headName && d.headName.toLowerCase().includes(q))
    );
  }, [departments, search]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="flex items-center gap-2 truncate text-left">
          <Building className="size-3.5 shrink-0 text-slate-400" />
          {selectedDept ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedDept.name}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono shrink-0 font-bold">
                {selectedDept.code}
              </Badge>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`size-3.5 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950 max-h-72 flex flex-col">
          {/* Live Search Input */}
          <div className="relative mb-1.5">
            <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Cari kode atau nama departemen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7.5 rounded-lg pl-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Department Items List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 max-h-48 pr-0.5">
            {filteredList.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Tidak ada departemen yang cocok.
              </div>
            ) : (
              filteredList.map((dept) => {
                const isSelected = dept.code.toUpperCase() === (value || "").toUpperCase();
                return (
                  <button
                    key={dept.code}
                    type="button"
                    onClick={() => {
                      onChange(dept.code);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-blue-50 font-bold text-[#003461] dark:bg-blue-950 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        [{dept.code}]
                      </span>
                      <span className="truncate">{dept.name}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Action: Tambah / Kelola Departemen */}
          {onOpenManage && (
            <div className="border-t border-slate-100 pt-1.5 mt-1 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenManage();
                }}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-lg text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors"
              >
                <Plus className="size-3.5" />
                Tambah / Kelola Departemen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SearchablePicSelectProps {
  value: string;
  onChange: (value: string) => void;
  picOptions: PicSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SearchablePicSelect({
  value,
  onChange,
  picOptions,
  placeholder = "Pilih PIC / Penanggung Jawab Dokumen...",
  disabled = false,
}: SearchablePicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState<"ALL" | "HEAD_DEPT" | "HEAD_SECTION" | "EMPLOYEE">("ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedPic = useMemo(() => {
    if (!value) return null;
    const numId = Number(value);
    return picOptions.find((p) => p.id === numId) || null;
  }, [picOptions, value]);

  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return picOptions.filter((p) => {
      // Category filter
      if (categoryTab !== "ALL") {
        if (p.category !== categoryTab) return false;
      }

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.employeeSn && p.employeeSn.toLowerCase().includes(q)) ||
        (p.position && p.position.toLowerCase().includes(q)) ||
        (p.unitLabel && p.unitLabel.toLowerCase().includes(q))
      );
    });
  }, [picOptions, search, categoryTab]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="flex items-center gap-2 truncate text-left">
          <UserCheck className="size-3.5 shrink-0 text-slate-400" />
          {selectedPic ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedPic.name}
              </span>
              {selectedPic.employeeSn && (
                <span className="text-[10px] font-mono text-slate-400">
                  ({selectedPic.employeeSn})
                </span>
              )}
              {selectedPic.category === "HEAD_DEPT" && (
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[9px] px-1.5 py-0">
                  Head Dept
                </Badge>
              )}
              {selectedPic.category === "HEAD_SECTION" && (
                <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[9px] px-1.5 py-0">
                  Head Section
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`size-3.5 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 max-h-80 flex flex-col">
          {/* Live Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Cari nama PIC, NIK, jabatan, atau departemen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7.5 rounded-lg pl-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Category Pills */}
          <div className="flex items-center gap-1 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryTab("ALL")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                categoryTab === "ALL"
                  ? "bg-[#003461] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Semua PIC
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab("HEAD_DEPT")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                categoryTab === "HEAD_DEPT"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
              }`}
            >
              Head Dept
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab("HEAD_SECTION")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                categoryTab === "HEAD_SECTION"
                  ? "bg-sky-600 text-white"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300"
              }`}
            >
              Head Section
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab("EMPLOYEE")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                categoryTab === "EMPLOYEE"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Karyawan Lain
            </button>
          </div>

          {/* PIC Options List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 max-h-52 pr-0.5">
            {/* Clear Selection Option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearch("");
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors text-left italic"
            >
              <span>- Tanpa PIC / Kosongkan -</span>
            </button>

            {filteredList.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400">
                Tidak ada PIC yang cocok dengan kriteria.
              </div>
            ) : (
              filteredList.map((pic) => {
                const isSelected = value === pic.id.toString();
                return (
                  <button
                    key={`${pic.category || "emp"}_${pic.id}_${pic.unitLabel}`}
                    type="button"
                    onClick={() => {
                      onChange(pic.id.toString());
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-blue-50 font-bold text-[#003461] dark:bg-blue-950 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {pic.name}
                        </span>
                        {pic.employeeSn && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({pic.employeeSn})
                          </span>
                        )}
                        {pic.category === "HEAD_DEPT" && (
                          <Badge className="bg-indigo-100 text-indigo-800 text-[9px] px-1 py-0 border-none shrink-0">
                            Head Dept
                          </Badge>
                        )}
                        {pic.category === "HEAD_SECTION" && (
                          <Badge className="bg-sky-100 text-sky-800 text-[9px] px-1 py-0 border-none shrink-0">
                            Head Section
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">
                        {pic.unitLabel || pic.position || "Staff"}
                      </span>
                    </div>

                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

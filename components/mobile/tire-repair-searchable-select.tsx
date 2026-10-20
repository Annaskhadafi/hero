'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SearchableSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  onAddNewManual?: () => void;
  addNewManualLabel?: string;
  triggerClassName?: string;
  uppercase?: boolean;
  disabled?: boolean;
  isMultiSelect?: boolean;
}

export function TireRepairSearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  onAddNewManual,
  addNewManualLabel = '+ Tambah Manual',
  triggerClassName,
  uppercase = false,
  disabled = false,
  isMultiSelect = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Multi-select selected items list
  const selectedItems = isMultiSelect && value
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleMultiItem = (opt: string) => {
    const exists = selectedItems.some(
      (item) => item.toLowerCase() === opt.toLowerCase()
    );
    let next: string[];
    if (exists) {
      next = selectedItems.filter(
        (item) => item.toLowerCase() !== opt.toLowerCase()
      );
    } else {
      next = [...selectedItems, opt];
    }
    onValueChange(next.join(', '));
  };

  // Deduplicate and filter options
  const uniqueOptions = Array.from(new Set(options.filter(Boolean)));
  const filteredOptions = uniqueOptions.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full min-w-0 justify-between rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold px-3 text-left shadow-2xs hover:bg-slate-100 transition-colors overflow-hidden',
            uppercase && 'uppercase',
            triggerClassName
          )}
        >
          <span className="truncate flex-1 min-w-0 block pr-1">
            {value ? (
              <span className="text-[#082033] font-bold truncate block">{value}</span>
            ) : (
              <span className="text-slate-400 font-normal truncate block">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-40 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[92vw] p-0 rounded-2xl shadow-xl border border-slate-200 bg-white z-50 overflow-hidden"
        align="start"
      >
        <div className="flex flex-col max-h-[320px]">
          {/* Multi-select Header summary */}
          {isMultiSelect && (
            <div className="bg-[#003f78] text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-bold">
              <span>{selectedItems.length} Manpower Terpilih</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[10px] transition-colors"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Live Search Input Box */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-hidden placeholder:text-slate-400 text-[#082033]"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-56 divide-y divide-slate-100">
            {/* Custom typed value option */}
            {query.trim() && !uniqueOptions.some((opt) => opt.toLowerCase() === query.trim().toLowerCase()) && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => {
                    const customVal = uppercase ? query.trim().toUpperCase() : query.trim();
                    if (isMultiSelect) {
                      toggleMultiItem(customVal);
                    } else {
                      onValueChange(customVal);
                      setOpen(false);
                    }
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Gunakan &quot;{query.trim()}&quot;</span>
                </button>
              </div>
            )}

            {/* Optional + Tambah Manual CTA */}
            {onAddNewManual && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    onAddNewManual();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addNewManualLabel}</span>
                </button>
              </div>
            )}

            {filteredOptions.length === 0 && !query.trim() ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada opsi tersedia
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Klik tombol di atas untuk menggunakan &quot;{query}&quot;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = isMultiSelect
                  ? selectedItems.some((item) => item.toLowerCase() === opt.toLowerCase())
                  : opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (isMultiSelect) {
                        toggleMultiItem(opt);
                      } else {
                        onValueChange(opt);
                        setOpen(false);
                        setQuery('');
                      }
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#e9f6fd] font-bold text-[#003f78]'
                        : 'text-[#082033] hover:bg-slate-50 font-medium'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isMultiSelect && (
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-[#003f78] border-[#003f78] text-white'
                              : 'border-slate-300 bg-white'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      )}
                      <span className={cn('truncate', uppercase && 'uppercase')}>{opt}</span>
                    </div>
                    {!isMultiSelect && isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#003f78] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}


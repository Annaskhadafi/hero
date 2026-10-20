"use client";

import * as React from "react";
import { Download, Printer, MapPin } from "lucide-react";

export function OsmPrintAction({ googleMapsUrl }: { googleMapsUrl?: string | null }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden no-print">
      {googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-800 bg-white/95 hover:bg-white border border-sky-300 rounded-xl shadow-lg transition-all hover:scale-105 backdrop-blur-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-sky-600" />
          <span>Buka Google Maps</span>
        </a>
      )}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xl transition-all hover:scale-105 cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <Printer className="w-3.5 h-3.5 opacity-80" />
        <span>Download / Cetak PDF</span>
      </button>
    </div>
  );
}

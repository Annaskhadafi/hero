'use client';

import React, { useState } from 'react';

export interface EvidencePhoto {
  url: string;
  itemName: string;
  index: number;
  totalItemPhotos: number;
  requestType: string;
}

export function ApdEvidencePhotos({ photos }: { photos: EvidencePhoto[] }) {
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});

  if (!photos || photos.length === 0) return null;

  return (
    <div className="mt-1 mb-2 p-2 border border-gray-400 rounded bg-gray-50/80">
      <div className="text-[7.5pt] font-bold text-gray-800 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span>Lampiran Foto Bukti Fisik (Barang Rusak / Pergantian)</span>
        </span>
        <span className="text-[6.5pt] font-normal text-gray-500">
          Total {photos.length} foto terlampir
        </span>
      </div>
      <div className="flex flex-wrap gap-3 items-start">
        {photos.map((photo, idx) => {
          const isFailed = failedIndices[idx];
          return (
            <div key={idx} className="flex flex-col items-center bg-white p-1 rounded border border-gray-300 shadow-xs relative">
              <div className="h-24 w-32 relative rounded overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                {!isFailed ? (
                  <img
                    src={photo.url}
                    alt={`Bukti ${photo.itemName}`}
                    className="h-full w-full object-cover rounded"
                    onError={() => {
                      setFailedIndices((prev) => ({ ...prev, [idx]: true }));
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 text-center p-2">
                    <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[6.5pt] font-medium text-gray-500">Foto Tidak Tersedia</span>
                  </div>
                )}
              </div>
              <span className="text-[7pt] font-semibold text-gray-800 mt-1 max-w-[128px] truncate text-center">
                {photo.itemName} {photo.totalItemPhotos > 1 ? `(#${photo.index})` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

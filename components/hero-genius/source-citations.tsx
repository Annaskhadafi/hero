"use client";

import { useState } from "react";
import { FileText, Eye, BookOpen, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentPreviewModal } from "./document-preview-modal";
import { resolveRagDocumentUrl, type RagSourceItem } from "@/lib/hero-genius/client";

interface SourceCitationsProps {
  sources?: RagSourceItem[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [selectedSource, setSelectedSource] = useState<RagSourceItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ filename: string; url: string } | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
        <BookOpen className="size-3" />
        Sumber:
      </span>
      {sources.map((src, idx) => {
        const scorePercent = Math.round((src.similarity_score || 0) * 100);
        const isWebDoc =
          src.filename.endsWith(".md") ||
          (src.content && src.content.includes("[Sumber]: http"));

        return (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedSource(src)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              isWebDoc
                ? "border-blue-200 bg-blue-50/90 text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-sky-200 bg-sky-50/80 text-sky-800 hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
            }`}
          >
            {isWebDoc ? (
              <Globe className="size-3 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileText className="size-3 text-sky-600 dark:text-sky-400" />
            )}
            <span className="max-w-[140px] truncate">{src.filename}</span>
            <Badge
              variant="outline"
              className="h-4 border-sky-300 bg-white/80 px-1 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300"
            >
              {scorePercent}%
            </Badge>
          </button>
        );
      })}

      {/* Source Detail Modal */}
      <Dialog open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              {selectedSource?.filename.endsWith(".md") ? (
                <Globe className="size-4 text-blue-600" />
              ) : (
                <FileText className="size-4 text-sky-600" />
              )}
              Detail Sumber Dokumen
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informasi chunk referensi yang digunakan oleh Hero Genius AI.
            </DialogDescription>
          </DialogHeader>

          {selectedSource && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/70 dark:bg-slate-900 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Nama File:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
                    {selectedSource.filename}
                  </span>
                </div>
                {selectedSource.heading && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Heading / Bab:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedSource.heading}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Similarity Score:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    {(selectedSource.similarity_score * 100).toFixed(1)}% Match
                  </Badge>
                </div>

                {/* Extract Web Source URL if available in chunk */}
                {(() => {
                  const urlMatch = selectedSource.content?.match(
                    /\[Sumber\]:\s*(https?:\/\/[^\s\n\r]+)/i
                  );
                  const webUrl = urlMatch ? urlMatch[1] : null;

                  if (webUrl) {
                    return (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Globe className="size-3 text-blue-500" />
                          Web Asli:
                        </span>
                        <a
                          href={webUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium truncate max-w-[280px]"
                        >
                          {webUrl}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedSource.s3_url && (
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <Button
                      type="button"
                      onClick={() => {
                        setPreviewDoc({
                          filename: selectedSource.filename,
                          url: selectedSource.s3_url!,
                        });
                      }}
                      className="w-full h-9 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Eye className="size-4" />
                      Pratinjau Dokumen Asli (Read-Only)
                    </Button>
                  </div>
                )}
              </div>

              {selectedSource.content && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Cuplikan Teks (Chunk Content):
                  </label>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 font-mono">
                    {selectedSource.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Document Read-Only Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          filename={previewDoc.filename}
          url={previewDoc.url}
        />
      )}
    </div>
  );
}

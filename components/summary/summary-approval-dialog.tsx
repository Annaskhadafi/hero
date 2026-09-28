'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/signature-pad';
import { toast } from 'sonner';

type Props = {
  summaryId: number;
  summaryNumber: string;
  onSubmit: (signatureUrl: string) => Promise<void>;
  onClose: () => void;
};

export function SummaryApprovalDialog({ summaryId, summaryNumber, onSubmit, onClose }: Props) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signatureUrl) {
      toast.error('Silakan sediakan tanda tangan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(signatureUrl);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
                Diajukan Oleh
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">{summaryNumber}</span>
            </div>
            <h3 className="mt-1 text-base font-black text-slate-900">Tanda Tangan &amp; Submit</h3>
            <p className="text-xs text-slate-500">Tanda tangan resmi pembuat Summary APD.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <SignaturePad
            label="Tanda Tangan Digital Pengaju"
            onDataUrlChange={setSignatureUrl}
            height={140}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Batal
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !signatureUrl}
            className="bg-[#003461] hover:bg-[#002647] text-white text-xs font-bold shadow-xs px-4 h-9 rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Submit Dokumen</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

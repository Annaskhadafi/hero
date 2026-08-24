'use client';

import { useRef, useState } from 'react';

type Props = {
  summaryId: number;
  summaryNumber: string;
  onSubmit: (signatureUrl: string) => Promise<void>;
  onClose: () => void;
};

export function SummaryApprovalDialog({ summaryId, summaryNumber, onSubmit, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = async () => {
    if (!hasDrawn) {
      alert('Silakan tanda tangan terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const signatureUrl = canvas.toDataURL('image/png');
      await onSubmit(signatureUrl);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">Tanda Tangan & Submit</h3>
          <p className="text-sm text-gray-600 mt-1">Summary: {summaryNumber}</p>
          <p className="text-sm text-gray-600">Silakan tanda tangan sebagai "Diajukan Oleh"</p>
        </div>

        <div className="p-6">
          <div className="border-2 border-dashed rounded-lg p-2 mb-4">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full cursor-crosshair bg-white"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <button
            onClick={clearCanvas}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Hapus Tanda Tangan
          </button>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasDrawn}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Submit Summary'}
          </button>
        </div>
      </div>
    </div>
  );
}

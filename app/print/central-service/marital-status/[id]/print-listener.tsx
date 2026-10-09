'use client';

import { useEffect } from 'react';

export function MaritalStatusPrintListener({ hasExistingSignature }: { hasExistingSignature: boolean }) {
  useEffect(() => {
    // Notify parent window that print listener is ready to receive messages
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'maritalPrintReady' }, '*');
      } catch (e) {}
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'previewSignature') {
        const dataUrl = event.data.dataUrl;
        const level = event.data.level ? Number(event.data.level) : 2;

        const atasanContainer = document.getElementById('atasan-sig-container');
        const mengetahuiContainer = document.getElementById('mengetahui-sig-container');

        const targetContainer = (level === 1 && mengetahuiContainer) ? mengetahuiContainer : atasanContainer;

        if (targetContainer) {
          if (dataUrl) {
            targetContainer.innerHTML = `<img src="${dataUrl}" alt="Live Signature" style="max-height: 48px; object-fit: contain;" />`;
          } else if (!hasExistingSignature) {
            targetContainer.innerHTML = `<div class="text-black text-[8pt] italic">(Belum TTD)</div>`;
          }
        }
      }

      if (event.data.type === 'previewDecision') {
        const decision = event.data.decision;
        const boxApproved = document.getElementById('box-menyetujui');
        const boxRejected = document.getElementById('box-tidak-menyetujui');
        const statusText = document.getElementById('status-proses-text');
        if (boxApproved && boxRejected) {
          if (decision === 'approved') {
            boxApproved.textContent = '✓';
            boxRejected.textContent = '';
            if (statusText) statusText.classList.add('hidden');
          } else if (decision === 'rejected' || decision === 'reverted') {
            boxApproved.textContent = '';
            boxRejected.textContent = '✓';
            if (statusText) statusText.classList.add('hidden');
          }
        }
      }

      if (event.data.type === 'previewNote') {
        const note = event.data.note;
        const catatanEl = document.getElementById('preview-catatan-atasan');
        if (catatanEl && note !== undefined) {
          catatanEl.textContent = note || '-';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [hasExistingSignature]);

  return null;
}

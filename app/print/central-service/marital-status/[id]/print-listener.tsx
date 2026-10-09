'use client';

import { useEffect } from 'react';

export function MaritalStatusPrintListener({
  hasExistingSignature,
  isEmbed,
}: {
  hasExistingSignature: boolean;
  isEmbed?: boolean;
}) {
  useEffect(() => {
    if (!isEmbed) return;

    function autoFitEmbedDoc() {
      const wrapper = document.querySelector('.pdf-wrapper') as HTMLElement;
      if (!wrapper) return;
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const baseWidth = wrapper.offsetWidth || 794;
      const baseHeight = wrapper.offsetHeight || 1123;
      if (containerWidth <= 0 || containerHeight <= 0) return;
      const scaleX = containerWidth / baseWidth;
      const scaleY = containerHeight / baseHeight;
      const scale = Math.min(scaleX, scaleY);
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.transform = `scale(${scale})`;
    }

    autoFitEmbedDoc();
    window.addEventListener('resize', autoFitEmbedDoc);
    const t1 = setTimeout(autoFitEmbedDoc, 50);
    const t2 = setTimeout(autoFitEmbedDoc, 250);

    return () => {
      window.removeEventListener('resize', autoFitEmbedDoc);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isEmbed]);

  useEffect(() => {
    // Notify parent window that print listener is ready to receive messages
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'maritalPrintReady' }, '*');
      } catch (e) {}
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const level = event.data.level ? Number(event.data.level) : 2;

      if (event.data.type === 'previewSignature') {
        const dataUrl = event.data.dataUrl;

        const atasanContainer = document.getElementById('atasan-sig-container');
        const hrContainer = document.getElementById('hr-sig-container');
        const mengetahuiContainer = document.getElementById('mengetahui-sig-container');

        let targetContainer = atasanContainer;
        if (level === 1 && mengetahuiContainer) targetContainer = mengetahuiContainer;
        if (level === 3 && hrContainer) targetContainer = hrContainer;

        if (targetContainer) {
          if (dataUrl) {
            targetContainer.innerHTML = `<img src="${dataUrl}" alt="Live Signature" style="max-height: 26px; width: auto; object-fit: contain;" />`;
          } else if (!hasExistingSignature) {
            targetContainer.innerHTML = '';
          }
        }
      }

      if (event.data.type === 'previewNote') {
        const note = event.data.note;
        const targetId = level === 3 ? 'preview-catatan-hr' : 'preview-catatan-atasan';
        const catatanEl = document.getElementById(targetId);
        if (catatanEl && note !== undefined) {
          const trimmed = (note || '').trim();
          catatanEl.textContent = trimmed && trimmed !== '-' ? trimmed : '';
        }
      }

      if (event.data.type === 'previewDecision') {
        const decision = event.data.decision;
        const targetDateId = level === 3 ? 'preview-hr-date' : 'preview-atasan-date';
        const dateEl = document.getElementById(targetDateId);
        if (dateEl) {
          if (decision === 'approved' && !dateEl.textContent?.trim()) {
            const today = new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: '2-digit',
            });
            dateEl.textContent = today;
          }
        }
      }

      if (event.data.type === 'previewLiveDraft') {
        const d = event.data;
        if (d.employeeName !== undefined) {
          const el = document.getElementById('preview-emp-name');
          if (el) el.textContent = `: ${d.employeeName || '-'}`;
        }
        if (d.employeeSn !== undefined) {
          const el = document.getElementById('preview-emp-sn');
          if (el) el.textContent = d.employeeSn || '-';
        }
        if (d.employeeJobTitle !== undefined) {
          const el = document.getElementById('preview-emp-job');
          if (el) el.textContent = `: ${d.employeeJobTitle || '-'}`;
        }
        if (d.departmentSection !== undefined) {
          const el = document.getElementById('preview-emp-dept-sec');
          if (el) el.textContent = `: ${d.departmentSection || '-'}`;
        }
        if (d.siteName !== undefined) {
          const el = document.getElementById('preview-emp-site');
          if (el) el.textContent = `: ${d.siteName || '-'}`;
        }
        if (d.currentMaritalStatus !== undefined) {
          const el = document.getElementById('preview-current-status');
          if (el) el.textContent = `: ${d.currentMaritalStatus || '-'}`;
        }
        if (d.targetMaritalStatus !== undefined) {
          const el = document.getElementById('preview-target-status');
          if (el) el.textContent = `: ${d.targetMaritalStatus || '-'}`;
        }
        if (d.reason !== undefined) {
          const el = document.getElementById('preview-reason');
          if (el) el.textContent = d.reason || '-';
        }
        if (d.approver1Name !== undefined) {
          const el = document.getElementById('preview-approver1-name');
          if (el) el.textContent = d.approver1Name || 'PJO / HSE / Leader';
        }
        if (d.approver1Job !== undefined) {
          const el = document.getElementById('preview-approver1-job');
          if (el) el.textContent = d.approver1Job || 'PJO / HSE / Leader';
        }
        if (d.approver2Name !== undefined) {
          const el = document.getElementById('preview-atasan-name') || document.getElementById('preview-approver2-name');
          if (el) el.textContent = d.approver2Name || '—';
        }
        if (d.approver2Job !== undefined) {
          const el = document.getElementById('preview-atasan-job') || document.getElementById('preview-approver2-job');
          if (el) el.textContent = d.approver2Job || 'Atasan Langsung';
        }
        if (d.approver3Name !== undefined) {
          const el = document.getElementById('preview-hr-name') || document.getElementById('preview-approver3-name');
          if (el) el.textContent = d.approver3Name || '—';
        }
        if (d.approver3Job !== undefined) {
          const el = document.getElementById('preview-hr-job') || document.getElementById('preview-approver3-job');
          if (el) el.textContent = d.approver3Job || 'Human Resources';
        }
        if (d.submitterJob !== undefined) {
          const el = document.getElementById('preview-submitter-job');
          if (el) el.textContent = d.submitterJob || 'Karyawan';
        }
        if (d.signatureUrl !== undefined) {
          const container = document.getElementById('preview-submitter-sig');
          if (container) {
            if (d.signatureUrl) {
              container.innerHTML = `<img src="${d.signatureUrl}" alt="Signature Karyawan" style="max-height: 45px; object-fit: contain;" />`;
            } else {
              container.innerHTML = `<div className="text-black text-[8pt] italic">(Tanda Tangan)</div>`;
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [hasExistingSignature]);

  return null;
}



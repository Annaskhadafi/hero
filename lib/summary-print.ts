/**
 * Shared client helper to print a Summary APD document cleanly via an isolated iframe.
 * Guards against duplicate print triggers and removes the temporary iframe after printing
 * so subsequent browser prints never render a stale second copy.
 */
export function printSummaryInPlace(summaryId: number, onFinish?: () => void): void {
  if (typeof document === 'undefined') {
    onFinish?.();
    return;
  }

  const existing = document.getElementById('summary-print-iframe');
  if (existing) {
    existing.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'summary-print-iframe';
  iframe.title = `Cetak Summary APD #${summaryId}`;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '297mm';
  iframe.style.height = '210mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  let hasPrinted = false;
  let finished = false;
  let fallbackCleanupTimer: number | null = null;
  let loadFallbackTimer: number | null = null;

  const notifyFinish = () => {
    if (finished) return;
    finished = true;
    onFinish?.();
  };

  const cleanupIframe = () => {
    if (fallbackCleanupTimer !== null) {
      window.clearTimeout(fallbackCleanupTimer);
      fallbackCleanupTimer = null;
    }
    if (loadFallbackTimer !== null) {
      window.clearTimeout(loadFallbackTimer);
      loadFallbackTimer = null;
    }
    if (iframe.parentNode) {
      iframe.remove();
    }
    notifyFinish();
  };

  const waitForReadyAndPrint = async () => {
    if (hasPrinted) return;
    hasPrinted = true;

    try {
      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframeWindow?.document;

      if (iframeDoc?.fonts?.ready) {
        await Promise.race([
          iframeDoc.fonts.ready,
          new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
        ]);
      }

      if (iframeDoc) {
        const pendingImages = Array.from(iframeDoc.images).filter((img) => !img.complete);
        if (pendingImages.length > 0) {
          await Promise.race([
            Promise.all(
              pendingImages.map(
                (img) =>
                  new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                  })
              )
            ),
            new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
          ]);
        }
      }

      await new Promise<void>((resolve) => window.setTimeout(resolve, 150));

      if (iframeWindow) {
        iframeWindow.addEventListener('afterprint', cleanupIframe, { once: true });
        // Safety fallback if browser does not fire afterprint on closed/cancelled dialog
        fallbackCleanupTimer = window.setTimeout(cleanupIframe, 60_000);
        iframeWindow.focus();
        iframeWindow.print();
      } else {
        cleanupIframe();
      }
    } catch (err) {
      console.error('Failed to print iframe:', err);
      cleanupIframe();
    } finally {
      notifyFinish();
    }
  };

  iframe.onload = () => {
    void waitForReadyAndPrint();
  };

  iframe.onerror = () => {
    cleanupIframe();
  };

  // Fallback unlock in case iframe load stalls
  loadFallbackTimer = window.setTimeout(() => {
    if (!hasPrinted) {
      notifyFinish();
    }
  }, 10_000);

  iframe.src = `/print/summary/${summaryId}?printOnly=1`;
  document.body.appendChild(iframe);
}


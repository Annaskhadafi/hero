"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function BusinessCardQr({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 4, color: { dark: "#0f172a", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [value, size]);

  return dataUrl
    ? <img src={dataUrl} width={size} height={size} alt="Scan to open this digital business card" className="h-auto max-w-full" />
    : <div role="status" className="text-sm text-slate-600">Preparing QR code…</div>;
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function BusinessCardQr({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#0f172a", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [value, size]);

  return dataUrl
    ? <img src={dataUrl} width={size} height={size} alt="Scan untuk membuka business card" className="size-30 rounded-lg" />
    : <div role="img" aria-label="QR code sedang dibuat" className="size-30 animate-pulse rounded-lg bg-slate-100" />;
}

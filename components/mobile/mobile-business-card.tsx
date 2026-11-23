"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDownToLine, Copy, QrCode, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessCardQr } from "@/components/mobile/business-card-qr";
import { toggleBusinessCardSharingAction } from "@/app/mobile/profile/actions";

const PUBLIC_DOMAIN = "https://hero.chitraparatama.com";

type Props = {
  name: string;
  title: string;
  email: string;
  phone: string;
  enabled: boolean;
  token: string | null;
};

export function MobileBusinessCard({ name, title, email, phone, enabled, token }: Props) {
  const [open, setOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [publicToken, setPublicToken] = useState(token);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const cardUrl = useMemo(
    () => (publicToken ? `${PUBLIC_DOMAIN}/business-card/${publicToken}` : ""),
    [publicToken]
  );

  function toggleSharing(next: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await toggleBusinessCardSharingAction(next);
      setMessage(result.message);
      if (result.ok) {
        setIsEnabled(next);
        if (result.token) setPublicToken(result.token);
      }
    });
  }

  async function copyLink() {
    if (!cardUrl) return;
    await navigator.clipboard.writeText(cardUrl);
    setMessage("Link kartu berhasil disalin.");
  }

  const hue = name.split("").reduce((n, char) => n + char.charCodeAt(0), 0) % 360;
  const backgroundStyle = { background: `radial-gradient(ellipse at 15% 0%, hsla(${hue},90%,62%,.45), transparent 45%), radial-gradient(ellipse at 100% 95%, hsla(${(hue + 78) % 360},85%,58%,.32), transparent 42%), linear-gradient(145deg,#081329,#101b36 60%,#111128)` };

  return <>
    <Button type="button" className="min-h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 font-semibold text-white" onClick={() => setOpen(true)}>
      <Share2 className="size-4" /> E-Business Card <QrCode className="ml-auto size-4 opacity-80" />
    </Button>
    {open ? <div className="fixed inset-0 z-[90] overflow-y-auto text-white" style={backgroundStyle}>
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-5 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-blue-200">HERO Digital Identity</p><p className="mt-1 text-xs text-white/60">Your contact, beautifully shared</p></div>
        <button type="button" aria-label="Tutup kartu" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/10"><X className="size-5" /></button>
      </header>
      <main className="mx-auto w-full max-w-lg px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <article className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[.08] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div aria-hidden className="absolute -right-16 top-16 size-56 rounded-full border border-white/10" />
          <div className="relative mb-8 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[.28em] text-blue-100">HERO</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-wide">BUSINESS CARD</span></div>
          <div className="relative mb-5 flex size-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-white/35 to-white/5 text-3xl font-black shadow-lg ring-1 ring-white/20">{name.trim().split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</div>
          <h1 className="relative text-3xl font-bold leading-tight tracking-tight">{name}</h1>
          <p className="relative mt-2 text-base font-medium text-blue-100">{title}</p>
          <div className="relative mt-7 space-y-3 border-t border-white/10 pt-5">
            <a href={`mailto:${email}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[.07] px-4 text-sm"><span className="text-lg text-blue-200">✉</span><span className="break-all">{email}</span></a>
            {phone ? <a href={`tel:${phone}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[.07] px-4 text-sm"><span className="text-lg text-blue-200">⌕</span>{phone}</a> : null}
          </div>
          {isEnabled && publicToken ? <>
            <div className="relative mt-6 flex items-center gap-4 rounded-2xl bg-white p-4 text-slate-900">
              <BusinessCardQr value={cardUrl} size={108} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Scan to connect</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Pindai QR untuk melihat kartu dan menyimpan kontak.</p>
                <p className="mt-1 font-mono text-[10px] text-blue-700 truncate">{cardUrl}</p>
              </div>
            </div>
            <a href={`/business-card/${publicToken}/contact.vcf`} className="relative mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-bold shadow-lg"><ArrowDownToLine className="size-4" /> Add to Contacts</a>
            <button type="button" onClick={copyLink} disabled={!cardUrl} className="relative mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.07] text-sm font-semibold disabled:opacity-50"><Copy className="size-4" /> Salin link kartu</button>
          </> : <p className="relative mt-5 rounded-xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-xs leading-5 text-amber-50">Aktifkan berbagi di bawah untuk membuat QR dan link kontak publik.</p>}
          <p className="relative mt-5 text-center text-[10px] text-white/45">PT Chitra Paratama · Contact information shared with your permission</p>
        </article>
        <section className="mt-5 rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <input id="business-card-sharing" type="checkbox" checked={isEnabled} disabled={pending} onChange={(event) => toggleSharing(event.target.checked)} className="mt-1 size-5 accent-blue-500" />
            <label htmlFor="business-card-sharing" className="flex-1"><span className="block text-sm font-bold">Bagikan kartu saya</span><span className="mt-1 block text-xs leading-5 text-white/65">Jika aktif, siapa pun yang memiliki link/QR dapat melihat nama, jabatan, email dan nomor telepon kerja. Anda dapat menonaktifkan kapan saja.</span></label>
          </div>
          {message ? <p role="status" className="mt-3 text-xs text-blue-100">{message}</p> : null}
          {pending ? <p className="mt-3 text-xs text-white/60">Menyimpan...</p> : null}
        </section>
      </main>
    </div> : null}
  </>;
}

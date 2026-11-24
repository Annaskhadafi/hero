"use client";

import { useState, type ReactNode } from "react";
import { Download, ExternalLink, MapPin, Phone, QrCode } from "lucide-react";
import { HeroDetailModal } from "@/components/templates";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessCardQr } from "./business-card-qr";
import { EmployeeEcardCompany, EmployeeEcardGallery } from "./employee-ecard-company";

type Props = { name: string; title: string; email: string; phone: string; cardUrl?: string; contactUrl?: string; ownerControls?: ReactNode; headingLevel?: 1 | 2 };
const companyWebsite = "https://www.chitraparatama.co.id/";
const mapsUrl = "https://www.google.com/maps/search/?api=1&query=PT%20Chitra%20Paratama%20Gedung%20TMT%201%20Cilandak%20KKO%20Jakarta%2012560";

export function EmployeeEcard({ name, title, email, phone, cardUrl, contactUrl, ownerControls, headingLevel = 1 }: Props) {
  const [showQr, setShowQr] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase();
  const Heading = headingLevel === 2 ? "h2" : "h1";
  const contactRow = "flex min-h-11 min-w-0 items-center gap-3 border-b border-[#e7dece] py-2 text-sm font-medium hover:underline";
  const tab = "min-w-0 rounded-none px-2 text-[#48586a] data-[state=active]:border-b-2 data-[state=active]:border-[#936d33] data-[state=active]:bg-transparent data-[state=active]:text-[#0d1e33] data-[state=active]:shadow-none";
  return <article className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-[#faf8f3] text-[#0d1e33]">
    <header className="bg-[#0d1e33] px-4 pb-5 pt-4 text-white sm:px-6">
      <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-4">
        {/* Corporate artwork is a bundled public asset, not an employee upload. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/Chitra-Paratama.png" alt="Chitra Paratama" width={92} height={38} className="rounded bg-white px-1" />
        <span className="text-right text-[10px] uppercase tracking-[.18em] text-[#e7c990]">E-Business Card</span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border border-[#e7c990] bg-[#1e354e] font-serif text-xl text-[#e7c990]">{initials}</span>
        <div className="min-w-0">
          <Heading className="break-words text-balance font-serif text-[clamp(1.5rem,7vw,2.25rem)] leading-tight [overflow-wrap:anywhere]">{name}</Heading>
          {title && <p className="break-words text-sm text-[#eee7d9]">{title}</p>}
          <p className="mt-1 text-xs text-[#e7c990]">PT Chitra Paratama</p>
        </div>
      </div>
      {ownerControls && <div className="mt-4">{ownerControls}</div>}
      {cardUrl && contactUrl && <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild className="h-9 min-w-0 bg-[#e7c990] px-2 text-[#0d1e33] hover:bg-[#f0d9ab]"><a href={contactUrl}><Download aria-hidden className="size-4" /> Save Contact</a></Button>
        <Button type="button" variant="outline" className="h-9 min-w-0 border-[#e7c990] bg-transparent px-2 text-[#e7c990] hover:bg-[#263b50] hover:text-white" onClick={() => setShowQr(true)}><QrCode aria-hidden className="size-4" /> Show QR</Button>
      </div>}
    </header>
    <Tabs defaultValue="contact" className="gap-0">
      <TabsList aria-label="Profile sections" className="grid w-full grid-cols-3 rounded-none border-b border-[#e7dece] bg-transparent px-3 shadow-none">
        <TabsTrigger value="contact" className={tab}>Contact</TabsTrigger>
        <TabsTrigger value="company" className={tab}>Company</TabsTrigger>
        <TabsTrigger value="gallery" className={tab}>Gallery</TabsTrigger>
      </TabsList>
      <TabsContent value="contact" className="px-4 py-3 sm:px-6">
        {email && <a className={contactRow} href={`mailto:${email}`}><span className="min-w-0 break-all">{email}</span></a>}
        {phone && <a className={contactRow} href={`tel:${phone}`}><Phone aria-hidden className="size-4 shrink-0" /> {phone}</a>}
        <a className={contactRow} href={mapsUrl} target="_blank" rel="noreferrer"><MapPin aria-hidden className="size-4 shrink-0" /><span>Head Office <span className="block text-xs font-normal text-[#48586a]">Gedung TMT 1, 5th Floor, Suite 502<br />Jl. Cilandak KKO No. 1, Jakarta 12560</span></span></a>
        <a className={contactRow} href="tel:+622129976661"><Phone aria-hidden className="size-4 shrink-0" /> +62 21 2997 6661</a>
        <a className={contactRow} href={companyWebsite} rel="noreferrer" target="_blank"><ExternalLink aria-hidden className="size-4 shrink-0" /> chitraparatama.co.id</a>
      </TabsContent>
      <TabsContent value="company" className="px-4 py-4 sm:px-6"><EmployeeEcardCompany /></TabsContent>
      <TabsContent value="gallery" className="px-4 py-4 sm:px-6"><EmployeeEcardGallery /></TabsContent>
    </Tabs>
    {cardUrl && <HeroDetailModal open={showQr} onOpenChange={setShowQr} title="E-card QR Code" subtitle="Scan to open this digital business card.">
      <div className="grid justify-items-center gap-3"><BusinessCardQr key={cardUrl} value={cardUrl} size={200} /><a className="break-all text-center text-sm text-blue-800 underline" href={cardUrl} rel="noreferrer">{cardUrl}</a></div>
    </HeroDetailModal>}
  </article>;
}

'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

const ASSET = '/brand/employee-ecard'
const PHOTO_CREDIT = 'Photos: Chitra Paratama’s official MahaDasha company profile'

const operationsPhotos = [
  { src: `${ASSET}/web-slide-1.webp`, alt: 'Technician inspecting heavy equipment', caption: 'Technical team on site' },
  { src: `${ASSET}/web-slide-2.webp`, alt: 'Technician working on an earthmover tire', caption: 'Heavy-equipment tire operations' },
  { src: `${ASSET}/web-slide-3.webp`, alt: 'Earthmover tire mounted on workshop equipment', caption: 'Workshop service' },
]

const products = [
  {
    name: 'Michelin Earthmover Tires', model: 'XDR3 · Rigid dump trucks', image: 'product-0.webp', alt: 'Michelin Earthmover tire, manufacturer reference image',
    description: 'An off-the-road mining tire for rigid dump trucks. Michelin lists sizes including 27.00R49 and 59/80R63; select size and compound for the fleet’s operating conditions.',
    source: 'https://business.michelinman.com/tires/michelin-xdr3', sourceLabel: 'Michelin reference',
  },
  {
    name: 'Industrial Wheels & Rims', model: 'Jantsa · Industrial wheels', image: 'product-1.webp', alt: 'Industrial wheels and rims, manufacturer reference image',
    description: 'Wheel and rim options for earthmoving and mining equipment. Confirm wheel dimensions, load rating, and fitment for the vehicle and tire.',
    source: 'https://jantsa.com/industrial', sourceLabel: 'Jantsa reference',
  },
  {
    name: 'IMT TireHand®', model: 'IMT · Tire manipulator', image: 'product-2.webp', alt: 'IMT TireHand tire manipulator, manufacturer reference image',
    description: 'A tire-handling attachment designed to position large off-road tires during removal and installation. Match the configuration to the tire and carrier.',
    source: 'https://imt.com/product/tire-manipulator/tirehand/', sourceLabel: 'IMT reference',
  },
  {
    name: 'Tire Tools & Accessories', model: 'Haltec · Automatic inflation', image: 'product-3.webp', alt: 'Haltec tire service equipment, manufacturer reference image',
    description: 'An example of Haltec’s mining tire service equipment. The range includes automatic inflators, pressure gauges, and tire service hardware.',
    source: 'https://www.haltec.com/pc/Mining-Solutions-d8.htm', sourceLabel: 'Haltec reference',
  },
]

const services = [
  ['Tire Repair', 'Repair services for heavy-equipment tires.'],
  ['Tire Retreading', 'Retreading to extend tire service life.'],
  ['Tire Management', 'On-site maintenance and fleet tire management through Chitra Tire System (CTS).'],
  ['Pressure Monitoring', 'Tire pressure tracking with Smart Pressure Monitoring (SPM).'],
]

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>
}

export function EmployeeEcardCompany() {
  const [slide, setSlide] = useState(0)
  const photo = operationsPhotos[slide]
  return (
    <section aria-labelledby="ecard-company-title" className="space-y-5 text-slate-800">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-amber-800">Heavy equipment tire solutions</p>
        <h2 id="ecard-company-title" className="mt-1 text-lg font-bold text-slate-950">Chitra Paratama</h2>
      </header>

      <section aria-label="Chitra operations photos" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-white">
        <figure className="m-0">
          <img className="block aspect-[2.25/1] w-full object-cover" src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
          <figcaption className="px-3 pt-2 text-xs text-white/85">{photo.caption}</figcaption>
        </figure>
        <div className="flex items-center justify-between px-2 py-1">
          <Button type="button" variant="ghost" size="denseIcon" className="text-amber-300 hover:bg-white/10" aria-label="Previous photo" onClick={() => setSlide((slide + operationsPhotos.length - 1) % operationsPhotos.length)}>‹</Button>
          <span aria-live="polite" aria-atomic="true" className="text-xs text-amber-200">{slide + 1} / {operationsPhotos.length}</span>
          <Button type="button" variant="ghost" size="denseIcon" className="text-amber-300 hover:bg-white/10" aria-label="Next photo" onClick={() => setSlide((slide + 1) % operationsPhotos.length)}>›</Button>
        </div>
      </section>
      <ExternalLink className="inline-block text-xs font-medium text-amber-900 underline underline-offset-2" href="https://www.mahadasha.co.id/pt-chitra-paratama">{PHOTO_CREDIT} ↗</ExternalLink>

      <h3 className="pt-2 text-sm font-bold uppercase tracking-wide text-slate-900">Product Lines</h3>
      <div className="grid grid-cols-2 gap-2">
        {products.map((product) => (
          <details key={product.name} className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white open:border-amber-700/50">
            <summary className="min-h-11 cursor-pointer list-none p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 [&::-webkit-details-marker]:hidden">
              <img className="mb-2 block aspect-[1.2/1] w-full border-b border-slate-100 bg-amber-50/30 object-contain" src={`${ASSET}/${product.image}`} alt={product.alt} loading="lazy" decoding="async" />
              <span className="flex items-start gap-1.5"><span className="min-w-0 flex-1"><strong className="block text-xs leading-4 text-slate-900">{product.name}</strong><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{product.model}</span></span><span aria-hidden="true" className="text-amber-800 group-open:hidden">＋</span><span aria-hidden="true" className="hidden text-amber-800 group-open:inline">−</span></span>
            </summary>
            <div className="space-y-2 px-2.5 pb-3 text-xs leading-5 text-slate-600">
              <p>{product.description}</p>
              <ExternalLink className="inline-block font-medium text-amber-900 underline underline-offset-2" href={product.source}>{product.sourceLabel} ↗</ExternalLink>
            </div>
          </details>
        ))}
      </div>
      <p className="text-[11px] leading-4 text-slate-500">Products shown are manufacturer examples, not a statement of current stock or availability. Confirm specifications and availability with Chitra.</p>

      <h3 className="pt-2 text-sm font-bold uppercase tracking-wide text-slate-900">Services</h3>
      <div className="grid grid-cols-2 gap-2">
        {services.map(([name, description]) => <details key={name} className="group rounded-xl border border-slate-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 p-3 text-xs font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className="text-amber-800">✦</span><span className="flex-1">{name}</span><span aria-hidden="true" className="text-amber-800 group-open:rotate-45">＋</span></summary>
          <p className="px-3 pb-3 text-xs leading-5 text-slate-600">{description}</p>
        </details>)}
      </div>

    </section>
  )
}

export function EmployeeEcardGallery() {
  const [instagramEnabled, setInstagramEnabled] = useState(false)
  return (
      <section aria-labelledby="ecard-instagram-title" className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 id="ecard-instagram-title" className="font-semibold text-slate-950">Instagram</h3>
        <p className="mt-1 text-sm leading-5 text-slate-600">Preview the official Chitra Paratama account. Instagram content is loaded only after you choose to view it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="dense" variant="outline" aria-expanded={instagramEnabled} onClick={() => setInstagramEnabled(v => !v)}>{instagramEnabled ? "Close Instagram preview" : "Load Instagram preview"}</Button>
          <ExternalLink className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-amber-900 underline underline-offset-2" href="https://www.instagram.com/chitraparatama_id/">Open Instagram profile ↗</ExternalLink>
          <ExternalLink href="https://www.instagram.com/p/DbfgJgvD6l1/">Mining Tire Solutions ↗</ExternalLink>
          <ExternalLink href="https://www.instagram.com/reel/DO05eGRDwhk/">Mining Expo 2025 ↗</ExternalLink>
        </div>
        {instagramEnabled && <iframe className="mt-3 h-[430px] w-full rounded-lg border border-slate-200" title="Official Chitra Paratama Instagram profile" src="https://www.instagram.com/chitraparatama_id/embed/" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write; encrypted-media; picture-in-picture; web-share" />}
        <noscript><a href="https://www.instagram.com/chitraparatama_id/" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open the official Instagram profile</a></noscript>
      </section>
  )
}

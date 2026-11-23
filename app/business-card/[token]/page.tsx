import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowDownToLine, Mail, Phone, UserRound } from "lucide-react";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { BusinessCardQr } from "@/components/mobile/business-card-qr";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PublicBusinessCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{64}$/.test(token)) notFound();

  const [employee] = await db.select({
    name: employees.name,
    jobTitle: employees.jobTitle,
    role: employees.role,
    email: employees.email,
    phoneNumber: employees.phoneNumber,
    publicToken: employees.businessCardPublicToken,
    sharingEnabled: employees.businessCardPublicEnabled,
    isActive: employees.isActive,
  }).from(employees).where(eq(employees.businessCardPublicToken, token)).limit(1);

  if (!employee || !employee.publicToken || !employee.sharingEnabled || !employee.isActive) notFound();

  const publicBaseUrl = "https://hero.chitraparatama.com";
  const cardUrl = `${publicBaseUrl}/business-card/${token}`;
  const contactUrl = `/business-card/${token}/contact.vcf`;
  const title = employee.jobTitle || employee.role;

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#081329] px-5 py-10 text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(30,120,255,.45),transparent_45%),radial-gradient(ellipse_at_90%_80%,rgba(139,92,246,.32),transparent_40%)]" />
      <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
      <div aria-hidden className="absolute -bottom-32 -left-24 size-96 rounded-full border border-white/10" />
      <article className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.09] p-7 shadow-2xl shadow-blue-950/50 backdrop-blur-xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-[.28em] text-blue-200">HERO · BUSINESS CARD</div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold text-emerald-200">CONTACT</span>
        </div>
        <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-300 to-indigo-500 shadow-lg shadow-blue-950/40">
          <UserRound className="size-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
        <p className="mt-2 text-base font-medium text-blue-100">{title}</p>
        <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
          <a href={`mailto:${employee.email}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[0.06] px-4 text-sm hover:bg-white/10"><Mail className="size-4 text-blue-200" /> <span className="break-all">{employee.email}</span></a>
          {employee.phoneNumber ? <a href={`tel:${employee.phoneNumber}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[0.06] px-4 text-sm hover:bg-white/10"><Phone className="size-4 text-blue-200" /> {employee.phoneNumber}</a> : null}
        </div>
        <div className="mt-7 flex items-center gap-4 rounded-2xl bg-white p-4 text-slate-900">
          <BusinessCardQr value={cardUrl} />
          <div><p className="text-sm font-bold">Scan & save contact</p><p className="mt-1 text-xs leading-5 text-slate-500">Scan QR code untuk membuka kartu kontak ini.</p></div>
        </div>
        <a href={contactUrl} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-bold shadow-lg shadow-blue-950/30 hover:brightness-110"><ArrowDownToLine className="size-4" /> Add to Contacts</a>
        <p className="mt-5 text-center text-[10px] text-blue-100/50">Shared by the employee · PT Chitra Paratama</p>
      </article>
    </main>
  );
}

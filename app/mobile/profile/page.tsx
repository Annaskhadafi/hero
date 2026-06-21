import { redirect } from "next/navigation";
import { desc, eq, inArray, and } from "drizzle-orm";
import {
  BriefcaseBusiness, Calendar, HeartPulse, MapPin, ShieldCheck,
  Stethoscope, Trophy, UserRound, GraduationCap, Award, Clock,
} from "lucide-react";

import { ExpandableList } from "@/components/expandable-list";
import { MobileProfileSettings } from "@/components/mobile/mobile-profile-settings";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import {
  employees, pointEvents, trainingRecords, sioCertifications,
  hrEmployees, hcLeaveRequests, hcLeaveTypes, hcCandidateMcu,
} from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { cn } from "@/lib/utils";

function getDateInputValue(value: string | null | undefined) {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

function fd(v: Date | string | null | undefined) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(v: Date | string | null | undefined) {
  if (!v) return null
  const d = new Date(v)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-2">{title}</h2>
      {children}
    </section>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-gray-100 bg-white", className)}>{children}</div>
}

function Row({ icon, label, value, right }: { icon?: React.ReactNode; label: string; value: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon ? <span className="shrink-0 text-blue-600">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
      {right ? <span className="shrink-0 ml-2">{right}</span> : null}
    </div>
  )
}

function StatusBadge({ value, good, bad }: { value: string | null | undefined; good?: string[]; bad?: string[] }) {
  if (!value) return null
  const g = good || ['active', 'aktif', 'valid', 'completed', 'approved']
  const b = bad || ['expired', 'inactive', 'draft', 'rejected', 'deleted']
  const isGood = g.includes(value.toLowerCase())
  const isBad = b.includes(value.toLowerCase())
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', isGood ? 'bg-emerald-50 text-emerald-700' : isBad ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600')}>
      {value}
    </span>
  )
}

export default async function MobileProfilePage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getDailyActivityEmployeeData(session.user.email, { ensureSeed: false });
  if (!data) {
    return (
      <div className="rounded-lg bg-white p-5 text-sm leading-6 text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  // Get employee IDs for related queries
  const [emp] = await db
    .select({ id: employees.id, authUserId: employees.authUserId, email: employees.email })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const empId = emp?.id
  const employeeIds: number[] = empId ? [empId] : []
  if (emp?.authUserId) {
    const uid = Number(emp.authUserId)
    if (!Number.isNaN(uid) && uid !== empId) employeeIds.push(uid)
  }

  // Get employee record for contract dates & MCU matching
  const [hrEmp] = emp?.email ? await db
    .select({
      id: employees.id, name: employees.name, email: employees.email,
      contractDurationStart: employees.contractDurationStart, contractDurationEnd: employees.contractDurationEnd,
      joinDate: employees.joinDate, birthDate: employees.birthDate,
    })
    .from(employees)
    .where(eq(employees.email, emp.email))
    .limit(1) : []

  // Get hrEmployees ID for FK joins (hcLeaveRequests, hcCandidateMcu reference hrEmployees.id)
  const [hrFk] = emp?.email ? await db
    .select({ id: hrEmployees.id })
    .from(hrEmployees)
    .where(eq(hrEmployees.email, emp.email))
    .limit(1) : []

  const hrFkId = hrFk?.id ?? hrEmp?.id

  // ── Queries ────────────────────────────────────────────────
  const [pointTransactions, trainings, certifications, sickLeaves, mcuRecords] = await Promise.all([
    // Points
    empId ? db.select().from(pointEvents).where(inArray(pointEvents.employeeId, employeeIds)).orderBy(desc(pointEvents.createdAt)).limit(50) : [],

    // Training
    empId ? db.select().from(trainingRecords).where(inArray(trainingRecords.employeeId, employeeIds)).orderBy(desc(trainingRecords.completedYear)) : [],

    // SIO Certifications
    empId ? db.select().from(sioCertifications).where(inArray(sioCertifications.employeeId, employeeIds)).orderBy(desc(sioCertifications.expiryDate)) : [],

    // Sick Leave (hcLeaveRequests where leaveType is SAKIT)
    hrFkId ? db
      .select({
        id: hcLeaveRequests.id, startDate: hcLeaveRequests.startDate, endDate: hcLeaveRequests.endDate,
        totalDays: hcLeaveRequests.totalDays, reason: hcLeaveRequests.reason, status: hcLeaveRequests.status,
        leaveTypeName: hcLeaveTypes.name, leaveTypeCode: hcLeaveTypes.code,
      })
      .from(hcLeaveRequests)
      .leftJoin(hcLeaveTypes, eq(hcLeaveRequests.leaveTypeId, hcLeaveTypes.id))
      .where(and(eq(hcLeaveRequests.employeeId, hrFkId), eq(hcLeaveTypes.code, 'SAKIT')))
      .orderBy(desc(hcLeaveRequests.startDate))
      .limit(10) : [],

    // MCU Records
    hrFkId ? db
      .select()
      .from(hcCandidateMcu)
      .where(eq(hcCandidateMcu.candidateId, hrFkId))
      .orderBy(desc(hcCandidateMcu.scheduledDate))
      .limit(5) : [],
  ])

  // Contract info
  const contractDaysLeft = hrEmp?.contractDurationEnd ? daysLeft(hrEmp.contractDurationEnd) : null

  return (
    <div className="space-y-4 pb-6">
      {/* ── Header ───────────────────────────────── */}
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start gap-4">
          <span className="flex size-16 items-center justify-center rounded-xl bg-white/10">
            <UserRound className="size-8 text-blue-200" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">Employee Profile</p>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight">{data.employee.name}</h1>
            <p className="mt-1 text-sm text-blue-200">{data.employee.email}</p>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <Trophy className="size-5 text-blue-600" />
          <p className="mt-3 text-xl font-bold text-gray-900">{data.employee.totalPoints.toLocaleString("id-ID")}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Total Points</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <ShieldCheck className="size-5 text-orange-600" />
          <p className="mt-3 text-xl font-bold text-gray-900">{data.employee.levelName}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Level</p>
        </div>
      </div>

      {/* ── Work Identity ────────────────────────── */}
      <Section title="Identitas Pekerjaan">
        <Card>
          <Row icon={<BriefcaseBusiness className="size-4" />} label="Role" value={data.employee.role} />
          <div className="border-t border-gray-50" />
          <Row icon={<MapPin className="size-4" />} label="Site" value={data.site?.name ?? data.employee.workLocation} />
          <div className="border-t border-gray-50" />
          <Row icon={<UserRound className="size-4" />} label="Departemen" value={data.employee.department} />
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <Badge className="rounded-md border-0 bg-blue-50 text-blue-700">{data.employee.department}</Badge>
            <Badge className="rounded-md border-0 bg-orange-50 text-orange-700">{data.employee.employeeStatusType}</Badge>
          </div>
        </Card>
      </Section>

      {/* ── Contract Info ─────────────────────────── */}
      {hrEmp ? (
        <Section title="Kontrak">
          <Card>
            <Row icon={<Calendar className="size-4" />} label="Tanggal Mulai" value={fd(hrEmp.contractDurationStart)} />
            <div className="border-t border-gray-50" />
            <Row icon={<Calendar className="size-4" />} label="Tanggal Berakhir" value={fd(hrEmp.contractDurationEnd)}
              right={contractDaysLeft !== null ? (
                <span className={cn('text-xs font-medium', contractDaysLeft < 30 ? 'text-orange-600' : 'text-gray-500')}>
                  {contractDaysLeft < 0 ? 'Expired' : `${contractDaysLeft} hari lagi`}
                </span>
              ) : undefined}
            />
            <div className="border-t border-gray-50" />
            <Row icon={<Clock className="size-4" />} label="Tanggal Masuk" value={fd(hrEmp.joinDate)} />
          </Card>
        </Section>
      ) : null}

      {/* ── Training ──────────────────────────────── */}
      <Section title="Pelatihan">
        <Card>
          {trainings.length === 0 ? (
            <div className="p-6 text-center">
              <GraduationCap className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada pelatihan</p>
            </div>
          ) : (
            <ExpandableList limit={5}>
              {trainings.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{t.trainingName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{t.provider}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{t.completedYear}</span>
                    {t.expiresAt ? <><span className="text-[10px] text-gray-400">·</span><span className="text-xs text-gray-500">s.d. {fd(t.expiresAt)}</span></> : null}
                  </div>
                  <div className="mt-1"><StatusBadge value={t.status || 'active'} /></div>
                </div>
              ))}
            </ExpandableList>
          )}
        </Card>
      </Section>

      {/* ── Sertifikasi ───────────────────────────── */}
      <Section title="Sertifikasi">
        <Card>
          {certifications.length === 0 ? (
            <div className="p-6 text-center">
              <Award className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada sertifikasi</p>
            </div>
          ) : (
            <ExpandableList limit={5}>
              {certifications.map((c) => {
                const dl = c.expiryDate ? daysLeft(c.expiryDate) : null
                return (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.certName || c.certType}</p>
                      <StatusBadge value={c.status}
                        good={['active', 'aktif']}
                        bad={['expired', 'inactive']}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.certNumber ? <span className="text-xs text-gray-500">{c.certNumber}</span> : null}
                      {c.issuingBody ? <span className="text-xs text-gray-500">{c.issuingBody}</span> : null}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{c.certDate ? fd(c.certDate) : '-'}</span>
                      {c.expiryDate ? <span>→ {fd(c.expiryDate)}</span> : null}
                      {dl !== null ? (
                        <span className={cn('font-medium', dl < 0 ? 'text-orange-600' : dl < 30 ? 'text-amber-600' : 'text-gray-500')}>
                          {dl < 0 ? 'Expired' : `${dl} hari`}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </ExpandableList>
          )}
        </Card>
      </Section>

      {/* ── Izin Sakit ────────────────────────────── */}
      <Section title="Izin Sakit">
        <Card>
          {sickLeaves.length === 0 ? (
            <div className="p-6 text-center">
              <HeartPulse className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada riwayat izin sakit</p>
            </div>
          ) : (
            <ExpandableList limit={5}>
              {sickLeaves.map((sl) => (
                <div key={sl.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sl.leaveTypeName || 'Izin Sakit'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fd(sl.startDate)} - {fd(sl.endDate)} ({sl.totalDays} hari)</p>
                    </div>
                    <StatusBadge value={sl.status}
                      good={['approved', 'done']}
                      bad={['rejected', 'cancelled']}
                    />
                  </div>
                  {sl.reason ? <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sl.reason}</p> : null}
                </div>
              ))}
            </ExpandableList>
          )}
        </Card>
      </Section>

      {/* ── MCU ───────────────────────────────────── */}
      <Section title="Medical Check Up">
        <Card>
          {mcuRecords.length === 0 ? (
            <div className="p-6 text-center">
              <Stethoscope className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada data MCU</p>
            </div>
          ) : (
            <ExpandableList limit={5}>
              {mcuRecords.map((mcu) => (
                <div key={mcu.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{mcu.klinikName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fd(mcu.scheduledDate)}</p>
                    </div>
                    <StatusBadge value={mcu.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{mcu.paketMcu}</span>
                    {mcu.resultDate ? <span>Hasil: {fd(mcu.resultDate)}</span> : null}
                  </div>
                </div>
              ))}
            </ExpandableList>
          )}
        </Card>
      </Section>

      {/* ── Point Transactions ────────────────────── */}
      <Section title="Riwayat Poin">
        <Card>
          {pointTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <Trophy className="mx-auto size-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada riwayat poin</p>
            </div>
          ) : (
            <ExpandableList limit={5}>
              {pointTransactions.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.label || 'Aktivitas'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.category} &middot; {fd(p.createdAt)}</p>
                  </div>
                  <span className={cn('text-sm font-bold ml-3', p.transactionType === 'deduction' ? 'text-orange-600' : 'text-emerald-600')}>
                    {p.transactionType === 'deduction' ? '-' : '+'}{p.points}
                  </span>
                </div>
              ))}
            </ExpandableList>
          )}
        </Card>
      </Section>

      {/* ── Settings ──────────────────────────────── */}
      <MobileProfileSettings
        profile={{
          name: data.employee.name,
          email: data.employee.email,
          phoneNumber: data.employee.phoneNumber ?? "",
          domicile: data.employee.domicile ?? "",
          birthPlaceDate: getDateInputValue(data.employee.birthPlaceDate),
          profileImage: session.user.image ?? "",
        }}
        showEmailPrompt={/^[a-zA-Z0-9]+@chitraparatama\.co\.id$/.test(data.employee.email)}
      />
    </div>
  );
}

'use client'

import * as React from 'react'
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Button } from '@/components/ui/button'
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroDetailModal,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroKpiCard,
  HeroSearchableSelect,
  HeroStatusBadge,
  HeroTextarea,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { toast } from 'sonner'

export interface KegiatanOlahragaItem {
  id: string
  name: string
  sportCategory: string
  schedule: string
  location: string
  picName: string
  contactNumber: string
  memberCount: number
  frequency: string
  status: 'active' | 'scheduled' | 'completed'
  notes: string
  createdAt: string
}

const INITIAL_KEGIATAN_LIST: KegiatanOlahragaItem[] = [
  {
    id: 'SP-001',
    name: 'Chitra Badminton Club (CBC)',
    sportCategory: 'Badminton',
    schedule: 'Setiap Rabu & Jumat • 19:00 - 21:00 WITA',
    location: 'GOR Hevindo, Balikpapan',
    picName: 'Rian Pratama',
    contactNumber: '0812-3456-7890',
    memberCount: 36,
    frequency: '2x Seminggu',
    status: 'active',
    notes: 'Terbuka untuk seluruh karyawan & kontraktor site Balikpapan. Shuttlecock disediakan panitia.',
    createdAt: '2026-01-10',
  },
  {
    id: 'SP-002',
    name: 'Chitra FC (Futsal Tim)',
    sportCategory: 'Futsal',
    schedule: 'Setiap Selasa • 20:00 - 22:00 WITA',
    location: 'Global Sport Arena, Balikpapan',
    picName: 'Budi Santoso',
    contactNumber: '0813-4567-8901',
    memberCount: 28,
    frequency: '1x Seminggu',
    status: 'active',
    notes: 'Latihan rutin persiapan turnamen antar departemen triwulan II.',
    createdAt: '2026-01-15',
  },
  {
    id: 'SP-003',
    name: 'Chitra Runners & 5K Saturday',
    sportCategory: 'Running',
    schedule: 'Setiap Sabtu • 06:00 - 08:00 WITA',
    location: 'Lapangan Merdeka, Balikpapan',
    picName: 'Dewi Lestari',
    contactNumber: '0811-2233-4455',
    memberCount: 42,
    frequency: '1x Seminggu',
    status: 'active',
    notes: 'Lari santai 5K keliling pesisir Lapangan Merdeka dilanjutkan sharing nutrisi sehat.',
    createdAt: '2026-02-01',
  },
  {
    id: 'SP-004',
    name: 'Gowes Weekend Sehat (BCC)',
    sportCategory: 'Sepeda / Gowes',
    schedule: 'Setiap Minggu ke-2 & ke-4 • 06:30 WITA',
    location: 'Meeting Point Kantor Pusat Chitra',
    picName: 'Ahmad Fauzi',
    contactNumber: '0852-9988-7766',
    memberCount: 22,
    frequency: '2x Sebulan',
    status: 'active',
    notes: 'Rute santai 20-30 km rute perkotaan dan perbukitan sekitar ringroad Balikpapan.',
    createdAt: '2026-02-14',
  },
  {
    id: 'SP-005',
    name: 'Turnamen Tenis Meja Antar Seksi',
    sportCategory: 'Tenis Meja',
    schedule: '25 November 2026 • 16:30 - 18:30 WITA',
    location: 'Ruang Rekreasi Karyawan Lt. 2',
    picName: 'Deni Kurniawan',
    contactNumber: '0819-8765-4321',
    memberCount: 16,
    frequency: 'Event Turnamen',
    status: 'scheduled',
    notes: 'Pendaftaran ganda & tunggal terbuka sampai tanggal 20 November 2026.',
    createdAt: '2026-11-01',
  },
]

interface OlahragaClientPageProps {
  currentEmployee: {
    id: number
    name: string
    employeeSn: string
    jobTitle: string
  }
  canManage: boolean
}

export function OlahragaClientPage({ currentEmployee, canManage }: OlahragaClientPageProps) {
  const [data, setData] = React.useState<KegiatanOlahragaItem[]>(INITIAL_KEGIATAN_LIST)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<KegiatanOlahragaItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // Form states
  const [formName, setFormName] = React.useState('')
  const [formCategory, setFormCategory] = React.useState('Badminton')
  const [formSchedule, setFormSchedule] = React.useState('')
  const [formLocation, setFormLocation] = React.useState('')
  const [formPicName, setFormPicName] = React.useState(currentEmployee.name || '')
  const [formContact, setFormContact] = React.useState('')
  const [formNotes, setFormNotes] = React.useState('')

  const handleCreateSubmit = () => {
    if (!formName.trim() || !formLocation.trim()) {
      toast.error('Mohon lengkapi nama kegiatan dan lokasi kegiatan.')
      return
    }

    const newItem: KegiatanOlahragaItem = {
      id: `SP-${String(data.length + 1).padStart(3, '0')}`,
      name: formName.trim(),
      sportCategory: formCategory,
      schedule: formSchedule.trim() || 'Jadwal fleksibel diumumkan di grup WhatsApp',
      location: formLocation.trim(),
      picName: formPicName.trim() || currentEmployee.name,
      contactNumber: formContact.trim() || '-',
      memberCount: 1,
      frequency: 'Rutin',
      status: 'active',
      notes: formNotes.trim() || '-',
      createdAt: new Date().toISOString().split('T')[0],
    }

    setData((prev) => [newItem, ...prev])
    toast.success('Komunitas/Kegiatan Olahraga berhasil ditambahkan!')
    setIsCreateOpen(false)
    setFormName('')
    setFormLocation('')
    setFormSchedule('')
    setFormNotes('')
  }

  // Calculate Metrics
  const totalKlub = data.length
  const totalPartisipan = data.reduce((acc, curr) => acc + curr.memberCount, 0)
  const aktifKlub = data.filter((d) => d.status === 'active').length
  const upcomingEvents = data.filter((d) => d.status === 'scheduled').length

  const columns: HeroColumnDef<KegiatanOlahragaItem>[] = [
    {
      key: 'id',
      header: 'KODE',
      className: 'font-mono text-xs font-semibold text-slate-500 w-[90px]',
      render: (row: KegiatanOlahragaItem) => row.id,
    },
    {
      key: 'name',
      header: 'NAMA KEGIATAN & KOMUNITAS',
      sortable: true,
      render: (row: KegiatanOlahragaItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.sportCategory} • {row.frequency}</span>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'JADWAL & LOKASI',
      render: (row: KegiatanOlahragaItem) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="font-medium flex items-center gap-1 text-slate-800 dark:text-slate-200">
            <Clock className="size-3 text-muted-foreground" />
            {row.schedule}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3 text-muted-foreground" />
            {row.location}
          </span>
        </div>
      ),
    },
    {
      key: 'picName',
      header: 'PIC / KOORDINATOR',
      render: (row: KegiatanOlahragaItem) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-slate-900 dark:text-slate-100">{row.picName}</span>
          <span className="text-muted-foreground">{row.contactNumber}</span>
        </div>
      ),
    },
    {
      key: 'memberCount',
      header: 'PARTISIPAN',
      sortable: true,
      render: (row: KegiatanOlahragaItem) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Users className="size-3 text-muted-foreground" />
          {row.memberCount} Orang
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (row: KegiatanOlahragaItem) => (
        <HeroStatusBadge
          status={row.status}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'scheduled', label: 'Terjadwal' },
            { value: 'completed', label: 'Selesai' },
          ]}
        />
      ),
    },
    {
      key: 'actions',
      header: 'AKSI',
      render: (row: KegiatanOlahragaItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setSelectedItem(row)
              setIsDetailOpen(true)
            }}
          >
            <Eye className="size-3.5 mr-1" />
            Detail
          </Button>
        </div>
      ),
    },
  ]

  const filters: HeroTableFilter[] = [
    {
      key: 'sportCategory',
      label: 'Cabang Olahraga',
      options: [
        { label: 'Badminton', value: 'Badminton' },
        { label: 'Futsal', value: 'Futsal' },
        { label: 'Running', value: 'Running' },
        { label: 'Sepeda / Gowes', value: 'Sepeda / Gowes' },
        { label: 'Tenis Meja', value: 'Tenis Meja' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Terjadwal', value: 'scheduled' },
        { label: 'Selesai', value: 'completed' },
      ],
    },
  ]

  return (
    <AdminPageShell
      eyebrow="Wellbeing & Employee Engagement"
      title="List Kegiatan Olahraga"
      description="Daftar komunitas hobi & cabang olahraga, jadwal latihan rutin bersama, turnamen internal, serta fasilitas kebugaran karyawan PT Chitra Paratama."
      badge="HC • Wellbeing"
    >
      <div className="space-y-6">
        {/* Scorecards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroKpiCard
            title="Total Komunitas"
            value={totalKlub}
            subtitle="Cabang olahraga aktif"
            tone="blue"
            icon={Trophy}
          />
          <HeroKpiCard
            title="Total Partisipan"
            value={`${totalPartisipan} Karyawan`}
            subtitle="Terdaftar di klub olahraga"
            tone="emerald"
            icon={Users}
          />
          <HeroKpiCard
            title="Klub Aktif Rutin"
            value={aktifKlub}
            subtitle="Latihan rutin tiap minggu"
            tone="cyan"
            icon={Activity}
          />
          <HeroKpiCard
            title="Event Terjadwal"
            value={upcomingEvents}
            subtitle="Turnamen & acara mendatang"
            tone="amber"
            icon={Calendar}
          />
        </div>

        {/* Toolbar & Data Table */}
        <div className="bg-card rounded-xl border p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Direktori Komunitas Olahraga Karyawan</h2>
              <p className="text-xs text-muted-foreground">
                Karyawan dapat bergabung langsung dengan menghubungi PIC koordinator masing-masing cabang.
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                className="h-9 px-3 gap-1.5 font-medium shadow-xs"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="size-4" />
                Tambah Komunitas / Event
              </Button>
            )}
          </div>

          <HeroDataTable
            data={data}
            columns={columns}
            searchableKeys={['name', 'sportCategory', 'picName']}
            searchPlaceholder="Cari nama kegiatan, cabang olahraga, atau koordinator..."
            filters={filters}
          />
        </div>
      </div>

      {/* Form Dialog: Add Activity */}
      <HeroFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Daftarkan Komunitas / Kegiatan Olahraga Baru"
        description="Tambahkan jadwal dan koordinator cabang olahraga karyawan Chitra Paratama."
        onSubmit={() => handleCreateSubmit()}
        submitLabel="Simpan Kegiatan"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <HeroFormField label="Nama Komunitas / Kegiatan" required>
            <HeroInput
              placeholder="Contoh: Chitra Basketball Community"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </HeroFormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Cabang Olahraga" required>
              <HeroSearchableSelect
                value={formCategory}
                onChange={setFormCategory}
                options={[
                  { label: 'Badminton', value: 'Badminton' },
                  { label: 'Futsal', value: 'Futsal' },
                  { label: 'Running', value: 'Running' },
                  { label: 'Sepeda / Gowes', value: 'Sepeda / Gowes' },
                  { label: 'Tenis Meja', value: 'Tenis Meja' },
                  { label: 'Basket', value: 'Basket' },
                  { label: 'Voli', value: 'Voli' },
                  { label: 'Yoga & Kebugaran', value: 'Yoga & Kebugaran' },
                ]}
              />
            </HeroFormField>

            <HeroFormField label="Jadwal Rutin / Pelaksanaan" required>
              <HeroInput
                placeholder="Contoh: Setiap Kamis • 18:30 WITA"
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Lokasi Lapangan / Venue" required>
            <HeroInput
              placeholder="Contoh: GOR Pertamina Balikpapan"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
            />
          </HeroFormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroFormField label="Nama PIC / Koordinator" required>
              <HeroInput
                placeholder="Nama Karyawan PIC"
                value={formPicName}
                onChange={(e) => setFormPicName(e.target.value)}
              />
            </HeroFormField>

            <HeroFormField label="Nomor Kontak WhatsApp">
              <HeroInput
                placeholder="Contoh: 0812-xxxx-xxxx"
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Catatan / Syarat Partisipasi">
            <HeroTextarea
              placeholder="Jelaskan perlengkapan yang perlu dibawa, iuran sewa lapangan (jika ada), dsb."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* Detail Modal */}
      {selectedItem && (
        <HeroDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedItem.name}
          statusBadge={<HeroStatusBadge status={selectedItem.status} />}
          subtitle={`Cabang: ${selectedItem.sportCategory} • Frekuensi: ${selectedItem.frequency}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
              <div>
                <span className="text-xs text-muted-foreground font-medium">Jadwal Rutin</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItem.schedule}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Lokasi / Venue</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItem.location}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Koordinator (PIC)</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItem.picName}</p>
                <p className="text-xs text-muted-foreground">{selectedItem.contactNumber}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Anggota Terdaftar</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItem.memberCount} Orang</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-medium">Informasi & Catatan Tambahan</span>
              <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-muted/40 p-3 rounded-md">
                {selectedItem.notes}
              </p>
            </div>
          </div>
        </HeroDetailModal>
      )}
    </AdminPageShell>
  )
}

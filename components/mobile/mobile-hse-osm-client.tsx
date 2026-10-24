'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  Crosshair,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  HardHat,
  Image as ImageIcon,
  ImageOff,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OsmMiniMap } from '@/components/ui/osm-mini-map'
import {
  createHseOsmFinding,
  createHseOsmSession,
  deleteHseOsmSession,
  getHseEmployeesList,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  getHseOsmSessions,
  submitHseOsmAction,
  submitHseOsmSession,
  syncHseOsmOfflineBatch,
  updateHseOsmFindingPhotos,
  verifyHseOsmFinding,
} from '@/app/actions/hse-osm'
import { uploadFile } from '@/app/actions/upload'
import { compressImageFile } from '@/lib/client-image-compression'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'
import {
  HSE_OSM_DEFAULT_CLASSIFICATIONS,
  HSE_OSM_DEFAULT_FOCUS_ITEMS,
  HSE_OSM_FINDING_CONDITIONS,
  HSE_OSM_LAST_SYNC_KEY,
  HSE_OSM_OFFLINE_STORAGE_KEY,
  HSE_OSM_RISK_CONFIG,
  HSE_OSM_STATUS_CONFIG,
  type HseOsmFindingCondition,
  type HseOsmFindingStatus,
  type HseOsmRiskLevel,
} from '@/lib/hse-osm-constants'

type MobileHseOsmClientProps = {
  initialData: any
}

type ViewMode =
  | 'hub'
  | 'monitoring'
  | 'reports'
  | 'monitoring_list'
  | 'create_wizard'
  | 'session_detail'

function CircularProgressRing({
  percent,
  size = 48,
  strokeWidth = 4,
}: {
  percent: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-blue-600 transition-all duration-500 ease-in-out dark:stroke-blue-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="text-foreground absolute text-[10px] font-bold">{percent.toFixed(1)}%</span>
    </div>
  )
}

export function MobileHseOsmClient({ initialData }: MobileHseOsmClientProps) {
  const router = useRouter()

  const [currentView, setCurrentView] = useState<ViewMode>('hub')
  const [isOnline, setIsOnline] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<string>('')
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [reportActiveTab, setReportActiveTab] = useState<'created' | 'received' | 'assigned'>(
    'created'
  )
  const [tabCounts, setTabCounts] = useState({ created: 0, received: 0, assigned: 0, total: 0 })
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false)
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<{
    id: number
    sessionNumber: string
  } | null>(null)
  const [isDeletingSession, setIsDeletingSession] = useState(false)

  // Live GPS state
  const [liveGeo, setLiveGeo] = useState<{
    lat: string
    lng: string
    acc: string
    message: string
  }>({
    lat: '',
    lng: '',
    acc: '',
    message: 'GPS standby',
  })

  // Metrics
  const [metrics, setMetrics] = useState(
    initialData?.metrics || {
      totalSessions: 0,
      totalFindings: 0,
      openTickets: 0,
      processedTickets: 0,
      closedTickets: 0,
      rejectedTickets: 0,
    }
  )

  // Monitoring sessions
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  // Active Session Detail View
  const [activeSessionDetail, setActiveSessionDetail] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Master Operational Sites
  const operationalSites = useMemo(() => {
    const raw = (initialData?.sites || []) as Array<{ id: number; name: string }>
    if (raw && raw.length > 0) {
      return [...raw].sort((a, b) => a.name.localeCompare(b.name))
    }
    return [
      'AMM Mifa Hauling',
      'AMM Tabang',
      'Balikpapan',
      'Balikpapan External',
      'BSI - Banyuwangi',
      'BUMA Tanjung',
      'CDE - Bengkulu',
      'CK BIB',
      'CK BMB',
      'CK KIM',
      'CK MHU',
      'CK MIFA',
      'CK NCN',
      'Jakarta',
      'KPUC - Malinau',
      'Madhani Talatah - ME',
      'Makassar',
      'MTN - Berau',
      'MTN - ME',
      'Palembang',
      'Pekanbaru',
      'Petrosea SDA',
      'PKA Musi Rawas',
      'PPA BIB',
      'PPA TJ-Enim',
      'PT SMJ - Berau',
      'Sangatta KABO',
      'Sangatta KPC',
      'Sebamban',
      'Tj. Adaro',
      'Tj. Redeb - Berau',
      'TU Batu Hijau',
      'TU Gresik',
      'Vale - Sorowako',
    ].map((name, idx) => ({ id: idx + 1, name }))
  }, [initialData?.sites])

  // Wizard state: Step 1 (Team), Step 2 (Spatial & Focus), Step 3 (Findings & Camera)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [wizardLocationArea, setWizardLocationArea] = useState(() => {
    const actorSiteId = initialData?.actor?.employee?.siteId
    if (actorSiteId && initialData?.sites) {
      const found = initialData.sites.find((s: any) => s.id === actorSiteId)
      if (found?.name) return found.name
    }
    return 'Sangatta KABO'
  })
  const [wizardLocationDetail, setWizardLocationDetail] = useState('')
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [wizardDate, setWizardDate] = useState('')
  const [wizardTime, setWizardTime] = useState('')
  const [wizardLat, setWizardLat] = useState('')
  const [wizardLng, setWizardLng] = useState('')
  const [wizardGpsAcc, setWizardGpsAcc] = useState('')
  const [wizardFocusItem, setWizardFocusItem] = useState('Fatality Prevention')
  const [wizardNotes, setWizardNotes] = useState('')

  // Wizard Team Members
  const [wizardTeam, setWizardTeam] = useState<any[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<any[]>(initialData?.employees || [])
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [selectedMultiEmpIds, setSelectedMultiEmpIds] = useState<number[]>([])
  const [inlineEmpSearch, setInlineEmpSearch] = useState('')
  const [searchEmpModalOpen, setSearchEmpModalOpen] = useState(false)
  const [empSearchQuery, setEmpSearchQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualBadge, setManualBadge] = useState('')
  const [manualDept, setManualDept] = useState('')
  const [isManualExternal, setIsManualExternal] = useState(false)

  // Wizard Finding (Step 3)
  const [wizardClassification, setWizardClassification] = useState<string>(
    HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name
  )
  const [wizardFindingCondition, setWizardFindingCondition] =
    useState<HseOsmFindingCondition>('SUBSTANDARD')
  const [wizardFindingDesc, setWizardFindingDesc] = useState('')
  const [wizardRiskLevel, setWizardRiskLevel] = useState<HseOsmRiskLevel>('MEDIUM')
  const [wizardActionReq, setWizardActionReq] = useState('')
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false)

  // State for Add Finding to existing OSM session in mobile
  const [isAddFindingModalOpen, setIsAddFindingModalOpen] = useState(false)
  const [newFindingCondition, setNewFindingCondition] =
    useState<HseOsmFindingCondition>('SUBSTANDARD')
  const [newFindingClassification, setNewFindingClassification] = useState<string>(
    HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name
  )
  const [newFindingRiskLevel, setNewFindingRiskLevel] = useState<HseOsmRiskLevel>('MEDIUM')
  const [newFindingDesc, setNewFindingDesc] = useState('')
  const [newFindingActionReq, setNewFindingActionReq] = useState('')
  const [newFindingDueDate, setNewFindingDueDate] = useState('')
  const [newFindingPhotos, setNewFindingPhotos] = useState<string[]>([])
  const [isUploadingNewFindingPhoto, setIsUploadingNewFindingPhoto] = useState(false)
  const [isSubmittingNewFinding, setIsSubmittingNewFinding] = useState(false)
  const [newFindingError, setNewFindingError] = useState<string | null>(null)

  // Active action/verification modal state in mobile
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null)
  const [actionFinding, setActionFinding] = useState<any>(null)
  const [actionTakenText, setActionTakenText] = useState('')
  const [actionPhotos, setActionPhotos] = useState<string[]>([])
  const [rejectionReasonText, setRejectionReasonText] = useState('')
  const [actionMode, setActionMode] = useState<'action' | 'close' | 'reject' | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [showDetailMap, setShowDetailMap] = useState(false)

  // Manage / Replace Finding Photos state in mobile
  const [managePhotosFinding, setManagePhotosFinding] = useState<any>(null)
  const [editingFindingPhotos, setEditingFindingPhotos] = useState<string[]>([])
  const [isSavingFindingPhotos, setIsSavingFindingPhotos] = useState(false)
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false)

  // Inspector profile info from session
  const actor = initialData?.actor
  const inspectorName = actor?.employee?.name || actor?.sessionUser?.name || 'Muhammad Ikbal Isisa'
  const inspectorBadge = actor?.employee?.employeeSn || '2108847'
  const inspectorDept = 'Chitra Paratama PT'
  const inspectorSection = actor?.employee?.jobTitle || 'PJO Contractor'

  // Check online status and stored sync info
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const savedLastSync = localStorage.getItem(HSE_OSM_LAST_SYNC_KEY)
    if (savedLastSync) setLastSyncTime(savedLastSync)

    const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY)
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setOfflineQueueCount(Array.isArray(parsed) ? parsed.length : 0)
      } catch {}
    }

    // Auto capture GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveGeo({
            lat: pos.coords.latitude.toFixed(7),
            lng: pos.coords.longitude.toFixed(7),
            acc: `±${Math.round(pos.coords.accuracy)}m`,
            message: 'Online',
          })
        },
        (err) => {
          setLiveGeo((prev) => ({ ...prev, message: 'GPS nonaktif' }))
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch employees list if not passed from server
  useEffect(() => {
    if (!initialData?.employees || initialData.employees.length === 0) {
      getHseEmployeesList().then((res) => {
        if (res.success && res.data) setAvailableEmployees(res.data)
      })
    }
  }, [initialData?.employees])

  const filteredEmployees = useMemo(() => {
    if (!empSearchQuery.trim()) return availableEmployees
    const q = empSearchQuery.toLowerCase()
    return availableEmployees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeSn?.toLowerCase().includes(q) ||
        e.departmentName?.toLowerCase().includes(q) ||
        e.sectionName?.toLowerCase().includes(q) ||
        e.jobTitle?.toLowerCase().includes(q)
    )
  }, [availableEmployees, empSearchQuery])

  const inlineFilteredEmployees = useMemo(() => {
    if (!inlineEmpSearch.trim()) return []
    const q = inlineEmpSearch.toLowerCase()
    return availableEmployees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeSn?.toLowerCase().includes(q) ||
        e.departmentName?.toLowerCase().includes(q) ||
        e.sectionName?.toLowerCase().includes(q) ||
        e.jobTitle?.toLowerCase().includes(q)
    )
  }, [availableEmployees, inlineEmpSearch])

  function addEmployeeToTeam(emp: {
    id?: number
    employeeSn: string
    name: string
    departmentName?: string | null
  }) {
    if (wizardTeam.some((m) => m.badgeNumber === emp.employeeSn)) {
      alert(`Karyawan ${emp.name} sudah terdaftar dalam tim.`)
      return
    }
    setWizardTeam((prev) => [
      ...prev,
      {
        employeeId: emp.id,
        badgeNumber: emp.employeeSn,
        name: emp.name,
        department: emp.departmentName || 'Mining Operations',
        company: 'PT Chitra Paratama',
        isTeamLeader: false,
        isExternal: false,
      },
    ])
    setSelectedEmpId('')
    setInlineEmpSearch('')
    setSearchEmpModalOpen(false)
  }

  function addMultipleEmployeesToTeam(empIds: number[]) {
    if (empIds.length === 0) return
    const toAdd = availableEmployees.filter(
      (emp) =>
        empIds.includes(emp.id) &&
        !wizardTeam.some((m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id)
    )
    if (toAdd.length === 0) {
      alert('Semua personil yang dipilih sudah terdaftar di tim.')
      return
    }
    const newMembers = toAdd.map((emp) => ({
      employeeId: emp.id,
      badgeNumber: emp.employeeSn,
      name: emp.name,
      department: emp.departmentName || 'Mining Operations',
      company: 'PT Chitra Paratama',
      isTeamLeader: false,
      isExternal: false,
    }))
    setWizardTeam((prev) => [...prev, ...newMembers])
    setSelectedMultiEmpIds([])
    setInlineEmpSearch('')
    setEmpSearchQuery('')
    setSearchEmpModalOpen(false)
  }

  // Reset wizard on initial open
  function startNewOsm() {
    const now = new Date()
    setWizardDate(now.toISOString().split('T')[0])
    const defaultSiteName = actor?.employee?.siteId
      ? initialData?.sites?.find((s: any) => s.id === actor?.employee?.siteId)?.name ||
        operationalSites.find((s) => s.name === 'Sangatta KABO')?.name ||
        operationalSites[0]?.name ||
        'Sangatta KABO'
      : operationalSites.find((s) => s.name === 'Sangatta KABO')?.name ||
        operationalSites[0]?.name ||
        'Sangatta KABO'
    setWizardLocationArea(defaultSiteName)
    setWizardLocationDetail('')
    setWizardLat(liveGeo.lat)
    setWizardLng(liveGeo.lng)
    setWizardGpsAcc(liveGeo.acc)
    setWizardFocusItem('Fatality Prevention')
    setWizardNotes('')
    setWizardStep(1)

    // Initial leader
    setWizardTeam([
      {
        name: inspectorName,
        badgeNumber: inspectorBadge,
        department: 'Mining Operations',
        company: 'PT Chitra Paratama',
        isTeamLeader: true,
        isExternal: false,
      },
    ])

    setWizardFindingDesc('')
    setWizardPhotos([])
    setWizardActionReq('')
    setWizardError(null)
    setCurrentView('create_wizard')
  }

  // Load sessions list
  async function loadSessions() {
    setIsLoadingSessions(true)
    try {
      const res = await getHseOsmSessions({ limit: 50 })
      if (res.success && res.data) {
        setSessions(res.data)
        if ((res as any).tabCounts) setTabCounts((res as any).tabCounts)
      }
      const resMetrics = await getHseOsmDashboardData()
      if (resMetrics.success && resMetrics.metrics) {
        setMetrics(resMetrics.metrics)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  useEffect(() => {
    if (
      currentView === 'monitoring_list' ||
      currentView === 'reports' ||
      currentView === 'monitoring' ||
      currentView === 'hub'
    ) {
      loadSessions()
    }
  }, [currentView])

  async function handleOpenDetail(sessionId: number) {
    setIsLoadingDetail(true)
    try {
      const res = await getHseOsmSessionById(sessionId)
      if (res.success && res.data) {
        setActiveSessionDetail(res.data)
        setCurrentView('session_detail')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Sync offline queue to server
  async function handleSync() {
    if (!navigator.onLine) {
      alert(
        'Perangkat sedang offline. Sambungkan ke koneksi internet untuk melakukan sinkronisasi.'
      )
      return
    }

    setIsSyncing(true)
    try {
      const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY)
      if (savedQueue) {
        const queue = JSON.parse(savedQueue)
        if (Array.isArray(queue) && queue.length > 0) {
          const res = await syncHseOsmOfflineBatch(queue)
          if (res.success) {
            localStorage.removeItem(HSE_OSM_OFFLINE_STORAGE_KEY)
            setOfflineQueueCount(0)
          }
        }
      }

      const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16)
      localStorage.setItem(HSE_OSM_LAST_SYNC_KEY, nowFormatted)
      setLastSyncTime(nowFormatted)

      await loadSessions()
      alert('Sinkronisasi data OSM berhasil dilakukan!')
    } catch (err: any) {
      alert(`Gagal sinkronisasi: ${err?.message || 'Terjadi kendala jaringan'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Photo upload handler
  async function handlePhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'wizard' | 'action' | 'new_finding'
  ) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const currentPhotos =
      target === 'wizard'
        ? wizardPhotos
        : target === 'new_finding'
          ? newFindingPhotos
          : actionPhotos

    if (currentPhotos.length + files.length > 3) {
      alert('Maksimal 3 foto temuan.')
      return
    }

    if (target === 'new_finding') {
      setIsUploadingNewFindingPhoto(true)
    } else {
      setIsUploadingPhoto(true)
    }

    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i]
        // Client-side lightweight compression (max 1200px, 0.75 WebP) - reduces 5-15MB phone camera photo to ~100-250KB!
        const file = await compressImageFile(rawFile, {
          maxDimension: 1200,
          quality: 0.75,
          mimeType: 'image/webp',
        })

        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadTarget', 'hse-osm')

        const res = await uploadFile(formData)
        if (res.success && res.url) {
          newUrls.push(res.url)
        } else {
          throw new Error(res.error || 'Gagal mengunggah foto.')
        }
      }

      if (target === 'wizard') {
        setWizardPhotos((prev) => [...prev, ...newUrls])
      } else if (target === 'new_finding') {
        setNewFindingPhotos((prev) => [...prev, ...newUrls])
      } else {
        setActionPhotos((prev) => [...prev, ...newUrls])
      }
    } catch (err: any) {
      alert(err?.message || 'Gagal mengunggah foto.')
    } finally {
      setIsUploadingPhoto(false)
      setIsUploadingNewFindingPhoto(false)
      e.target.value = ''
    }
  }

  // Upload handler for managing / replacing existing finding photos
  async function handleEditPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (editingFindingPhotos.length + files.length > 5) {
      alert('Maksimal 5 foto temuan.')
      return
    }

    setIsUploadingEditPhoto(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i]
        const file = await compressImageFile(rawFile, {
          maxDimension: 1200,
          quality: 0.75,
          mimeType: 'image/webp',
        })

        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadTarget', 'hse-osm')

        const res = await uploadFile(formData)
        if (res.success && res.url) {
          newUrls.push(res.url)
        } else {
          throw new Error(res.error || 'Gagal mengunggah foto.')
        }
      }
      setEditingFindingPhotos((prev) => [...prev, ...newUrls])
    } catch (err: any) {
      alert(err?.message || 'Gagal mengunggah foto.')
    } finally {
      setIsUploadingEditPhoto(false)
      e.target.value = ''
    }
  }

  // Save updated finding photos
  async function handleSaveFindingPhotos() {
    if (!managePhotosFinding) return
    setIsSavingFindingPhotos(true)
    try {
      const res = await updateHseOsmFindingPhotos(managePhotosFinding.id, editingFindingPhotos)
      if (!res.success) {
        throw new Error(res.error || 'Gagal memperbarui foto temuan.')
      }

      // Update activeSessionDetail local state immediately
      setActiveSessionDetail((prev: any) => {
        if (!prev || !prev.findings) return prev
        return {
          ...prev,
          findings: prev.findings.map((f: any) =>
            f.id === managePhotosFinding.id ? { ...f, photoUrls: editingFindingPhotos } : f
          ),
        }
      })

      alert('Foto temuan berhasil diperbarui!')
      setManagePhotosFinding(null)
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan foto temuan.')
    } finally {
      setIsSavingFindingPhotos(false)
    }
  }

  // Submit complete wizard
  async function handleSubmitWizard() {
    if (!wizardLocationArea.trim()) {
      setWizardError('Area lokasi inspeksi wajib diisi.')
      setWizardStep(2)
      return
    }

    const leader = wizardTeam.find((m) => m.isTeamLeader) || wizardTeam[0]
    if (!leader) {
      setWizardError('Minimal harus ada satu Team Leader.')
      setWizardStep(1)
      return
    }

    setIsSubmittingWizard(true)
    setWizardError(null)

    const isStandard = wizardFindingCondition === 'STANDARD'

    const findingsPayload = wizardFindingDesc.trim()
      ? [
          {
            classificationName: wizardClassification,
            description: wizardFindingDesc.trim(),
            photoUrls: wizardPhotos,
            riskLevel: wizardRiskLevel,
            status: isStandard ? ('CLOSED' as const) : ('OPEN' as const),
            condition: wizardFindingCondition,
            actionRequired: isStandard
              ? wizardActionReq.trim() || 'Good Condition / Sesuai Standar Keselamatan'
              : wizardActionReq.trim(),
            actionTaken: isStandard
              ? 'Kondisi telah diperiksa dan dipastikan sesuai standar keselamatan (Standard / Close).'
              : '',
          },
        ]
      : []

    const matchedSite = operationalSites.find((s) => s.name === wizardLocationArea.trim())

    const sessionPayload = {
      siteId: matchedSite?.id || actor?.employee?.siteId || null,
      inspectionDate: wizardDate,
      inspectionTime: wizardTime,
      locationArea: wizardLocationArea.trim(),
      locationDetail: wizardLocationDetail.trim(),
      latitude: wizardLat || liveGeo.lat,
      longitude: wizardLng || liveGeo.lng,
      gpsAccuracy: wizardGpsAcc || liveGeo.acc,
      focusItemName: wizardFocusItem,
      leadEmployeeName: leader.name,
      leadBadgeNumber: leader.badgeNumber,
      leadDepartment: leader.department,
      leadCompany: leader.company || 'PT Chitra Paratama',
      notes: wizardNotes.trim(),
      teamMembers: wizardTeam,
      findings: findingsPayload,
    }

    // If offline, save to local queue
    if (!navigator.onLine) {
      try {
        const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY)
        const queue = savedQueue ? JSON.parse(savedQueue) : []
        queue.push(sessionPayload)
        localStorage.setItem(HSE_OSM_OFFLINE_STORAGE_KEY, JSON.stringify(queue))
        setOfflineQueueCount(queue.length)
        alert(
          'Perangkat offline: Sesi OSM disimpan ke antrean offline lokal dan akan disinkronkan saat online.'
        )
        setCurrentView('hub')
      } catch (err: any) {
        setWizardError('Gagal menyimpan ke penyimpanan offline.')
      } finally {
        setIsSubmittingWizard(false)
      }
      return
    }

    try {
      const res = await createHseOsmSession(sessionPayload)
      if (!res.success) throw new Error(res.error || 'Gagal membuat sesi OSM.')
      if (!res.data) throw new Error('Data sesi OSM tidak tersedia setelah sesi dibuat.')

      // Sesi On the Spot Monitoring berhasil dibuat
      await loadSessions()
      await handleOpenDetail(res.data.id)
    } catch (err: any) {
      setWizardError(err?.message || 'Terjadi kesalahan saat submit.')
    } finally {
      setIsSubmittingWizard(false)
    }
  }

  async function handleConfirmDeleteSession() {
    if (!deleteSessionTarget) return
    setIsDeletingSession(true)
    try {
      const res = await deleteHseOsmSession(deleteSessionTarget.id)
      if (res.success) {
        setDeleteSessionTarget(null)
        if (currentView === 'session_detail') {
          setActiveSessionDetail(null)
          setCurrentView('reports')
        }
        await loadSessions()
      } else {
        alert(res.error || 'Gagal menghapus sesi OSM draft.')
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Gagal menghapus sesi OSM draft.')
    } finally {
      setIsDeletingSession(false)
    }
  }

  async function handleSubmitInspection() {
    if (!activeSessionDetail) return
    const count = activeSessionDetail.findings?.length || 0
    if (count < 3) {
      alert(
        `Minimal 3 hasil inspeksi baru agar dapat di-Submit. Saat ini baru terdapat ${count} temuan.`
      )
      return
    }

    const confirmed = confirm(
      'Apakah Anda yakin ingin melakukan Submit laporan inspeksi ini?\n\nSetelah Submit, laporan akan TERKUNCI dan tidak dapat diedit lagi. Notifikasi email akan otomatis dikirim ke PIC Area & tembusan.'
    )
    if (!confirmed) return

    setIsSubmittingInspection(true)
    try {
      const res = await submitHseOsmSession(activeSessionDetail.id)
      if (!res.success) {
        alert(res.error || 'Gagal melakukan submit laporan.')
        return
      }

      alert(
        'Laporan OSM berhasil disubmit! Laporan telah terkunci dan notifikasi email berhasil diproses.'
      )
      await handleOpenDetail(activeSessionDetail.id)
      await loadSessions()
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err?.message || 'Gagal submit laporan.'}`)
    } finally {
      setIsSubmittingInspection(false)
    }
  }

  // Handle create new finding on existing OSM session in mobile
  async function handleCreateNewFinding(sessionId: number) {
    if (!newFindingDesc.trim()) {
      setNewFindingError('Uraian deskripsi temuan wajib diisi.')
      return
    }

    setIsSubmittingNewFinding(true)
    setNewFindingError(null)

    const isStandard = newFindingCondition === 'STANDARD'

    try {
      const res = await createHseOsmFinding(sessionId, {
        classificationName: newFindingClassification,
        description: newFindingDesc.trim(),
        photoUrls: newFindingPhotos,
        riskLevel: newFindingRiskLevel,
        status: isStandard ? 'CLOSED' : 'OPEN',
        condition: newFindingCondition,
        actionRequired: isStandard
          ? newFindingActionReq.trim() || 'Good Condition / Sesuai Standar Keselamatan'
          : newFindingActionReq.trim(),
        actionTaken: isStandard
          ? 'Kondisi telah diperiksa dan dipastikan sesuai standar keselamatan (Standard / Close).'
          : undefined,
        dueDate: isStandard ? undefined : newFindingDueDate || undefined,
      })

      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan temuan baru.')
      }

      alert('Temuan baru berhasil ditambahkan pada sesi OSM ini!')
      setIsAddFindingModalOpen(false)

      // Reset form
      setNewFindingCondition('SUBSTANDARD')
      setNewFindingClassification(HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name)
      setNewFindingDesc('')
      setNewFindingRiskLevel('MEDIUM')
      setNewFindingActionReq('')
      setNewFindingDueDate('')
      setNewFindingPhotos([])

      // Refresh current session detail & session list
      await handleOpenDetail(sessionId)
      await loadSessions()
    } catch (err: any) {
      setNewFindingError(err?.message || 'Terjadi kesalahan saat menyimpan temuan.')
    } finally {
      setIsSubmittingNewFinding(false)
    }
  }

  // Handle Action Submit (Corrective Action / Verify)
  async function handleExecuteAction() {
    if (!actionFinding) return
    setIsSubmittingAction(true)
    try {
      if (actionMode === 'action') {
        if (!actionTakenText.trim()) throw new Error('Catatan tindakan perbaikan wajib diisi.')
        const res = await submitHseOsmAction(actionFinding.id, {
          actionTaken: actionTakenText.trim(),
          actionPhotoUrls: actionPhotos,
        })
        if (!res.success) throw new Error(res.error || 'Gagal menyimpan perbaikan.')
      } else if (actionMode === 'close') {
        const res = await verifyHseOsmFinding(actionFinding.id, { status: 'CLOSED' })
        if (!res.success) throw new Error(res.error || 'Gagal memverifikasi penutupan.')
      } else if (actionMode === 'reject') {
        if (!rejectionReasonText.trim()) throw new Error('Alasan penolakan perbaikan wajib diisi.')
        const res = await verifyHseOsmFinding(actionFinding.id, {
          status: 'REJECTED',
          rejectionReason: rejectionReasonText.trim(),
        })
        if (!res.success) throw new Error(res.error || 'Gagal menolak perbaikan.')
      }

      // Refresh detail
      if (activeSessionDetail?.id) {
        await handleOpenDetail(activeSessionDetail.id)
      }
      setActionMode(null)
      setActionFinding(null)
      setActionTakenText('')
      setActionPhotos([])
      setRejectionReasonText('')
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses aksi.')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // ==========================================
  // VIEW 1: HUB / PUSAT KONTROL OSM (Slide 2 & 3)
  // ==========================================
  if (currentView === 'hub') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
        {/* Top Header Card (Slide 2) */}
        <div className="space-y-3 border-b bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/mobile/hse')}
                className="text-muted-foreground -ml-1 size-8"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-foreground text-base leading-tight font-bold">HSES App</h1>
                <p className="text-muted-foreground text-[11px]">Report Solution Console</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  isOnline
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="size-3" /> ONLINE
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3" /> OFFLINE
                  </>
                )}
              </span>
            </div>
          </div>

          {/* User Profile Card (Slide 2 & 3) */}
          <div className="space-y-2 rounded-xl border bg-slate-50/70 p-3.5 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border border-teal-300 bg-teal-100 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                {inspectorName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-foreground truncate text-sm font-bold">{inspectorName}</h2>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  NRP: {inspectorBadge} • {inspectorDept}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="py-0.2 rounded-full border border-amber-300 bg-amber-100 px-2 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {inspectorSection}
                  </span>
                </div>
              </div>
            </div>

            {liveGeo.lat && (
              <div className="text-muted-foreground flex items-center gap-1 border-t pt-2 font-mono text-[11px]">
                <MapPin className="size-3 shrink-0 text-red-500" />
                <span>
                  Latitude: {liveGeo.lat}, Longitude: {liveGeo.lng}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Monitoring, Report, Sync (Slide 3) */}
        <div className="space-y-4 p-4">
          <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            ACTIONS
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Action 1: Monitoring (Slide 2) */}
            <button
              onClick={() => setCurrentView('monitoring')}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3.5 text-center shadow-xs transition-all hover:border-amber-500 active:scale-95 dark:bg-slate-900"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs dark:bg-amber-950/60 dark:text-amber-300">
                <HardHat className="size-5" />
              </div>
              <span className="text-foreground text-xs font-semibold">Monitoring</span>
            </button>

            {/* Action 2: Report -> OSM Reports (Slide 3) */}
            <button
              onClick={() => {
                setReportActiveTab('created')
                setCurrentView('reports')
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3.5 text-center shadow-xs transition-all hover:border-blue-500 active:scale-95 dark:bg-slate-900"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs dark:bg-blue-950/60 dark:text-blue-300">
                <FileText className="size-5" />
              </div>
              <span className="text-foreground text-xs font-semibold">Report</span>
            </button>

            {/* Action 3: Sync */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="relative flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3.5 text-center shadow-xs transition-all hover:border-emerald-500 active:scale-95 dark:bg-slate-900"
            >
              {offlineQueueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                  {offlineQueueCount}
                </span>
              )}
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs dark:bg-emerald-950/60 dark:text-emerald-300">
                <RefreshCw className={`size-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <span className="text-foreground text-xs font-semibold">Sync</span>
            </button>
          </div>

          <div className="text-muted-foreground text-center text-[11px]">
            Last sync: {lastSyncTime || '2024-10-09 13:34'}
          </div>

          {/* DASHBOARD REPORTS (Slide 3) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                DASHBOARD REPORTS
              </span>
              <span className="text-muted-foreground text-[11px]">Detailed report in HSES</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* OPEN CARD */}
              <div className="space-y-1 rounded-xl border border-red-200 bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <span className="text-3xl font-black text-red-600">{metrics.openTickets}</span>
                <span className="block text-xs font-bold text-red-700">OPEN</span>
                <span className="text-muted-foreground block text-[11px]">Ticket Open</span>
              </div>

              {/* REJECTED CARD */}
              <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <span className="text-3xl font-black text-slate-700 dark:text-slate-300">
                  {metrics.rejectedTickets}
                </span>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rejected
                </span>
                <span className="text-muted-foreground block text-[11px]">Ticket Rejected</span>
              </div>

              {/* PROCESSED CARD */}
              <div className="space-y-1 rounded-xl border border-amber-200 bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <span className="text-3xl font-black text-amber-600">
                  {metrics.processedTickets}
                </span>
                <span className="block text-xs font-bold text-amber-700">Processed</span>
                <span className="text-muted-foreground block text-[11px]">Tindak Lanjut</span>
              </div>

              {/* CLOSED CARD */}
              <div className="space-y-1 rounded-xl border border-emerald-200 bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <span className="text-3xl font-black text-emerald-600">
                  {metrics.closedTickets}
                </span>
                <span className="block text-xs font-bold text-emerald-700">CLOSED</span>
                <span className="text-muted-foreground block text-[11px]">
                  Selesai Diverifikasi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Button "+ New OSM" */}
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-[430px] justify-end px-4">
          <Button
            onClick={startNewOsm}
            className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-blue-600 p-0 text-white shadow-xl transition-transform hover:bg-blue-700 active:scale-95"
          >
            <Plus className="size-7" />
          </Button>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: MENU MONITORING (Slide 2 Revisi)
  // Khusus untuk fitur membuat OSM baru (+ New)
  // ==========================================
  if (currentView === 'monitoring') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 pb-20 dark:bg-slate-950">
        {/* Navigation Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('hub')}
              className="text-muted-foreground -ml-1 size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-foreground text-base font-bold">Monitoring</h1>
          </div>
        </div>

        {/* Empty State Card (Slide 2: Khusus untuk membuat OSM baru) */}
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="flex w-full max-w-xs flex-col items-center space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex size-20 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50/80 text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Activity className="size-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-foreground text-sm font-bold">Tidak ada monitoring</h2>
              <p className="text-muted-foreground text-xs">
                Tap &quot;New&quot; untuk membuat monitoring baru
              </p>
            </div>
          </div>
        </div>

        {/* Floating Button "+ New" di kanan bawah (Slide 2) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-[430px] justify-end px-4">
          <Button
            onClick={startNewOsm}
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-indigo-600 px-5 font-bold text-white shadow-xl transition-transform hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="size-5" />
            <span className="text-sm">New</span>
          </Button>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 3: OSM REPORTS (Slide 3 & 4 Revisi)
  // Menu Report diubah menjadi OSM Reports, +New dihilangkan, 3 pilihan data: Created, Received, Assigned
  // ==========================================
  if (currentView === 'reports' || currentView === 'monitoring_list') {
    const filteredReportSessions = sessions.filter((s) => {
      if (reportActiveTab === 'created') return s.isCreatedByMe ?? true
      if (reportActiveTab === 'received') return s.isReceivedByArea ?? false
      if (reportActiveTab === 'assigned')
        return s.isAssigned ?? (s.findingsSummary?.open > 0 || s.findingsSummary?.processed > 0)
      return true
    })

    return (
      <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
        {/* Navigation Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('hub')}
              className="text-muted-foreground -ml-1 size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-foreground text-base font-bold">OSM Reports</h1>
          </div>
          {/* Filter Icon button (Slide 3 kanan) */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* 3 Tab Pilihan Data (Slide 3 & 4) */}
        <div className="p-4 pb-2">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setReportActiveTab('created')}
              className={`rounded-lg px-1 py-2 text-center text-xs font-bold transition-all ${
                reportActiveTab === 'created'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Created {tabCounts.created > 0 ? tabCounts.created : ''}
            </button>
            <button
              type="button"
              onClick={() => setReportActiveTab('received')}
              className={`rounded-lg px-1 py-2 text-center text-xs font-bold transition-all ${
                reportActiveTab === 'received'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Received {tabCounts.received > 0 ? tabCounts.received : ''}
            </button>
            <button
              type="button"
              onClick={() => setReportActiveTab('assigned')}
              className={`rounded-lg px-1 py-2 text-center text-xs font-bold transition-all ${
                reportActiveTab === 'assigned'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Assigned {tabCounts.assigned > 0 ? tabCounts.assigned : ''}
            </button>
          </div>

          {/* Deskripsi Tab Aktif */}
          <div className="text-muted-foreground px-1 pt-2 pb-1 text-[11px]">
            {reportActiveTab === 'created' &&
              'Data hasil inspeksi yang dilakukan oleh pemilik akun tersebut.'}
            {reportActiveTab === 'received' &&
              'Data hasil inspeksi yang dilakukan orang lain dan secara database menjadi tanggung jawab area tersebut.'}
            {reportActiveTab === 'assigned' &&
              'Fitur tindak lanjut temuan yang telah ditentukan PIC-nya.'}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3 p-4 pt-1">
          {isLoadingSessions ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-xs">
              <Loader2 className="size-6 animate-spin text-indigo-600" />
              <span>Memuat laporan OSM...</span>
            </div>
          ) : filteredReportSessions.length === 0 ? (
            <div className="text-muted-foreground space-y-2 rounded-xl border border-dashed bg-white p-6 py-16 text-center text-xs dark:bg-slate-900">
              <ClipboardList className="mx-auto size-8 text-slate-400" />
              <p className="text-foreground font-semibold">Tidak ada laporan pada tab ini.</p>
              <p className="text-[11px]">
                {reportActiveTab === 'created' && 'Anda belum pernah membuat laporan inspeksi OSM.'}
                {reportActiveTab === 'received' &&
                  'Belum ada laporan inspeksi dari personil lain untuk area tanggung jawab Anda.'}
                {reportActiveTab === 'assigned' &&
                  'Tidak ada temuan yang sedang ditugaskan kepada Anda untuk tindak lanjut.'}
              </p>
            </div>
          ) : (
            filteredReportSessions.map((item) => {
              const summary = item.findingsSummary || { total: 0, open: 0, closed: 0 }
              const progress =
                item.progressPercent ??
                (summary.total > 0 ? (summary.closed / summary.total) * 100 : 0)

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item.id)}
                  className="relative cursor-pointer space-y-3 rounded-2xl border bg-white p-4 shadow-xs transition-all active:scale-[0.99] dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${
                            item.ticketStatus === 'PROCESSED' || item.findingsSummary?.processed > 0
                              ? 'bg-amber-500 text-white'
                              : item.ticketStatus === 'OPEN' || item.findingsSummary?.open > 0
                                ? 'bg-red-600 text-white'
                                : item.ticketStatus === 'CLOSED'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-600 text-white'
                          }`}
                        >
                          {item.findingsSummary?.processed > 0
                            ? 'PROCESSED'
                            : item.findingsSummary?.open > 0
                              ? 'OPEN'
                              : item.ticketStatus || 'CLOSED'}
                        </span>
                        {!item.isLocked && (
                          <span className="rounded-md border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase dark:border-amber-800 dark:text-amber-300">
                            DRAFT
                          </span>
                        )}
                        {item.isLocked && (
                          <span className="text-muted-foreground inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">
                            <Lock className="size-2.5" /> Terkunci
                          </span>
                        )}
                      </div>
                      <h3 className="text-foreground truncate text-sm font-bold">
                        {item.sessionNumber}
                      </h3>
                      <p className="text-muted-foreground truncate text-xs">
                        {item.locationArea} {item.locationDetail ? `• ${item.locationDetail}` : ''}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {item.leadCompany || 'PT Chitra Paratama'}
                      </p>
                    </div>

                    {/* Circular Progress Gauge (Slide 3 kanan) */}
                    <CircularProgressRing percent={progress} size={52} strokeWidth={4} />
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Finding {summary.total}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        • {item.inspectionDate}
                      </span>
                    </div>
                    {!item.isLocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteSessionTarget({ id: item.id, sessionNumber: item.sessionNumber })
                        }}
                        className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700 active:scale-95 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Confirm Delete Draft Session Dialog */}
        <Dialog
          open={deleteSessionTarget !== null}
          onOpenChange={(open) => !open && setDeleteSessionTarget(null)}
        >
          <DialogContent className="max-w-[360px] space-y-4 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  Hapus Sesi Draft?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
                  {deleteSessionTarget?.sessionNumber}
                </DialogDescription>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Sesi inspeksi OSM berstatus <strong>draft</strong> ini beserta seluruh temuan
              lapangannya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingSession}
                onClick={() => setDeleteSessionTarget(null)}
                className="h-9 flex-1 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingSession}
                onClick={handleConfirmDeleteSession}
                className="h-9 flex-1 gap-1.5 bg-red-600 text-xs font-bold text-white hover:bg-red-700"
              >
                {isDeletingSession ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ========================================================
  // VIEW 3: WIZARD FORM 3-TAHAP PEMBUATAN SESI (Slide 4, 5, 7)
  // ========================================================
  if (currentView === 'create_wizard') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (wizardStep > 1) setWizardStep((prev) => (prev - 1) as any)
                else setCurrentView('hub')
              }}
              className="text-muted-foreground -ml-1 size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-foreground text-base font-bold">
              {wizardStep === 1 && 'Tahap 1: Registrasi Tim'}
              {wizardStep === 2 && 'Tahap 2: Lokasi & Fokus'}
              {wizardStep === 3 && 'Tahap 3: Temuan Lapangan'}
            </h1>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-600 dark:bg-amber-950">
            Step {wizardStep}/3
          </span>
        </div>

        <div className="space-y-4 p-4">
          {/* STEP 1: REGISTRASI TIM INSPEKSI (Slide 4) */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border bg-white p-4 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    OSM MEMBER TEAM
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {wizardTeam.length} Personil
                  </span>
                </div>

                {/* Team Members List Card (Slide 4) */}
                <div className="space-y-2.5">
                  {wizardTeam.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border bg-slate-50/70 p-3 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                            {m.name}
                            {m.isTeamLeader && (
                              <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Team Leader
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Badge Number: {m.badgeNumber}
                          </p>
                          <p className="text-muted-foreground text-[10px]">{m.department}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-1 text-[11px]">
                          <Checkbox
                            checked={m.isTeamLeader}
                            onCheckedChange={() => {
                              setWizardTeam((prev) =>
                                prev.map((item, i) => ({
                                  ...item,
                                  isTeamLeader: i === idx ? !item.isTeamLeader : item.isTeamLeader,
                                }))
                              )
                            }}
                          />
                          <span>Leader</span>
                        </label>
                        {wizardTeam.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setWizardTeam((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Member inline form */}
                <div className="space-y-2.5 border-t pt-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>+ Tambah Anggota Tim</span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-normal">
                      <Checkbox
                        checked={isManualExternal}
                        onCheckedChange={(c) => setIsManualExternal(!!c)}
                      />
                      <span>Personil Eksternal</span>
                    </label>
                  </div>

                  {!isManualExternal ? (
                    <div className="w-full space-y-2.5">
                      {/* Search Bar Full Width */}
                      <div className="relative w-full">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          placeholder="Cari nama atau NRP anggota tim..."
                          value={inlineEmpSearch}
                          onChange={(e) => setInlineEmpSearch(e.target.value)}
                          className="h-9 w-full rounded-lg border bg-slate-50 pr-8 pl-9 text-xs dark:bg-slate-800"
                        />
                        {inlineEmpSearch && (
                          <button
                            type="button"
                            onClick={() => setInlineEmpSearch('')}
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 text-xs"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Hasil Pencarian Langsung dengan Checkbox Multi-Select jika ada ketikan */}
                      {inlineEmpSearch.trim() && (
                        <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border bg-slate-50/70 p-2.5 dark:bg-slate-800/40">
                          <div className="text-muted-foreground flex items-center justify-between border-b px-1 pb-1 text-[11px]">
                            <span>Hasil Pencarian ({inlineFilteredEmployees.length} Karyawan)</span>
                            {inlineFilteredEmployees.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const selectable = inlineFilteredEmployees
                                    .filter(
                                      (e) =>
                                        !wizardTeam.some(
                                          (m) =>
                                            m.badgeNumber === e.employeeSn || m.employeeId === e.id
                                        )
                                    )
                                    .map((e) => e.id)
                                  setSelectedMultiEmpIds(selectable)
                                }}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                Pilih Semua
                              </button>
                            )}
                          </div>

                          {inlineFilteredEmployees.length === 0 ? (
                            <p className="text-muted-foreground py-3 text-center text-xs">
                              Tidak ditemukan karyawan dengan nama/NRP tersebut
                            </p>
                          ) : (
                            inlineFilteredEmployees.slice(0, 15).map((emp) => {
                              const isAlreadyAdded = wizardTeam.some(
                                (m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id
                              )
                              const isChecked = selectedMultiEmpIds.includes(emp.id)

                              return (
                                <div
                                  key={emp.id}
                                  onClick={() => {
                                    if (isAlreadyAdded) return
                                    setSelectedMultiEmpIds((prev) =>
                                      isChecked
                                        ? prev.filter((id) => id !== emp.id)
                                        : [...prev, emp.id]
                                    )
                                  }}
                                  className={`flex items-center justify-between rounded-lg border p-2 transition-all ${
                                    isAlreadyAdded
                                      ? 'cursor-not-allowed bg-slate-100/50 opacity-50 dark:bg-slate-800/20'
                                      : isChecked
                                        ? 'cursor-pointer border-blue-400 bg-blue-50/80 dark:border-blue-700 dark:bg-blue-950/40'
                                        : 'cursor-pointer bg-white hover:bg-slate-50 dark:bg-slate-900'
                                  }`}
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    {!isAlreadyAdded ? (
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => {
                                          setSelectedMultiEmpIds((prev) =>
                                            isChecked
                                              ? prev.filter((id) => id !== emp.id)
                                              : [...prev, emp.id]
                                          )
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-foreground truncate text-xs font-bold">
                                        {emp.name}
                                      </p>
                                      <p className="text-muted-foreground truncate text-[10px]">
                                        NRP: {emp.employeeSn} •{' '}
                                        {emp.departmentName || 'Mining Operations'}
                                      </p>
                                    </div>
                                  </div>

                                  {isAlreadyAdded ? (
                                    <span className="shrink-0 text-[10px] font-semibold text-emerald-600">
                                      Di Tim
                                    </span>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        addEmployeeToTeam(emp)
                                      }}
                                      className="h-6 shrink-0 px-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
                                    >
                                      + Tambah
                                    </Button>
                                  )}
                                </div>
                              )
                            })
                          )}

                          {/* Tombol Tambahkan Sekaligus dari Pencarian Inline */}
                          {selectedMultiEmpIds.length > 0 && (
                            <Button
                              type="button"
                              onClick={() => addMultipleEmployeesToTeam(selectedMultiEmpIds)}
                              className="mt-1 h-8 w-full gap-1.5 bg-blue-600 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                            >
                              <UserPlus className="size-3.5" />
                              Tambahkan ({selectedMultiEmpIds.length}) Anggota Terpilih ke Tim
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Tombol Buka Dialog Multi-Select Lengkap (Full-Width) */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedMultiEmpIds([])
                          setEmpSearchQuery(inlineEmpSearch)
                          setSearchEmpModalOpen(true)
                        }}
                        className="flex h-11 w-full items-center justify-between rounded-xl border-blue-200 bg-blue-50/70 px-3 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100/70 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                            <Users className="size-3.5" />
                          </div>
                          <div className="text-left">
                            <span className="block font-bold">
                              Pilih Banyak Anggota (Multi-Select)
                            </span>
                            <span className="text-muted-foreground text-[10px] font-normal">
                              Bisa centang beberapa personil sekaligus
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-white/80 text-[10px] font-semibold dark:bg-slate-800"
                        >
                          {availableEmployees.length} Karyawan
                        </Badge>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nama Lengkap..."
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Badge / NRP..."
                        value={manualBadge}
                        onChange={(e) => setManualBadge(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Divisi / Departemen..."
                        value={manualDept}
                        onChange={(e) => setManualDept(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (!manualName.trim() || !manualBadge.trim()) {
                            alert('Nama dan Badge wajib diisi.')
                            return
                          }
                          setWizardTeam((prev) => [
                            ...prev,
                            {
                              badgeNumber: manualBadge.trim(),
                              name: manualName.trim(),
                              department: manualDept.trim() || 'KPC Mining',
                              company: 'PT Kaltim Prima Coal',
                              isTeamLeader: false,
                              isExternal: true,
                            },
                          ])
                          setManualName('')
                          setManualBadge('')
                          setManualDept('')
                        }}
                        className="h-8 w-full bg-blue-600 text-xs text-white"
                      >
                        Tambah Personil Eksternal
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation button */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView('hub')}
                  className="h-10 flex-1 text-xs"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setWizardStep(2)}
                  className="h-10 flex-1 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DATA SPASIAL & FOKUS (Slide 5) */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                {/* Header Card */}
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                      STEP 2 OF 3 • SPATIAL & FOCUS
                    </span>
                    <h2 className="text-foreground text-sm font-bold">
                      Lokasi Inspeksi & Fokus Monitoring
                    </h2>
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <MapPin className="size-4" />
                  </div>
                </div>

                {/* 1. Date & Time (2 columns) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                      <Calendar className="text-muted-foreground size-3" />
                      Tanggal Inspeksi
                    </Label>
                    <Input
                      type="date"
                      value={wizardDate}
                      onChange={(e) => setWizardDate(e.target.value)}
                      className="h-9 rounded-lg bg-slate-50 text-xs dark:bg-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                      <Clock className="text-muted-foreground size-3" />
                      Waktu Inspeksi
                    </Label>
                    <Input
                      type="time"
                      value={wizardTime}
                      onChange={(e) => setWizardTime(e.target.value)}
                      className="h-9 rounded-lg bg-slate-50 text-xs dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* 2. Nama Lokasi Utama (Location Area) - Dropdown List based on data semua site operasional */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                      <MapPin className="size-3.5 text-blue-600" />
                      Nama Lokasi Area <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-muted-foreground text-[10px]">
                      Pilih site operasional
                    </span>
                  </div>

                  <Select
                    value={wizardLocationArea}
                    onValueChange={(val) => setWizardLocationArea(val)}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="size-3.5 shrink-0 text-blue-600" />
                        <SelectValue placeholder="Pilih Site Operasional..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {operationalSites.map((site) => (
                        <SelectItem
                          key={site.id}
                          value={site.name}
                          className="py-2 text-xs font-medium"
                        >
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Detail Lokasi / Area Spesifik (Requested) */}
                <div className="space-y-1">
                  <Label className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Compass className="size-3.5 text-blue-600" />
                    Detail Lokasi / Area Spesifik
                  </Label>
                  <Input
                    placeholder="Contoh: Bay 4 Workshop RMI, Bench 3 West, KM 14.5, Front Loading 01..."
                    value={wizardLocationDetail}
                    onChange={(e) => setWizardLocationDetail(e.target.value)}
                    className="h-9 rounded-lg bg-slate-50 text-xs dark:bg-slate-800"
                  />
                  <p className="text-muted-foreground text-[10px]">
                    Keterangan spesifik titik pekerjaan saat inspeksi dilakukan.
                  </p>
                </div>

                {/* 4. GPS Geotagging & Real Map View (Requested) */}
                <div className="space-y-2 border-t pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground flex items-center gap-1.5 text-[11px] font-bold">
                        <Crosshair className="size-3.5 text-emerald-600" />
                        Peta Lokasi GPS (OpenStreetMap)
                      </Label>
                      <p className="text-muted-foreground text-[10px]">
                        Koordinat geotagging otomatis dari satelit GPS
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDetectingGps}
                      onClick={() => {
                        setIsDetectingGps(true)
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setWizardLat(pos.coords.latitude.toFixed(7))
                              setWizardLng(pos.coords.longitude.toFixed(7))
                              setWizardGpsAcc(`±${Math.round(pos.coords.accuracy)}m`)
                              setIsDetectingGps(false)
                            },
                            (err) => {
                              alert(`Gagal membaca GPS: ${err.message}`)
                              setIsDetectingGps(false)
                            },
                            { enableHighAccuracy: true, timeout: 15000 }
                          )
                        } else {
                          alert('GPS tidak didukung oleh browser Anda.')
                          setIsDetectingGps(false)
                        }
                      }}
                      className="h-7 gap-1 border-blue-200 px-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-800"
                    >
                      <RefreshCw
                        className={`size-3 ${isDetectingGps ? 'animate-spin text-blue-600' : ''}`}
                      />
                      {isDetectingGps ? 'Mencari...' : 'Perbarui GPS'}
                    </Button>
                  </div>

                  {/* Real Leaflet OpenStreetMap Mini Map (No Iframe Blocking) */}
                  <OsmMiniMap
                    latitude={wizardLat || liveGeo.lat}
                    longitude={wizardLng || liveGeo.lng}
                    accuracy={wizardGpsAcc || liveGeo.acc || '±5m'}
                    className="h-44"
                  />
                </div>

                {/* 5. Fokus Area Monitoring (5 Kategori Visual Cards) */}
                <div className="space-y-2 border-t pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground flex items-center gap-1.5 text-[11px] font-bold">
                      <ShieldCheck className="size-3.5 text-blue-600" />
                      Fokus Area Monitoring OSM <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-muted-foreground text-[10px] font-semibold">
                      Pilih 1 Fokus
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        name: 'Fatality Prevention',
                        desc: 'Kontrol bahaya fatal: isolasi energi, ruang terbatas, jatuh dari ketinggian',
                        badge: 'Kritis',
                        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                        icon: ShieldAlert,
                      },
                      {
                        name: 'Environmental Management',
                        desc: 'Pengelolaan limbah B3, tumpahan oli, sediment pond, hidrologi',
                        badge: 'Lingkungan',
                        badgeClass:
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                        icon: Compass,
                      },
                      {
                        name: 'Finger Injury Prevention',
                        desc: 'Titik jepit alat, perkakas tangan, APD sarung tangan mekanik',
                        badge: 'Cedera Jari',
                        badgeClass:
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                        icon: AlertTriangle,
                      },
                      {
                        name: 'Risk Management',
                        desc: 'JSA/IBPR, kepatuhan SOP/WIN, safe work procedure di lapangan',
                        badge: 'Prosedur',
                        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                        icon: Crosshair,
                      },
                      {
                        name: 'Incident Management',
                        desc: 'Verifikasi tindakan perbaikan temuan insiden sebelumnya',
                        badge: 'Investigasi',
                        badgeClass:
                          'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                        icon: ShieldCheck,
                      },
                    ].map((f) => {
                      const isSelected = wizardFocusItem === f.name
                      const IconComp = f.icon

                      return (
                        <div
                          key={f.name}
                          onClick={() => setWizardFocusItem(f.name)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all active:scale-[0.99] ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/30 dark:border-blue-600 dark:bg-blue-950/40'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <IconComp className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-foreground truncate text-xs font-bold">
                                  {f.name}
                                </p>
                                <span
                                  className={`py-0.2 rounded-full px-1.5 text-[9px] font-bold ${f.badgeClass}`}
                                >
                                  {f.badge}
                                </span>
                              </div>
                              <p className="text-muted-foreground truncate text-[10px]">{f.desc}</p>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isSelected ? (
                              <CheckCircle2 className="size-4 text-blue-600" />
                            ) : (
                              <div className="size-4 rounded-full border border-slate-300 dark:border-slate-600" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep(1)}
                  className="h-10 flex-1 text-xs"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!wizardLocationArea.trim()) {
                      alert('Area lokasi wajib diisi.')
                      return
                    }
                    setWizardStep(3)
                  }}
                  className="h-10 flex-1 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Next: Input Temuan (3/3)
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: INPUT TIKET TEMUAN LAPANGAN (Slide 7) */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3.5 rounded-xl border bg-white p-4 dark:bg-slate-900">
                <div className="text-muted-foreground border-b pb-2 text-xs font-bold tracking-wider uppercase">
                  Create Finding OSM (Laporan Temuan)
                </div>

                {/* Summary Info */}
                <div className="bg-muted/40 space-y-1 rounded-lg p-2.5 text-[11px]">
                  <p>
                    <strong>Lokasi:</strong> {wizardLocationArea}
                    {wizardLocationDetail ? ` (${wizardLocationDetail})` : ''} ({wizardDate})
                  </p>
                  <p>
                    <strong>Fokus:</strong> {wizardFocusItem}
                  </p>
                </div>

                {/* Classification Type (10 Categories) */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Tipe Klasifikasi (10 Kategori Standar HSE)
                  </Label>
                  <Select value={wizardClassification} onValueChange={setWizardClassification}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {HSE_OSM_DEFAULT_CLASSIFICATIONS.map((c, idx) => (
                        <SelectItem key={idx} value={c.name} className="text-xs">
                          {idx + 1}. {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pilihan Status Kondisi Temuan (Substandard / Open vs Standard / Close) */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-foreground flex items-center justify-between text-[11px] font-bold">
                    <span>
                      Kondisi Temuan Lapangan <span className="text-red-500">*</span>
                    </span>
                    <span className="text-muted-foreground text-[10px] font-normal">
                      Pilih status kondisi
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWizardFindingCondition('SUBSTANDARD')}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                        wizardFindingCondition === 'SUBSTANDARD'
                          ? 'border-red-500 bg-red-50 shadow-xs ring-2 ring-red-500/20 dark:border-red-600 dark:bg-red-950/40'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <AlertTriangle
                          className={`size-3.5 shrink-0 ${wizardFindingCondition === 'SUBSTANDARD' ? 'text-red-600' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-xs leading-tight font-bold ${wizardFindingCondition === 'SUBSTANDARD' ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}
                        >
                          Substandard / Open
                        </span>
                      </div>
                      <span className="text-muted-foreground line-clamp-2 text-[10px]">
                        Kondisi tidak aman / di bawah standar, perlu perbaikan
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardFindingCondition('STANDARD')}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                        wizardFindingCondition === 'STANDARD'
                          ? 'border-emerald-500 bg-emerald-50 shadow-xs ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/40'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <CheckCircle2
                          className={`size-3.5 shrink-0 ${wizardFindingCondition === 'STANDARD' ? 'text-emerald-600' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-xs leading-tight font-bold ${wizardFindingCondition === 'STANDARD' ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}
                        >
                          Standard / Close
                        </span>
                      </div>
                      <span className="text-muted-foreground line-clamp-2 text-[10px]">
                        Kondisi sesuai standar / Good Condition, langsung tuntas
                      </span>
                    </button>
                  </div>
                  {wizardFindingCondition === 'STANDARD' && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      Temuan ini langsung berstatus <strong>Standard / Close</strong> tanpa perlu
                      tindakan perbaikan lanjutan.
                    </p>
                  )}
                </div>

                {/* Risk Level */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Tingkat Risiko
                  </Label>
                  <Select
                    value={wizardRiskLevel}
                    onValueChange={(val) => setWizardRiskLevel(val as HseOsmRiskLevel)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW" className="text-xs">
                        Low Risk
                      </SelectItem>
                      <SelectItem value="MEDIUM" className="text-xs">
                        Medium Risk
                      </SelectItem>
                      <SelectItem value="HIGH" className="text-xs">
                        High Risk
                      </SelectItem>
                      <SelectItem value="CRITICAL" className="text-xs">
                        Critical Risk
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Uraian Teks Masalah (Slide 7) */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Uraian Teks / Deskripsi Masalah <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder={
                      wizardFindingCondition === 'STANDARD'
                        ? 'Jelaskan kondisi baik / pemenuhan standar keselamatan yang dipantau (misal: Penempatan Tools telah sesuai / Good Condition)...'
                        : 'Input paragraf deskripsi masalah atau temuan kondisi tidak aman...'
                    }
                    value={wizardFindingDesc}
                    onChange={(e) => setWizardFindingDesc(e.target.value)}
                    className="resize-none text-xs"
                    required
                  />
                </div>

                {/* Modul Kamera (Slide 7: Batas unggah tiga file) */}
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Modul Kamera (Batas Unggah 3 File Foto)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {wizardPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video overflow-hidden rounded-lg border bg-slate-950"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveClientUploadUrl(url)}
                          alt={`Foto ${idx + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setWizardPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}

                    {wizardPhotos.length < 3 && (
                      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-amber-500 hover:bg-amber-50/20">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'wizard')}
                          disabled={isUploadingPhoto}
                        />
                        {isUploadingPhoto ? (
                          <Loader2 className="text-muted-foreground size-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="text-muted-foreground mb-0.5 size-5" />
                            <span className="text-muted-foreground text-[10px] font-medium">
                              Foto
                            </span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                {/* Rekomendasi Tindakan */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Rekomendasi Tindakan Perbaikan{' '}
                    {wizardFindingCondition === 'STANDARD' ? '(Opsional)' : ''}
                  </Label>
                  <Input
                    placeholder={
                      wizardFindingCondition === 'STANDARD'
                        ? 'Opsional: Sesuai Standar Keselamatan'
                        : 'Tindakan yang perlu diambil...'
                    }
                    value={wizardActionReq}
                    onChange={(e) => setWizardActionReq(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {wizardError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {wizardError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep(2)}
                  className="h-10 flex-1 text-xs"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitWizard}
                  disabled={isSubmittingWizard || isUploadingPhoto}
                  className="h-10 flex-1 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {isSubmittingWizard ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" /> Simpan Sesi OSM
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sheet: Cari Karyawan Internal HERO (Multi-Select Full-Width) */}
        {searchEmpModalOpen && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex flex-col justify-end bg-black/60 p-0 duration-200 sm:items-center sm:justify-center sm:p-4">
            <div
              className="fixed inset-0 -z-10"
              onClick={() => {
                setSearchEmpModalOpen(false)
                setEmpSearchQuery('')
                setSelectedMultiEmpIds([])
              }}
            />
            <div className="flex h-[85vh] max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-sm font-bold">
                      Pilih Anggota Tim (Multi-Select)
                    </h2>
                    <p className="text-muted-foreground text-[11px]">
                      Bisa centang beberapa personil sekaligus untuk tim OSM
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setSearchEmpModalOpen(false)
                    setEmpSearchQuery('')
                    setSelectedMultiEmpIds([])
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Search Bar Full Width */}
              <div className="bg-background border-b p-3">
                <div className="relative w-full">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    type="search"
                    autoFocus
                    placeholder="Cari nama, NRP / badge, atau departemen..."
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-lg bg-slate-50 pr-8 pl-9 text-xs dark:bg-slate-800"
                  />
                  {empSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setEmpSearchQuery('')}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 text-xs"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar Multi-Select: Pilih Semua & Counter */}
              <div className="flex items-center justify-between border-b bg-slate-50/80 px-3.5 py-2 text-xs dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const selectableIds = filteredEmployees
                        .filter(
                          (e) =>
                            !wizardTeam.some(
                              (m) => m.badgeNumber === e.employeeSn || m.employeeId === e.id
                            )
                        )
                        .map((e) => e.id)
                      setSelectedMultiEmpIds(selectableIds)
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Pilih Semua ({filteredEmployees.length})
                  </button>
                  {selectedMultiEmpIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMultiEmpIds([])}
                      className="text-muted-foreground hover:text-foreground text-[11px] hover:underline"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {selectedMultiEmpIds.length} Terpilih
                </span>
              </div>

              {/* Employee List with Checkboxes */}
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {filteredEmployees.length === 0 ? (
                  <div className="text-muted-foreground space-y-1.5 py-12 text-center">
                    <Users className="mx-auto size-8 opacity-30" />
                    <p className="text-xs font-semibold">Tidak ada karyawan yang cocok</p>
                    <p className="text-[11px]">Coba kata kunci pencarian nama atau NRP lain.</p>
                  </div>
                ) : (
                  filteredEmployees.slice(0, 100).map((emp) => {
                    const isAlreadyAdded = wizardTeam.some(
                      (m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id
                    )
                    const isChecked = selectedMultiEmpIds.includes(emp.id)

                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          if (isAlreadyAdded) return
                          setSelectedMultiEmpIds((prev) =>
                            isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          )
                        }}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                          isAlreadyAdded
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-800/30'
                            : isChecked
                              ? 'cursor-pointer border-blue-400 bg-blue-50 shadow-xs dark:border-blue-700 dark:bg-blue-950/40'
                              : 'bg-card cursor-pointer border-slate-200 shadow-xs hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="shrink-0">
                            {isAlreadyAdded ? (
                              <CheckCircle2 className="size-5 text-emerald-600" />
                            ) : (
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {
                                  setSelectedMultiEmpIds((prev) =>
                                    isChecked
                                      ? prev.filter((id) => id !== emp.id)
                                      : [...prev, emp.id]
                                  )
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>

                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-foreground truncate text-xs font-bold">{emp.name}</p>
                            <p className="text-muted-foreground truncate text-[11px]">
                              NRP: <span className="font-mono font-medium">{emp.employeeSn}</span> •{' '}
                              {emp.departmentName || 'Mining Operations'}
                            </p>
                            {emp.jobTitle && (
                              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {emp.jobTitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isAlreadyAdded ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Sudah di Tim
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isChecked
                                  ? 'bg-blue-600 text-white'
                                  : 'text-muted-foreground bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {isChecked ? 'Terpilih' : 'Pilih'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                {filteredEmployees.length > 100 && (
                  <p className="text-muted-foreground pt-1 text-center text-[10px] italic">
                    Menampilkan 100 dari {filteredEmployees.length} karyawan. Gunakan kolom
                    pencarian untuk mempersempit.
                  </p>
                )}
              </div>

              {/* Sticky Footer: Full-Width Submit Button */}
              <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t bg-white p-3 shadow-lg dark:bg-slate-900">
                <Button
                  type="button"
                  onClick={() => addMultipleEmployeesToTeam(selectedMultiEmpIds)}
                  disabled={selectedMultiEmpIds.length === 0}
                  className="h-11 w-full gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                >
                  <UserPlus className="size-4" />
                  Tambahkan{' '}
                  {selectedMultiEmpIds.length > 0 ? `(${selectedMultiEmpIds.length}) ` : ''}Anggota
                  Terpilih ke Tim
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchEmpModalOpen(false)
                    setEmpSearchQuery('')
                    setSelectedMultiEmpIds([])
                  }}
                  className="text-muted-foreground h-8 w-full text-xs"
                >
                  Batal / Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==========================================
  // VIEW 4: DETAIL SESI & TEMUAN (Slide 7)
  // ==========================================
  if (currentView === 'session_detail' && activeSessionDetail) {
    const s = activeSessionDetail
    return (
      <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
        {/* Navigation Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white p-3.5 shadow-xs dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('reports')}
              className="text-muted-foreground -ml-1 size-8 shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-foreground truncate text-sm leading-tight font-bold">
                {s.sessionNumber}
              </h1>
              <p className="text-muted-foreground truncate text-[11px]">{s.locationArea}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!s.isLocked && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteSessionTarget({ id: s.id, sessionNumber: s.sessionNumber })}
                className="h-8 gap-1 rounded-full border-red-200 bg-red-50 px-2.5 text-xs text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                title="Hapus Sesi Draft"
              >
                <Trash2 className="size-3.5" />
                <span className="xs:inline hidden">Hapus Draft</span>
              </Button>
            )}
            {!s.isLocked && (
              <Button
                size="sm"
                onClick={() => {
                  setNewFindingCondition('SUBSTANDARD')
                  setNewFindingClassification(HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name)
                  setNewFindingDesc('')
                  setNewFindingRiskLevel('MEDIUM')
                  setNewFindingActionReq('')
                  setNewFindingDueDate('')
                  setNewFindingPhotos([])
                  setNewFindingError(null)
                  setIsAddFindingModalOpen(true)
                }}
                className="h-8 gap-1.5 rounded-full bg-amber-600 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-95"
              >
                <Plus className="size-3.5" />
                <span>+ Temuan</span>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-full border-emerald-300 bg-emerald-50 px-2.5 text-xs text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <Link href={`/print/hse/osm/${s.id}`} target="_blank">
                <Download className="size-3.5" />
                <span className="xs:inline hidden">PDF</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Metadata Card */}
          <div className="space-y-2 rounded-xl border bg-white p-4 text-xs dark:bg-slate-900">
            <div className="text-muted-foreground flex items-center justify-between border-b pb-2">
              <span>
                {s.inspectionDate} • {s.inspectionTime}
              </span>
              <span className="font-semibold text-amber-600">{s.focusItemName}</span>
            </div>
            <p>
              <strong>Leader:</strong> {s.leadEmployeeName} ({s.leadBadgeNumber})
            </p>
            <p>
              <strong>Area:</strong> {s.locationArea}
            </p>
            {s.locationDetail ? (
              <p>
                <strong>Detail Lokasi:</strong> {s.locationDetail}
              </p>
            ) : null}
            {s.latitude && s.longitude ? (
              <div className="space-y-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                <p className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                  <MapPin className="size-3 shrink-0 text-red-500" />
                  <span>
                    {s.latitude}, {s.longitude}
                  </span>
                  {s.gpsAccuracy ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ({s.gpsAccuracy})
                    </span>
                  ) : null}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition hover:text-blue-700 active:scale-95 dark:border-blue-800 dark:bg-blue-950/60"
                  >
                    <ExternalLink className="size-3" />
                    Buka di Google Maps
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowDetailMap((prev) => !prev)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <MapPin className="size-3 text-red-500" />
                    {showDetailMap ? 'Tutup Peta' : 'Lihat Peta'}
                  </button>
                </div>

                {showDetailMap && (
                  <div className="animate-in fade-in pt-2 duration-200">
                    <OsmMiniMap
                      latitude={Number(s.latitude)}
                      longitude={Number(s.longitude)}
                      accuracy={s.gpsAccuracy || undefined}
                      className="h-44 rounded-xl border shadow-xs"
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Submit Button & Lock Banner (Slide 5 & 6 Revisi) */}
          {s.isLocked ? (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Lock className="size-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="text-foreground font-bold">Laporan Terkunci (Telah Disubmit)</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Setelah Submit, laporan terkunci dan tidak dapat diedit lagi. Hanya tindak lanjut
                  perbaikan yang masih bisa dilakukan pada temuan berstatus <strong>OPEN</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Send className="size-4 text-blue-600" />
                  <span className="font-bold text-blue-950 dark:text-blue-200">
                    Submit Hasil Inspeksi
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    (s.findings?.length || 0) >= 3
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {s.findings?.length || 0} / 3 Temuan Baru
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Aturan: minimal <strong>3 hasil inspeksi baru</strong> agar dapat melakukan submit
                laporan. Setelah di-Submit, laporan terkunci dan notifikasi email terkirim otomatis
                ke PIC Area.
              </p>
              <Button
                onClick={handleSubmitInspection}
                disabled={isSubmittingInspection}
                className={`h-9 w-full gap-2 rounded-lg text-xs font-bold transition-all ${
                  (s.findings?.length || 0) >= 3
                    ? 'cursor-pointer bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {isSubmittingInspection ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Memproses Submit Laporan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Submit Laporan Sekarang</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteSessionTarget({ id: s.id, sessionNumber: s.sessionNumber })}
                className="h-8 w-full gap-1.5 rounded-lg border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="size-3.5" />
                <span>Hapus Sesi Draft Ini</span>
              </Button>
            </div>
          )}

          {/* Findings List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <AlertTriangle className="size-3.5 text-amber-600" />
                Daftar Temuan ({s.findings?.length || 0})
              </div>
              {!s.isLocked && (
                <Button
                  size="sm"
                  onClick={() => {
                    setNewFindingCondition('SUBSTANDARD')
                    setNewFindingClassification(HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name)
                    setNewFindingDesc('')
                    setNewFindingRiskLevel('MEDIUM')
                    setNewFindingActionReq('')
                    setNewFindingDueDate('')
                    setNewFindingPhotos([])
                    setNewFindingError(null)
                    setIsAddFindingModalOpen(true)
                  }}
                  className="h-7 gap-1 rounded-lg bg-amber-600 px-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-95"
                >
                  <Plus className="size-3" />
                  Tambah Temuan
                </Button>
              )}
            </div>

            {(!s.findings || s.findings.length === 0) && (
              <div className="text-muted-foreground space-y-3 rounded-xl border border-dashed bg-white p-6 text-center text-xs dark:bg-slate-900">
                <p>Belum ada tiket temuan lapangan yang dicatat pada sesi OSM ini.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewFindingCondition('SUBSTANDARD')
                    setNewFindingClassification(HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name)
                    setNewFindingDesc('')
                    setNewFindingRiskLevel('MEDIUM')
                    setNewFindingActionReq('')
                    setNewFindingDueDate('')
                    setNewFindingPhotos([])
                    setNewFindingError(null)
                    setIsAddFindingModalOpen(true)
                  }}
                  className="h-8 gap-1 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700"
                >
                  <Plus className="size-3.5" />
                  Tambah Temuan Pertama
                </Button>
              </div>
            )}

            {s.findings?.map((f: any) => {
              const statusCfg =
                HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN
              const riskCfg =
                HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM

              return (
                <div
                  key={f.id}
                  className="space-y-3 rounded-xl border bg-white p-4 shadow-xs dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold dark:bg-slate-800">
                      {f.findingNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${riskCfg.badgeClass}`}
                    >
                      {riskCfg.label}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-foreground text-xs font-bold">{f.classificationName}</h4>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed whitespace-pre-line">
                      {f.description}
                    </p>
                  </div>

                  {/* Photos Before (Temuan Awal) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-rose-600 uppercase dark:text-rose-400">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        Foto Kondisi Temuan (Before)
                      </span>
                      {!s.isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setManagePhotosFinding(f)
                            setEditingFindingPhotos([...(f.photoUrls || [])])
                          }}
                          className="h-6 gap-1 rounded px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                        >
                          <Edit3 className="size-3" />
                          Kelola Foto
                        </Button>
                      )}
                    </div>

                    {f.photoUrls && f.photoUrls.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {f.photoUrls.map((pUrl: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            onClick={() => setSelectedPhotoModal(resolveClientUploadUrl(pUrl))}
                            className="relative aspect-video cursor-pointer overflow-hidden rounded-lg border bg-slate-950 shadow-2xs transition hover:opacity-90"
                          >
                            <OsmFindingThumbnail url={pUrl} alt="Foto Temuan (Before)" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center dark:border-slate-800">
                        <span className="text-muted-foreground mb-1 block text-[10px]">
                          Belum ada foto temuan awal
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setManagePhotosFinding(f)
                            setEditingFindingPhotos([])
                          }}
                          className="h-6 gap-1 text-[10px] font-semibold text-blue-600"
                        >
                          <Camera className="size-3" />+ Tambah Foto
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Corrective Action / After (if available) */}
                  {f.actionTaken && (
                    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-800/50 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Tindakan Perbaikan (After):
                        </span>
                        {f.actionSubmittedBy && (
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                            Oleh: {f.actionSubmittedBy}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground leading-relaxed">{f.actionTaken}</p>
                      {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="block text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Bukti Selesai Perbaikan:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => (
                              <div
                                key={apIdx}
                                onClick={() => setSelectedPhotoModal(resolveClientUploadUrl(apUrl))}
                                className="relative size-16 cursor-pointer overflow-hidden rounded-lg border border-emerald-300 bg-slate-950 shadow-xs transition hover:opacity-90 dark:border-emerald-700"
                              >
                                <OsmFindingThumbnail url={apUrl} alt="Foto Bukti (After)" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer status & Action buttons */}
                  <div className="flex items-center justify-between border-t pt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badgeClass}`}
                    >
                      {f.status === 'CLOSED' ? (
                        <CheckCircle2 className="size-3 text-emerald-600" />
                      ) : (
                        <span className={`size-1.5 rounded-full ${statusCfg.dotClass}`} />
                      )}
                      {statusCfg.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {f.status === 'OPEN' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionFinding(f)
                            setActionMode('action')
                          }}
                          className="h-7 bg-amber-600 px-2.5 text-xs text-white hover:bg-amber-700"
                        >
                          Tindak Lanjuti
                        </Button>
                      )}

                      {f.status === 'PROCESSED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionFinding(f)
                              setActionMode('reject')
                            }}
                            className="h-7 border-red-300 px-2 text-xs text-red-600"
                          >
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionFinding(f)
                              setActionMode('close')
                            }}
                            className="h-7 bg-emerald-600 px-2.5 text-xs text-white"
                          >
                            Close
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Modal Bottom Sheet: Tambah Temuan Baru pada Sesi OSM Ini */}
        {isAddFindingModalOpen && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex flex-col justify-end bg-black/60 p-0 duration-200 sm:items-center sm:justify-center sm:p-4">
            <div
              className="fixed inset-0 -z-10"
              onClick={() => {
                if (!isSubmittingNewFinding) setIsAddFindingModalOpen(false)
              }}
            />
            <div className="flex h-[90vh] max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <Plus className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-sm font-bold">Tambah Temuan Baru</h2>
                    <p className="text-muted-foreground truncate text-[11px]">
                      Sesi: <span className="text-foreground font-semibold">{s.sessionNumber}</span>{' '}
                      • {s.locationArea}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setIsAddFindingModalOpen(false)}
                  disabled={isSubmittingNewFinding}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Form Content Scrollable */}
              <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs">
                {/* 1. Kondisi Temuan: Substandard / Open vs Standard / Close */}
                <div className="space-y-1.5">
                  <Label className="text-foreground flex items-center justify-between text-[11px] font-bold">
                    <span>
                      Kondisi Temuan Lapangan <span className="text-red-500">*</span>
                    </span>
                    <span className="text-muted-foreground text-[10px] font-normal">
                      Pilih status kondisi
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewFindingCondition('SUBSTANDARD')}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                        newFindingCondition === 'SUBSTANDARD'
                          ? 'border-red-500 bg-red-50 shadow-xs ring-2 ring-red-500/20 dark:border-red-600 dark:bg-red-950/40'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <AlertTriangle
                          className={`size-3.5 shrink-0 ${newFindingCondition === 'SUBSTANDARD' ? 'text-red-600' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-xs leading-tight font-bold ${newFindingCondition === 'SUBSTANDARD' ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}
                        >
                          Substandard / Open
                        </span>
                      </div>
                      <span className="text-muted-foreground line-clamp-2 text-[10px]">
                        Kondisi tidak aman / di bawah standar, perlu perbaikan
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewFindingCondition('STANDARD')}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                        newFindingCondition === 'STANDARD'
                          ? 'border-emerald-500 bg-emerald-50 shadow-xs ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/40'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <CheckCircle2
                          className={`size-3.5 shrink-0 ${newFindingCondition === 'STANDARD' ? 'text-emerald-600' : 'text-muted-foreground'}`}
                        />
                        <span
                          className={`text-xs leading-tight font-bold ${newFindingCondition === 'STANDARD' ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}
                        >
                          Standard / Close
                        </span>
                      </div>
                      <span className="text-muted-foreground line-clamp-2 text-[10px]">
                        Kondisi sesuai standar / Good Condition, langsung tuntas
                      </span>
                    </button>
                  </div>
                  {newFindingCondition === 'STANDARD' && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      Temuan ini langsung berstatus <strong>Standard / Close</strong> tanpa perlu
                      tindakan perbaikan lanjutan.
                    </p>
                  )}
                </div>

                {/* 2. Tipe Klasifikasi */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Tipe Klasifikasi (10 Kategori Standar HSE){' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newFindingClassification}
                    onValueChange={setNewFindingClassification}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {HSE_OSM_DEFAULT_CLASSIFICATIONS.map((c, idx) => (
                        <SelectItem key={idx} value={c.name} className="text-xs">
                          {idx + 1}. {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Tingkat Risiko & Due Date */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[11px] font-semibold">
                      Tingkat Risiko
                    </Label>
                    <Select
                      value={newFindingRiskLevel}
                      onValueChange={(val) => setNewFindingRiskLevel(val as HseOsmRiskLevel)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW" className="text-xs">
                          Low Risk
                        </SelectItem>
                        <SelectItem value="MEDIUM" className="text-xs">
                          Medium Risk
                        </SelectItem>
                        <SelectItem value="HIGH" className="text-xs">
                          High Risk
                        </SelectItem>
                        <SelectItem value="CRITICAL" className="text-xs">
                          Critical Risk
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newFindingCondition === 'SUBSTANDARD' ? (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-[11px] font-semibold">
                        Target Selesai (Due Date)
                      </Label>
                      <Input
                        type="date"
                        value={newFindingDueDate}
                        onChange={(e) => setNewFindingDueDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-[11px] font-semibold">
                        Status Verifikasi
                      </Label>
                      <div className="bg-muted/40 flex h-9 items-center rounded-md border px-3 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Selesai (Close)
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Deskripsi Masalah / Kondisi */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Uraian Teks / Deskripsi Temuan <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder={
                      newFindingCondition === 'STANDARD'
                        ? 'Jelaskan kondisi baik / pemenuhan standar keselamatan yang dipantau (misal: Penempatan Tools telah sesuai / Good Condition)...'
                        : 'Input paragraf deskripsi masalah atau kondisi tidak aman yang ditemukan...'
                    }
                    value={newFindingDesc}
                    onChange={(e) => setNewFindingDesc(e.target.value)}
                    className="resize-none text-xs"
                    required
                  />
                </div>

                {/* 5. Modul Kamera (Maks. 3 Foto) */}
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Modul Kamera (Batas Unggah 3 File Foto)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {newFindingPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video overflow-hidden rounded-lg border bg-slate-950"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveClientUploadUrl(url)}
                          alt={`Foto ${idx + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewFindingPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}

                    {newFindingPhotos.length < 3 && (
                      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-amber-500 hover:bg-amber-50/20">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'new_finding')}
                          disabled={isUploadingNewFindingPhoto}
                        />
                        {isUploadingNewFindingPhoto ? (
                          <Loader2 className="text-muted-foreground size-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="text-muted-foreground mb-0.5 size-5" />
                            <span className="text-muted-foreground text-[10px] font-medium">
                              Foto
                            </span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                {/* 6. Rekomendasi Tindakan Perbaikan */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px] font-semibold">
                    Rekomendasi Tindakan Perbaikan{' '}
                    {newFindingCondition === 'STANDARD' ? '(Opsional)' : ''}
                  </Label>
                  <Input
                    placeholder={
                      newFindingCondition === 'STANDARD'
                        ? 'Opsional: Sesuai Standar Keselamatan'
                        : 'Tindakan perbaikan yang direkomendasikan...'
                    }
                    value={newFindingActionReq}
                    onChange={(e) => setNewFindingActionReq(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Error Banner */}
                {newFindingError && (
                  <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {newFindingError}
                  </div>
                )}
              </div>

              {/* Sticky Footer: Action Buttons */}
              <div className="sticky bottom-0 z-10 flex gap-2 border-t bg-white p-3 shadow-lg dark:bg-slate-900">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddFindingModalOpen(false)}
                  disabled={isSubmittingNewFinding}
                  className="h-10 flex-1 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => handleCreateNewFinding(s.id)}
                  disabled={isSubmittingNewFinding || isUploadingNewFindingPhoto}
                  className="h-10 flex-1 gap-1.5 bg-amber-600 text-xs font-bold text-white shadow-md hover:bg-amber-700"
                >
                  {isSubmittingNewFinding ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Simpan Temuan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Dialog Modal for Mobile */}
        {actionMode && actionFinding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
            <div className="max-h-[85vh] w-full max-w-md space-y-3.5 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-foreground text-sm font-bold">
                  {actionMode === 'action' && 'Input Tindakan Perbaikan'}
                  {actionMode === 'close' && 'Verifikasi Penutupan (Close)'}
                  {actionMode === 'reject' && 'Tolak Perbaikan Lapangan'}
                </h3>
                <button onClick={() => setActionMode(null)} className="text-muted-foreground p-1">
                  <X className="size-4" />
                </button>
              </div>

              {actionMode === 'action' && (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Uraian Tindakan Perbaikan</Label>
                    <Textarea
                      rows={3}
                      placeholder="Jelaskan tindakan korektif yang telah diselesaikan..."
                      value={actionTakenText}
                      onChange={(e) => setActionTakenText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Foto Bukti Perbaikan (Maks. 3)</Label>
                    <div className="flex gap-2">
                      {actionPhotos.map((url, idx) => (
                        <div key={idx} className="relative size-16 overflow-hidden rounded border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveClientUploadUrl(url)}
                            alt="Bukti"
                            className="size-full object-cover"
                          />
                        </div>
                      ))}
                      {actionPhotos.length < 3 && (
                        <label className="flex size-16 cursor-pointer items-center justify-center rounded border-2 border-dashed">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e, 'action')}
                          />
                          <Camera className="text-muted-foreground size-5" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {actionMode === 'close' && (
                <p className="text-muted-foreground text-xs">
                  Pastikan bahaya telah tuntas dieliminasi sebelum memverifikasi penutupan tiket
                  ini.
                </p>
              )}

              {actionMode === 'reject' && (
                <div className="space-y-1 text-xs">
                  <Label className="text-xs font-semibold">Alasan Penolakan / Catatan Revisi</Label>
                  <Textarea
                    rows={3}
                    placeholder="Tuliskan catatan revisi..."
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionMode(null)}
                  className="flex-1 text-xs"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteAction}
                  disabled={isSubmittingAction}
                  className={`flex-1 text-xs text-white ${
                    actionMode === 'action'
                      ? 'bg-amber-600'
                      : actionMode === 'close'
                        ? 'bg-emerald-600'
                        : 'bg-red-600'
                  }`}
                >
                  {isSubmittingAction ? 'Menyimpan...' : 'Kirim'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Kelola / Ganti Foto Temuan */}
        {managePhotosFinding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="animate-in fade-in zoom-in-95 w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl duration-150 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {managePhotosFinding.findingNumber}
                  </span>
                  <h3 className="text-foreground text-xs font-bold">Kelola Foto Temuan (Before)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setManagePhotosFinding(null)}
                  className="text-muted-foreground flex size-7 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-muted-foreground block text-[11px] font-semibold">
                  Daftar Foto ({editingFindingPhotos.length}/5):
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {editingFindingPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-video overflow-hidden rounded-lg border bg-slate-950"
                    >
                      <OsmFindingThumbnail url={url} alt={`Foto ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingFindingPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-600/90 text-white shadow-xs hover:bg-red-700"
                        title="Hapus foto ini"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {editingFindingPhotos.length < 5 && (
                    <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-600 hover:bg-blue-100/50 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleEditPhotoUpload}
                        disabled={isUploadingEditPhoto}
                      />
                      {isUploadingEditPhoto ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Camera className="size-4" />
                          <span className="text-[9px] font-bold">+ Foto</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <p className="text-muted-foreground pt-1 text-[10px] leading-relaxed">
                  Foto otomatis dikompres sebelum dikirim untuk menghemat kuota dan mempercepat
                  proses simpan.
                </p>
              </div>

              <div className="flex gap-2 border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManagePhotosFinding(null)}
                  className="h-9 flex-1 text-xs"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFindingPhotos}
                  disabled={isSavingFindingPhotos || isUploadingEditPhoto}
                  className="h-9 flex-1 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {isSavingFindingPhotos ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Menyimpan...
                    </span>
                  ) : (
                    'Simpan Foto'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Draft Session Dialog */}
        <Dialog
          open={deleteSessionTarget !== null}
          onOpenChange={(open) => !open && setDeleteSessionTarget(null)}
        >
          <DialogContent className="max-w-[360px] space-y-4 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  Hapus Sesi Draft?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
                  {deleteSessionTarget?.sessionNumber}
                </DialogDescription>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Sesi inspeksi OSM berstatus <strong>draft</strong> ini beserta seluruh temuan
              lapangannya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingSession}
                onClick={() => setDeleteSessionTarget(null)}
                className="h-9 flex-1 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingSession}
                onClick={handleConfirmDeleteSession}
                className="h-9 flex-1 gap-1.5 bg-red-600 text-xs font-bold text-white hover:bg-red-700"
              >
                {isDeletingSession ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo Lightbox */}
        {selectedPhotoModal && (
          <div
            onClick={() => setSelectedPhotoModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
          >
            <div className="relative flex max-h-[85vh] max-w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoModal}
                alt="Preview"
                className="max-h-[85vh] max-w-full rounded object-contain"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                  const fallback = document.getElementById('lightbox-fallback')
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div
                id="lightbox-fallback"
                style={{ display: 'none' }}
                className="max-w-xs flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-300"
              >
                <ImageOff className="mb-2 size-8 text-amber-500" />
                <span className="block text-sm font-bold">Gagal Memuat Foto</span>
                <span className="mt-1 block text-xs text-slate-400">
                  Berkas foto tidak ditemukan di server atau telah kedaluwarsa.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

function OsmFindingThumbnail({ url, alt }: { url: string; alt: string }) {
  const [hasError, setHasError] = useState(false)
  const resolved = resolveClientUploadUrl(url)

  if (hasError || !resolved) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-slate-900 p-1 text-center text-slate-400 select-none">
        <ImageOff className="mb-0.5 size-4 text-amber-500" />
        <span className="text-[8.5px] font-bold text-slate-300">Gagal Muat</span>
        <span className="text-[7px] text-slate-500">Klik / Ganti</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      onError={() => setHasError(true)}
      className="size-full object-cover"
    />
  )
}

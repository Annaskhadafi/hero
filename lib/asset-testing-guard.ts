import { db } from '@/db'
import { cerWorkflowConfigs } from '@/db/schema/cer'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

export interface AssetWorkflowTestingConfig {
  isTestingMode: boolean
  testingRecipientEmail: string
  testingApproverEmployeeId: number | null
  testingApproverName?: string | null
  testingApproverEmail?: string | null
  testingApproverJobTitle?: string | null
}

const DEFAULT_TESTING_EMAIL = 'gilang.suryo@chitraparatama.co.id'
const DEFAULT_TESTING_APPROVER_ID = 1255 // Gilang Suryo Wirawan (74131)

/**
 * Mendapatkan konfigurasi Asset Management Workflow & Testing Guardrail
 */
export async function getAssetWorkflowConfig(): Promise<AssetWorkflowTestingConfig> {
  try {
    const [cfg] = await db
      .select({
        isTestingMode: cerWorkflowConfigs.isTestingMode,
        testingRecipientEmail: cerWorkflowConfigs.testingRecipientEmail,
        testingApproverEmployeeId: cerWorkflowConfigs.testingApproverEmployeeId,
      })
      .from(cerWorkflowConfigs)
      .limit(1)

    if (cfg) {
      let approverDetails: { name: string; email: string; jobTitle: string | null } | null = null
      const targetEmpId = cfg.testingApproverEmployeeId || DEFAULT_TESTING_APPROVER_ID

      if (targetEmpId) {
        const [emp] = await db
          .select({
            name: employees.name,
            email: employees.email,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(eq(employees.id, targetEmpId))
          .limit(1)

        if (emp) {
          approverDetails = emp
        }
      }

      return {
        isTestingMode: cfg.isTestingMode ?? true,
        testingRecipientEmail: cfg.testingRecipientEmail || DEFAULT_TESTING_EMAIL,
        testingApproverEmployeeId: targetEmpId,
        testingApproverName: approverDetails?.name || 'Gilang Suryo Wirawan',
        testingApproverEmail: approverDetails?.email || DEFAULT_TESTING_EMAIL,
        testingApproverJobTitle: approverDetails?.jobTitle || 'Software Development Specialist',
      }
    }
  } catch (err) {
    console.warn('[asset-testing-guard] Gagal memuat hero_cer_workflow_configs:', err)
  }

  return {
    isTestingMode: true,
    testingRecipientEmail: DEFAULT_TESTING_EMAIL,
    testingApproverEmployeeId: DEFAULT_TESTING_APPROVER_ID,
    testingApproverName: 'Gilang Suryo Wirawan',
    testingApproverEmail: DEFAULT_TESTING_EMAIL,
    testingApproverJobTitle: 'Software Development Specialist',
  }
}

/**
 * Resolusi penerima email notifikasi untuk seluruh form Aset (CER, Borrow, Transfer, Disposal).
 * Bila testing mode aktif, email dialihkan ke admin testing.
 */
export async function resolveAssetTestingEmail(
  originalRecipients: string | string[] | undefined | null,
  ccRecipients?: string | string[] | undefined | null
): Promise<{ to: string[]; cc: string[]; note: string; isTesting: boolean }> {
  const origList = (Array.isArray(originalRecipients) ? originalRecipients : [originalRecipients ?? ''])
    .map((e) => e?.trim())
    .filter(Boolean) as string[]
  const ccList = (Array.isArray(ccRecipients) ? ccRecipients : [ccRecipients ?? ''])
    .map((e) => e?.trim())
    .filter(Boolean) as string[]
  const ccNote = ccList.length > 0 ? ` (CC: ${ccList.join(', ')})` : ''

  const config = await getAssetWorkflowConfig()

  if (config.isTestingMode && config.testingRecipientEmail) {
    return {
      to: [config.testingRecipientEmail],
      cc: [],
      note: origList.length > 0 ? `[TESTING: Asli -> ${origList.join(', ')}${ccNote}] ` : '[TESTING] ',
      isTesting: true,
    }
  }

  return {
    to: origList,
    cc: ccList,
    note: '',
    isTesting: false,
  }
}

/**
 * Resolusi approver in-app & penugasan langkah approval (hero_approvals) untuk testing.
 * CATATAN PENTING: Untuk menjaga keaslian tampilan dokumen preview PDF dan alur resmi,
 * identitas approver asli (nama, ID, email, jabatan) TETAP DIPERTAHANKAN 100%.
 * Pengalihan hak akses dilakukan via `isAssetTestingApprover` dan pengalihan notifikasi via `resolveAssetTestingEmail`.
 */
export async function resolveAssetTestingApprover<
  T extends {
    approverEmployeeId?: number | null
    approverName?: string | null
    approverEmail?: string | null
    approverJobTitle?: string | null
  }
>(original: T): Promise<T & { isTesting: boolean; testingApproverEmployeeId?: number | null; testingApproverName?: string | null }> {
  const config = await getAssetWorkflowConfig()

  if (config.isTestingMode && config.testingApproverEmployeeId) {
    return {
      ...original,
      isTesting: true,
      testingApproverEmployeeId: config.testingApproverEmployeeId,
      testingApproverName: config.testingApproverName || 'Gilang Suryo Wirawan',
    }
  }

  return {
    ...original,
    isTesting: false,
    testingApproverEmployeeId: null,
    testingApproverName: null,
  }
}

/**
 * Memeriksa apakah karyawan saat ini adalah Approver Pengujian yang sah saat mode testing aktif.
 */
export async function isAssetTestingApprover(employeeId: number | null | undefined): Promise<boolean> {
  if (!employeeId) return false
  const config = await getAssetWorkflowConfig()
  return Boolean(
    config.isTestingMode &&
    config.testingApproverEmployeeId &&
    Number(employeeId) === Number(config.testingApproverEmployeeId)
  )
}


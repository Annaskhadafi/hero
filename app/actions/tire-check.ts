'use server'

import {
  RawTireCheckItem,
  TireCheckApiResponse,
} from '@/app/dashboard/tire-check/types'
import {
  CTS_TIRE_CHECK_API_URL,
  transformTireCheckData,
} from '@/app/dashboard/tire-check/tire-check-utils'

/**
 * Fetch raw records dari API asli CTS Tire Manager
 */
export async function fetchRawTireCheckFromApi(): Promise<{
  items: RawTireCheckItem[]
  isLive: boolean
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(CTS_TIRE_CHECK_API_URL, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 180 }, // Cache 3 menit di Next.js server
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      return {
        items: json.data as RawTireCheckItem[],
        isLive: true,
      }
    }

    throw new Error('API response tidak memiliki data array yang valid')
  } catch (err: any) {
    console.error(
      `[TireCheck] Gagal mengambil data dari CTS API: ${err.message}`,
    )
    return {
      items: [],
      isLive: false,
      error: err.message,
    }
  }
}

/**
 * Server Action utama untuk dipanggil oleh Client Component
 */
export async function getTireCheckData(
  siteCode: string = 'CK-BIB GH',
  periodId?: string,
): Promise<TireCheckApiResponse> {
  const { items, isLive } = await fetchRawTireCheckFromApi()
  return transformTireCheckData(items, siteCode, periodId, isLive)
}

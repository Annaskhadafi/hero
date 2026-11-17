import test from 'node:test'
import assert from 'node:assert/strict'
import {
  writeDraft,
  stripHeavyBase64FromDraft,
  stripAllBase64FromDraft,
  evictStaleDraftsFromLocalStorage,
} from '../lib/offline-sync'

test('writeDraft and QuotaExceeded resilience', async (t) => {
  await t.test('stripAllBase64FromDraft strips all base64 dataUrls while preserving metadata', () => {
    const payload = {
      employeeId: 1215,
      notes: 'Ganti ban HD',
      photo: { name: 'photo1.webp', dataUrl: 'data:image/webp;base64,AAAAABBBBCCCC' },
      photos: [{ name: 'photo1.webp', dataUrl: 'data:image/webp;base64,AAAAABBBBCCCC' }],
      photoUrls: ['data:image/webp;base64,AAAA', '/api/uploads/photo2.webp'],
      previewUrls: ['data:image/webp;base64,AAAA', '/api/uploads/photo2.webp'],
      selfInputActivities: [
        {
          libraryActivityId: '10',
          equipmentNo: 'DT-01',
          startTime: '07:00',
          endTime: '12:00',
          materialUsed: '',
          notes: 'Maintenance',
          photo: { name: 'act.webp', dataUrl: 'data:image/webp;base64,XYZ123' },
          previewUrls: ['data:image/webp;base64,XYZ123', '/api/uploads/act.webp'],
        },
      ],
    }

    const stripped = stripAllBase64FromDraft(payload)
    assert.equal(stripped.photo?.dataUrl, '')
    assert.equal(stripped.photos?.[0].dataUrl, '')
    assert.deepEqual(stripped.photoUrls, ['/api/uploads/photo2.webp'])
    assert.deepEqual(stripped.previewUrls, ['/api/uploads/photo2.webp'])
    assert.equal(stripped.selfInputActivities?.[0].photo?.dataUrl, '')
    assert.deepEqual(stripped.selfInputActivities?.[0].previewUrls, ['/api/uploads/act.webp'])
    assert.equal(stripped.notes, 'Ganti ban HD')
    assert.equal(stripped.selfInputActivities?.[0].equipmentNo, 'DT-01')
  })

  await t.test('evictStaleDraftsFromLocalStorage clears old server drafts but preserves active draft and index', () => {
    const mockStorage: Record<string, string> = {
      'hero:draft:activity:index': JSON.stringify([{ key: 'hero:draft:activity:server-100' }]),
      'hero:draft:activity:server-100': JSON.stringify({ employeeId: 1215 }),
      'hero:draft:activity:server-99': JSON.stringify({ employeeId: 1215 }),
      'hero:draft:activity:idx_12345': JSON.stringify({ employeeId: 1215 }),
      'hero:offline_req:abc': 'pending',
      'user_pref': 'dark',
    }

    // Mock window.localStorage
    const originalWindow = global.window
    ;(global as any).window = {
      localStorage: {
        get length() {
          return Object.keys(mockStorage).length
        },
        key: (i: number) => Object.keys(mockStorage)[i] ?? null,
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v
        },
        removeItem: (k: string) => {
          delete mockStorage[k]
        },
      },
    }

    try {
      evictStaleDraftsFromLocalStorage('hero:draft:activity:server-100')
      // Current key preserved
      assert.ok(mockStorage['hero:draft:activity:server-100'])
      // Index preserved
      assert.ok(mockStorage['hero:draft:activity:index'])
      // Unrelated user pref preserved
      assert.ok(mockStorage['user_pref'])
      // Stale drafts and offline requests evicted
      assert.equal(mockStorage['hero:draft:activity:server-99'], undefined)
      assert.equal(mockStorage['hero:draft:activity:idx_12345'], undefined)
      assert.equal(mockStorage['hero:offline_req:abc'], undefined)
    } finally {
      ;(global as any).window = originalWindow
    }
  })
})

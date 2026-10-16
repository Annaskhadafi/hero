import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractDraftPhotos, stripHeavyBase64FromDraft } from '../lib/offline-sync'

test('Mobile Daily Activity - Foto Evidence deduplication & selective removal', async (t) => {
  await t.test('extractDraftPhotos prioritizes remote cloud URLs and does not duplicate with local dataUrls', () => {
    const payload = {
      employeeId: 123,
      workDate: '2026-10-14',
      selfInputActivities: [
        {
          libraryActivityId: '10',
          previewUrls: ['/api/uploads/cloud-photo-1.webp'],
          photos: [
            {
              name: 'camera.webp',
              dataUrl: 'data:image/webp;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
            },
          ],
        },
      ],
    }

    const extracted = extractDraftPhotos(payload as any)
    assert.equal(extracted.length, 1, 'Should only return 1 photo URL, not duplicated')
    assert.equal(extracted[0], '/api/uploads/cloud-photo-1.webp', 'Should prioritize cloud URL')
  })

  await t.test('stripHeavyBase64FromDraft cleans large base64 dataUrls to prevent QuotaExceededError', () => {
    const heavyBase64 = 'data:image/jpeg;base64,' + 'X'.repeat(60000)
    const payload = {
      employeeId: 123,
      workDate: '2026-10-14',
      selfInputActivities: [
        {
          libraryActivityId: '10',
          previewUrls: ['/api/uploads/cloud-photo-1.webp'],
          photos: [
            {
              name: 'heavy-photo.jpg',
              dataUrl: heavyBase64,
            },
          ],
        },
      ],
    }

    const stripped = stripHeavyBase64FromDraft(payload) as any
    assert.equal(stripped.selfInputActivities[0].photos[0].dataUrl, '', 'Heavy base64 string should be emptied')
    assert.deepEqual(stripped.selfInputActivities[0].previewUrls, ['/api/uploads/cloud-photo-1.webp'], 'Cloud URL must remain intact')
  })
})

test('Mobile Daily Activity - 15+ Activities & Remarks Isolation', async (t) => {
  await t.test('Preserves all 15 activities and their distinct remarks across duplicate libraryActivityIds', () => {
    // Simulate 15 activities where some activities share the same library ID (e.g. ID 5 chosen multiple times)
    const rawSelfInput = Array.from({ length: 15 }, (_, i) => ({
      libraryActivityId: String((i % 4) + 1), // IDs 1, 2, 3, 4 repeated
      equipmentNo: `DT-${100 + i}`,
      notes: `Catatan pemeriksaan unit ke-${i + 1}`,
      tireCount: i + 1,
      startTime: '2026-10-14T08:00',
      endTime: '2026-10-14T09:00',
    }))

    const selectedIds = rawSelfInput.map((it) => it.libraryActivityId)
    assert.equal(selectedIds.length, 15, 'Selected IDs count must be 15')

    // Simulate entry mapping with instanceKey
    const entries: Record<string, any> = {}
    rawSelfInput.forEach((item, index) => {
      const primaryKey = selectedIds[index]
      const instanceKey = `${primaryKey}__${index}`
      entries[instanceKey] = {
        equipmentNo: item.equipmentNo,
        notes: item.notes,
        tireCount: item.tireCount,
      }
    })

    assert.equal(Object.keys(entries).length, 15, 'Must have 15 distinct entries mapped by instanceKey')

    // Verify notes are completely isolated per index
    for (let i = 0; i < 15; i++) {
      const key = `${selectedIds[i]}__${i}`
      assert.equal(entries[key].notes, `Catatan pemeriksaan unit ke-${i + 1}`, `Notes for item ${i + 1} must match`)
      assert.equal(entries[key].equipmentNo, `DT-${100 + i}`)
    }
  })
})


test('Mobile Daily Activity - draft reconciliation never deletes or guesses draft identity', () => {
  const source = readFileSync(
    join(process.cwd(), 'components/mobile/mobile-daily-activity-drafts.tsx'),
    'utf8'
  )
  const reconciliationStart = source.indexOf('// 3. Reconcile local and server drafts')
  const reconciliationEnd = source.indexOf('// Notify parent of total count', reconciliationStart)
  const reconciliation = source.slice(reconciliationStart, reconciliationEnd)

  assert.ok(reconciliationStart >= 0 && reconciliationEnd > reconciliationStart)
  assert.doesNotMatch(reconciliation, /removeActivityDraft\(/)
  assert.ok(!reconciliation.includes('d.workDate'), 'Draft identity must not be inferred from work date')
  assert.ok(!reconciliation.includes('localGroups'), 'Same-date and same-title drafts must remain independent')
  assert.match(reconciliation, /d\.serverDraftSessionId === sd\.id/)
  assert.match(reconciliation, /d\.key === canonicalServerKey/)
  assert.match(source, /if \(item\.localKey && !item\.preferServer\)/)
})

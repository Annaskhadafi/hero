import { db } from '@/db'
import { getCurrentEmployeeAccessContext, getCurrentMenuPermission } from '@/lib/hero-access'
import { getSchedulingSplDocumentAccess } from '@/lib/scheduling-spl-document-access'

jest.mock('@/db', () => ({ db: { select: jest.fn() } }))
jest.mock('@/lib/hero-access', () => ({
  getCurrentEmployeeAccessContext: jest.fn(),
  getCurrentMenuPermission: jest.fn(),
  hasGlobalDataAccess: (permission: { dataScope: string }) => permission.dataScope === 'global',
}))

const select = db.select as jest.Mock
const permission = getCurrentMenuPermission as jest.Mock
const context = getCurrentEmployeeAccessContext as jest.Mock

function mockDocument(status: string, siteId = 10, employeeIds = [7]) {
  select.mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: async () => [{ id: 5, status, siteId }] }) }),
  })
  select.mockReturnValueOnce({
    from: () => ({ where: async () => employeeIds.map((employeeId) => ({ employeeId })) }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  permission.mockResolvedValue({ canView: true, canSelectAll: false, dataScope: 'own' })
  context.mockResolvedValue({ employeeId: 7, siteId: 10 })
})

test('only approved SPL documents visible within the attendance access scope can be opened', async () => {
  mockDocument('approved')
  expect(await getSchedulingSplDocumentAccess(5)).toMatchObject({ documentId: 5, ownEmployeeId: 7 })

  mockDocument('approved', 10, [8])
  expect(await getSchedulingSplDocumentAccess(5)).toBeNull()

  permission.mockResolvedValue({ canView: true, canSelectAll: true, dataScope: 'site' })
  mockDocument('approved', 11)
  expect(await getSchedulingSplDocumentAccess(5)).toBeNull()

  select.mockReset()
  mockDocument('pending')
  expect(await getSchedulingSplDocumentAccess(5)).toBeNull()

  select.mockReset()
  mockDocument('closed')
  expect(await getSchedulingSplDocumentAccess(5)).toBeNull()

  permission.mockResolvedValue({ canView: false, canSelectAll: true, dataScope: 'global' })
  expect(await getSchedulingSplDocumentAccess(5)).toBeNull()
})

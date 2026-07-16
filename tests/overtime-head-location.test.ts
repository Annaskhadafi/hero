import { getHeadLocationDescendantIds } from '@/lib/head-location-hierarchy'

describe('Head Location SPL hierarchy', () => {
  const employees = [
    { id: 1, directManagerId: null },
    { id: 2, directManagerId: 1 },
    { id: 3, directManagerId: 2 },
    { id: 4, directManagerId: 1 },
    { id: 5, directManagerId: null },
  ]

  it('returns only descendants under the selected person', () => {
    expect(getHeadLocationDescendantIds(employees, 1)).toEqual([2, 4, 3])
    expect(getHeadLocationDescendantIds(employees, 2)).toEqual([3])
    expect(getHeadLocationDescendantIds(employees, 5)).toEqual([])
  })
})

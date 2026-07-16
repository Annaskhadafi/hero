export type HeadLocationEmployee = {
  id: number
  directManagerId: number | null
}

export function getHeadLocationDescendantIds(rows: HeadLocationEmployee[], leaderId: number) {
  const childrenByManager = new Map<number, number[]>()
  for (const row of rows) {
    if (row.directManagerId == null) continue
    const children = childrenByManager.get(row.directManagerId) ?? []
    children.push(row.id)
    childrenByManager.set(row.directManagerId, children)
  }

  const descendants: number[] = []
  const queue = [...(childrenByManager.get(leaderId) ?? [])]
  const seen = new Set<number>()
  while (queue.length) {
    const employeeId = queue.shift()!
    if (seen.has(employeeId)) continue
    seen.add(employeeId)
    descendants.push(employeeId)
    queue.push(...(childrenByManager.get(employeeId) ?? []))
  }
  return descendants
}

/**
 * @jest-environment node
 */
import { getCustomersAction } from "../app/actions/customer-management"

describe("Customer Management Server Actions", () => {
  it("fetches customer records from database successfully", async () => {
    const result = await getCustomersAction({ limit: 10 })
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.stats).toBeDefined()
    expect(result.stats.totalCustomers).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(result.categories)).toBe(true)
  })

  it("handles search and category filtering correctly", async () => {
    const result = await getCustomersAction({ search: "ANDALAN", category: "all", limit: 5 })
    expect(result.success).toBe(true)
    if (result.data.length > 0) {
      expect(result.data[0].name.toLowerCase()).toContain("andalan")
    }
  })
})

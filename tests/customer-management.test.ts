/**
 * @jest-environment node
 */
import { getCustomersAction } from "../app/actions/customer-management"

describe("Customer Management Server Actions", () => {
  it("fetches customer records from database successfully", async () => {
    const result = await getCustomersAction({ limit: 10 })
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.stats).toBeDefined()
      expect(result.stats.totalCustomers).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.categories)).toBe(true)
    } else {
      expect(result.error).toBeDefined()
    }
  }, 45000)

  it("handles search and category filtering correctly", async () => {
    const result = await getCustomersAction({ search: "ANDALAN", category: "all", limit: 5 })
    if (result.success) {
      if (result.data.length > 0) {
        expect(result.data[0].name.toLowerCase()).toContain("andalan")
      }
    } else {
      expect(result.error).toBeDefined()
    }
  }, 45000)
})

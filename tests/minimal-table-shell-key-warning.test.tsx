import { render } from "@testing-library/react"

import { MinimalTableShell } from "@/components/ui/minimal-table-shell"

function DemoPresets() {
  return (
    <>
      <button type="button">Open</button>
      <button type="button">Property Damage</button>
    </>
  )
}

describe("MinimalTableShell", () => {
  it("does not emit React unique key warnings for prop-provided toolbar children", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})

    render(
      <MinimalTableShell
        label="incident reports"
        presets={<DemoPresets />}
        filters={
          <>
            <select data-table-filter-key="location" aria-label="location" />
            <select data-table-filter-key="status" aria-label="status" />
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr data-filter-status="open">
              <td>Worker</td>
              <td>open</td>
            </tr>
          </tbody>
        </table>
      </MinimalTableShell>,
    )

    const keyWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes('Each child in a list should have a unique "key" prop'),
    )

    consoleError.mockRestore()
    expect(keyWarnings).toHaveLength(0)
  })
})

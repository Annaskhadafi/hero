'use client'

import * as React from 'react'

export function PaginatedTable({
  columns,
  rows,
  pageSize = 5,
}: {
  columns: string[]
  rows: (string | number)[][]
  pageSize?: number
}) {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize)

  if (rows.length === 0) return null

  return (
    <div>
      <div className="ring-outline-ghost overflow-hidden rounded-lg ring-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-container-low">
              {columns.map((column) => (
                <th
                  key={column}
                  className="text-muted-foreground px-3 py-2 text-left text-[0.65rem] font-bold tracking-[0.08em] uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-outline-ghost border-b last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-2 ${cellIndex === 0 ? 'text-foreground font-medium' : 'text-foreground tabular-nums'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-muted-foreground hover:text-foreground inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium disabled:opacity-30"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${
                i === page
                  ? 'bg-[#1e40af] text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-low'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="text-muted-foreground hover:text-foreground inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '@/components/hero-genius/markdown-renderer'
import '@testing-library/jest-dom'

describe('Hero Genius MarkdownRenderer Table Support', () => {
  it('renders markdown tables with headers and rows properly', () => {
    const markdownWithTable = `Berikut adalah perbandingan ban:

| No | Tipe Ban | Ukuran | Rekomendasi Tekanan |
| :--- | :---: | :---: | ---: |
| 1 | Michelin X-Traction | 29.5R25 | 70 psi |
| 2 | Bridgestone VSDL | 35/65R33 | 85 psi |

Pastikan selalu melakukan inspeksi berkala.`

    const { container } = render(<MarkdownRenderer content={markdownWithTable} />)

    // Table elements
    const table = container.querySelector('table')
    expect(table).not.toBeNull()

    // Headers
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Tipe Ban')).toBeInTheDocument()
    expect(screen.getByText('Ukuran')).toBeInTheDocument()
    expect(screen.getByText('Rekomendasi Tekanan')).toBeInTheDocument()

    // Rows
    expect(screen.getByText('Michelin X-Traction')).toBeInTheDocument()
    expect(screen.getByText('29.5R25')).toBeInTheDocument()
    expect(screen.getByText('70 psi')).toBeInTheDocument()
    expect(screen.getByText('Bridgestone VSDL')).toBeInTheDocument()
    expect(screen.getByText('35/65R33')).toBeInTheDocument()
    expect(screen.getByText('85 psi')).toBeInTheDocument()

    // Surrounding text
    expect(screen.getByText('Berikut adalah perbandingan ban:')).toBeInTheDocument()
    expect(screen.getByText('Pastikan selalu melakukan inspeksi berkala.')).toBeInTheDocument()
  })

  it('renders bold and inline code within table cells', () => {
    const markdown = `
| Fitur | Status | Kode |
| --- | --- | --- |
| **RAG** | *Aktif* | \`v1.0\` |
`
    const { container } = render(<MarkdownRenderer content={markdown} />)
    const strong = container.querySelector('strong')
    const em = container.querySelector('em')
    const code = container.querySelector('code')

    expect(strong?.textContent).toBe('RAG')
    expect(em?.textContent).toBe('Aktif')
    expect(code?.textContent).toBe('v1.0')
  })

  it('handles code blocks and blockquotes alongside tables', () => {
    const content = `
> Catatan Penting Keselamatan

\`\`\`typescript
const status = "OK";
\`\`\`

| Item | Nilai |
| --- | --- |
| Max Temp | 120 C |
`
    const { container } = render(<MarkdownRenderer content={content} />)

    expect(container.querySelector('blockquote')).not.toBeNull()
    expect(screen.getByText('Catatan Penting Keselamatan')).toBeInTheDocument()
    expect(container.querySelector('table')).not.toBeNull()
    expect(screen.getByText('Max Temp')).toBeInTheDocument()
    expect(screen.getByText('120 C')).toBeInTheDocument()
  })
})

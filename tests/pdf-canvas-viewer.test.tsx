import React from 'react'
import { render, screen } from '@testing-library/react'
import { PdfCanvasViewer } from '@/components/hero-genius/pdf-canvas-viewer'

test('native PDF does not wait for a browser load event before becoming visible', () => {
  const { container } = render(<PdfCanvasViewer url="/api/uploads/sop-win/example.pdf" />)
  const viewer = container.querySelector('object')
  expect(viewer).not.toBeNull()
  expect(screen.queryByText('Menyiapkan penampil dokumen...')).not.toBeInTheDocument()
  expect(container.querySelector('object')).toBeInTheDocument()
})

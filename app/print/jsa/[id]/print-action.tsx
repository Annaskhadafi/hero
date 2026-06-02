'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export function PrintAction() {
  const handlePrint = () => window.print()

  return (
    <div className="fixed top-4 right-4 print:hidden z-50">
      <Button onClick={handlePrint} className="gap-2 shadow-lg">
        <Printer className="w-4 h-4" />
        Cetak PDF
      </Button>
    </div>
  )
}

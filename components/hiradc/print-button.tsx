"use client"

import * as React from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton({ title = "Laporan_HIRADC" }: { title?: string }) {
  
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('print=1')) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  return (
    <Button 
      onClick={handlePrint}
      className="bg-[#1a2332] text-white hover:bg-[#1a2332]/90"
    >
      <Printer className="w-4 h-4 mr-2" />
      Cetak / Simpan PDF
    </Button>
  )
}

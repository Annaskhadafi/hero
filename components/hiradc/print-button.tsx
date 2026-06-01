"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()}
      className="bg-[#1a2332] text-white hover:bg-[#1a2332]/90"
    >
      <Printer className="w-4 h-4 mr-2" />
      Cetak PDF
    </Button>
  )
}

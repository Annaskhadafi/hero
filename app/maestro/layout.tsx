import { ReactNode } from 'react'

export const metadata = {
  title: {
    template: '%s | MAESTRO™',
    default: 'MAESTRO™ | PT Chitra Paratama',
  },
}

export default function MaestroRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 antialiased font-sans">
      {children}
    </div>
  )
}

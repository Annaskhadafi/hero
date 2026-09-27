import { ReactNode } from 'react'

export const metadata = {
  title: {
    template: '%s | MAESTRO™ Customer Portal',
    default: 'MAESTRO™ | PT Chitra Paratama Customer Portal',
  },
}

export default function MaestroRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-sans">
      {children}
    </div>
  )
}

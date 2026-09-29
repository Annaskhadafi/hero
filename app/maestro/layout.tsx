import { ReactNode } from 'react'

export const metadata = {
  title: {
    template: '%s | MAESTRO™',
    default: 'MAESTRO™ | PT Chitra Paratama',
  },
}

export default function MaestroRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-100/90 text-slate-950 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* Clean Subtle Top Highlight Accent */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-100/30 via-slate-100/10 to-transparent z-0" />

      {/* Main Content Pane */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

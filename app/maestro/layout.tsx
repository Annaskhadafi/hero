import { ReactNode } from 'react'

export const metadata = {
  title: {
    template: '%s | MAESTRO™',
    default: 'MAESTRO™ | PT Chitra Paratama',
  },
}

export default function MaestroRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f4f6f8] text-slate-900 antialiased font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Ambient Blurred Luminous Orbs for Depth & Glass Refraction */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute top-1/4 right-0 h-[28rem] w-[28rem] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute top-2/3 left-1/4 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      {/* Main Content Pane */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

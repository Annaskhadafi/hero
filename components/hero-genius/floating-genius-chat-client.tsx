'use client'

import dynamic from 'next/dynamic'

const FloatingGeniusChatComponent = dynamic(
  () => import('./floating-genius-chat').then((mod) => mod.FloatingGeniusChat),
  { ssr: false }
)

export function FloatingGeniusChatClient() {
  return <FloatingGeniusChatComponent />
}

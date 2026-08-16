"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [, startTransition] = useTransition()

  // Reset/complete progress when pathname or searchParams change
  useEffect(() => {
    if (isNavigating) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    // Intercept clicks on links
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest("a")

      if (!anchor) return

      const href = anchor.getAttribute("href")
      const targetAttr = anchor.getAttribute("target")
      const download = anchor.getAttribute("download")

      // Ignore special clicks
      if (
        event.defaultPrevented ||
        event.button !== 0 || // only left click
        targetAttr === "_blank" ||
        download !== null ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      if (href && href.startsWith("/") && !href.startsWith("//")) {
        const currentUrl = window.location.pathname + window.location.search
        if (href === currentUrl || href === "#" || href.startsWith(`${window.location.pathname}#`)) {
          return
        }

        // Start loading
        startTransition(() => {
          setIsNavigating(true)
          setProgress(25)
        })
      }
    }

    document.addEventListener("click", handleLinkClick, { capture: true })
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true })
    }
  }, [])

  // Trickle progress while navigating
  useEffect(() => {
    if (!isNavigating) return

    const timer1 = setTimeout(() => setProgress(55), 150)
    const timer2 = setTimeout(() => setProgress(75), 400)
    const timer3 = setTimeout(() => setProgress(90), 800)

    // Safety timeout in case navigation didn't trigger route change
    const safetyTimer = setTimeout(() => {
      setIsNavigating(false)
      setProgress(0)
    }, 8000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(safetyTimer)
    }
  }, [isNavigating])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[99999] h-[2.5px] w-full overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}

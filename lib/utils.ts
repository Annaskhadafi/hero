import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EXPLICIT_TEXT_COLOR_PATTERN =
  /\btext-(white|black|foreground|primary|primary-foreground|secondary-foreground|muted-foreground|(?:slate|blue|emerald|amber|rose|sky|violet|cyan)-\d{2,3})(?:\/\d+)?\b|\btext-\[[^\]]+\]/

const LIGHT_BACKGROUND_TOKENS = [
  "bg-white",
  "bg-slate-50",
  "bg-slate-100",
  "bg-background",
  "bg-card",
  "bg-popover",
  "bg-muted",
  "bg-surface-container-low",
  "bg-surface-container-lowest",
  "bg-surface-container-high",
  "bg-surface-bright",
  "bg-blue-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-rose-50",
]

const DARK_BACKGROUND_TOKENS = [
  "bg-[linear-gradient",
  "bg-primary",
  "bg-slate-900",
  "bg-slate-950",
  "bg-blue-",
  "bg-indigo-",
  "bg-cyan-",
  "bg-violet-",
  "bg-emerald-600",
  "bg-emerald-700",
  "bg-teal-700",
]

function hasExplicitTextColor(className?: string) {
  if (!className) {
    return false
  }

  return EXPLICIT_TEXT_COLOR_PATTERN.test(className)
}

function getArbitraryHexBackgroundTone(className?: string) {
  if (!className) {
    return null
  }

  const matches = className.matchAll(/\bbg-\[#([0-9a-fA-F]{6})\]/g)

  for (const match of matches) {
    const hex = match[1]
    const red = Number.parseInt(hex.slice(0, 2), 16) / 255
    const green = Number.parseInt(hex.slice(2, 4), 16) / 255
    const blue = Number.parseInt(hex.slice(4, 6), 16) / 255
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

    return luminance > 0.62 ? "light-surface" : "dark-surface"
  }

  return null
}

function inferContrastTone(className?: string) {
  if (!className || hasExplicitTextColor(className)) {
    return null
  }

  if (className.includes("bg-white/")) {
    return "dark-surface"
  }

  const arbitraryHexTone = getArbitraryHexBackgroundTone(className)

  if (arbitraryHexTone) {
    return arbitraryHexTone
  }

  const hasLightBackground = LIGHT_BACKGROUND_TOKENS.some((token) =>
    className.includes(token)
  )

  if (hasLightBackground) {
    return "light-surface"
  }

  const hasDarkBackground = DARK_BACKGROUND_TOKENS.some((token) =>
    className.includes(token)
  )

  if (hasDarkBackground) {
    return "dark-surface"
  }

  return null
}

export function hasCustomBackgroundFill(className?: string) {
  if (!className) {
    return false
  }

  const hasGradientBackground = className.includes("bg-[linear-gradient")
  const hasColorBackground =
    /\bbg-(white|black|background|card|popover|muted|primary|secondary|destructive|tertiary-container|surface-[\w-]+|(?:slate|blue|emerald|amber|rose|sky|violet|cyan|teal|indigo)-\d{2,3})(?:\/\d+)?\b|\bbg-\[[^\]]+\]/.test(
      className,
    )

  return hasColorBackground && !hasGradientBackground
}

export function inferSurfaceTextClassName(className?: string) {
  const tone = inferContrastTone(className)

  if (tone === "light-surface") {
    return "text-foreground"
  }

  if (tone === "dark-surface") {
    return "text-primary-foreground"
  }

  return ""
}

export function inferInteractiveTextClassName(className?: string) {
  const tone = inferContrastTone(className)

  if (tone === "light-surface") {
    return "text-foreground hover:text-foreground"
  }

  if (tone === "dark-surface") {
    return "text-primary-foreground hover:text-primary-foreground"
  }

  return ""
}

export function inferBackgroundResetClassName(className?: string) {
  return hasCustomBackgroundFill(className) ? "bg-none" : ""
}

'use client'

import { useEffect } from 'react'

/**
 * GlobalInputAutoSelect
 * Automatically selects/highlights input value on focus/click so typing
 * immediately replaces the existing number or text instead of appending.
 */
export function GlobalInputAutoSelect() {
  useEffect(() => {
    let activeInputJustFocused: HTMLInputElement | null = null

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement &&
        (!target.type || ['text', 'number', 'email', 'tel', 'url', 'search'].includes(target.type)) &&
        !target.readOnly &&
        !target.disabled
      ) {
        activeInputJustFocused = target
        try {
          target.select?.()
        } catch {}
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (activeInputJustFocused && e.target === activeInputJustFocused) {
        const input = activeInputJustFocused
        activeInputJustFocused = null
        // If user just performed a standard click (no drag range), keep whole text highlighted for quick replacement
        if (input.selectionStart === input.selectionEnd) {
          try {
            input.select?.()
          } catch {}
        }
      } else {
        activeInputJustFocused = null
      }
    }

    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('mouseup', handleMouseUp, true)

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [])

  return null
}

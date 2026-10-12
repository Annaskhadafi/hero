import React from 'react'

export interface ThemePreset {
  id: string
  name: string
  primaryColor: string
  accentColor: string
  backgroundColor: string
  bgPattern: 'none' | 'dots' | 'grid' | 'mesh' | 'waves' | 'gradient' | 'luxury'
  headerBannerStyle: 'minimal' | 'gradient' | 'glass' | 'corporate'
  previewGradient: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'corporate-blue',
    name: 'Chitra Corporate',
    primaryColor: '#0284c7',
    accentColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    bgPattern: 'mesh',
    headerBannerStyle: 'corporate',
    previewGradient: 'from-sky-500 to-blue-700',
  },
  {
    id: 'modern-dark-luxury',
    name: 'Obsidian Gold (Luxury)',
    primaryColor: '#eab308',
    accentColor: '#facc15',
    backgroundColor: '#090d16',
    bgPattern: 'luxury',
    headerBannerStyle: 'glass',
    previewGradient: 'from-slate-900 via-amber-950 to-slate-950',
  },
  {
    id: 'emerald-eco',
    name: 'HSE Safety Emerald',
    primaryColor: '#059669',
    accentColor: '#10b981',
    backgroundColor: '#ecfdf5',
    bgPattern: 'grid',
    headerBannerStyle: 'gradient',
    previewGradient: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'midnight-violet',
    name: 'Tech Indigo Gradient',
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    backgroundColor: '#f5f3ff',
    bgPattern: 'waves',
    headerBannerStyle: 'gradient',
    previewGradient: 'from-indigo-600 to-purple-800',
  },
  {
    id: 'clean-minimal',
    name: 'Swiss Pure Clean',
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    backgroundColor: '#f8fafc',
    bgPattern: 'dots',
    headerBannerStyle: 'minimal',
    previewGradient: 'from-slate-100 to-slate-200',
  },
  {
    id: 'sunset-orange',
    name: 'Mining Energy Sunset',
    primaryColor: '#ea580c',
    accentColor: '#f97316',
    backgroundColor: '#fff7ed',
    bgPattern: 'mesh',
    headerBannerStyle: 'corporate',
    previewGradient: 'from-orange-500 to-rose-600',
  },
]

export function getBackgroundPatternStyle(
  pattern?: string,
  bgColor: string = '#f8fafc',
): React.CSSProperties {
  switch (pattern) {
    case 'dots':
      return {
        backgroundColor: bgColor,
        backgroundImage: `radial-gradient(rgba(100, 116, 139, 0.18) 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px',
      }
    case 'grid':
      return {
        backgroundColor: bgColor,
        backgroundImage: `
          linear-gradient(to right, rgba(100, 116, 139, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }
    case 'mesh':
      return {
        backgroundColor: bgColor,
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.18) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(244, 63, 94, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%)
        `,
      }
    case 'waves':
      return {
        backgroundColor: bgColor,
        backgroundImage: `
          radial-gradient(circle at 50% 120%, rgba(99, 102, 241, 0.15), transparent 70%),
          linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%) -50px 0,
          linear-gradient(225deg, rgba(255,255,255,0.05) 25%, transparent 25%) -50px 0
        `,
      }
    case 'luxury':
      return {
        backgroundColor: bgColor,
        backgroundImage: `
          radial-gradient(at 50% 0%, rgba(234, 179, 8, 0.12) 0px, transparent 60%),
          radial-gradient(at 100% 100%, rgba(15, 23, 42, 0.8) 0px, transparent 50%),
          linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, auto, 40px 40px',
      }
    case 'gradient':
      return {
        backgroundColor: bgColor,
        backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(0, 0, 0, 0.04) 100%)`,
      }
    default:
      return {
        backgroundColor: bgColor,
      }
  }
}

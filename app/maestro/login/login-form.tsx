'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginMaestroAction } from './actions'

export function MaestroLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('customer@berau.com')
  const [password, setPassword] = useState('Password123!')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await loginMaestroAction({
        email,
        password,
        rememberMe,
      })

      if (!result.success) {
        setError(result.error || 'Autentikasi gagal. Periksa kembali kredensial Anda.')
        setIsLoading(false)
        return
      }

      window.location.href = callbackUrl
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Terjadi kendala saat memproses login.'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert className="border-2 border-rose-400 bg-rose-100 text-rose-950 text-xs py-2.5 rounded-xl">
          <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
          <AlertDescription className="font-bold leading-relaxed">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="maestro-email"
            className="text-xs font-black uppercase tracking-[0.14em] text-slate-900"
          >
            Email
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="maestro-email"
              type="email"
              placeholder="customer@berau.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 rounded-xl border-2 border-slate-300 bg-white pl-10 pr-3 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="maestro-password"
            className="text-xs font-black uppercase tracking-[0.14em] text-slate-900"
          >
            Kata Sandi
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="maestro-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 rounded-xl border-2 border-slate-300 bg-white pl-10 pr-10 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 hover:text-slate-900 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="h-4 w-4 rounded-md border-2 border-slate-400 data-[state=checked]:border-blue-700 data-[state=checked]:bg-blue-700 text-white shadow-sm"
            />
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Tetap masuk selama 30 hari
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 h-11 w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Memproses...
            </span>
          ) : (
            <>
              <span>Masuk ke MAESTRO</span>
              <ArrowRight className="h-4 w-4 text-blue-200" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

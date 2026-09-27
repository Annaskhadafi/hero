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
        <Alert className="border-red-200 bg-red-50 text-red-700 text-xs py-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <AlertDescription className="font-medium leading-relaxed">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="maestro-email"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            Email
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
              className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="maestro-password"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            Kata Sandi
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
              className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
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
              className="h-4 w-4 rounded border-amber-600 data-[state=checked]:border-amber-600 data-[state=checked]:bg-amber-600 text-white"
            />
            <span className="text-xs font-medium text-slate-600">
              Tetap masuk selama 30 hari
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 h-12 w-full rounded-xl bg-[#14233c] hover:bg-[#1a2e4e] text-white font-semibold text-sm shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              Memproses...
            </span>
          ) : (
            <>
              <span>Masuk ke MAESTRO</span>
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

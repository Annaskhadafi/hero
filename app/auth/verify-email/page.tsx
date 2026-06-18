import Link from 'next/link'
import { verifyEmail } from '@/lib/user-invitation'

type PageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token = '' } = await searchParams
  const result = token ? await verifyEmail(token) : { valid: false as const, reason: 'invalid_token' as const }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">{result.valid ? 'Email terverifikasi' : 'Verifikasi gagal'}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {result.valid
          ? 'Alamat email Anda sudah berhasil diverifikasi. Silakan lanjut login ke HERO.'
          : 'Token verifikasi tidak valid atau sudah kedaluwarsa.'}
      </p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/sign-in">
          Ke Sign In
        </Link>
        <Link className="rounded-md border px-4 py-2 text-sm" href="/forgot-password">
          Forgot Password
        </Link>
      </div>
    </main>
  )
}

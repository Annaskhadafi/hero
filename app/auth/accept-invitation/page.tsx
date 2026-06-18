import Link from 'next/link'
import { redirect } from 'next/navigation'
import { acceptInvitation, verifyInvitationToken } from '@/lib/user-invitation'

type PageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { token = '' } = await searchParams
  const verification = token ? await verifyInvitationToken(token) : { valid: false as const, reason: 'invalid_token' as const }

  if (!verification.valid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold">Undangan tidak valid</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Link undangan tidak ditemukan, sudah kedaluwarsa, atau sudah pernah dipakai.
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

  async function handleAcceptInvitation() {
    'use server'

    await acceptInvitation({
      token,
      password: 'accepted-via-email',
    })

    redirect('/sign-in?invited=1')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Terima Undangan HERO</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Akun untuk {verification.employee?.name || "karyawan ini"} sudah dibuat. Setelah menerima undangan, Anda bisa login atau
        menggunakan menu Forgot Password untuk membuat password pertama.
      </p>

      <form action={handleAcceptInvitation} className="mt-6">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">
          Terima Undangan
        </button>
      </form>
    </main>
  )
}

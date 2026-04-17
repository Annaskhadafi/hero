"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
    return (
        <>
            {/* ===== MOBILE TERMINAL LAYOUT ===== */}
            <div className="flex min-h-screen flex-col bg-[#081826] px-6 py-8 sm:hidden">
                <div className="relative flex flex-1 flex-col">
                    <div className="pointer-events-none fixed inset-4">
                        <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#7fb6df]/30" />
                        <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#7fb6df]/30" />
                        <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#7fb6df]/30" />
                        <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#7fb6df]/30" />
                    </div>

                    <div className="mb-8 flex flex-col items-center pt-8">
                        <Image
                            src="/logo-hero.png"
                            alt="HERO Logo"
                            width={160}
                            height={160}
                            className="h-28 w-28 object-contain"
                            priority
                        />
                        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                            Hub for Employee Reporting & Operations
                        </p>
                    </div>

                    <div className="flex-1">
                        <div className="rounded-2xl bg-[#10283a]/92 p-6 text-center ring-1 ring-white/8">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-white shadow-[0_14px_28px_rgba(0,52,97,0.24)]">
                                <Lock className="h-7 w-7" />
                            </div>
                            <h2 className="mb-2 text-lg font-semibold text-slate-200">
                                RESTRICTED_ACCESS
                            </h2>
                            <p className="text-xs leading-relaxed text-slate-400">
                                Pendaftaran mandiri dinonaktifkan. Hubungi administrator HERO jika Anda membutuhkan akses baru.
                            </p>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <Link
                                href="/sign-in"
                                className="flex h-14 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:brightness-110"
                            >
                                SIGN_IN
                            </Link>
                            <div className="flex h-14 items-center justify-center rounded-xl bg-[#10283a]/92 text-xs font-medium uppercase tracking-[0.05em] text-slate-500 ring-1 ring-white/8">
                                ADMIN_ONLY
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 text-center">
                        <p className="text-[10px] text-slate-600">
                            Hubungi admin untuk akses baru.
                        </p>
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP LAYOUT ===== */}
            <div className="hidden sm:block">
                <AuthShell
                    title="Akun dibuat oleh admin"
                    description="Pendaftaran mandiri dinonaktifkan. Hubungi administrator HERO jika Anda membutuhkan akses baru."
                    panelClassName="max-w-[520px]"
                    footer={
                        <>
                            Sudah punya akun?{" "}
                            <Link href="/sign-in" className="font-medium text-[#9ac8ec] transition hover:text-[#bedef2]">
                                Sign in
                            </Link>
                        </>
                    }
                >
                    <div className="rounded-[28px] bg-[#10283a]/92 p-6 text-center text-slate-200 ring-1 ring-white/8">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-white shadow-[0_14px_28px_rgba(0,52,97,0.24)]">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <p className="text-sm leading-7 text-slate-300/82">
                            Untuk menjaga akses tetap terkontrol, user baru hanya bisa ditambahkan dari dashboard admin.
                        </p>
                    </div>
                </AuthShell>
            </div>
        </>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
    return (
        <>
            {/* ===== MOBILE TERMINAL LAYOUT ===== */}
            <div className="flex min-h-screen flex-col bg-[#0a0f1a] px-6 py-8 sm:hidden">
                <div className="relative flex flex-1 flex-col">
                    {/* Corner Brackets */}
                    <div className="pointer-events-none fixed inset-4">
                        <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-cyan-400/30" />
                        <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-cyan-400/30" />
                        <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-cyan-400/30" />
                        <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-cyan-400/30" />
                    </div>

                    {/* Header */}
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

                    {/* Content */}
                    <div className="flex-1">
                        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
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
                                className="flex h-14 items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-400 transition hover:from-cyan-500/30 hover:to-blue-600/30"
                            >
                                SIGN_IN
                            </Link>
                            <div className="flex h-14 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 text-xs font-medium uppercase tracking-[0.05em] text-slate-500">
                                ADMIN_ONLY
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
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
                            <Link href="/sign-in" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                                Sign in
                            </Link>
                        </>
                    }
                >
                    <div className="rounded-[28px] border border-white/8 bg-white/6 p-6 text-center text-slate-200">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
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

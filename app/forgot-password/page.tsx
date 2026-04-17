"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MailCheck, Mail } from "lucide-react";
import Image from "next/image";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setIsLoading(true);

        try {
            const result = await authClient.forgetPassword({
                email,
                redirectTo: "/reset-password",
            });

            if (result.error) {
                setError(result.error.message || "Permintaan reset password gagal.");
                return;
            }

            setMessage("Kalau email terdaftar, link reset password sudah kami kirim.");
        } catch {
            setError("Terjadi kendala saat mengirim link reset password.");
        } finally {
            setIsLoading(false);
        }
    };

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

                    {/* Form */}
                    <div className="flex-1 space-y-6">
                        {error ? (
                            <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-200">
                                <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                        ) : null}

                        {message ? (
                            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                                <MailCheck className="h-4 w-4" />
                                <AlertDescription className="text-xs">{message}</AlertDescription>
                            </Alert>
                        ) : null}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="m-email" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Terminal Identity
                                </Label>
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <Mail className="h-4 w-4 text-slate-500 transition group-focus-within:text-cyan-400" />
                                    </div>
                                    <Input
                                        id="m-email"
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-14 rounded-xl border-slate-700/50 bg-slate-800/50 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/25"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-14 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_30px_rgba(6,182,212,0.4)] transition hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_8px_35px_rgba(6,182,212,0.5)] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        PROCESSING...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        SEND_RESET_LINK
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </form>

                        <div className="relative py-2">
                            <div className="absolute inset-x-0 top-1/2 border-t border-slate-700/50" />
                            <span className="relative mx-auto block w-fit bg-[#0a0f1a] px-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                or
                            </span>
                        </div>

                        <Link
                            href="/sign-in"
                            className="flex h-14 w-full items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50 text-xs font-medium uppercase tracking-[0.05em] text-slate-300 transition hover:border-cyan-400/30 hover:bg-slate-700/50 hover:text-cyan-400"
                        >
                            RETURN_TO_LOGIN
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 text-center">
                        <p className="text-[10px] text-slate-600">
                            Cek inbox/spam folder untuk link reset.
                        </p>
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP LAYOUT ===== */}
            <div className="hidden sm:block">
                <AuthShell
                    title="Reset password"
                    description="Masukkan email kerja Anda. Kami akan kirim link untuk membuat password baru."
                    panelClassName="max-w-[520px]"
                    footer={
                        <>
                            Kembali ke{" "}
                            <Link href="/sign-in" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                                Sign in
                            </Link>
                        </>
                    }
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error ? (
                            <Alert className="border-rose-400/25 bg-rose-500/10 text-rose-50">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}

                        {message ? (
                            <Alert className="border-emerald-400/25 bg-emerald-500/10 text-emerald-50">
                                <MailCheck className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="d-email" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                Email
                            </Label>
                            <Input
                                id="d-email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                disabled={isLoading}
                                className="h-14 rounded-2xl border-white/8 bg-white/6 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-14 w-full rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_18px_50px_rgba(103,232,249,0.24)] transition hover:bg-cyan-200"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Mengirim link...
                                </>
                            ) : (
                                <>
                                    Kirim link reset password
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </AuthShell>
            </div>
        </>
    );
}

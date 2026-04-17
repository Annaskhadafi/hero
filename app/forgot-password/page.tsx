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

                    <div className="flex-1 space-y-6">
                        {error ? (
                            <Alert className="border-0 bg-[#5a2200]/24 text-[#ffd7c1] ring-1 ring-[#ffb288]/18">
                                <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                        ) : null}

                        {message ? (
                            <Alert className="border-0 bg-[#0b3f5f]/34 text-[#dcefff] ring-1 ring-[#9ac8ec]/18">
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
                                        <Mail className="h-4 w-4 text-slate-500 transition group-focus-within:text-[#9ac8ec]" />
                                    </div>
                                    <Input
                                        id="m-email"
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-14 rounded-xl bg-[#10283a]/92 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-14 w-full rounded-xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-sm text-white shadow-[0_18px_34px_rgba(0,52,97,0.28)] transition hover:brightness-110 active:scale-[0.98]"
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
                            <div className="absolute inset-x-0 top-1/2 border-t border-[#7fb6df]/16" />
                            <span className="relative mx-auto block w-fit bg-[#081826] px-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                or
                            </span>
                        </div>

                        <Link
                            href="/sign-in"
                            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#10283a]/92 text-xs font-medium uppercase tracking-[0.05em] text-slate-200 transition hover:bg-[#143044]"
                        >
                            RETURN_TO_LOGIN
                        </Link>
                    </div>

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
                            <Link href="/sign-in" className="font-medium text-[#9ac8ec] transition hover:text-[#bedef2]">
                                Sign in
                            </Link>
                        </>
                    }
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error ? (
                            <Alert className="border-0 bg-[#5a2200]/24 text-[#ffd7c1] ring-1 ring-[#ffb288]/18">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}

                        {message ? (
                            <Alert className="border-0 bg-[#0b3f5f]/34 text-[#dcefff] ring-1 ring-[#9ac8ec]/18">
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
                                className="h-14 rounded-2xl bg-[#10283a]/92 text-base text-white placeholder:text-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-white shadow-[0_18px_50px_rgba(0,52,97,0.28)] transition hover:brightness-110"
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

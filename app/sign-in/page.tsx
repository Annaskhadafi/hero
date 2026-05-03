"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, Mail, Sparkles, Wand2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { isMobileUserAgent } from "@/lib/device";

function GoogleIcon() {
    return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 10.2v3.9h5.42c-.24 1.26-.96 2.33-2.03 3.05l3.29 2.55c1.91-1.76 3.02-4.35 3.02-7.43 0-.72-.06-1.41-.18-2.07H12Z" />
            <path fill="#4285F4" d="M12 22c2.73 0 5.03-.91 6.7-2.48l-3.29-2.55c-.91.61-2.08.97-3.41.97-2.62 0-4.84-1.77-5.63-4.15H2.96v2.62A10.11 10.11 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.37 13.79A6.08 6.08 0 0 1 6.05 12c0-.62.11-1.22.32-1.79V7.59H2.96A10.05 10.05 0 0 0 1.9 12c0 1.62.39 3.15 1.06 4.41l3.41-2.62Z" />
            <path fill="#34A853" d="M12 6.06c1.49 0 2.83.51 3.89 1.51l2.92-2.92C17.02 2.98 14.72 2 12 2 8.04 2 4.61 4.27 2.96 7.59l3.41 2.62c.79-2.38 3.01-4.15 5.63-4.15Z" />
        </svg>
    );
}

function getClientPostLoginPath() {
    if (typeof window === "undefined") {
        return "/dashboard";
    }

    const isPhoneLike = isMobileUserAgent(window.navigator.userAgent);
    const isNarrowViewport = window.matchMedia("(max-width: 767px)").matches;

    return isPhoneLike || isNarrowViewport ? "/mobile" : "/dashboard";
}

function SignInContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [magicLinkLoading, setMagicLinkLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (session?.user) {
            router.replace(getClientPostLoginPath());
        }
    }, [router, session]);

    useEffect(() => {
        if (searchParams.get("reset") === "success") {
            setMessage("Password updated successfully. Please log in with the new password.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const callbackURL = getClientPostLoginPath();
            const result = await signIn.email({
                email,
                password,
                rememberMe,
                callbackURL,
            });

            if (result.error) {
                setError(result.error.message || "Sign in failed");
                return;
            }

            router.replace(callbackURL);
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLinkSignIn = async () => {
        if (!email) {
            setError("Masukkan email dulu untuk menerima magic link.");
            return;
        }

        setMagicLinkLoading(true);
        setError("");
        setMessage("");

        try {
            const callbackURL = getClientPostLoginPath();
            const result = await authClient.signIn.magicLink({
                email,
                callbackURL,
                errorCallbackURL: "/sign-in",
            });

            if (result.error) {
                setError(result.error.message || "Magic link failed to send.");
                return;
            }

            setMessage("Magic link sudah dikirim. Cek inbox email Anda untuk masuk ke HERO.");
        } catch {
            setError("Terjadi kendala saat mengirim magic link.");
        } finally {
            setMagicLinkLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setSocialLoading("google");
        setError("");
        setMessage("");

        try {
            const callbackURL = getClientPostLoginPath();
            const result = await signIn.social({
                provider: "google",
                callbackURL,
                errorCallbackURL: "/sign-in",
            });

            if (result.error) {
                setError(result.error.message || "Google sign in failed");
            }
        } catch {
            setError("Login dengan Google belum bisa digunakan. Silakan coba lagi nanti atau masuk dengan email dan password.");
        } finally {
            setSocialLoading(null);
        }
    };

    const isDisabled = isLoading || isPending || socialLoading !== null || magicLinkLoading;

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
                        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
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
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription className="text-xs">{message}</AlertDescription>
                            </Alert>
                        ) : null}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="m-email" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Email
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
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-xl bg-[#10283a]/92 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="m-password" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Password
                                </Label>
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <LockKeyhole className="h-4 w-4 text-slate-500 transition group-focus-within:text-[#9ac8ec]" />
                                    </div>
                                    <Input
                                        id="m-password"
                                        type="password"
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-xl bg-[#10283a]/92 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                                        className="h-4 w-4 border-[#7fb6df]/28 bg-[#10283a] data-[state=checked]:border-[#9ac8ec] data-[state=checked]:bg-[#9ac8ec] data-[state=checked]:text-slate-900"
                                    />
                                    <span>Remember me</span>
                                </label>

                                <Link href="/forgot-password" className="text-[#9ac8ec] transition hover:text-[#bedef2]">
                                    Forgot?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={isDisabled}
                                className="h-14 w-full rounded-xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-sm text-white shadow-[0_18px_34px_rgba(0,52,97,0.28)] transition hover:brightness-110 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Masuk...
                                    </span>
                                ) : (
                                    "Masuk ke HERO"
                                )}
                            </Button>
                        </form>

                        <div className="relative py-2">
                            <div className="absolute inset-x-0 top-1/2 border-t border-[#7fb6df]/16" />
                            <span className="relative mx-auto block w-fit bg-[#081826] px-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                or
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                onClick={handleMagicLinkSignIn}
                                disabled={isDisabled}
                                className="h-14 rounded-xl bg-[#10283a]/92 text-xs text-slate-200 transition hover:bg-[#143044]"
                            >
                                <span className="flex items-center gap-2">
                                    {magicLinkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    Magic Link
                                </span>
                            </Button>

                            <Button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isDisabled}
                                className="h-14 rounded-xl bg-[#10283a]/92 text-xs text-slate-200 transition hover:bg-[#143044]"
                            >
                                <span className="flex items-center gap-2">
                                    {socialLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                                    Google
                                </span>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 text-center">
                        <p className="text-[10px] text-slate-600">
                            Akses baru dibuat oleh admin HERO.
                        </p>
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP LAYOUT ===== */}
            <div className="hidden sm:block">
                <AuthShell
                    title={
                        <span className="block text-base font-medium tracking-[0.14em] text-slate-200/86 sm:text-lg">
                            Hub for Employee Reporting & Operations
                        </span>
                    }
                    description="Setiap pekerjaan tercatat, setiap prestasi dihargai, setiap keputusan berbasis data."
                    panelClassName="max-w-[520px]"
                    headerBadge={
                        <div className="flex items-center justify-center">
                            <Image
                                src="/logo-hero.png"
                                alt="HERO Logo"
                                width={160}
                                height={160}
                                className="h-[144px] w-[144px] object-contain sm:h-[160px] sm:w-[160px]"
                                priority
                            />
                        </div>
                    }
                    footer={<>Akses baru dibuat oleh admin HERO.</>}
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error ? (
                            <Alert className="border-0 bg-[#5a2200]/24 text-[#ffd7c1] ring-1 ring-[#ffb288]/18">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}

                        {message ? (
                            <Alert className="border-0 bg-[#0b3f5f]/34 text-[#dcefff] ring-1 ring-[#9ac8ec]/18">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        ) : null}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="d-email" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                    Email
                                </Label>
                                <div className="group relative">
                                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#9ac8ec]" />
                                    <Input
                                        id="d-email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-2xl bg-[#10283a]/92 pl-11 pr-4 text-base text-white placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="d-password" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                    Password
                                </Label>
                                <div className="group relative">
                                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#9ac8ec]" />
                                    <Input
                                        id="d-password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-2xl bg-[#10283a]/92 pl-11 pr-4 text-base text-white placeholder:text-slate-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm text-slate-300/72">
                            <label className="flex items-center gap-3">
                                <Checkbox
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                                    className="border-white/16 bg-[#10283a] data-[state=checked]:border-[#9ac8ec] data-[state=checked]:bg-[#9ac8ec] data-[state=checked]:text-slate-950"
                                />
                                <span>Remember me</span>
                            </label>

                            <Link href="/forgot-password" className="text-[#9ac8ec] transition hover:text-[#bedef2]">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={isDisabled}
                            className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-white shadow-[0_18px_50px_rgba(0,52,97,0.28)] transition hover:brightness-110"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Login ke HERO
                                    <Sparkles className="h-4 w-4" />
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            onClick={handleMagicLinkSignIn}
                            disabled={isDisabled}
                            className="h-14 w-full justify-between rounded-2xl bg-[#10283a]/92 px-5 text-left text-slate-100 transition hover:bg-[#143044]"
                        >
                            <span className="flex items-center gap-3">
                                {magicLinkLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                                <span>Continue with Magic Link</span>
                            </span>
                        </Button>

                        <div className="relative py-1">
                            <div className="absolute inset-x-0 top-1/2 border-t border-white/8" />
                            <span className="relative mx-auto block w-fit bg-[#10283a] px-4 text-xs uppercase tracking-[0.32em] text-slate-400">
                                Or
                            </span>
                        </div>

                        <Button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isDisabled}
                            className="h-14 w-full justify-between rounded-2xl bg-[#10283a]/92 px-5 text-left text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-[#143044]"
                        >
                            <span className="flex items-center gap-3">
                                {socialLoading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                                <span>Continue with Google</span>
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/8">
                                <Sparkles className="h-4 w-4" />
                            </span>
                        </Button>
                    </form>
                </AuthShell>
            </div>
        </>
    );
}

export default function SignInPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-[#081826]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9ac8ec]" />
                </div>
            }
        >
            <SignInContent />
        </Suspense>
    );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ScanFace, Wand2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { isMobileUserAgent } from "@/lib/device";
import { FaceLoginModal } from "@/components/auth/face-login-modal";

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
    const [error, setError] = useState("");
    const [resolvedEmail, setResolvedEmail] = useState("");
    const [resolvedName, setResolvedName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

    // Check if input looks like email
    const isEmailInput = email.includes("@");
    const displayEmail = resolvedEmail || email;
    const [message, setMessage] = useState("");
    const { data: session, isPending } = useSession();
    const searchParams = useSearchParams();

    const handleFaceLoginSuccess = (userData: { name: string; email?: string; employeeSn?: string; token?: string }) => {
        setIsFaceModalOpen(false);
        setMessage(`Login Wajah Berhasil! Selamat datang, ${userData.name}.`);
        setTimeout(() => {
            if (userData.token) {
                window.location.href = `/api/auth/magic-link/verify?token=${userData.token}&callbackURL=${encodeURIComponent(getClientPostLoginPath())}`;
            } else {
                window.location.href = getClientPostLoginPath();
            }
        }, 500);
    };

    useEffect(() => {
        if (session?.user && !isLoading) {
            // Full page navigation to guarantee the fresh session cookie
            // is present on the next server render.
            window.location.href = getClientPostLoginPath();
        }
    }, [session, isLoading]);

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

            // Resolve SN to email if input is not an email
            let loginEmail = email.trim();
            if (!loginEmail.includes("@")) {
                const res = await fetch("/api/resolve-sn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sn: loginEmail }),
                });

                let data: { email?: string; name?: string; error?: string } = {};
                try {
                    data = await res.json();
                } catch {
                    setError("Layanan autentikasi tidak merespons (404/500). Mohon refresh halaman atau periksa server.");
                    setIsLoading(false);
                    return;
                }

                if (!res.ok || !data.email) {
                    setError(data.error || "SN tidak ditemukan. Pastikan SN karyawan benar.");
                    setIsLoading(false);
                    return;
                }
                loginEmail = data.email;
                setResolvedEmail(data.email);
                setResolvedName(data.name || "");
            }

            const result = await signIn.email({
                email: loginEmail,
                password,
                rememberMe,
            });

            if (result.error) {
                setError(result.error.message || "Sign in failed");
                setIsLoading(false);
                return;
            }

            // Use full page navigation so the new session cookie is guaranteed
            // to be present on the next server render.
            window.location.href = callbackURL;
        } catch (err: any) {
            setError(err?.message || "An unexpected error occurred during sign in");
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

    const isDisabled = isLoading || magicLinkLoading;

    return (
        <>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes scanLine {
                    0% { top: -2px; }
                    100% { top: 100%; }
                }
                @keyframes slideRight {
                    0%, 100% { opacity: 0; transform: translateX(-30%); }
                    50% { opacity: 1; transform: translateX(30%); }
                }
                @keyframes floatYellow {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                    50% { transform: translateY(-15px) scale(1.2); opacity: 0.7; }
                }
            `}</style>

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
                                    Email / SN Karyawan
                                </Label>
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <Mail className="h-4 w-4 text-slate-500 transition group-focus-within:text-[#9ac8ec]" />
                                    </div>
                                    <Input
                                        id="m-email"
                                        type="text"
                                        placeholder="Email atau SN (contoh: CP001)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-xl bg-[#10283a]/92 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
                                    />
                                    {resolvedName && (
                                        <p className="mt-1 text-xs text-[#9ac8ec]">
                                            Ditemukan: {resolvedName}
                                        </p>
                                    )}
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
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="auth-dark-input h-14 rounded-xl bg-[#10283a]/92 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-500"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
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
                                onClick={() => {
                                    if (!email.trim()) {
                                        setError("Masukkan Email / SN terlebih dahulu untuk menggunakan login wajah.");
                                        return;
                                    }
                                    setIsFaceModalOpen(true);
                                }}
                                disabled={isDisabled}
                                className="h-14 w-full rounded-xl bg-[linear-gradient(135deg,#003461_0%,#005596_100%)] text-xs font-semibold text-slate-100 ring-1 ring-[#7fb6df]/30 transition hover:brightness-110 active:scale-[0.98]"
                            >
                                <span className="flex items-center gap-1.5 justify-center">
                                    <ScanFace className="h-4 w-4 text-[#9ac8ec]" />
                                    Biometrik Wajah
                                </span>
                            </Button>

                            <Button
                                type="button"
                                onClick={handleMagicLinkSignIn}
                                disabled={isDisabled}
                                className="h-14 w-full rounded-xl bg-[#10283a]/92 text-xs text-slate-200 transition hover:bg-[#143044]"
                            >
                                <span className="flex items-center gap-1.5 justify-center">
                                    {magicLinkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    Magic Link
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
            <div className="hidden sm:flex min-h-screen">
                {/* Left Panel — Branding */}
                <div className="relative flex-1 bg-gradient-to-br from-[#1448b0] via-[#1a56db] to-[#2563eb] flex flex-col items-center justify-center overflow-hidden text-white">
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_35%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:110px_110px] opacity-40" />
                    <div className="absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

                    {/* Animated rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[500px] h-[500px] border border-white/10 rounded-full animate-[spin_60s_linear_infinite]" />
                        <div className="absolute w-[350px] h-[350px] border border-white/8 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                        <div className="absolute w-[200px] h-[200px] border border-white/12 rounded-full animate-[spin_25s_linear_infinite]" />
                    </div>

                    {/* Floating particles */}
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/25 rounded-full animate-[float_8s_ease-in-out_infinite]" />
                    <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white/20 rounded-full animate-[float_12s_ease-in-out_infinite_2s]" />
                    <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/15 rounded-full animate-[float_10s_ease-in-out_infinite_4s]" />
                    <div className="absolute top-2/3 right-1/3 w-2.5 h-2.5 bg-white/15 rounded-full animate-[float_9s_ease-in-out_infinite_1s]" />
                    <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white/20 rounded-full animate-[float_11s_ease-in-out_infinite_3s]" />

                    {/* Geometric accents — top-left */}
                    <svg className="absolute top-8 left-8 w-32 h-32 opacity-[0.10]" viewBox="0 0 100 100">
                        <rect x="10" y="10" width="30" height="30" fill="none" stroke="white" strokeWidth="1" />
                        <rect x="20" y="20" width="30" height="30" fill="none" stroke="white" strokeWidth="0.5" />
                        <line x1="0" y1="50" x2="60" y2="50" stroke="white" strokeWidth="0.5" />
                        <line x1="50" y1="0" x2="50" y2="60" stroke="white" strokeWidth="0.5" />
                    </svg>

                    {/* Geometric accents — bottom-right */}
                    <svg className="absolute bottom-16 right-12 w-40 h-40 opacity-[0.08]" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="4 3" />
                        <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="1" />
                        <circle cx="50" cy="50" r="8" fill="white" opacity="0.15" />
                    </svg>

                    {/* Crosshair grid lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
                    </div>

                    {/* Corner brackets */}
                    <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-white/10" />
                    <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-white/10" />
                    <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-white/10" />
                    <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-white/10" />

                    {/* Horizontal scan line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-[scanLine_8s_linear_infinite]" />

                    {/* Yellow moving accent lines */}
                    <div className="absolute top-[20%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent animate-[slideRight_6s_ease-in-out_infinite]" />
                    <div className="absolute top-[65%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-[slideRight_8s_ease-in-out_infinite_2s]" />

                    {/* Yellow floating dots */}
                    <div className="absolute top-[15%] right-[20%] w-2 h-2 bg-amber-400/50 rounded-full animate-[floatYellow_7s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[25%] left-[15%] w-1.5 h-1.5 bg-yellow-400/40 rounded-full animate-[floatYellow_9s_ease-in-out_infinite_1.5s]" />
                    <div className="absolute top-[50%] right-[10%] w-1 h-1 bg-amber-300/35 rounded-full animate-[floatYellow_11s_ease-in-out_infinite_3s]" />

                    {/* Yellow accent arc */}
                    <svg className="absolute top-[10%] left-[10%] w-48 h-48 opacity-[0.12] animate-[spin_30s_linear_infinite]" viewBox="0 0 100 100">
                        <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 50 10 A 40 40 0 0 0 10 50" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 5" strokeLinecap="round" />
                    </svg>

                    <svg className="absolute bottom-[15%] right-[12%] w-36 h-36 opacity-[0.10] animate-[spin_25s_linear_infinite_reverse]" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6 4" />
                        <circle cx="50" cy="50" r="20" fill="none" stroke="#f59e0b" strokeWidth="1" />
                    </svg>

                    {/* Yellow corner accents */}
                    <div className="absolute top-[8%] right-[15%] w-10 h-10 border-t-[3px] border-r-[3px] border-amber-400/50 animate-[pulse_4s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[12%] left-[18%] w-10 h-10 border-b-[3px] border-l-[3px] border-yellow-400/40 animate-[pulse_4s_ease-in-out_infinite_1s]" />

                    {/* Title — center */}
                    <div className="relative z-10 text-center max-w-lg px-12">
                        <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-xs font-semibold uppercase tracking-[0.2em] text-white animate-[fadeIn_0.8s_ease-out_forwards] opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                            PT Chitra Paratama Hub
                        </div>

                        <h1 className="text-[3.2rem] font-extrabold tracking-tighter leading-[0.9] animate-[slideUp_0.8s_ease-out_forwards] opacity-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                            <span className="block">
                                Hub for
                            </span>
                            <span className="block mt-1">
                                Employee
                            </span>
                            <span className="block mt-1">
                                Reporting
                            </span>
                            <span className="block text-[2.2rem] font-bold text-white/80 mt-2 tracking-normal">
                                & Operations
                            </span>
                        </h1>

                        <p className="mt-8 text-sm text-white/75 leading-relaxed max-w-xs mx-auto animate-[fadeIn_0.8s_ease-out_forwards] opacity-0" style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}>
                            Setiap pekerjaan tercatat, setiap prestasi dihargai, setiap keputusan berbasis data.
                        </p>
                    </div>
                </div>

                {/* Right Panel — Login Form */}
                <div className="flex-1 flex items-center justify-center bg-white p-8">
                    <div className="w-full max-w-[420px]">
                        {/* Logo */}
                        <div className="mb-8">
                            <Image
                                src="/logo-hero.png"
                                alt="HERO Logo"
                                width={160}
                                height={160}
                                className="h-12 w-auto object-contain"
                                priority
                            />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Log In to <span className="text-[#2563b8]">HERO™</span>
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Masuk dengan akun kerja Anda.
                        </p>

                        {error && (
                            <Alert className="mt-5 border-red-200 bg-red-50 text-red-700">
                                <AlertDescription className="text-sm">{error}</AlertDescription>
                            </Alert>
                        )}

                        {message && (
                            <Alert className="mt-5 border-blue-200 bg-blue-50 text-blue-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription className="text-sm">{message}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="d-email" className="text-sm font-medium text-slate-700">
                                    Your Email
                                </Label>
                                <div className="group relative">
                                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#2563b8]" />
                                    <Input
                                        id="d-email"
                                        type="text"
                                        inputMode="email"
                                        placeholder="Email atau SN (contoh: CP001)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="h-12 rounded-xl border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563b8] focus:ring-[#2563b8]/20 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="d-password" className="text-sm font-medium text-slate-700">
                                    Your Password
                                </Label>
                                <div className="group relative">
                                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#2563b8]" />
                                    <Input
                                        id="d-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                        className="h-12 rounded-xl border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563b8] focus:ring-[#2563b8]/20 shadow-sm"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                                        className="border-slate-300 data-[state=checked]:border-[#2563b8] data-[state=checked]:bg-[#2563b8]"
                                    />
                                    <span className="text-sm text-slate-600">Remember</span>
                                </label>
                                <Link href="/forgot-password" className="text-sm font-medium text-[#2563b8] hover:text-[#1d4ed8] transition">
                                    Forgotten?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={isDisabled}
                                className="h-12 w-full rounded-xl bg-[#2563b8] text-white font-semibold shadow-lg shadow-[#2563b8]/25 transition hover:bg-[#1d4ed8] hover:shadow-xl hover:shadow-[#2563b8]/30 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    "Log In"
                                )}
                            </Button>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        if (!email.trim()) {
                                            setError("Masukkan Email / SN terlebih dahulu untuk menggunakan login wajah.");
                                            return;
                                        }
                                        setIsFaceModalOpen(true);
                                    }}
                                    disabled={isDisabled}
                                    className="h-12 w-full rounded-xl bg-slate-900 text-white font-medium shadow-sm transition hover:bg-slate-800"
                                >
                                    <span className="flex items-center gap-2 justify-center">
                                        <ScanFace className="h-4 w-4 text-[#7fb6df]" />
                                        Face Biometric
                                    </span>
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleMagicLinkSignIn}
                                    disabled={isDisabled}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white text-slate-700 font-medium shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                                >
                                    <span className="flex items-center gap-2 justify-center">
                                        {magicLinkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        Magic Link
                                    </span>
                                </Button>
                            </div>
                        </form>

                        <p className="mt-8 text-center text-xs text-slate-400">
                            Akses baru dibuat oleh admin HERO.
                        </p>
                    </div>
                </div>
            </div>

            <FaceLoginModal
                isOpen={isFaceModalOpen}
                onClose={() => setIsFaceModalOpen(false)}
                onSuccess={handleFaceLoginSuccess}
                identifier={email}
            />
        </>
    );
}

export default function SignInPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-slate-50">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563b8]" />
                </div>
            }
        >
            <SignInContent />
        </Suspense>
    );
}

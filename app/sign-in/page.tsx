"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Eye, EyeOff, FileText, Headphones, Link2, Loader2, LockKeyhole, Mail, ScanFace, Settings } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { isMobileUserAgent } from "@/lib/device";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import styles from "./landing.module.css";
import dynamic from "next/dynamic";
const FaceLoginModal = dynamic(() => import("@/components/auth/face-login-modal").then((m) => m.FaceLoginModal), { ssr: false });

import { resolveSnAction } from "@/app/actions/resolve-sn-action";

function getSafeCallbackPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return null;
    }
    return value;
}

function getClientPostLoginPath(callbackPath?: string | null) {
    if (typeof window === "undefined") {
        return callbackPath || "/dashboard";
    }

    if (callbackPath) return callbackPath;

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

    const displayEmail = resolvedEmail || email;
    const [message, setMessage] = useState("");
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const callbackPath = getSafeCallbackPath(searchParams.get("callbackUrl"));

    const handleFaceLoginSuccess = (userData: { name: string; email?: string; employeeSn?: string; token?: string }) => {
        setIsFaceModalOpen(false);
        setMessage(`Login Wajah Berhasil! Selamat datang, ${userData.name}.`);
        setTimeout(() => {
            if (userData.token) {
                window.location.href = `/api/auth/magic-link/verify?token=${userData.token}&callbackURL=${encodeURIComponent(getClientPostLoginPath(callbackPath))}`;
            } else {
                window.location.href = getClientPostLoginPath(callbackPath);
            }
        }, 500);
    };

    const isDeactivatedError = searchParams.get("error") === "account_deactivated" || searchParams.get("error") === "deactivated";

    useEffect(() => {
        if (isDeactivatedError) {
            authClient.signOut().catch(() => {});
            return;
        }

        if (session?.user && !isLoading) {
            // Full page navigation to guarantee the fresh session cookie
            // is present on the next server render.
            window.location.href = getClientPostLoginPath(callbackPath);
        }
    }, [session, isLoading, isDeactivatedError, callbackPath]);

    useEffect(() => {
        if (searchParams.get("reset") === "success") {
            setMessage("Password updated successfully. Please log in with the new password.");
        }
        const errorType = searchParams.get("error");
        if (errorType) {
            if (errorType === "account_deactivated" || errorType === "deactivated") {
                setError("Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi tim HR / Admin untuk mengaktifkan kembali.");
            } else if (errorType === "new_user_signup_disabled") {
                setError("Akun user Anda tidak ditemukan. Harap pastikan email Anda sudah terdaftar.");
            } else if (errorType === "INVALID_TOKEN") {
                setError("Token login biometrik tidak valid atau sudah digunakan.");
            } else if (errorType === "EXPIRED_TOKEN") {
                setError("Token login biometrik telah kedaluwarsa.");
            } else {
                setError(`Gagal login biometrik: ${errorType}`);
            }
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const callbackURL = getClientPostLoginPath(callbackPath);

            // Resolve SN to email if input is not an email
            let loginEmail = email.trim();
            if (!loginEmail.includes("@")) {
                let resolved = false;
                try {
                    const res = await fetch("/api/resolve-sn", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sn: loginEmail }),
                    });
                    const data = await res.json();
                    if (res.ok && data.email) {
                        loginEmail = data.email;
                        setResolvedEmail(data.email);
                        setResolvedName(data.name || "");
                        resolved = true;
                    } else if (data.error) {
                        setError(data.error);
                        setIsLoading(false);
                        return;
                    }
                } catch {
                    // Fallback to server action if fetch fails
                }

                if (!resolved) {
                    try {
                        const snRes = await resolveSnAction(loginEmail);
                        if (snRes.success && snRes.email) {
                            loginEmail = snRes.email;
                            setResolvedEmail(snRes.email);
                            setResolvedName(snRes.name || "");
                        } else {
                            setError(snRes.error || "SN tidak ditemukan. Pastikan SN karyawan benar.");
                            setIsLoading(false);
                            return;
                        }
                    } catch (err: any) {
                        if (err?.message?.includes("Server Action") || err?.message?.includes("not found")) {
                            window.location.reload();
                            return;
                        }
                        setError("SN tidak ditemukan. Pastikan SN karyawan benar.");
                        setIsLoading(false);
                        return;
                    }
                }
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
            if (err?.message?.includes("Server Action") || err?.message?.includes("not found")) {
                window.location.reload();
                return;
            }
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
            const callbackURL = getClientPostLoginPath(callbackPath);
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
        <div className={styles.page}>
            <header className={styles.header}>
                <Link href="/sign-in" aria-label="HERO — halaman masuk">
                    <Image
                        src={resolveUploadUrl("/logo-hero.png?v=hero-cat-20261012")}
                        alt="HERO"
                        width={2172}
                        height={724}
                        sizes="(max-width: 899px) 150px, 188px"
                        className={styles.logo}
                        priority
                    />
                </Link>
                <a href="#bantuan" className={styles.help} onClick={() => {
                    const support = document.getElementById("bantuan") as HTMLDetailsElement | null;
                    if (support) support.open = true;
                }}>
                    <Headphones aria-hidden="true" size={22} />
                    Butuh bantuan?
                </a>
            </header>

            <main className={styles.panel}>
                <section className={styles.story} aria-label="Selamat datang di HERO">
                    <Image
                        src={resolveUploadUrl("/Hero%20Logo/bg%20hero.png")}
                        alt="Maskot HERO dengan ilustrasi presensi, pelaporan, dan operasional di area tambang"
                        fill
                        sizes="(max-width: 899px) 560px, 59vw"
                        className={styles.illustration}
                        priority
                    />
                    <div className={styles.storyCopy}>
                        <p className={styles.eyebrow}>PT CHITRA PARATAMA</p>
                        <h1 className={styles.headline}>Kerja hebat,<br />dimulai di sini.</h1>
                        <p className={styles.summary}>Satu tempat untuk aktivitas, pelaporan,<br className="hidden lg:block" /> dan operasional Anda.</p>
                    </div>
                    <div className={styles.features}>
                        {[
                            { icon: CalendarDays, title: "Presensi", description: "Catat setiap kehadiran Anda." },
                            { icon: FileText, title: "Pelaporan", description: "Setiap prestasi dihargai." },
                            { icon: Settings, title: "Operasional", description: "Dukung keputusan berbasis data." },
                        ].map(({ icon: Icon, title, description }) => (
                            <div className={styles.feature} key={title}>
                                <span className={styles.featureIcon}><Icon aria-hidden="true" size={25} /></span>
                                <div><strong>{title}</strong><p>{description}</p></div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.formPanel} aria-labelledby="login-title">
                    <div className={styles.formContent}>
                        <p className={`${styles.eyebrow} ${styles.formEyebrow}`}>AKUN KARYAWAN</p>
                        <h2 id="login-title" className={styles.title}>Selamat datang kembali</h2>
                        <p className={styles.description}>Masuk ke HERO dengan akun kerja Anda.</p>

                        {error ? (
                            <Alert className="mt-5 border-red-200 bg-red-50 text-red-800" role="alert">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}
                        {message ? (
                            <Alert className="mt-5 border-blue-200 bg-blue-50 text-blue-800" role="status">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        ) : null}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.field}>
                                <Label htmlFor="email">Email atau SN karyawan</Label>
                                <div className={styles.inputWrap}>
                                    <Mail aria-hidden="true" className={styles.inputIcon} />
                                    <Input
                                        id="email"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        placeholder="Masukkan email atau SN"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                    />
                                </div>
                                {resolvedName ? <p className="text-xs text-blue-700">Ditemukan: {resolvedName} ({displayEmail})</p> : null}
                            </div>

                            <div className={styles.field}>
                                <Label htmlFor="password">Kata sandi</Label>
                                <div className={styles.inputWrap}>
                                    <LockKeyhole aria-hidden="true" className={styles.inputIcon} />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Masukkan kata sandi"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isDisabled}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                        aria-pressed={showPassword}
                                        disabled={isDisabled}
                                        className={styles.passwordToggle}
                                    >
                                        {showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.options}>
                                <label className={styles.remember}>
                                    <Checkbox
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                                        disabled={isDisabled}
                                        className="border-blue-300 data-[state=checked]:border-[#0753e7] data-[state=checked]:bg-[#0753e7]"
                                    />
                                    <span>Ingat saya</span>
                                </label>
                                <Link href="/forgot-password">Lupa kata sandi?</Link>
                            </div>

                            <Button type="submit" disabled={isDisabled} className={styles.submit}>
                                {isLoading ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Masuk...</> : <>Masuk ke HERO<ArrowRight aria-hidden="true" className="h-5 w-5" /></>}
                            </Button>
                        </form>

                        <div className={styles.divider}>atau masuk dengan</div>
                        <div className={styles.alternatives}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (!email.trim()) {
                                        setError("Masukkan Email / SN terlebih dahulu untuk menggunakan login wajah.");
                                        return;
                                    }
                                    setIsFaceModalOpen(true);
                                }}
                                disabled={isDisabled}
                                className={styles.alternative}
                            >
                                <ScanFace aria-hidden="true" className="h-5 w-5" />Face Biometric
                            </Button>
                            <Button type="button" variant="outline" onClick={handleMagicLinkSignIn} disabled={isDisabled} className={styles.alternative}>
                                {magicLinkLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Link2 aria-hidden="true" className="h-5 w-5" />}Magic Link
                            </Button>
                        </div>
                        <p className={styles.accountNote}>Akses akun dibuat oleh admin HERO.</p>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <p>© {new Date().getFullYear()} PT Chitra Paratama</p>
                <p>Hub for Employee Reporting &amp; <strong>Operations</strong></p>
            </footer>
            <details id="bantuan" className={styles.support}>
                <summary>Bantuan akses akun</summary>
                <p>Gunakan email atau SN karyawan yang terdaftar. Untuk pemulihan kata sandi, pilih “Lupa kata sandi?”. Jika akun belum tersedia atau dinonaktifkan, hubungi tim HR atau admin HERO.</p>
            </details>

            <FaceLoginModal
                isOpen={isFaceModalOpen}
                onClose={() => setIsFaceModalOpen(false)}
                onSuccess={handleFaceLoginSuccess}
                identifier={email}
            />
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-[#e5f3ff]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0753e7]" />
                </div>
            }
        >
            <SignInContent />
        </Suspense>
    );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowRight,
    Award,
    BarChart3,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    FileText,
    Flame,
    Headphones,
    Link2,
    Loader2,
    LockKeyhole,
    Mail,
    ScanFace,
    Settings,
    ShieldCheck,
    Sparkles,
    Target,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { isMobileUserAgent } from "@/lib/device";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import { resolveSnAction } from "@/app/actions/resolve-sn-action";
import type { LoginPageSettingsData } from "@/app/dashboard/settings/login-page/types";
import { DEFAULT_LOGIN_PAGE_SETTINGS } from "@/app/dashboard/settings/login-page/types";
import styles from "./landing.module.css";

const FaceLoginModal = dynamic(() => import("@/components/auth/face-login-modal").then((m) => m.FaceLoginModal), { ssr: false });

const ICON_MAP: Record<string, LucideIcon> = {
    CalendarDays,
    FileText,
    Settings,
    ShieldCheck,
    Clock,
    Sparkles,
    Award,
    CheckCircle2,
    Users,
    BarChart3,
    Flame,
    Target,
    Zap,
    Briefcase,
};

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

export function SignInContent({ initialSettings }: { initialSettings?: LoginPageSettingsData }) {
    const settings = initialSettings || DEFAULT_LOGIN_PAGE_SETTINGS;

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
                window.location.href = `/api/auth/magic-link/verify?token=${userData.token}&callbackURL=${encodeURIComponent(getClientPostLoginPath(callbackPath))}&errorCallbackURL=${encodeURIComponent("/sign-in")}`;
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

    // Determine custom page background style
    const pageCustomStyle: React.CSSProperties = {};
    if (settings.pageBackgroundType === "solid" && settings.pageBackgroundColor) {
        pageCustomStyle.background = settings.pageBackgroundColor;
    } else if (settings.pageBackgroundType === "gradient" && settings.pageBackgroundColor) {
        pageCustomStyle.background = settings.pageBackgroundColor;
    } else if (settings.pageBackgroundType === "image" && settings.pageBackgroundImageUrl) {
        pageCustomStyle.backgroundImage = `url(${resolveUploadUrl(settings.pageBackgroundImageUrl)})`;
        pageCustomStyle.backgroundSize = "cover";
        pageCustomStyle.backgroundPosition = "center";
        pageCustomStyle.backgroundAttachment = "fixed";
    }

    const bannerStyle: React.CSSProperties = {
        backgroundColor: settings.bannerOverlayColor || "#0860ee",
    };

    return (
        <div className={styles.page} style={pageCustomStyle}>
            <header className={styles.header}>
                <Link href="/sign-in" aria-label="HERO — halaman masuk">
                    <Image
                        src={resolveUploadUrl(settings.logoUrl || "/logo-hero.png?v=hero-cat-20261012")}
                        alt="HERO Logo"
                        width={2172}
                        height={724}
                        sizes="(max-width: 899px) 150px, 188px"
                        className={styles.logo}
                        priority
                    />
                </Link>
                <a
                    href="#bantuan"
                    className={styles.help}
                    onClick={() => {
                        const support = document.getElementById("bantuan") as HTMLDetailsElement | null;
                        if (support) support.open = true;
                    }}
                >
                    <Headphones aria-hidden="true" size={22} />
                    {settings.helpText || "Butuh bantuan?"}
                </a>
            </header>

            <main className={styles.panel}>
                <section className={styles.story} style={bannerStyle} aria-label="Selamat datang di HERO">
                    <Image
                        src={resolveUploadUrl(settings.bannerImageUrl || "/Hero%20Logo/bg%20hero.png")}
                        alt="Hero Banner"
                        fill
                        sizes="(max-width: 899px) 560px, 59vw"
                        className={styles.illustration}
                        priority
                    />
                    <div className={styles.storyCopy}>
                        <p className={styles.eyebrow}>{settings.heroEyebrow || "PT CHITRA PARATAMA"}</p>
                        <h1 className={styles.headline} style={{ whiteSpace: "pre-line" }}>
                            {settings.heroTitle || "Kerja hebat,\ndimulai di sini."}
                        </h1>
                        <p className={styles.summary} style={{ whiteSpace: "pre-line" }}>
                            {settings.heroSubtitle || "Satu tempat untuk aktivitas, pelaporan,\n dan operasional Anda."}
                        </p>
                    </div>
                    <div className={styles.features}>
                        {(settings.featuresJson || DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson).map((item, idx) => {
                            const IconComponent = ICON_MAP[item.icon] || CheckCircle2;
                            return (
                                <div className={styles.feature} key={`${item.title}-${idx}`}>
                                    <span className={styles.featureIcon}>
                                        <IconComponent aria-hidden="true" size={25} />
                                    </span>
                                    <div>
                                        <strong>{item.title}</strong>
                                        <p>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className={styles.formPanel} aria-labelledby="login-title">
                    <div className={styles.formContent}>
                        <p className={`${styles.eyebrow} ${styles.formEyebrow}`}>
                            {settings.formEyebrow || "AKUN KARYAWAN"}
                        </p>
                        <h2 id="login-title" className={styles.title}>
                            {settings.formTitle || "Selamat datang kembali"}
                        </h2>
                        <p className={styles.description}>
                            {settings.formDescription || "Masuk ke HERO dengan akun kerja Anda."}
                        </p>

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

                        <form onSubmit={handleSubmit} method="post" action="#" className={styles.form}>
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
                                        className="!bg-[#f8fbff] !text-[#17305c] placeholder:!text-[#7185a8]"
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
                                        className="!bg-[#f8fbff] !text-[#17305c] placeholder:!text-[#7185a8]"
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
                                {isLoading ? (
                                    <>
                                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                                        Masuk...
                                    </>
                                ) : (
                                    <>
                                        Masuk ke HERO
                                        <ArrowRight aria-hidden="true" className="h-5 w-5" />
                                    </>
                                )}
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
                                <ScanFace aria-hidden="true" className="h-5 w-5" />
                                Face Biometric
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleMagicLinkSignIn}
                                disabled={isDisabled}
                                className={styles.alternative}
                            >
                                {magicLinkLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Link2 aria-hidden="true" className="h-5 w-5" />}
                                Magic Link
                            </Button>
                        </div>
                        <p className={styles.accountNote}>Akses akun dibuat oleh admin HERO.</p>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <p>© {new Date().getFullYear()} {settings.footerCopyright || "PT Chitra Paratama"}</p>
                <p>{settings.footerTagline || "Hub for Employee Reporting & Operations"}</p>
            </footer>
            <details id="bantuan" className={styles.support}>
                <summary>{settings.helpText || "Bantuan akses akun"}</summary>
                <p>{settings.helpDetails || "Gunakan email atau SN karyawan yang terdaftar. Untuk pemulihan kata sandi, pilih “Lupa kata sandi?”. Jika akun belum tersedia atau dinonaktifkan, hubungi tim HR atau admin HERO."}</p>
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

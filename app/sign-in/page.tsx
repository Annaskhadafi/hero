"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, useSession } from "@/lib/auth-client";

function GoogleIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
        >
            <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.42c-.24 1.26-.96 2.33-2.03 3.05l3.29 2.55c1.91-1.76 3.02-4.35 3.02-7.43 0-.72-.06-1.41-.18-2.07H12Z"
            />
            <path
                fill="#4285F4"
                d="M12 22c2.73 0 5.03-.91 6.7-2.48l-3.29-2.55c-.91.61-2.08.97-3.41.97-2.62 0-4.84-1.77-5.63-4.15H2.96v2.62A10.11 10.11 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.37 13.79A6.08 6.08 0 0 1 6.05 12c0-.62.11-1.22.32-1.79V7.59H2.96A10.05 10.05 0 0 0 1.9 12c0 1.62.39 3.15 1.06 4.41l3.41-2.62Z"
            />
            <path
                fill="#34A853"
                d="M12 6.06c1.49 0 2.83.51 3.89 1.51l2.92-2.92C17.02 2.98 14.72 2 12 2 8.04 2 4.61 4.27 2.96 7.59l3.41 2.62c.79-2.38 3.01-4.15 5.63-4.15Z"
            />
        </svg>
    );
}

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
    const [error, setError] = useState("");
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session?.user) {
            router.replace("/dashboard");
        }
    }, [router, session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.email({
                email,
                password,
                rememberMe,
                callbackURL: "/dashboard",
            });

            if (result.error) {
                setError(result.error.message || "Sign in failed");
                return;
            }

            router.replace("/dashboard");
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setSocialLoading("google");
        setError("");

        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
                newUserCallbackURL: "/dashboard",
                errorCallbackURL: "/sign-in",
            });

            if (result.error) {
                setError(result.error.message || "Google sign in failed");
            }
        } catch {
            setError(
                "Google sign in belum siap. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah diisi."
            );
        } finally {
            setSocialLoading(null);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            description="Please enter your details to sign in and continue into your HERO workspace."
            footer={
                <>
                    Don&apos;t have an account?{" "}
                    <Link href="/sign-up" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                        Create Account
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

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Email
                        </Label>
                        <div className="group relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-300" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading || isPending || socialLoading !== null}
                                className="h-14 rounded-2xl border-white/8 bg-white/6 pl-11 pr-14 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || isPending || socialLoading !== null}
                                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.35)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label="Submit sign in"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Password
                        </Label>
                        <div className="group relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-300" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading || isPending || socialLoading !== null}
                                className="h-14 rounded-2xl border-white/8 bg-white/6 pl-11 pr-4 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm text-slate-300/72">
                    <label className="flex items-center gap-3">
                        <Checkbox
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                            className="border-white/16 bg-white/6 data-[state=checked]:border-cyan-300 data-[state=checked]:bg-cyan-300 data-[state=checked]:text-slate-950"
                        />
                        <span>Remember me</span>
                    </label>

                    <Link href="/sign-up" className="text-cyan-300 transition hover:text-cyan-200">
                        Create account
                    </Link>
                </div>

                <div className="relative py-1">
                    <div className="absolute inset-x-0 top-1/2 border-t border-white/8" />
                    <span className="relative mx-auto block w-fit bg-[#13233a] px-4 text-xs uppercase tracking-[0.32em] text-slate-400">
                        Or
                    </span>
                </div>

                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isPending || socialLoading !== null}
                    className="h-14 w-full justify-between rounded-2xl border border-white/8 bg-white/6 px-5 text-left text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/10"
                >
                    <span className="flex items-center gap-3">
                        {socialLoading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                        <span>Continue with Google</span>
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/8">
                        <ArrowRight className="h-4 w-4" />
                    </span>
                </Button>
            </form>
        </AuthShell>
    );
}

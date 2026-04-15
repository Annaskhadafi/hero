"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signIn, signUp, useSession } from "@/lib/auth-client";

const signUpSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            ),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type SignUpForm = z.infer<typeof signUpSchema>;

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

export default function SignUpPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
    const { data: session, isPending } = useSession();
    const router = useRouter();

    const form = useForm<SignUpForm>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (session?.user) {
            router.replace("/dashboard");
        }
    }, [router, session]);

    const onSubmit = async (data: SignUpForm) => {
        setIsLoading(true);
        setError("");

        try {
            const result = await signUp.email({
                email: data.email,
                password: data.password,
                name: data.name,
                callbackURL: "/dashboard",
            });

            if (result.error) {
                setError(result.error.message || "Sign up failed");
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
        setSocialLoading(true);
        setError("");

        try {
            const result = await signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
                newUserCallbackURL: "/dashboard",
                requestSignUp: true,
                errorCallbackURL: "/sign-up",
            });

            if (result.error) {
                setError(result.error.message || "Google sign up failed");
            }
        } catch {
            setError(
                "Google sign up belum siap. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah diisi."
            );
        } finally {
            setSocialLoading(false);
        }
    };

    return (
        <AuthShell
            title="Create account"
            description="Register a new HERO account manually or continue faster with Google."
            panelClassName="max-w-[520px]"
            footer={
                <>
                    Already have an account?{" "}
                    <Link href="/sign-in" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                        Sign in
                    </Link>
                </>
            }
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {error ? (
                        <Alert className="border-rose-400/25 bg-rose-500/10 text-rose-50">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <FormLabel className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                        Full Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your full name"
                                            {...field}
                                            disabled={isLoading || isPending || socialLoading}
                                            className="h-[52px] rounded-2xl border-white/8 bg-white/6 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <FormLabel className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                        Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="name@company.com"
                                            {...field}
                                            disabled={isLoading || isPending || socialLoading}
                                            className="h-[52px] rounded-2xl border-white/8 bg-white/6 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Create a password"
                                                {...field}
                                                disabled={isLoading || isPending || socialLoading}
                                                className="h-[52px] rounded-2xl border-white/8 bg-white/6 pr-11 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-300"
                                                disabled={isLoading || isPending || socialLoading}
                                                aria-label="Toggle password visibility"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                                        Confirm Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Repeat your password"
                                                {...field}
                                                disabled={isLoading || isPending || socialLoading}
                                                className="h-[52px] rounded-2xl border-white/8 bg-white/6 pr-11 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-300"
                                                disabled={isLoading || isPending || socialLoading}
                                                aria-label="Toggle confirm password visibility"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading || isPending || socialLoading}
                        className="h-[52px] w-full rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_18px_50px_rgba(103,232,249,0.24)] transition hover:bg-cyan-200"
                    >
                        {isLoading || isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <div className="relative py-1">
                        <div className="absolute inset-x-0 top-1/2 border-t border-white/8" />
                        <span className="relative mx-auto block w-fit bg-[#13233a] px-4 text-xs uppercase tracking-[0.32em] text-slate-400">
                            Or
                        </span>
                    </div>

                    <Button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading || isPending || socialLoading}
                        className="h-[52px] w-full justify-between rounded-2xl border border-white/8 bg-white/6 px-5 text-left text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/10"
                    >
                        <span className="flex items-center gap-3">
                            {socialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                            <span>Continue with Google</span>
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/8">
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </Button>
                </form>
            </Form>
        </AuthShell>
    );
}

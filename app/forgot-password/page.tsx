"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
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
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                        Email
                    </Label>
                    <Input
                        id="email"
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
    );
}

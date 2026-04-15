"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!token) {
            setError("Token reset password tidak ditemukan atau sudah tidak valid.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Konfirmasi password belum sama.");
            return;
        }

        setIsLoading(true);

        try {
            const result = await authClient.resetPassword({
                newPassword: password,
                token,
            });

            if (result.error) {
                setError(result.error.message || "Gagal memperbarui password.");
                return;
            }

            router.replace("/sign-in?reset=success");
        } catch {
            setError("Terjadi kendala saat memperbarui password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Buat password baru"
            description="Masukkan password baru untuk akun HERO Anda."
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

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Password baru
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Masukkan password baru"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            disabled={isLoading}
                            className="h-14 rounded-2xl border-white/8 bg-white/6 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Konfirmasi password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Ulangi password baru"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            disabled={isLoading}
                            className="h-14 rounded-2xl border-white/8 bg-white/6 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/25"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || !token}
                    className="h-14 w-full rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_18px_50px_rgba(103,232,249,0.24)] transition hover:bg-cyan-200"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Menyimpan password...
                        </>
                    ) : (
                        <>
                            Simpan password baru
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>
        </AuthShell>
    );
}

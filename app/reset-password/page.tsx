"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ResetPasswordContent() {
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
            setError("Reset password token not found or invalid.");
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
            title="Create new password"
            description="Masukkan password baru untuk akun HERO Anda."
            panelClassName="max-w-[520px]"
            footer={
                <>
                    Kembali ke{" "}
                    <Link href="/sign-in" className="font-medium text-[#9ac8ec] transition hover:text-[#bedef2]">
                        Login
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

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Password baru
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            disabled={isLoading}
                            className="auth-dark-input h-14 rounded-2xl bg-[#10283a]/92 text-base text-white placeholder:text-slate-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                            Konfirmasi password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Repeat new password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            disabled={isLoading}
                            className="auth-dark-input h-14 rounded-2xl bg-[#10283a]/92 text-base text-white placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || !token}
                    className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-white shadow-[0_18px_50px_rgba(0,52,97,0.28)] transition hover:brightness-110"
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

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9ac8ec]" />
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}

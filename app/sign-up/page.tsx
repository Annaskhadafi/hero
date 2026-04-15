import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
    return (
        <AuthShell
            title="Akun dibuat oleh admin"
            description="Pendaftaran mandiri dinonaktifkan. Hubungi administrator HERO jika Anda membutuhkan akses baru."
            panelClassName="max-w-[520px]"
            footer={
                <>
                    Sudah punya akun?{" "}
                    <Link href="/sign-in" className="font-medium text-cyan-300 transition hover:text-cyan-200">
                        Sign in
                    </Link>
                </>
            }
        >
            <div className="rounded-[28px] border border-white/8 bg-white/6 p-6 text-center text-slate-200">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <p className="text-sm leading-7 text-slate-300/82">
                    Untuk menjaga akses tetap terkontrol, user baru hanya bisa ditambahkan dari dashboard admin.
                </p>
            </div>
        </AuthShell>
    );
}

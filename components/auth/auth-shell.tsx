import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
    title: ReactNode;
    description: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    headerBadge?: ReactNode;
    panelClassName?: string;
};

export function AuthShell({
    title,
    description,
    children,
    footer,
    headerBadge,
    panelClassName,
}: AuthShellProps) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#081826] px-4 py-10 text-slate-50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,130,178,0.28),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(90,34,0,0.14),_transparent_24%),linear-gradient(180deg,_#0d2030_0%,_#081826_52%,_#06111b_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(154,200,236,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(154,200,236,0.06)_1px,transparent_1px)] bg-[size:110px_110px] opacity-30" />
            <div className="absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-[#4f83b0]/18 blur-3xl" />

            <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                <div
                    className={cn(
                        "w-full max-w-[460px] rounded-lg border-0 bg-[linear-gradient(180deg,rgba(16,39,57,0.9)_0%,rgba(10,28,43,0.96)_100%)] p-8 shadow-[0_28px_90px_rgba(2,8,23,0.58)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-10",
                        panelClassName
                    )}
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6">
                            {headerBadge ?? (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#003461_0%,#004b87_72%,#5a2200_150%)] shadow-[0_18px_40px_rgba(0,52,97,0.35)]">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/18">
                                        <div className="h-4 w-4 rounded-sm border-2 border-white/85" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-normal text-slate-300/70">
                            Secure Operations
                        </p>
                        <h1 className="font-display mt-2 text-3xl font-semibold tracking-normal text-white">
                            {title}
                        </h1>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300/80">
                            {description}
                        </p>
                    </div>

                    <div className="mt-8">{children}</div>

                    {footer ? (
                        <div className="mt-8 pt-6 text-center text-sm text-slate-300/70">
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

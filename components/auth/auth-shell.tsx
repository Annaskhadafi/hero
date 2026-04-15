import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
    title: string;
    description: string;
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
        <div className="relative min-h-screen overflow-hidden bg-[#07111e] px-4 py-10 text-slate-50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(101,196,255,0.2),_transparent_20%),radial-gradient(circle_at_20%_20%,_rgba(23,85,160,0.26),_transparent_32%),linear-gradient(180deg,_#0a1526_0%,_#07111d_52%,_#040913_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:96px_96px] opacity-25" />
            <div className="absolute left-1/2 top-16 h-36 w-36 -translate-x-1/2 rounded-full bg-cyan-300/15 blur-3xl" />

            <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                <div
                    className={cn(
                        "w-full max-w-[460px] rounded-[36px] border border-white/12 bg-[linear-gradient(180deg,rgba(27,45,71,0.86)_0%,rgba(12,24,41,0.94)_100%)] p-8 shadow-[0_28px_90px_rgba(2,8,23,0.65)] backdrop-blur-2xl sm:p-10",
                        panelClassName
                    )}
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] border border-cyan-200/18 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_30px_rgba(103,232,249,0.12)]">
                            {headerBadge ?? (
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/12 ring-1 ring-inset ring-cyan-100/20">
                                    <div className="h-4 w-4 rounded-full border-2 border-cyan-100/90" />
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">
                            {title}
                        </h1>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300/80">
                            {description}
                        </p>
                    </div>

                    <div className="mt-8">{children}</div>

                    {footer ? (
                        <div className="mt-8 border-t border-white/8 pt-6 text-center text-sm text-slate-300/70">
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

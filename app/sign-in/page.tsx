import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getLoginPageSettings } from "@/app/dashboard/settings/login-page/actions";
import { SignInContent } from "./sign-in-content";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
    const settings = await getLoginPageSettings();

    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-[#e5f3ff]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0753e7]" />
                </div>
            }
        >
            <SignInContent initialSettings={settings} />
        </Suspense>
    );
}

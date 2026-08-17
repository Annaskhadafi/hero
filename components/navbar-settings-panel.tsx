"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateNavbarThemeAction, type AdminMutationState } from "@/app/dashboard/admin-actions";

type NavbarThemeRow = {
  themeName: string;
  backgroundStyle: string;
  accentColor: string;
  headerBackgroundColor: string;
  textColor: string;
  density: string;
  logoMode: string;
} | undefined;

export function NavbarSettingsPanel({
  theme,
}: {
  theme: NavbarThemeRow;
  menuItems?: any[];
}) {
  const initialState: AdminMutationState = { status: "idle", message: "" };
  const [state, formAction, isPending] = useActionState(updateNavbarThemeAction, initialState);
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState(
    theme?.headerBackgroundColor ?? "#FFFFFF"
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tampilan Navigasi</CardTitle>
          <CardDescription>
            Atur warna dan identitas navigasi admin HERO.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">
            Nama tema
            <Input value={theme?.themeName ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Gaya latar
            <Input value={theme?.backgroundStyle ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Warna aksen
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <span
                className="size-5 rounded-full border"
                style={{ backgroundColor: theme?.accentColor ?? "#D97706" }}
              />
              <span className="text-sm">{theme?.accentColor ?? "—"}</span>
            </div>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Warna teks
            <Input value={theme?.textColor ?? ""} readOnly />
          </label>
          <form action={formAction} className="space-y-2 text-sm font-medium">
            Warna header
            <div className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="color"
                value={headerBackgroundColor}
                onChange={(event) => setHeaderBackgroundColor(event.target.value)}
                className="h-10 w-16 cursor-pointer rounded border bg-transparent p-1"
              />
              <Input
                name="headerBackgroundColor"
                value={headerBackgroundColor}
                onChange={(event) => setHeaderBackgroundColor(event.target.value)}
                className="h-10"
                required
              />
              <Button type="submit" size="sm" disabled={isPending} className="rounded-full">
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
            {state.status !== "idle" ? (
              <Alert
                className={
                  state.status === "error"
                    ? "border-rose-200 text-rose-700"
                    : "border-emerald-200 text-emerald-700"
                }
              >
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </form>
          <label className="space-y-2 text-sm font-medium">
            Kerapatan
            <Input value={theme?.density ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Mode logo
            <Input value={theme?.logoMode ?? ""} readOnly />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}

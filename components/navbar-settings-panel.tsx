"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

type NavbarMenuRow = {
  id: number;
  section: string;
  title: string;
  url: string;
  iconName: string;
  resource: string;
  sortOrder: number;
  isVisible: boolean;
  openInNewTab: boolean;
};

export function NavbarSettingsPanel({
  theme,
  menuItems,
}: {
  theme: NavbarThemeRow;
  menuItems: NavbarMenuRow[];
}) {
  const initialState: AdminMutationState = { status: "idle", message: "" };
  const [state, formAction, isPending] = useActionState(updateNavbarThemeAction, initialState);
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState(theme?.headerBackgroundColor ?? "#FFFFFF");
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
          <CardTitle>Navbar Theme</CardTitle>
          <CardDescription>
            Meniru area pengaturan visual navbar dari halaman referensi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">
            Theme name
            <Input value={theme?.themeName ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Background style
            <Input value={theme?.backgroundStyle ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Accent color
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <span
                className="size-5 rounded-full border"
                style={{ backgroundColor: theme?.accentColor ?? "#D97706" }}
              />
              <span className="text-sm">{theme?.accentColor ?? "—"}</span>
            </div>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Text color
            <Input value={theme?.textColor ?? ""} readOnly />
          </label>
          <form action={formAction} className="space-y-2 text-sm font-medium">
            Header navbar color
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
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {state.status !== "idle" ? (
              <Alert className={state.status === "error" ? "border-rose-200 text-rose-700" : "border-emerald-200 text-emerald-700"}>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </form>
          <label className="space-y-2 text-sm font-medium">
            Density
            <Input value={theme?.density ?? ""} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Logo mode
            <Input value={theme?.logoMode ?? ""} readOnly />
          </label>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Navbar Menu</CardTitle>
          <CardDescription>
            Struktur menu governance yang tampil di sidebar admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr]"
            >
              <div className="space-y-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.url}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {item.section}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {item.iconName}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {item.resource}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Sort order</p>
                <p className="font-medium">{item.sortOrder}</p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={item.isVisible} disabled />
                  <span className="text-sm">Visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={item.openInNewTab} disabled />
                  <span className="text-sm">New tab</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

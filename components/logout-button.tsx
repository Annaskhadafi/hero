"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  variant = "outline",
  size = "default",
  label = "Keluar",
  redirectTo = "/sign-in",
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isSigningOut}
      className={cn(className)}
    >
      <LogOut className="size-4" />
      {size === "icon" ? <span className="sr-only">{isSigningOut ? "Keluar..." : label}</span> : isSigningOut ? "Keluar..." : label}
    </Button>
  );
}

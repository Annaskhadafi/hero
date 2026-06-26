"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const MobileSecurityRoleManagement = dynamic(
  () => import("@/components/mobile-security-role-management").then((mod) => mod.MobileSecurityRoleManagement),
  { ssr: false },
);

export function MobileSecurityRoleManagementClient(
  props: ComponentProps<typeof MobileSecurityRoleManagement>,
) {
  return <MobileSecurityRoleManagement {...props} />;
}

"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const SecurityRoleManagement = dynamic(
  () => import("@/components/security-role-management").then((mod) => mod.SecurityRoleManagement),
  { ssr: false },
);

export function SecurityRoleManagementClient(props: ComponentProps<typeof SecurityRoleManagement>) {
  return <SecurityRoleManagement {...props} />;
}

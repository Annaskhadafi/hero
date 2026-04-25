"use client"

import * as React from "react"

import { MinimalTableShell } from "@/components/ui/minimal-table-shell"

type AdminDataTableShellProps = React.ComponentProps<typeof MinimalTableShell>

export function AdminDataTableShell(props: AdminDataTableShellProps) {
  return <MinimalTableShell {...props} />
}

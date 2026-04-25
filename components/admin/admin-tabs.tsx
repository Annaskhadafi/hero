"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

type AdminTabItem = {
  value: string
  label: string
  count?: number
}

export function AdminTabsList({ items }: { items: AdminTabItem[] }) {
  return (
    <TabsList className="h-auto w-full justify-start overflow-x-auto p-0.5">
      {items.map((item) => (
        <TabsTrigger key={item.value} value={item.value}>
          {item.label}
          {typeof item.count === "number" ? (
            <Badge variant="secondary" className="ml-1 rounded-[6px] px-1.5 py-0 text-[11px]">
              {item.count}
            </Badge>
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  showQuickCreate = false,
}: {
  items: {
    section?: string
    title: string
    url: string
    icon?: Icon
  }[]
  showQuickCreate?: boolean
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {showQuickCreate ? (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                asChild
                tooltip="Quick Create"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 rounded-xl duration-200 ease-linear"
              >
                <Link href="/dashboard/activity-hub/my-day">
                  <IconCirclePlusFilled />
                  <span>Tambah Aktivitas</span>
                </Link>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="size-8 rounded-xl border-slate-200 bg-white group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <IconMail />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <SidebarMenu className="px-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.section ? `${item.section} • ${item.title}` : item.title}
                isActive={item.url !== "#" && pathname.startsWith(item.url)}
                className="rounded-xl"
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconChevronRight,
  IconCirclePlusFilled,
  type Icon,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function isMenuItemActive(pathname: string, url: string) {
  return url !== "#" && pathname === url
}

export function NavMain({
  groups,
  showQuickCreate = false,
}: {
  groups: {
    title: string
    icon?: Icon
    items: {
      section?: string
      title: string
      url: string
      icon?: Icon
    }[]
  }[]
  showQuickCreate?: boolean
}) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.map((group) => [
        group.title,
        group.items.some((item) => isMenuItemActive(pathname, item.url)),
      ])
    )
  )

  React.useEffect(() => {
    setOpenGroups((previous) => {
      const next = { ...previous }
      let hasChanged = false

      for (const group of groups) {
        const hasActiveItem = group.items.some((item) => isMenuItemActive(pathname, item.url))

        if (!(group.title in next)) {
          next[group.title] = hasActiveItem
          hasChanged = true
          continue
        }

        if (hasActiveItem && !next[group.title]) {
          next[group.title] = true
          hasChanged = true
        }
      }

      return hasChanged ? next : previous
    })
  }, [groups, pathname])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        {showQuickCreate ? (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                asChild
                tooltip="Aksi cepat"
                className="min-h-9 min-w-8 rounded-md bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] px-2 text-[13px] text-primary-foreground shadow-none duration-200 ease-linear hover:text-primary-foreground active:text-primary-foreground"
              >
                <Link href="/dashboard/activity-hub/my-day">
                  <IconCirclePlusFilled />
                  <span>Tambah Aktivitas</span>
                </Link>
              </SidebarMenuButton>

            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <SidebarMenu className="px-1">
          {groups.map((group) => {
            const hasActiveItem = group.items.some((item) => isMenuItemActive(pathname, item.url))
            const isOpen = openGroups[group.title] ?? hasActiveItem

            return (
              <Collapsible
                key={group.title}
                asChild
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenGroups((previous) => ({
                    ...previous,
                    [group.title]: open,
                  }))
                }
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={group.title}
                      isActive={hasActiveItem}
                      className="min-h-9 rounded-md px-2 text-[13px] font-medium"
                    >
                      {group.icon && <group.icon />}
                      <span>{group.title}</span>
                      <IconChevronRight
                        className={cn(
                          "ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                          isOpen ? "rotate-90" : "rotate-0"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-0.5">
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isMenuItemActive(pathname, item.url)}
                            className="min-h-8 rounded-md px-2 text-[13px]"
                          >
                            <Link href={item.url}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}





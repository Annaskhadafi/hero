"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconChevronRight,
  IconCirclePlusFilled,
  IconMail,
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
      <SidebarGroupContent className="flex flex-col gap-2">
        {showQuickCreate ? (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                asChild
                tooltip="Quick Create"
                className="min-w-8 rounded-[1rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] text-primary-foreground shadow-[0_14px_28px_rgba(0,52,97,0.18)] duration-200 ease-linear hover:text-primary-foreground active:text-primary-foreground"
              >
                <Link href="/dashboard/activity-hub/my-day">
                  <IconCirclePlusFilled />
                  <span>Tambah Aktivitas</span>
                </Link>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="size-10 rounded-[1rem] bg-surface-container-low group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <IconMail />
                <span className="sr-only">Inbox</span>
              </Button>
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
                      className="rounded-[1rem]"
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
                    <SidebarMenuSub className="mt-1">
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isMenuItemActive(pathname, item.url)}
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

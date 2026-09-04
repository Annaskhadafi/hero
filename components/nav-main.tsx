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
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

function isMenuItemActive(pathname: string, url: string) {
  return url !== "#" && pathname === url
}

type NavItem = {
  id?: number
  section?: string
  title: string
  url: string
  icon?: Icon
  groupLabel?: string | null
  openInNewTab?: boolean
  parentId?: number | null
  isIframe?: boolean
  children?: NavItem[]
}

type NavGroup = {
  title: string
  icon?: Icon
  items: NavItem[]
}

function groupItemsByLabel(items: NavItem[]): Map<string | null, NavItem[]> {
  const groups = new Map<string | null, NavItem[]>()
  for (const item of items) {
    const key = item.groupLabel ?? null
    const existing = groups.get(key) ?? []
    existing.push(item)
    groups.set(key, existing)
  }
  return groups
}

function SubmenuItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [isOpen, setIsOpen] = React.useState(() => {
    return item.children?.some(child => isMenuItemActive(pathname, child.url)) ?? false
  })

  const hasActiveChild = item.children?.some(child => isMenuItemActive(pathname, child.url)) ?? false
  const hasChildren = item.children && item.children.length > 0

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem key={item.url}>
        <SidebarMenuSubButton
          asChild
          isActive={isMenuItemActive(pathname, item.url)}
          className="min-h-8 rounded-md px-2 text-[13px]"
        >
          <Link href={item.url} target={item.openInNewTab ? "_blank" : undefined}>
            <span>{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <SidebarMenuSubItem>
        <div className="flex flex-col w-full">
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton
              isActive={isMenuItemActive(pathname, item.url) || hasActiveChild}
              className="min-h-8 rounded-md px-2 text-[13px] font-medium flex items-center justify-between w-full"
            >
              <span>{item.title}</span>
              <IconChevronRight
                className={cn(
                  "ml-auto h-3.5 w-3.5 transition-transform duration-200",
                  isOpen ? "rotate-90" : "rotate-0"
                )}
              />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 border-l border-sidebar-border/60 ml-2 mt-1 flex flex-col gap-1">
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isMenuItemActive(pathname, child.url)}
                  className="min-h-7 rounded-md px-2 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  <Link href={child.url} target={child.openInNewTab ? "_blank" : undefined}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </CollapsibleContent>
        </div>
      </SidebarMenuSubItem>
    </Collapsible>
  )
}

export function NavMain({
  groups,
  showQuickCreate = false,
  groupLabelColor = "#6B7280",
}: {
  groups: NavGroup[]
  showQuickCreate?: boolean
  groupLabelColor?: string
}) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (groups || []).map((group) => [
        group.title,
        (group.items || []).some((item) => isMenuItemActive(pathname, item?.url)),
      ])
    )
  )

  React.useEffect(() => {
    setOpenGroups((previous) => {
      const next = { ...previous }
      let hasChanged = false

      for (const group of groups || []) {
        const hasActiveItem = (group.items || []).some((item) => isMenuItemActive(pathname, item?.url))

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

  function renderItems(items: NavItem[], section?: string) {
    const grouped = groupItemsByLabel(items)
    const hasGroups = grouped.size > 1 || !grouped.has(null)

    if (!hasGroups) {
      return items.map((item) => (
        <SubmenuItem key={item.url} item={item} pathname={pathname} />
      ))
    }

    return Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
      <React.Fragment key={groupLabel ?? "__ungrouped__"}>
        {groupLabel && (
          <li
            className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: groupLabelColor }}
          >
            {groupLabel}
          </li>
        )}
        {groupItems.map((item) => (
          <SubmenuItem key={item.url} item={item} pathname={pathname} />
        ))}
      </React.Fragment>
    ))
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        {showQuickCreate ? (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                asChild
                tooltip={t('sidebar.quick_action', 'Aksi cepat')}
                className="min-h-9 min-w-8 rounded-md bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] px-2 text-[13px] text-primary-foreground shadow-none duration-200 ease-linear hover:text-primary-foreground active:text-primary-foreground"
              >
                <Link href="/dashboard/activity-hub/my-day">
                  <IconCirclePlusFilled />
                  <span>{t('sidebar.add_activity', 'Tambah Aktivitas')}</span>
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
                      <span suppressHydrationWarning>{group.title}</span>
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
                      {renderItems(group.items, group.title)}
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





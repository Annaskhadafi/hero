import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"

export function SiteHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="size-9 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground" />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle ? (
              <p className="text-muted-foreground truncate text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 md:flex">
            RBAC synced workspace
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full px-4">
            <Link href="/">Dashboard Home</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

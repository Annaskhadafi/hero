import { redirect } from "next/navigation";

export default async function MobilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = searchParams ? await searchParams : {}
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === 'string') qs.set(key, val)
  }
  const queryStr = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/mobile/dashboard${queryStr}`)
}

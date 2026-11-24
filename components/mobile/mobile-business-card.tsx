"use client";

import { useState, useTransition } from "react";
import { Copy, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroDetailModal, HeroSwitch } from "@/components/templates";
import { EmployeeEcard } from "./employee-ecard";
import { toggleBusinessCardSharingAction } from "@/app/mobile/profile/actions";

const PUBLIC_DOMAIN = "https://hero.chitraparatama.com";

type Props = {
  name: string;
  title: string;
  email: string;
  phone: string;
  enabled: boolean;
  token: string | null;
};

export function MobileBusinessCard({ name, title, email, phone, enabled, token }: Props) {
  const [open, setOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [publicToken, setPublicToken] = useState(token);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const sharePath = isEnabled && publicToken ? `/business-card/${publicToken}` : "";
  const cardUrl = sharePath ? `${PUBLIC_DOMAIN}${sharePath}` : undefined;
  const [showLink, setShowLink] = useState(false);

  function toggleSharing(next: boolean) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await toggleBusinessCardSharingAction(next);
        setMessage(result.ok ? (next ? "Public sharing enabled." : "Public sharing disabled.") : "Unable to update sharing. Try again.");
        if (result.ok) {
          setIsEnabled(next);
          setShowLink(false);
          if (result.token) setPublicToken(result.token);
        }
      } catch {
        setMessage("Unable to update sharing. Try again.");
      }
    });
  }

  async function copyLink() {
    if (!cardUrl) return;
    try {
      await navigator.clipboard.writeText(cardUrl);
      setMessage("Link copied.");
    } catch { setShowLink(true); }
  }

  return <>
    <Button type="button" className="h-9 w-full gap-2 font-semibold" onClick={() => setOpen(true)}>
      <Share2 aria-hidden className="size-4" /> E-Business Card <QrCode aria-hidden className="ml-auto size-4" />
    </Button>
    <HeroDetailModal title="E-Business Card" subtitle="Preview and manage your contact card." open={open} onOpenChange={setOpen}>
      <EmployeeEcard name={name} title={title} email={email} phone={phone} headingLevel={2} cardUrl={cardUrl} contactUrl={sharePath ? `${sharePath}/contact.vcf` : undefined}
        ownerControls={<div className="rounded-lg bg-white p-2 text-slate-900">
          <HeroSwitch label="Share my card" description="Anyone with the link can see your name, job title, work email and phone. Turn sharing off at any time." checked={isEnabled} onCheckedChange={toggleSharing} disabled={pending} />
          {cardUrl && <Button type="button" variant="ghost" className="mt-1 h-9" onClick={copyLink}><Copy aria-hidden className="size-4" /> Copy Link</Button>}
          {cardUrl && showLink && <a href={cardUrl} rel="noreferrer" className="block break-all p-2 text-xs underline">{cardUrl}</a>}
          {message && <p role="status" className="px-2 text-xs">{message}</p>}
        </div>} />
    </HeroDetailModal>
  </>;
}

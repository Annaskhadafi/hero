"use client";

import { ArrowUpRight } from "lucide-react";

import { PortalChitraIcon } from "@/components/portal-chitra-icon";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { PortalChitraAppRecord } from "@/lib/portal-chitra";

export function MobilePortalChitraSlider({
  apps,
}: {
  apps: PortalChitraAppRecord[];
}) {
  if (apps.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Portal Chitra</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-[#082033]">
            Launch app lintas sistem
          </h2>
        </div>
        <Badge className="rounded-full border-0 bg-[#e9f6fd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#003f78]">
          Slider
        </Badge>
      </div>

      <Carousel opts={{ align: "start" }} className="w-full">
        <CarouselContent className="-ml-3">
          {apps.map((app) => (
            <CarouselItem key={app.id} className="basis-[88%] pl-3 sm:basis-[72%]">
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[1.35rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] ring-1 ring-[#dbe8f1]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-12 items-center justify-center rounded-[1rem] text-white shadow-[0_14px_24px_rgba(8,32,51,0.16)]"
                    style={{ backgroundColor: app.color }}
                  >
                    <PortalChitraIcon name={app.iconName} className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-[#486275]" />
                </div>

                <div className="mt-4">
                  <Badge className="rounded-full border-0 bg-[#f3faff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
                    {app.category}
                  </Badge>
                  <p className="mt-3 text-base font-black leading-tight text-[#082033]">{app.name}</p>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">
                    {app.description}
                  </p>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

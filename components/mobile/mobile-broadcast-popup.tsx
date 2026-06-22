"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { interactWithBroadcast } from "@/app/actions/broadcast";

interface BroadcastMobileItem {
  id: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  mediaType: string;
  targetType: string;
  maxPopups: number;
  viewsCount: number;
  dismissed: boolean;
  liked: boolean | null;
  categoryName: string | null;
}

function VideoPlayer({ url }: { url: string }) {
  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYoutube) {
    let embedId = "";
    if (url.includes("watch?v=")) {
      embedId = url.split("watch?v=")[1]?.split("&")[0] || "";
    } else if (url.includes("youtu.be/")) {
      embedId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    }
    const embedUrl = `https://www.youtube.com/embed/${embedId}`;
    return (
      <iframe
        src={embedUrl}
        title="Video Player"
        className="w-full aspect-video rounded-t-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video
      src={url}
      controls
      className="w-full aspect-video rounded-t-lg object-cover"
    />
  );
}

export function MobileBroadcastPopup({
  initialBroadcasts = [],
}: {
  initialBroadcasts?: BroadcastMobileItem[];
}) {
  const [mounted, setMounted] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastMobileItem | null>(null);
  const [show, setShow] = useState(false);
  const [likedState, setLikedState] = useState<boolean | null>(null);
  const trackedRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (activeBroadcast || show) return;
    if (!initialBroadcasts || initialBroadcasts.length === 0) return;

    const top = initialBroadcasts[0];
    setActiveBroadcast(top);
    setLikedState(top.liked);
    setShow(true);
  }, [mounted, initialBroadcasts, activeBroadcast, show]);

  useEffect(() => {
    if (!activeBroadcast) return;
    if (trackedRef.current === activeBroadcast.id) return;

    trackedRef.current = activeBroadcast.id;
    interactWithBroadcast(activeBroadcast.id, "view").catch(console.error);
  }, [activeBroadcast]);

  const handleClose = async () => {
    if (!activeBroadcast) return;
    setShow(false);
    try {
      await interactWithBroadcast(activeBroadcast.id, "dismiss");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReaction = async (react: "like" | "dislike") => {
    if (!activeBroadcast) return;

    let targetReaction: "like" | "dislike" | "unlike" = react;

    if (likedState === true && react === "like") {
      targetReaction = "unlike";
    } else if (likedState === false && react === "dislike") {
      targetReaction = "unlike";
    }

    setLikedState(
      targetReaction === "unlike" ? null : targetReaction === "like" ? true : false
    );

    try {
      await interactWithBroadcast(activeBroadcast.id, targetReaction);
      setShow(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted || !show || !activeBroadcast) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] max-h-[85vh] rounded-[1.5rem] bg-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-muted/80">
        {/* Header Ribbon - Fixed */}
        <div className="bg-[#003f78] px-4 py-2.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-4 text-[#f4b183]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {activeBroadcast.categoryName || "Informasi Penting"}
            </span>
          </div>
          {activeBroadcast.categoryName && (
            <span className="text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
              PENTING
            </span>
          )}
        </div>

        {/* Close Button - Fixed */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/35 transition-colors p-1.5 rounded-full z-10"
        >
          <X className="size-4" />
        </button>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Media area */}
          {activeBroadcast.mediaType === "image" && activeBroadcast.imageUrl && (
            <div className="relative w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeBroadcast.imageUrl}
                alt={activeBroadcast.title}
                className="w-full h-auto object-contain"
              />
            </div>
          )}

          {activeBroadcast.mediaType === "video" && activeBroadcast.imageUrl && (
            <div className="w-full bg-slate-900 overflow-hidden">
              <VideoPlayer url={activeBroadcast.imageUrl} />
            </div>
          )}

          {/* Text Content */}
          <div className="p-4">
            <h4 className="text-base font-bold text-foreground leading-tight">
              {activeBroadcast.title}
            </h4>
            {activeBroadcast.content && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {activeBroadcast.content}
              </p>
            )}

            {/* Action Destination Link */}
            {activeBroadcast.linkUrl && (
              <a
                href={activeBroadcast.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="mt-3.5 inline-flex items-center justify-center w-full rounded-xl bg-blue-50 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100/50"
              >
                Lihat Selengkapnya <ExternalLink className="ml-1.5 size-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Footer reaction panel - Fixed */}
        <div className="p-4 border-t bg-white shrink-0">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-center text-muted-foreground uppercase font-semibold tracking-wider">
              Apakah Informasi ini berguna?
            </p>
            <div className="flex gap-2">
              <Button
                variant={likedState === true ? "default" : "outline"}
                className={cn(
                  "flex-1 rounded-xl h-10 gap-1.5 text-xs font-semibold",
                  likedState === true
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
                onClick={() => handleReaction("like")}
              >
                <ThumbsUp className="size-4" /> Berguna
              </Button>
              
              <Button
                variant={likedState === false ? "default" : "outline"}
                className={cn(
                  "flex-1 rounded-xl h-10 gap-1.5 text-xs font-semibold",
                  likedState === false
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                )}
                onClick={() => handleReaction("dislike")}
              >
                <ThumbsDown className="size-4" /> Kurang
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Calendar,
  X,
  Play,
  FileText,
  ImageIcon,
  Video as VideoIcon,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { interactWithBroadcast } from "@/app/actions/broadcast";

interface BroadcastHistoryItem {
  id: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  mediaType: string;
  targetType: string;
  createdAt: Date;
  liked: boolean | null;
  dismissed: boolean;
  viewsCount: number;
  categoryName: string | null;
}

interface InformationClientProps {
  initialHistory: BroadcastHistoryItem[];
  canCreate?: boolean;
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
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video
      src={url}
      controls
      className="w-full aspect-video object-cover"
    />
  );
}

export function InformationClient({ initialHistory, canCreate = false }: InformationClientProps) {
  const [historyList, setHistoryList] = useState<BroadcastHistoryItem[]>(initialHistory);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const handleReaction = async (itemId: number, react: "like" | "dislike") => {
    const item = historyList.find((h) => h.id === itemId);
    if (!item) return;

    let targetReaction: "like" | "dislike" | "unlike" = react;
    if (item.liked === true && react === "like") {
      targetReaction = "unlike";
    } else if (item.liked === false && react === "dislike") {
      targetReaction = "unlike";
    }

    const nextLikedVal =
      targetReaction === "unlike" ? null : targetReaction === "like" ? true : false;

    setHistoryList((prev) =>
      prev.map((h) => (h.id === itemId ? { ...h, liked: nextLikedVal } : h))
    );

    try {
      await interactWithBroadcast(itemId, targetReaction);
    } catch (err) {
      console.error(err);
      setHistoryList((prev) =>
        prev.map((h) => (h.id === itemId ? { ...h, liked: item.liked } : h))
      );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <Link
          href="/mobile/information/create"
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#003f78] py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
        >
          <PlusCircle className="size-5" />
          Buat Informasi Baru
        </Link>
      )}

      {historyList.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-8 text-center text-sm font-semibold text-[#486275] shadow-sm border">
          Belum ada informasi dari Head Office / Section Head.
        </div>
      ) : (
        historyList.map((item) => (
          <div
            key={item.id}
            className="rounded-[1.5rem] bg-white border overflow-hidden shadow-sm flex flex-col transition-all active:scale-[0.99]"
          >
            {/* Header info */}
            <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground border-b font-medium">
              <span className="flex items-center gap-1.5 flex-wrap">
                <Calendar className="size-3 text-[#003f78]" />
                {formatDate(item.createdAt)}
                {item.categoryName && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="text-purple-700 font-bold uppercase tracking-wide text-[9px] bg-purple-50 px-1.5 py-0.5 rounded">
                      {item.categoryName}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/30">•</span>
                <span className="inline-flex items-center gap-0.5 capitalize">
                  {item.mediaType === "image" && <ImageIcon className="size-3" />}
                  {item.mediaType === "video" && <VideoIcon className="size-3" />}
                  {item.mediaType === "text" && <FileText className="size-3" />}
                  {item.mediaType}
                </span>
              </span>
              <span className="capitalize font-semibold text-[#003f78] bg-blue-50 px-1.5 py-0.5 rounded">
                {item.targetType === "all" ? "Semua" : item.targetType}
              </span>
            </div>

            {/* Media Area based on MediaType */}
            {item.mediaType === "image" && item.imageUrl && (
              <div
                className="relative w-full aspect-video bg-muted overflow-hidden cursor-zoom-in"
                onClick={() => setSelectedImage(item.imageUrl)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            {item.mediaType === "video" && item.imageUrl && (
              <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center cursor-pointer group">
                {/* Visual placeholder with play button */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 group-hover:bg-black/50 transition-colors z-10"
                  onClick={() => setSelectedVideo(item.imageUrl)}
                >
                  <div className="size-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/40 group-hover:scale-110 transition-transform">
                    <Play className="size-6 fill-current ml-0.5" />
                  </div>
                  <span className="text-xs text-white/90 font-medium tracking-wide">
                    Putar Video Pengumuman
                  </span>
                </div>
              </div>
            )}

            {/* Card details */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-foreground leading-snug">
                {item.title}
              </h3>
              {item.content && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {item.content}
                </p>
              )}

              {/* Redirect Action Link */}
              {item.linkUrl && (
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center w-full rounded-xl bg-blue-50/50 hover:bg-blue-50 py-2 text-xs font-semibold text-blue-700 transition-colors border border-blue-100/50"
                >
                  Buka Link Tautan <ExternalLink className="ml-1.5 size-3" />
                </a>
              )}

              <div className="my-3 border-t border-dashed" />

              {/* Reaction buttons */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Informasi ini berguna?
                </span>
                <div className="flex gap-2 w-[160px]">
                  <Button
                    variant={item.liked === true ? "default" : "outline"}
                    className={cn(
                      "flex-1 rounded-lg h-8 px-2 text-[11px] font-semibold gap-1",
                      item.liked === true
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    )}
                    onClick={() => handleReaction(item.id, "like")}
                  >
                    <ThumbsUp className="size-3.5" /> Ya
                  </Button>

                  <Button
                    variant={item.liked === false ? "default" : "outline"}
                    className={cn(
                      "flex-1 rounded-lg h-8 px-2 text-[11px] font-semibold gap-1",
                      item.liked === false
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "border-rose-200 text-rose-600 hover:bg-rose-50"
                    )}
                    onClick={() => handleReaction(item.id, "dislike")}
                  >
                    <ThumbsDown className="size-3.5" /> Tidak
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Large Image View Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
            onClick={() => setSelectedImage(null)}
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Full size view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}

      {/* Large Video Player Lightbox */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <button
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-25"
            onClick={() => setSelectedVideo(null)}
          >
            <X className="size-6" />
          </button>
          <div
            className="w-full max-w-[640px] bg-slate-950 rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPlayer url={selectedVideo} />
          </div>
        </div>
      )}
    </div>
  );
}

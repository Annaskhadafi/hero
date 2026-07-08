"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveClientUploadUrl } from "@/lib/client-url";
import { completeInternalLmsLessonAction, saveInternalLmsVideoProgressAction } from "@/app/dashboard/chitralearning-lms/actions";

type ChitraLearningVideoPlayerProps = {
  enrollmentId: number;
  courseId?: number;
  lessonId: number;
  videoUrl: string;
  initialSeconds?: number | null;
};

export function ChitraLearningVideoPlayer({
  enrollmentId,
  courseId,
  lessonId,
  videoUrl,
  initialSeconds = 0,
}: ChitraLearningVideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedSecondRef = useRef(Math.max(0, Math.floor(initialSeconds ?? 0)));
  const maxWatchedSecondRef = useRef(Math.max(0, Math.floor(initialSeconds ?? 0)));
  const savingRef = useRef(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const isYouTube = videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be');
  const isVimeo = videoUrl?.includes('vimeo.com');
  const isEmbed = isYouTube || isVimeo;

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (isYouTube) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    if (isVimeo) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  async function persistProgress(positionSeconds: number) {
    const nextSecond = Math.max(0, Math.floor(positionSeconds || 0));
    if (savingRef.current || Math.abs(nextSecond - lastSavedSecondRef.current) < 5) return;

    savingRef.current = true;
    lastSavedSecondRef.current = nextSecond;
    setSaveState("saving");
    try {
      await saveInternalLmsVideoProgressAction({
        enrollmentId,
        lessonId,
        positionSeconds: nextSecond,
      });
      setSaveState("saved");
      router.refresh();
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="grid gap-2">
      {isEmbed ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-100 shadow-sm relative">
          <iframe
            src={getEmbedUrl(videoUrl)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full border-0"
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={resolveClientUploadUrl(videoUrl)}
          controls
          controlsList="nodownload"
          disablePictureInPicture
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-slate-900 border border-slate-100 shadow-sm"
          onContextMenu={(event) => event.preventDefault()}
          onLoadedMetadata={(event) => {
            const resumeAt = Math.max(0, Math.floor(initialSeconds ?? 0));
            if (resumeAt > 0 && Number.isFinite(event.currentTarget.duration)) {
              event.currentTarget.currentTime = Math.min(resumeAt, Math.max(0, event.currentTarget.duration - 2));
            }
          }}
          onSeeking={(event) => {
            const video = event.currentTarget;
            if (video.currentTime > maxWatchedSecondRef.current + 2) {
              video.currentTime = maxWatchedSecondRef.current;
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (!video.seeking && video.currentTime > maxWatchedSecondRef.current) {
              maxWatchedSecondRef.current = video.currentTime;
            }
            
            const currentSecond = Math.floor(video.currentTime || 0);
            if (currentSecond - lastSavedSecondRef.current >= 15) {
              void persistProgress(currentSecond);
            }
          }}
          onPause={(event) => {
            void persistProgress(event.currentTarget.currentTime);
          }}
          onEnded={(event) => {
            void persistProgress(event.currentTarget.currentTime);
            if (courseId) {
              void completeInternalLmsLessonAction({ courseId, lessonId }).then(() => router.refresh());
            }
          }}
        />
      )}
      
      {!isEmbed && (
        <p className="text-xs text-muted-foreground flex items-center justify-end">
          {saveState === "saving" ? (
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>Menyimpan progres...</span>
          ) : saveState === "saved" ? (
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Progres tersimpan</span>
          ) : null}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

import { saveInternalLmsVideoProgressAction } from "@/app/dashboard/chitralearning-lms/actions";

type ChitraLearningVideoPlayerProps = {
  enrollmentId: number;
  lessonId: number;
  videoUrl: string;
  initialSeconds?: number | null;
};

export function ChitraLearningVideoPlayer({
  enrollmentId,
  lessonId,
  videoUrl,
  initialSeconds = 0,
}: ChitraLearningVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedSecondRef = useRef(Math.max(0, Math.floor(initialSeconds ?? 0)));
  const savingRef = useRef(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

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
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="grid gap-2">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        preload="metadata"
        className="aspect-video w-full rounded-lg bg-black"
        onLoadedMetadata={(event) => {
          const resumeAt = Math.max(0, Math.floor(initialSeconds ?? 0));
          if (resumeAt > 0 && Number.isFinite(event.currentTarget.duration)) {
            event.currentTarget.currentTime = Math.min(resumeAt, Math.max(0, event.currentTarget.duration - 2));
          }
        }}
        onTimeUpdate={(event) => {
          const currentSecond = Math.floor(event.currentTarget.currentTime || 0);
          if (currentSecond - lastSavedSecondRef.current >= 15) {
            void persistProgress(currentSecond);
          }
        }}
        onPause={(event) => {
          void persistProgress(event.currentTarget.currentTime);
        }}
        onEnded={(event) => {
          void persistProgress(event.currentTarget.currentTime);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Resume video: menit terakhir {saveState === "saving" ? "sedang disimpan" : "tersimpan"}.
      </p>
    </div>
  );
}

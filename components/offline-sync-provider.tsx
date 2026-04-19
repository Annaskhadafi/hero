"use client";

import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CloudOff, RefreshCw, Signal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  OFFLINE_QUEUE_STORAGE_KEY,
  formatQueueTimestamp,
  getSyncEndpoint,
  type OfflineQueueItem,
  type SyncItemStatus,
} from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

type OfflineSyncContextValue = {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  pendingCount: number;
  conflictCount: number;
  enqueueItem: (item: OfflineQueueItem) => void;
  retryItem: (id: string) => void;
  discardItem: (id: string) => void;
  openQueue: () => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function readQueueFromStorage() {
  if (typeof window === "undefined") {
    return [] as OfflineQueueItem[];
  }

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStatusBadgeVariant(status: SyncItemStatus) {
  if (status === "conflict") return "bg-[#f9eee8] text-[#5a2200]";
  if (status === "failed") return "bg-[#f4ddce] text-[#5a2200]";
  if (status === "syncing") return "bg-[#e6f6ff] text-[#003f78]";
  return "bg-[#eef6fb] text-[#486275]";
}

function normalizeSyncError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("conflict") ||
    lower.includes("bertabrakan") ||
    lower.includes("sudah pernah") ||
    lower.includes("sudah ada")
  ) {
    return "conflict" as const;
  }

  return "failed" as const;
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const syncLockRef = useRef(false);

  useEffect(() => {
    setQueue(readQueueFromStorage());
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (!isOnline || syncLockRef.current) {
      return;
    }

    const queuedItems = queue.filter((item) => item.status === "queued" || item.status === "failed");
    if (queuedItems.length === 0) {
      return;
    }

    syncLockRef.current = true;

    const syncQueue = async () => {
      for (const item of queuedItems) {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "syncing",
                  errorMessage: "",
                }
              : entry,
          ),
        );

        try {
          const response = await fetch(getSyncEndpoint(item.entityType), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
          const result = (await response.json()) as {
            success: boolean;
            message?: string;
            conflict?: boolean;
          };

          if (response.ok && result.success) {
            setQueue((current) => current.filter((entry) => entry.id !== item.id));
            continue;
          }

          const nextStatus = result.conflict
            ? "conflict"
            : normalizeSyncError(result.message || "Sync gagal.");

          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: nextStatus,
                    errorMessage: result.message || "Sync gagal.",
                  }
                : entry,
            ),
          );
        } catch (error) {
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Sync gagal.",
                  }
                : entry,
            ),
          );
        }
      }

      syncLockRef.current = false;
    };

    void syncQueue();
  }, [isOnline, queue]);

  const pendingCount = queue.filter((item) => item.status === "queued" || item.status === "syncing").length;
  const conflictCount = queue.filter((item) => item.status === "conflict").length;

  const value: OfflineSyncContextValue = {
    isOnline,
    queue,
    pendingCount,
    conflictCount,
    enqueueItem: (item) => {
      setQueue((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
      setIsSheetOpen(true);
    },
    retryItem: (id) => {
      setQueue((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "queued",
                errorMessage: "",
              }
            : item,
        ),
      );
    },
    discardItem: (id) => {
      setQueue((current) => current.filter((item) => item.id !== id));
    },
    openQueue: () => setIsSheetOpen(true),
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[82vh] rounded-t-[1.6rem] border-0 bg-[#f6fbff] px-0">
          <SheetHeader className="border-b border-[#d8e8f3] px-5 pb-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5d7485]">
                  Offline Sync Queue
                </p>
                <SheetTitle className="mt-1 text-xl font-black tracking-tight text-[#082033]">
                  {isOnline ? "Sync command center" : "Offline cache aktif"}
                </SheetTitle>
              </div>
              <div className="flex gap-2">
                <Badge className="border-0 bg-[#e6f6ff] text-[#003f78]">
                  {pendingCount} pending
                </Badge>
                <Badge className="border-0 bg-[#f9eee8] text-[#5a2200]">
                  {conflictCount} conflict
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-3 overflow-y-auto px-4 py-4">
            {queue.length > 0 ? (
              queue.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#082033]">{item.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#5d7485]">
                        {formatQueueTimestamp(item.createdAt)}
                      </p>
                    </div>
                    <Badge className={cn("border-0 font-black uppercase", getStatusBadgeVariant(item.status))}>
                      {item.status}
                    </Badge>
                  </div>

                  {item.errorMessage ? (
                    <p className="mt-3 rounded-[0.95rem] bg-[#f6fbff] px-3 py-2 text-xs font-semibold leading-5 text-[#486275]">
                      {item.errorMessage}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(item.status === "failed" || item.status === "conflict") ? (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl bg-[#003f78] text-white"
                        onClick={() => value.retryItem(item.id)}
                      >
                        <RefreshCw className="size-4" />
                        Retry
                      </Button>
                    ) : null}
                    {item.draftKey ? (
                      <Button asChild size="sm" variant="outline" className="rounded-xl border-0 bg-[#eaf4fb] text-[#003f78]">
                        <Link href={item.route}>Open form</Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-[#5d7485]"
                      onClick={() => value.discardItem(item.id)}
                    >
                      Discard
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.2rem] bg-white px-4 py-5 text-sm font-semibold text-[#486275] shadow-[0_12px_28px_rgba(8,32,51,0.08)]">
                Queue kosong. Draft dan submit offline baru akan muncul di sini.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);

  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider.");
  }

  return context;
}

export function MobileOfflineIndicator() {
  const { isOnline, pendingCount, conflictCount, openQueue } = useOfflineSync();

  return (
    <button
      type="button"
      onClick={openQueue}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em] transition active:scale-95",
        isOnline
          ? "bg-[#e6f6ff] text-[#003f78]"
          : "bg-[#f9eee8] text-[#5a2200]",
      )}
      aria-label="Open offline sync queue"
    >
      {conflictCount > 0 ? (
        <AlertTriangle className="size-3.5" />
      ) : isOnline ? (
        <Signal className="size-3.5" />
      ) : (
        <CloudOff className="size-3.5" />
      )}
      <span>{!isOnline ? "Offline" : pendingCount > 0 ? `${pendingCount} sync` : "Online"}</span>
    </button>
  );
}

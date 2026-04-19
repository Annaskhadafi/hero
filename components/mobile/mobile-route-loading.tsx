function LoadingCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white shadow-[0_14px_32px_rgba(8,32,51,0.08)] ${className}`} />;
}

export function MobileRouteLoading() {
  return (
    <div className="space-y-4" aria-label="Memuat konten mobile">
      <section className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[#d7ecf9]" />
        <div className="h-8 w-52 animate-pulse rounded-lg bg-[#cce4f4]" />
      </section>

      <LoadingCard className="h-36 bg-[#003f78]/90" />

      <section className="grid grid-cols-2 gap-3">
        <LoadingCard className="h-24" />
        <LoadingCard className="h-24" />
      </section>

      <section className="space-y-3">
        <div className="h-3 w-36 animate-pulse rounded-full bg-[#d7ecf9]" />
        <LoadingCard className="h-32" />
        <LoadingCard className="h-24" />
      </section>
    </div>
  );
}

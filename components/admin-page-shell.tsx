export function AdminPageShell({
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </header>

      {children}
    </div>
  );
}

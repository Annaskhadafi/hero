import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, TrendingUp, Calendar, ListTodo, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Forecast Revenue | Central Service",
  description: "Central Service Revenue Forecasting and Actuals Tracking",
};

const tabs = [
  { href: "/dashboard/central-service/forecast", label: "Dashboard", icon: TrendingUp },
  { href: "/dashboard/central-service/forecast/monthly", label: "Monthly Plan", icon: Calendar },
  { href: "/dashboard/central-service/forecast/daily", label: "Daily Updates", icon: ListTodo },
  { href: "/dashboard/central-service/forecast/report", label: "Daily Report", icon: BarChart3 },
];

export default function ForecastLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forecast Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Central Service Revenue Forecasting and Actuals Tracking
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-md p-1 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="flex-1">
              <div className="px-4 py-2 hover:bg-accent rounded-sm text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

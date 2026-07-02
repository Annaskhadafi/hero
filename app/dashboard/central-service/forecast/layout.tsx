import { Metadata } from "next";
import { Inter } from "next/font/google";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ShieldCheck, TrendingUp, Calendar, ListTodo } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Forecast Revenue | Central Service",
  description: "Central Service Revenue Forecasting and Actuals Tracking",
};

export default function ForecastLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`p-6 space-y-6 ${inter.className}`}>
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
          <Link href="/dashboard/central-service/forecast" className="flex-1">
            <div className="px-4 py-2 hover:bg-accent rounded-sm text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </div>
          </Link>
          <Link href="/dashboard/central-service/forecast/monthly" className="flex-1">
            <div className="px-4 py-2 hover:bg-accent rounded-sm text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Calendar className="w-4 h-4" />
              Monthly Plan
            </div>
          </Link>
          <Link href="/dashboard/central-service/forecast/daily" className="flex-1">
            <div className="px-4 py-2 hover:bg-accent rounded-sm text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <ListTodo className="w-4 h-4" />
              Daily Updates
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

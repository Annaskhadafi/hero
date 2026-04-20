import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  ChartColumn,
  Globe,
  Layers3,
  LayoutGrid,
  Megaphone,
  Radar,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";

export const portalChitraIconMap = {
  "book-open": BookOpen,
  briefcase: BriefcaseBusiness,
  car: CarFront,
  chart: ChartColumn,
  globe: Globe,
  layers: Layers3,
  megaphone: Megaphone,
  radar: Radar,
  shield: ShieldCheck,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  truck: Truck,
  user: UserRound,
  "user-cog": UserRound,
  users: Users,
  warehouse: Warehouse,
  bolt: Zap,
} as const satisfies Record<string, LucideIcon>;

export const PORTAL_CHITRA_ICON_OPTIONS = Object.keys(portalChitraIconMap);

export function PortalChitraIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name ? portalChitraIconMap[name as keyof typeof portalChitraIconMap] : null) ?? LayoutGrid;
  return <Icon className={className} aria-hidden="true" />;
}

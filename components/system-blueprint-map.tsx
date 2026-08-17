"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  History,
  Sliders,
  Mail,
  Sparkles,
  Database,
  ArrowDownToLine,
  ShieldCheck,
  ShoppingCart,
  Megaphone,
  Truck,
  Boxes,
  Receipt,
  BarChart3,
  Wrench,
  TrendingUp,
  PackageCheck,
  Coins,
  Users,
  Layers,
  Lock,
  Download,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  FileImage,
  Compass,
  CheckSquare,
  Activity,
  Layers2,
  CalendarDays,
  HardHat,
  GraduationCap,
  Bot,
  Clock,
  Award,
  Zap,
  ChevronRight,
  ArrowRight,
  Workflow,
  MousePointerClick,
  FileCheck2,
  Sparkle,
  Cpu,
  Hammer,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- HERO MODULE DEFINITION ---
export interface SystemModule {
  id: string;
  name: string;
  category: "FOUNDATION" | "WORKFORCE & HSE" | "OPERATIONS & SERVICE" | "INSIGHT & ACADEMY";
  tagline: string;
  targetUrl: string;
  icon: React.ElementType;
  cardBg: string;
  iconBg: string;
  badgeBg: string;
  features: Array<{ name: string; url: string }>;
}

const HERO_SYSTEM_MODULES: SystemModule[] = [
  // COLUMN 1: FOUNDATION (3 MODULES)
  {
    id: "user-management-core",
    name: "User & Org Foundation",
    category: "FOUNDATION",
    tagline: "Single source of truth karyawan, site, dept & roster",
    targetUrl: "/dashboard/hc/employee",
    icon: Database,
    cardBg: "bg-[#0f172a]",
    iconBg: "bg-[#1e293b] text-sky-400",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "hero_employees SSoT", url: "/dashboard/hc/employee" },
      { name: "Master Dept & Section", url: "/dashboard/master-data" },
      { name: "Master Positions", url: "/dashboard/master-data" },
      { name: "Sites & Locations", url: "/dashboard/master-data" },
      { name: "Org Structure Builder", url: "/dashboard/master-data" },
    ],
  },
  {
    id: "governance-security",
    name: "Governance & RBAC",
    category: "FOUNDATION",
    tagline: "Security, role permissions, audit log & session trace",
    targetUrl: "/dashboard/security",
    icon: ShieldCheck,
    cardBg: "bg-[#334155]",
    iconBg: "bg-[#475569] text-slate-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Roles & Permissions", url: "/dashboard/security" },
      { name: "Resource Guards", url: "/dashboard/security" },
      { name: "Navbar Menu Manager", url: "/dashboard/settings" },
      { name: "Audit Trail Log", url: "/dashboard/security" },
      { name: "Session Management", url: "/dashboard/security" },
    ],
  },
  {
    id: "human-capital-core",
    name: "Human Capital (HC)",
    category: "FOUNDATION",
    tagline: "Employee lifecycle, kontrak, konseling & SP",
    targetUrl: "/dashboard/hc/contract-review",
    icon: Users,
    cardBg: "bg-[#0f766e]",
    iconBg: "bg-[#115e59] text-teal-200",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Contract Expiry Review", url: "/dashboard/hc/contract-review" },
      { name: "Disciplinary SP & Teguran", url: "/dashboard/hc/disciplinary" },
      { name: "Recruitment Pipeline", url: "/dashboard/hc/recruitment" },
      { name: "HR Counseling & Curhat", url: "/dashboard/hr-counseling" },
      { name: "Leader KPI & Evaluation", url: "/dashboard/hc/leader-performance" },
    ],
  },

  // COLUMN 2: WORKFORCE & HSE (3 MODULES)
  {
    id: "daily-activity-engine",
    name: "Daily Activity & SPL",
    category: "WORKFORCE & HSE",
    tagline: "Library master, route builder, SPL & checklist",
    targetUrl: "/dashboard/activity-hub",
    icon: CheckCircle2,
    cardBg: "bg-[#0284c7]",
    iconBg: "bg-[#0369a1] text-sky-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Activity Library Master", url: "/dashboard/activity-hub/library" },
      { name: "Route Template Builder", url: "/dashboard/activity-hub/routes" },
      { name: "SPL (Surat Lembur)", url: "/dashboard/overtime-requests" },
      { name: "Mobile Daily Checklist", url: "/dashboard/activity-hub/my-day" },
      { name: "Point Override Engine", url: "/dashboard/activity-hub/configuration" },
    ],
  },
  {
    id: "attendance-timesheet",
    name: "Attendance & Timesheet",
    category: "WORKFORCE & HSE",
    tagline: "Geofencing check-in, roster matrix & request izin",
    targetUrl: "/dashboard/attendance",
    icon: CalendarDays,
    cardBg: "bg-[#059669]",
    iconBg: "bg-[#047857] text-emerald-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Live Map Geolocation", url: "/dashboard/attendance/live-map" },
      { name: "Monthly Roster Matrix", url: "/dashboard/scheduling-timesheet" },
      { name: "Timesheet EWH Log", url: "/dashboard/ewh" },
      { name: "Request Center (Izin/Cuti)", url: "/dashboard/request-center" },
      { name: "Attendance Drift Sync", url: "/dashboard/attendance" },
    ],
  },
  {
    id: "hse-safety-risk",
    name: "HSE Safety & Risk",
    category: "WORKFORCE & HSE",
    tagline: "Inspeksi, HIRADC, JSA, SIO & APD inventaris",
    targetUrl: "/dashboard/hse",
    icon: HardHat,
    cardBg: "bg-[#ea580c]",
    iconBg: "bg-[#c2410c] text-orange-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Daily Safety Checklist", url: "/dashboard/hse" },
      { name: "HIRADC Risk Matrix", url: "/dashboard/hse" },
      { name: "JSA Job Safety", url: "/dashboard/hse" },
      { name: "SIO/SIA License Reminder", url: "/dashboard/hse" },
      { name: "APD & Safety Shoes", url: "/dashboard/apd" },
    ],
  },

  // COLUMN 3: OPERATIONS & SERVICE (3 MODULES)
  {
    id: "central-service-assets",
    name: "Central Service & Assets",
    category: "OPERATIONS & SERVICE",
    tagline: "Asset komponen, site condition & tire change",
    targetUrl: "/dashboard/central-service",
    icon: Wrench,
    cardBg: "bg-[#7c3aed]",
    iconBg: "bg-[#6d28d9] text-purple-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Asset & Component Log", url: "/dashboard/central-service/assets" },
      { name: "Site Condition Monitor", url: "/dashboard/central-service/site-condition" },
      { name: "Service Form Tire Change", url: "/dashboard/360-service/service-form" },
      { name: "Tire Wear Tracking", url: "/dashboard/central-service" },
      { name: "Unit Utility Matrix", url: "/dashboard/unit-utility" },
    ],
  },
  {
    id: "repair-retread-wip",
    name: "Repair & Retread (WIP)",
    category: "OPERATIONS & SERVICE",
    tagline: "Warehouse repair, WIP table & tire designer",
    targetUrl: "/dashboard/repair-retread",
    icon: Hammer,
    cardBg: "bg-[#9333ea]",
    iconBg: "bg-[#7e22ce] text-purple-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Warehouse Repair Hub", url: "/dashboard/warehouse-repair" },
      { name: "WIP Repair Dashboard", url: "/dashboard/repair-retread" },
      { name: "WIP Repair Work Table", url: "/dashboard/repair-retread" },
      { name: "Tire Designer & Presets", url: "/dashboard/repair-retread" },
      { name: "Print Template Generator", url: "/dashboard/repair-retread" },
    ],
  },
  {
    id: "commercial-quotation",
    name: "Commercial & 360 Service",
    category: "OPERATIONS & SERVICE",
    tagline: "Customer 360, rate labour, quotation & PO upload",
    targetUrl: "/dashboard/360-service/quotations",
    icon: ShoppingCart,
    cardBg: "bg-[#d97706]",
    iconBg: "bg-[#b45309] text-amber-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Customer 360 Profile", url: "/dashboard/360-service/customers" },
      { name: "Service Rate & Labour", url: "/dashboard/360-service/items" },
      { name: "Quotation Daily Update", url: "/dashboard/360-service/quotations" },
      { name: "PO Upload & OCR Parser", url: "/dashboard/360-service/quotations" },
      { name: "Cargo Manifest & Fleet", url: "/dashboard/cargo-manifest" },
    ],
  },

  // COLUMN 4: INSIGHT & ACADEMY (3 MODULES)
  {
    id: "forecast-sap-analytics",
    name: "Central Forecast & SAP",
    category: "INSIGHT & ACADEMY",
    tagline: "Daily/monthly revenue forecast, SAP invoice & report",
    targetUrl: "/dashboard/central-service/forecast/report",
    icon: BarChart3,
    cardBg: "bg-[#2563eb]",
    iconBg: "bg-[#1d4ed8] text-blue-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Monthly & Daily Forecast", url: "/dashboard/central-service/forecast/monthly" },
      { name: "SAP Revenue Sync", url: "/dashboard/central-service/forecast/report" },
      { name: "Outstanding PO Matcher", url: "/dashboard/central-service/forecast/report" },
      { name: "Revenue Reports Hub", url: "/dashboard/central-service/forecast/report" },
      { name: "Financial Settlement", url: "/dashboard/reports" },
    ],
  },
  {
    id: "chitralearning-academy",
    name: "ChitraLearning LMS",
    category: "INSIGHT & ACADEMY",
    tagline: "LMS kurikulum, kuis, sertifikat & leaderboard",
    targetUrl: "/dashboard/chitralearning-lms",
    icon: GraduationCap,
    cardBg: "bg-[#e11d48]",
    iconBg: "bg-[#be123c] text-rose-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "Course Curriculum Builder", url: "/dashboard/chitralearning-lms/management" },
      { name: "Quiz Bank & Assessment", url: "/dashboard/chitralearning-lms/management" },
      { name: "Learning Campaigns", url: "/dashboard/chitralearning-lms/campaigns" },
      { name: "Certificate Generator", url: "/dashboard/chitralearning-lms/certificates" },
      { name: "LMS Leaderboard & Badges", url: "/dashboard/chitralearning-lms/leaderboard" },
    ],
  },
  {
    id: "hero-genius-ai",
    name: "HERO Genius & AI",
    category: "INSIGHT & ACADEMY",
    tagline: "Workplace context chat, helpdesk AI & speech",
    targetUrl: "/dashboard/hero-genius",
    icon: Bot,
    cardBg: "bg-[#4f46e5]",
    iconBg: "bg-[#4338ca] text-indigo-100",
    badgeBg: "bg-white/20 text-white hover:bg-white/30",
    features: [
      { name: "HERO Genius Chat Base", url: "/dashboard/hero-genius" },
      { name: "Helpdesk AI Support", url: "/dashboard/hero-genius" },
      { name: "Speech Transcription", url: "/dashboard/hero-genius" },
      { name: "Document AI Intelligence", url: "/dashboard/hero-genius" },
      { name: "Operational AI Insights", url: "/dashboard/hero-genius" },
    ],
  },
];

// Left panel items - HERO Shell Controls (6 colorful cards with direct URLs)
const HERO_CONTROL_ACCESS_ITEMS = [
  {
    title: "User Management SSoT",
    subtext: "Single source of truth hero_employees",
    url: "/dashboard/hc/employee",
    icon: Database,
    cardBg: "bg-blue-50/70 hover:bg-blue-50 border-blue-200/90 text-blue-950",
    iconBg: "bg-blue-600 text-white",
  },
  {
    title: "Central Approval Engine",
    subtext: "Dynamic resolver, inbox & multi-tier",
    url: "/dashboard/approval",
    icon: CheckCircle2,
    cardBg: "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/90 text-emerald-950",
    iconBg: "bg-emerald-600 text-white",
  },
  {
    title: "Audit Trail & Drift Check",
    subtext: "Activity log, session trace & QA audit",
    url: "/dashboard/security",
    icon: History,
    cardBg: "bg-purple-50/70 hover:bg-purple-50 border-purple-200/90 text-purple-950",
    iconBg: "bg-purple-600 text-white",
  },
  {
    title: "Email & Reminder Engine",
    subtext: "SMTP terpusat, template presets & cron",
    url: "/dashboard/settings/email",
    icon: Mail,
    cardBg: "bg-amber-50/70 hover:bg-amber-50 border-amber-200/90 text-amber-950",
    iconBg: "bg-amber-600 text-white",
  },
  {
    title: "Real-time Notification Bell",
    subtext: "Live active event subscription & push",
    url: "/dashboard/notifications",
    icon: Sparkle,
    cardBg: "bg-sky-50/70 hover:bg-sky-50 border-sky-200/90 text-sky-950",
    iconBg: "bg-sky-600 text-white",
  },
  {
    title: "Security & RBAC Matrix",
    subtext: "Resource permissions & role security",
    url: "/dashboard/security",
    icon: ShieldCheck,
    cardBg: "bg-indigo-50/70 hover:bg-indigo-50 border-indigo-200/90 text-indigo-950",
    iconBg: "bg-indigo-600 text-white",
  },
];

// Right panel items - HERO Business Outputs (6 colorful cards with direct URLs)
const HERO_BUSINESS_OUTPUT_ITEMS = [
  {
    title: "Workforce Productivity",
    subtext: "Daily activity score, SPL tracking & roster adherence",
    url: "/dashboard/activity-hub",
    icon: TrendingUp,
    cardBg: "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/90 text-emerald-950",
    iconBg: "bg-emerald-600 text-white",
  },
  {
    title: "Zero Accident (HSE)",
    subtext: "HIRADC compliance, SIO license tracking & APD monitoring",
    url: "/dashboard/hse",
    icon: Shield,
    cardBg: "bg-orange-50/70 hover:bg-orange-50 border-orange-200/90 text-orange-950",
    iconBg: "bg-orange-600 text-white",
  },
  {
    title: "Operational Accuracy",
    subtext: "Geofence attendance, timesheet EWH & shift drift check",
    url: "/dashboard/attendance",
    icon: PackageCheck,
    cardBg: "bg-blue-50/70 hover:bg-blue-50 border-blue-200/90 text-blue-950",
    iconBg: "bg-blue-600 text-white",
  },
  {
    title: "Revenue Governance",
    subtext: "Forecast vs SAP actual, service quotation & billing",
    url: "/dashboard/central-service/forecast/report",
    icon: Coins,
    cardBg: "bg-amber-50/70 hover:bg-amber-50 border-amber-200/90 text-amber-950",
    iconBg: "bg-amber-600 text-white",
  },
  {
    title: "Tire Asset Longevity",
    subtext: "WIP repair cycle, pattern presets & site condition",
    url: "/dashboard/repair-retread",
    icon: Wrench,
    cardBg: "bg-purple-50/70 hover:bg-purple-50 border-purple-200/90 text-purple-950",
    iconBg: "bg-purple-600 text-white",
  },
  {
    title: "Competency Growth",
    subtext: "LMS quiz score, course completion & certificate ranking",
    url: "/dashboard/chitralearning-lms/leaderboard",
    icon: Award,
    cardBg: "bg-rose-50/70 hover:bg-rose-50 border-rose-200/90 text-rose-950",
    iconBg: "bg-rose-600 text-white",
  },
];

// 8 Bottom Feature Categories - EXHAUSTIVE REAL HERO SYSTEM CATALOG (116 ACTUAL FEATURES WITH REAL URLS)
export interface RouteFeatureItem {
  name: string;
  url: string;
}

interface RouteGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  theme: {
    cardBg: string;
    cardBorder: string;
    topBorder: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    pillBg: string;
    pillHover: string;
    pillBorder: string;
    pillText: string;
  };
  items: RouteFeatureItem[];
}

const STATIC_HERO_ROUTE_GROUPS: RouteGroup[] = [
  {
    id: "main-navigation",
    name: "1. Shell & Navigation",
    icon: Compass,
    theme: {
      cardBg: "bg-slate-50/70",
      cardBorder: "border-slate-300",
      topBorder: "border-t-slate-800",
      iconBg: "bg-slate-800 text-white",
      iconColor: "text-white",
      badgeBg: "bg-slate-200 text-slate-900 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-slate-100 hover:text-slate-950 hover:border-slate-400",
      pillBorder: "border-slate-300",
      pillText: "text-slate-800",
    },
    items: [
      { name: "Dashboard Overview", url: "/dashboard" },
      { name: "Portal Chitra Launcher", url: "/dashboard/portal-chitra" },
      { name: "Command Center Ops", url: "/dashboard/command-center" },
      { name: "Live Feature Map Blueprint", url: "/dashboard/feature-map" },
      { name: "User Profile Settings", url: "/dashboard/profile" },
      { name: "Real-time Notification Bell", url: "/dashboard/notifications" },
      { name: "Hero Genius Floating Chat", url: "/dashboard/hero-genius" },
      { name: "Helpdesk AI Support", url: "/dashboard/hero-genius" },
      { name: "Speech-to-Text Transcriber", url: "/dashboard/hero-genius" },
      { name: "Theme Mode Switcher", url: "/dashboard/settings" },
      { name: "Multi-Site Switcher Bar", url: "/dashboard/master-data" },
      { name: "Navigation Progress Tracker", url: "/dashboard/settings" },
    ],
  },
  {
    id: "human-capital",
    name: "2. Human Capital (HC)",
    icon: Users,
    theme: {
      cardBg: "bg-teal-50/50",
      cardBorder: "border-teal-300",
      topBorder: "border-t-teal-600",
      iconBg: "bg-teal-700 text-white",
      iconColor: "text-white",
      badgeBg: "bg-teal-200 text-teal-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-teal-100 hover:text-teal-950 hover:border-teal-400",
      pillBorder: "border-teal-300",
      pillText: "text-teal-900",
    },
    items: [
      { name: "User Management (hero_employees)", url: "/dashboard/hc/employee" },
      { name: "Org Structure Hierarchy Builder", url: "/dashboard/master-data" },
      { name: "Contract Duration & Review", url: "/dashboard/hc/contract-review" },
      { name: "Disciplinary Records (SP 1, 2, 3)", url: "/dashboard/hc/disciplinary" },
      { name: "Surat Peringatan & Teguran", url: "/dashboard/hc/disciplinary" },
      { name: "Recruitment Pipeline ATS", url: "/dashboard/hc/recruitment" },
      { name: "Recruitment Offering Templates", url: "/dashboard/hc/recruitment" },
      { name: "Leader Performance Review (KPI)", url: "/dashboard/hc/leader-performance" },
      { name: "HR Counseling Session", url: "/dashboard/hr-counseling" },
      { name: "Curhat Anonymous Well-being", url: "/dashboard/curhat" },
      { name: "Employee Voice Feedback Box", url: "/dashboard/curhat" },
      { name: "Employee Master CSV Import", url: "/dashboard/master-data" },
      { name: "Department & Section Master", url: "/dashboard/master-data" },
      { name: "Position & Grading Master", url: "/dashboard/master-data" },
    ],
  },
  {
    id: "workforce-activity",
    name: "3. Daily Activity & Workforce",
    icon: CheckSquare,
    theme: {
      cardBg: "bg-sky-50/50",
      cardBorder: "border-sky-300",
      topBorder: "border-t-sky-600",
      iconBg: "bg-sky-600 text-white",
      iconColor: "text-white",
      badgeBg: "bg-sky-200 text-sky-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-sky-100 hover:text-sky-950 hover:border-sky-400",
      pillBorder: "border-sky-300",
      pillText: "text-sky-900",
    },
    items: [
      { name: "Activity Hub Overview", url: "/dashboard/activity-hub" },
      { name: "Global Activity Library Master", url: "/dashboard/activity-hub/library" },
      { name: "Route Template Builder", url: "/dashboard/activity-hub/routes" },
      { name: "Nested Route Group & Items", url: "/dashboard/activity-hub/routes" },
      { name: "Section Point Overrides", url: "/dashboard/activity-hub/library" },
      { name: "Rule & Requirement Inspector", url: "/dashboard/activity-hub/configuration" },
      { name: "SPL (Surat Perintah Lembur)", url: "/dashboard/overtime-requests" },
      { name: "SPL Planned Work Lines Import", url: "/dashboard/overtime-requests" },
      { name: "Mobile Daily Checklist Form", url: "/dashboard/activity-hub/my-day" },
      { name: "Mandatory Unit & Time Checker", url: "/dashboard/activity-hub/configuration" },
      { name: "Photo Evidence Attachment", url: "/dashboard/activity-hub/my-day" },
      { name: "Team Activity Live Board", url: "/dashboard/activity-hub/team-board" },
      { name: "Activity Configuration Studio", url: "/dashboard/activity-hub/configuration" },
      { name: "Daily Activity Architecture", url: "/dashboard/activity-hub/blueprint" },
      { name: "Activity Points Leaderboard", url: "/dashboard/leaderboard" },
    ],
  },
  {
    id: "attendance-timesheet",
    name: "4. Attendance & Scheduling",
    icon: Clock,
    theme: {
      cardBg: "bg-emerald-50/50",
      cardBorder: "border-emerald-300",
      topBorder: "border-t-emerald-600",
      iconBg: "bg-emerald-700 text-white",
      iconColor: "text-white",
      badgeBg: "bg-emerald-200 text-emerald-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-emerald-100 hover:text-emerald-950 hover:border-emerald-400",
      pillBorder: "border-emerald-300",
      pillText: "text-emerald-900",
    },
    items: [
      { name: "Attendance Mobile Check-in/out", url: "/dashboard/attendance" },
      { name: "GPS Geofencing Live Map", url: "/dashboard/attendance/live-map" },
      { name: "Attendance Historical Records", url: "/dashboard/attendance/records" },
      { name: "Monthly Roster Scheduling Matrix", url: "/dashboard/scheduling-timesheet" },
      { name: "Shift Schedule Configuration", url: "/dashboard/scheduling-timesheet" },
      { name: "Request Center (Izin / Cuti)", url: "/dashboard/request-center" },
      { name: "Surat Keterangan Sakit (SKS)", url: "/dashboard/request-center" },
      { name: "Dispensasi & Tugas Luar Request", url: "/dashboard/request-center" },
      { name: "Overtime Request Workflow", url: "/dashboard/overtime-requests" },
      { name: "Timesheet Effective Working Hours (EWH)", url: "/dashboard/ewh" },
      { name: "Timesheet Daily Approval Center", url: "/dashboard/timesheet" },
      { name: "Attendance Drift & DB QA Sync", url: "/dashboard/attendance" },
    ],
  },
  {
    id: "hse-safety",
    name: "5. HSE & Health Safety",
    icon: HardHat,
    theme: {
      cardBg: "bg-orange-50/50",
      cardBorder: "border-orange-300",
      topBorder: "border-t-orange-600",
      iconBg: "bg-orange-600 text-white",
      iconColor: "text-white",
      badgeBg: "bg-orange-200 text-orange-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-orange-100 hover:text-orange-950 hover:border-orange-400",
      pillBorder: "border-orange-300",
      pillText: "text-orange-900",
    },
    items: [
      { name: "HSE Dashboard & Safety Stats", url: "/dashboard/hse" },
      { name: "Safety Observation & Hazard Report", url: "/dashboard/safety" },
      { name: "Emergency Evacuation Call & Alarm", url: "/dashboard/hse" },
      { name: "Daily Safety Checklist Form", url: "/dashboard/hse" },
      { name: "HIRADC Hazard Identification", url: "/dashboard/hse" },
      { name: "HIRADC Risk Assessment Matrix", url: "/dashboard/hse" },
      { name: "JSA (Job Safety Analysis) Builder", url: "/dashboard/hse" },
      { name: "JSA Approver Review & Sign-off", url: "/dashboard/hse" },
      { name: "SIA / SIO License Reminder Engine", url: "/dashboard/hse" },
      { name: "SIO Recipient Config & Preview", url: "/dashboard/settings/email" },
      { name: "Safety Induction Course & Exam", url: "/dashboard/safety-induction" },
      { name: "APD (PPE) Master Inventory", url: "/dashboard/apd" },
      { name: "Safety Shoes Size & Allocation", url: "/dashboard/apd/inventory/safety-shoes" },
      { name: "SOP-WIN Standard Work Viewer", url: "/dashboard/sop-win" },
      { name: "Safety Inspection PDF Generator", url: "/dashboard/hse" },
    ],
  },
  {
    id: "central-service-repair",
    name: "6. Central Service & Tire Repair",
    icon: Wrench,
    theme: {
      cardBg: "bg-purple-50/50",
      cardBorder: "border-purple-300",
      topBorder: "border-t-purple-600",
      iconBg: "bg-purple-700 text-white",
      iconColor: "text-white",
      badgeBg: "bg-purple-200 text-purple-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-purple-100 hover:text-purple-950 hover:border-purple-400",
      pillBorder: "border-purple-300",
      pillText: "text-purple-900",
    },
    items: [
      { name: "Central Service Overview", url: "/dashboard/central-service" },
      { name: "Asset & Component Tracking", url: "/dashboard/central-service/assets" },
      { name: "Site Condition Monitoring Hub", url: "/dashboard/central-service/site-condition" },
      { name: "Service Form Tire Change", url: "/dashboard/360-service/service-form" },
      { name: "Tire Wear & Tread Depth Analyzer", url: "/dashboard/central-service" },
      { name: "Warehouse Repair Hub", url: "/dashboard/warehouse-repair" },
      { name: "WIP Repair Status Dashboard", url: "/dashboard/repair-retread" },
      { name: "WIP Repair Job Work Table", url: "/dashboard/repair-retread" },
      { name: "Tire Pattern 2D/3D Designer", url: "/dashboard/repair-retread" },
      { name: "Tire Pattern Presets Library", url: "/dashboard/repair-retread" },
      { name: "Tire Work Drawing Blueprint", url: "/dashboard/repair-retread" },
      { name: "Tire Print Template Generator", url: "/dashboard/repair-retread" },
      { name: "Retread Job Management", url: "/dashboard/repair-retread" },
      { name: "Scrap Tire Inspection & Analysis", url: "/dashboard/central-service" },
    ],
  },
  {
    id: "commercial-forecast",
    name: "7. Commercial & Analytics",
    icon: BarChart3,
    theme: {
      cardBg: "bg-amber-50/50",
      cardBorder: "border-amber-300",
      topBorder: "border-t-amber-600",
      iconBg: "bg-amber-600 text-white",
      iconColor: "text-white",
      badgeBg: "bg-amber-200 text-amber-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-amber-100 hover:text-amber-950 hover:border-amber-400",
      pillBorder: "border-amber-300",
      pillText: "text-amber-900",
    },
    items: [
      { name: "Customer 360 Workspace", url: "/dashboard/360-service/customers" },
      { name: "Customer Master Directory", url: "/dashboard/customers" },
      { name: "Service Rate & Labour Pricing", url: "/dashboard/360-service/items" },
      { name: "Quotation Builder & Cost Calc", url: "/dashboard/360-service/quotations/create" },
      { name: "Quotation Daily Status Update", url: "/dashboard/360-service/quotations" },
      { name: "Quotation PO Upload & Storage", url: "/dashboard/360-service/quotations" },
      { name: "PO OCR Extraction & Parser", url: "/dashboard/360-service/quotations" },
      { name: "Quotation Official PDF Export", url: "/dashboard/360-service/quotations" },
      { name: "Central Service Monthly Forecast", url: "/dashboard/central-service/forecast/monthly" },
      { name: "Central Service Daily Forecast", url: "/dashboard/central-service/forecast/daily" },
      { name: "SAP Revenue Sync Integration", url: "/dashboard/central-service/forecast/report" },
      { name: "Outstanding Invoice & PO Matcher", url: "/dashboard/central-service/forecast/report" },
      { name: "Cargo Manifest Verification", url: "/dashboard/cargo-manifest" },
      { name: "Fleet Trips & Vehicle Utility", url: "/dashboard/unit-utility" },
      { name: "Cost Settlement & Fuel Billing", url: "/dashboard/reports" },
    ],
  },
  {
    id: "lms-admin-system",
    name: "8. ChitraLearning & Governance",
    icon: ShieldCheck,
    theme: {
      cardBg: "bg-rose-50/50",
      cardBorder: "border-rose-300",
      topBorder: "border-t-rose-600",
      iconBg: "bg-rose-600 text-white",
      iconColor: "text-white",
      badgeBg: "bg-rose-200 text-rose-950 font-black",
      pillBg: "bg-white",
      pillHover: "hover:bg-rose-100 hover:text-rose-950 hover:border-rose-400",
      pillBorder: "border-rose-300",
      pillText: "text-rose-900",
    },
    items: [
      { name: "ChitraLearning Course Catalog", url: "/dashboard/chitralearning-lms/catalog" },
      { name: "Curriculum & Lesson Builder", url: "/dashboard/chitralearning-lms/management" },
      { name: "Rich Text & Video Lesson Player", url: "/dashboard/chitralearning-lms/my-learning" },
      { name: "Quiz Bank & Assessment Studio", url: "/dashboard/chitralearning-lms/management" },
      { name: "Online Assignments & Practical", url: "/dashboard/chitralearning-lms/online-assignments" },
      { name: "Learning Campaign Broadcast", url: "/dashboard/chitralearning-lms/campaigns" },
      { name: "Certificate Generator & Verify", url: "/dashboard/chitralearning-lms/certificates" },
      { name: "LMS Leaderboard & Badges", url: "/dashboard/chitralearning-lms/leaderboard" },
      { name: "Central Approval Inbox Engine", url: "/dashboard/approval" },
      { name: "Dynamic Routing Resolver", url: "/dashboard/approval" },
      { name: "Multi-Tier Approval Matrix", url: "/dashboard/approval" },
      { name: "RBAC Role & Permission Matrix", url: "/dashboard/security" },
      { name: "Resource Permission Registry", url: "/dashboard/security" },
      { name: "Central Email SMTP Settings", url: "/dashboard/settings/email" },
      { name: "Central Email Template Presets", url: "/dashboard/settings/email" },
      { name: "Notification Delivery Logs", url: "/dashboard/settings/email" },
      { name: "Navbar Menu Manager Studio", url: "/dashboard/settings" },
      { name: "Security Audit Trail Log Trace", url: "/dashboard/security" },
      { name: "Database Backup & Restore Tool", url: "/dashboard/settings" },
    ],
  },
];

export function SystemBlueprintMap({
  dynamicMenuItems = [],
}: {
  dynamicMenuItems?: Array<{ title: string; url: string; section?: string; groupLabel?: string | null }>;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  // Merge dynamic menu items from database into categories if any new routes were created
  const routeGroupsWithDynamic = useMemo(() => {
    // Clone static groups
    const groups = STATIC_HERO_ROUTE_GROUPS.map((g) => ({
      ...g,
      items: [...g.items],
    }));

    // Collect all existing registered URLs
    const existingUrls = new Set<string>();
    groups.forEach((g) => {
      g.items.forEach((item) => {
        existingUrls.add(item.url.toLowerCase());
        existingUrls.add(item.name.toLowerCase());
      });
    });

    // Check dynamic menu items from database
    const unmappedDynamicItems: RouteFeatureItem[] = [];

    dynamicMenuItems.forEach((dbItem) => {
      if (!dbItem.url || dbItem.url === "#" || dbItem.url.startsWith("http")) return;
      const urlLower = dbItem.url.toLowerCase();
      const titleLower = dbItem.title.toLowerCase();

      if (!existingUrls.has(urlLower) && !existingUrls.has(titleLower)) {
        existingUrls.add(urlLower);
        existingUrls.add(titleLower);

        const newItem: RouteFeatureItem = {
          name: dbItem.title,
          url: dbItem.url,
        };

        // Try mapping to section
        const sec = (dbItem.section || "").toLowerCase();
        if (sec.includes("hc") || sec.includes("human") || sec.includes("karyawan")) {
          groups[1].items.push(newItem);
        } else if (sec.includes("activity") || sec.includes("aktivitas") || sec.includes("lembur")) {
          groups[2].items.push(newItem);
        } else if (sec.includes("attendance") || sec.includes("absen") || sec.includes("roster")) {
          groups[3].items.push(newItem);
        } else if (sec.includes("hse") || sec.includes("safety") || sec.includes("k3")) {
          groups[4].items.push(newItem);
        } else if (sec.includes("service") || sec.includes("tire") || sec.includes("repair")) {
          groups[5].items.push(newItem);
        } else if (sec.includes("forecast") || sec.includes("commercial") || sec.includes("sales")) {
          groups[6].items.push(newItem);
        } else if (sec.includes("lms") || sec.includes("learning") || sec.includes("setting") || sec.includes("admin")) {
          groups[7].items.push(newItem);
        } else {
          groups[0].items.push(newItem);
        }
      }
    });

    return groups;
  }, [dynamicMenuItems]);

  // Exact Total features count calculation across HERO
  const totalHeroFeatures = useMemo(() => {
    return routeGroupsWithDynamic.reduce((sum, g) => sum + g.items.length, 0);
  }, [routeGroupsWithDynamic]);

  // Export to JPEG Function
  const handleExportJPEG = useCallback(async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan ekspor gambar JPEG resolusi tinggi (HD)...");

    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const element = exportRef.current;
      const originalTransform = element.style.transform;
      element.style.transform = "none";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1720,
      });

      element.style.transform = originalTransform;

      const imageUri = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `HERO-System-Blueprint-${timestamp}.jpg`;
      link.href = imageUri;
      link.click();

      toast.success("HERO Blueprint berhasil diexport sebagai JPEG!", { id: toastId });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Gagal mengekspor gambar. Silakan coba lagi.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export to PNG Function
  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan ekspor gambar PNG HERO Blueprint...");

    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const element = exportRef.current;
      const originalTransform = element.style.transform;
      element.style.transform = "none";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1720,
      });

      element.style.transform = originalTransform;

      const imageUri = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `HERO-System-Blueprint-${timestamp}.png`;
      link.href = imageUri;
      link.click();

      toast.success("HERO Blueprint berhasil diexport sebagai PNG!", { id: toastId });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Gagal mengekspor PNG. Silakan coba lagi.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4 lg:p-6 bg-slate-100/70 min-h-screen">
      {/* TOP CONTROL BAR (Not part of exported image) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="grid size-10 place-items-center rounded-xl bg-[#0f172a] text-white shadow-sm">
            <Activity className="size-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              HERO Enterprise System Blueprint
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                Live Blueprint ({totalHeroFeatures} Fitur Aktif)
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Semua fitur interaktif &mdash; Klik fitur mana pun untuk membuka halaman modul yang bersangkutan
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-52 sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari & temukan fitur HERO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-7 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-sm text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
              title="Perkecil"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-700 min-w-[3.2rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(1.4, prev + 0.1))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
              title="Perbesar"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-colors text-[11px] font-bold border-l border-slate-200"
              title="Reset Skala 100%"
            >
              Reset
            </button>
          </div>

          {/* Export Buttons */}
          <Button
            onClick={handleExportJPEG}
            disabled={isExporting}
            className="h-9 gap-2 rounded-xl bg-[#0f172a] text-white hover:bg-slate-800 text-xs font-bold shadow-sm transition-all"
          >
            <FileImage className="size-3.5 text-emerald-400" />
            {isExporting ? "Mengekspor..." : "Export JPEG (HD)"}
          </Button>

          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="h-9 gap-1.5 rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold"
          >
            <Download className="size-3.5 text-blue-600" />
            PNG
          </Button>
        </div>
      </div>

      {/* BLUEPRINT CANVAS CONTAINER (EXPORT TARGET) */}
      <div className="overflow-x-auto pb-8">
        <div
          style={{
            transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: "top left",
            transition: "transform 0.15s ease-out",
          }}
          className="inline-block min-w-[1380px] xl:w-full"
        >
          <div
            ref={exportRef}
            id="blueprint-export-root"
            className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_12px_45px_rgba(0,0,0,0.06)] space-y-6"
            style={{ width: "100%", maxWidth: "1680px", margin: "0 auto" }}
          >
            {/* 1. HEADER SECTION */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <span className="grid size-5 place-items-center rounded bg-[#0f172a] text-white font-bold text-[9px]">
                    ✦
                  </span>
                  HERO SYSTEM BLUEPRINT
                </div>
                <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  Peta fitur besar dan hubungan proses end-to-end
                </h1>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-2.5 min-w-[120px] text-center shadow-xs">
                  <span className="text-2xl lg:text-3xl font-black text-blue-900 leading-none">
                    12
                  </span>
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-700">
                    MODUL UTAMA
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-2.5 min-w-[120px] text-center shadow-xs">
                  <span className="text-2xl lg:text-3xl font-black text-emerald-900 leading-none">
                    {totalHeroFeatures}
                  </span>
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    FITUR TERHUBUNG
                  </span>
                </div>
              </div>
            </div>

            {/* 2. THREE-PANEL CORE BLUEPRINT (NO GAPS: LEFT 6 ITEMS, CENTER 12 MODULES, RIGHT 6 ITEMS) */}
            <div className="grid grid-cols-12 gap-5 items-stretch">
              {/* LEFT COLUMN: CONTROL & AKSES (HERO SHELL) */}
              <div className="col-span-12 lg:col-span-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 lg:p-5 flex flex-col justify-start gap-2.5">
                {/* Header block */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-xl bg-[#0f172a] text-white shadow-sm">
                      <Lock className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
                        CONTROL &amp; AKSES
                      </h2>
                      <span className="text-[9.5px] text-slate-400 font-bold">HERO CORE SHELL</span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 font-medium">
                    Semua fitur berada di shell dashboard, dikendalikan oleh single source of truth <code className="text-slate-900 font-bold bg-slate-200/80 px-1 rounded">hero_employees</code>,
                    resource permission, roles, users, sessions, dan audit log.
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 font-medium">
                    Approval layer mengunci transaksi penting seperti activity, SPL lembur, izin/cuti, quotation, dan cost request sebelum masuk proses berikutnya.
                  </p>
                </div>

                {/* Control items list (6 colorful clickable cards) */}
                <div className="flex flex-col gap-2 pt-1">
                  {HERO_CONTROL_ACCESS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.url}
                        className={`group flex items-center gap-2.5 rounded-xl border p-2.5 shadow-2xs transition-all hover:scale-[1.01] ${item.cardBg}`}
                      >
                        <div className={`grid size-7 shrink-0 place-items-center rounded-lg ${item.iconBg}`}>
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold tracking-tight flex items-center justify-between">
                            {item.title}
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-[10px] opacity-75 truncate font-medium">
                            {item.subtext}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* CENTER COLUMN: PROCESS MAP WITH 4 COLUMNS X 3 ROWS (12 MODULES - ZERO GAPS) */}
              <div className="col-span-12 lg:col-span-7 rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden">
                {/* Column category titles */}
                <div className="grid grid-cols-4 gap-3 text-center pb-2.5 border-b border-slate-200/70 mb-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    FOUNDATION
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    WORKFORCE &amp; HSE
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    OPERATION
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    INSIGHT
                  </div>
                </div>

                {/* 4 Columns x 3 Rows = 12 Modules (Uniform layout) */}
                <div className="grid grid-cols-4 gap-3 relative z-10">
                  {/* COLUMN 1: FOUNDATION (3 Modules) */}
                  <div className="flex flex-col gap-3">
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[0]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[0].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[0].id ? null : HERO_SYSTEM_MODULES[0].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[1]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[1].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[1].id ? null : HERO_SYSTEM_MODULES[1].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[2]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[2].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[2].id ? null : HERO_SYSTEM_MODULES[2].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                  </div>

                  {/* COLUMN 2: WORKFORCE & HSE (3 Modules) */}
                  <div className="flex flex-col gap-3">
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[3]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[3].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[3].id ? null : HERO_SYSTEM_MODULES[3].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[4]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[4].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[4].id ? null : HERO_SYSTEM_MODULES[4].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[5]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[5].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[5].id ? null : HERO_SYSTEM_MODULES[5].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                  </div>

                  {/* COLUMN 3: OPERATIONS & SERVICE (3 Modules) */}
                  <div className="flex flex-col gap-3">
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[6]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[6].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[6].id ? null : HERO_SYSTEM_MODULES[6].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[7]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[7].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[7].id ? null : HERO_SYSTEM_MODULES[7].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[8]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[8].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[8].id ? null : HERO_SYSTEM_MODULES[8].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                  </div>

                  {/* COLUMN 4: INSIGHT & ACADEMY (3 Modules) */}
                  <div className="flex flex-col gap-3">
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[9]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[9].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[9].id ? null : HERO_SYSTEM_MODULES[9].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[10]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[10].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[10].id ? null : HERO_SYSTEM_MODULES[10].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                    <ModuleCard
                      module={HERO_SYSTEM_MODULES[11]}
                      isSelected={selectedModule === HERO_SYSTEM_MODULES[11].id}
                      onSelect={() =>
                        setSelectedModule(
                          selectedModule === HERO_SYSTEM_MODULES[11].id ? null : HERO_SYSTEM_MODULES[11].id
                        )
                      }
                      searchQuery={searchQuery}
                    />
                  </div>
                </div>

                {/* Process Flow Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-0.5 bg-slate-500 rounded-full" />
                      Proses Utama (Foundation &rarr; Workforce &rarr; Operations &rarr; Insight)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-0.5 border-t border-dashed border-slate-400" />
                      Governance &amp; AI Integration
                    </span>
                  </div>
                  <span className="text-slate-400 italic">
                    Klik kartu atau pil fitur untuk langsung menuju halaman
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: OUTPUT HERO (6 colorful clickable cards) */}
              <div className="col-span-12 lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 lg:p-5 flex flex-col justify-start gap-2.5">
                {/* Header block */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
                      <TrendingUp className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
                        OUTPUT BISNIS
                      </h2>
                      <span className="text-[9.5px] text-emerald-600 font-bold">HERO OUTCOMES</span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 font-medium">
                    Hasil akhir operasional terintegrasi dalam indikator kunci performa bisnis:
                  </p>
                </div>

                {/* Output items list (6 colorful clickable cards) */}
                <div className="flex flex-col gap-2 pt-1">
                  {HERO_BUSINESS_OUTPUT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.url}
                        className={`group flex items-center gap-2.5 rounded-xl border p-2.5 shadow-2xs transition-all hover:scale-[1.01] ${item.cardBg}`}
                      >
                        <div className={`grid size-6 shrink-0 place-items-center rounded-lg ${item.iconBg}`}>
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold tracking-tight flex items-center justify-between">
                            {item.title}
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="mt-0.5 text-[10px] opacity-75 leading-snug font-medium">
                            {item.subtext}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. BOTTOM SECTION: COMPREHENSIVE 8 CATEGORY DIRECTORY (ALL FEATURES ARE CLICKABLE LINKS) */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Layers2 className="size-4 text-slate-700" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                    KATALOG LENGKAP FITUR &amp; RUTE SISTEM HERO ({totalHeroFeatures} FITUR TERHUBUNG &bull; KLIK MENUJU HALAMAN)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-bold">
                  Total {totalHeroFeatures} rute aktif &bull; Semua tombol dapat diklik
                </span>
              </div>

              {/* 8 Groups Grid (Clickable links to routes) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {routeGroupsWithDynamic.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div
                      key={group.id}
                      className={`rounded-2xl border ${group.theme.cardBorder} ${group.theme.cardBg} p-3.5 flex flex-col justify-start gap-2.5 border-t-4 ${group.theme.topBorder} shadow-2xs`}
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <div className={`grid size-6 place-items-center rounded-lg ${group.theme.iconBg} shadow-2xs`}>
                            <Icon className="size-3.5" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                            {group.name}
                          </h4>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${group.theme.badgeBg}`}>
                          {group.items.length}
                        </span>
                      </div>

                      {/* Pill Chips - Interactive Clickable Links */}
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => {
                          const isMatch =
                            searchQuery && item.name.toLowerCase().includes(searchQuery.toLowerCase());
                          return (
                            <Link
                              key={item.name + item.url}
                              href={item.url}
                              title={`Buka ${item.name} (${item.url})`}
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all ${
                                isMatch
                                  ? "bg-amber-400 text-slate-950 font-bold shadow-xs scale-105 ring-2 ring-amber-500"
                                  : `${group.theme.pillBg} ${group.theme.pillText} border ${group.theme.pillBorder} shadow-2xs ${group.theme.pillHover} active:scale-95`
                              }`}
                            >
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. FOOTER NOTE & BRANDING */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">HERO ENTERPRISE SYSTEM</span> &bull; All Rights
                Reserved &bull; Standard Architecture Blueprint
              </div>
              <div className="flex items-center gap-4">
                <span>Versi: HERO V2.5 (Enterprise)</span>
                <span>Single Source of Truth: hero_employees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODULE CARD COMPONENT ---
function ModuleCard({
  module,
  isSelected,
  onSelect,
  searchQuery,
}: {
  module: SystemModule;
  isSelected: boolean;
  onSelect: () => void;
  searchQuery: string;
}) {
  const Icon = module.icon;
  const isMatch =
    searchQuery &&
    (module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.features.some((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl transition-all duration-150 p-3.5 flex flex-col justify-between ${
        module.cardBg
      } text-white ${
        isSelected
          ? "ring-4 ring-offset-2 ring-indigo-500 shadow-xl scale-[1.02]"
          : isMatch
          ? "ring-4 ring-amber-400 shadow-lg scale-[1.02]"
          : "shadow-md hover:shadow-lg hover:scale-[1.01]"
      }`}
    >
      {/* Header with link to main module */}
      <div>
        <div className="flex items-start gap-2.5">
          <Link
            href={module.targetUrl}
            title={`Buka Modul ${module.name}`}
            onClick={(e) => e.stopPropagation()}
            className={`grid size-8 shrink-0 place-items-center rounded-xl ${module.iconBg} shadow-xs hover:scale-105 transition-transform`}
          >
            <Icon className="size-4" />
          </Link>
          <div className="min-w-0">
            <Link
              href={module.targetUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-black tracking-tight leading-tight hover:underline flex items-center gap-1"
            >
              {module.name}
            </Link>
            <p className="text-[9.5px] opacity-80 leading-snug mt-0.5 line-clamp-2">{module.tagline}</p>
          </div>
        </div>
      </div>

      {/* Feature tags (clickable links) */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {module.features.map((feature) => {
          const isFeatureMatch =
            searchQuery && feature.name.toLowerCase().includes(searchQuery.toLowerCase());
          return (
            <Link
              key={feature.name}
              href={feature.url}
              onClick={(e) => e.stopPropagation()}
              title={`Buka ${feature.name}`}
              className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-semibold tracking-wide transition-all ${
                isFeatureMatch
                  ? "bg-amber-300 text-slate-950 font-bold shadow-xs"
                  : `${module.badgeBg} active:scale-95`
              }`}
            >
              {feature.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

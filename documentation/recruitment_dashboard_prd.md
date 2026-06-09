# Recruitment Dashboard — Product Requirements Document

## Executive Summary

Dashboard komprehensif untuk recruitment yang menampilkan KPI real-time, pipeline funnel, analytics, dan aktivitas terbaru. Menggunakan **Recharts** untuk visualisasi. Design mengikuti HERO Design System: bright surfaces, clean typography, minimal noise.

**Route:** `/dashboard/hc/recruitment/dashboard` (tab baru di recruitment)
**Framework:** Recharts + Tailwind + shadcn/ui
**Data Source:** Drizzle ORM queries ke `hcRecruitments`, `hcCandidates`, `hcCandidateStages`, `emailDeliveryLogs`, dan related tables.

---

## 1. Data Sources & Available Metrics

### Core Tables
| Table | Fields | Metrics Extractable |
|---|---|---|
| `hcRecruitments` | status, isPublic, startDate, endDate, totalRequested, department, section | Active MPR, vacancy status, department distribution, overdue count |
| `hcCandidates` | currentStage, source, createdAt, aiScore, rating, recruitmentId | Total candidates, stage counts, source breakdown, AI score distribution |
| `hcCandidateStages` | stage, createdAt, candidateId | Stage history, time-to-fill, conversion rates |
| `emailDeliveryLogs` | status, lastSentAt, candidateId | Email delivery rate, outreach effectiveness |
| `interviews` | scheduledAt, result, candidateId | Upcoming interviews, interview pass rate |
| `hcRecruitmentTests` | test results, passed, candidateId | Test completion rate, pass rate |

### Available KPIs
- **Active MPR**: `status != 'Completed' && status != 'Cancelled'`
- **Total Candidates**: count of `hcCandidates`
- **Hired**: count where `currentStage = 'Hired'`
- **Overdue**: `endDate < today` AND status != 'Completed'
- **Time to Fill**: avg days from vacancy created to first hired candidate
- **Conversion Rate**: % candidates progressing through each stage
- **Source Breakdown**: `source` field (LinkedIn, JobStreet, Referral, etc.)
- **AI Match Distribution**: `aiScore` buckets
- **Email Delivery Rate**: % emails with status 'sent'
- **Interview Pass Rate**: % interviews with result = 'Pass'
- **Test Pass Rate**: % tests with passed = true

---

## 2. Dashboard Layout (8 Sections)

### Section A: Hero KPI Row (Top)
6 compact cards dalam satu baris horizontal. 3 cards kiri, 3 cards kanan dengan gap.

**Cards:**
1. **Active Vacancies** — total active MPR
2. **Total Candidates** — jumlah semua kandidat
3. **Hired This Month** — hired dalam bulan berjalan
4. **Avg Time to Fill** — rata-rata hari dari post ke hired
5. **Overdue Vacancies** — lowongan yang expired
6. **Email Delivery Rate** — % email terkirim

**Visual:** Card putih, rounded-xl, border subtle. Icon besar di kiri (48px), angka bold (text-3xl Manrope), label kecil uppercase (text-[11px] Inter tracking-wider). Color-coded angka: primary untuk active, blue untuk candidates, green untuk hired, red untuk overdue, amber untuk time-to-fill.

### Section B: Recruitment Pipeline Funnel (Left, 60% width)
**Chart Type:** Funnel Chart (Recharts custom)
**Data:** Stages: Sourcing → Screening → Psikotes → Interview → Offering → Hired
**Visual:** Vertikal funnel, bar melebar dari atas ke bawah. Color gradient dari teal → green → yellow → orange → red. Label di kiri: stage name + count. Label di kanan: conversion rate %.
**Interaktif:** Hover bar → tooltip: count + conversion rate dari stage sebelumnya.

### Section C: Source Breakdown (Right, 40% width)
**Chart Type:** Donut Chart (Recharts PieChart innerRadius)
**Data:** `source` field: LinkedIn, JobStreet, Referral, Website, Walk-in, Others
**Visual:** Donut chart dengan center text "Total Candidates: {count}". Color palette: warm pastels. Legend di bawah.
**Interaktif:** Hover slice → tooltip: count + percentage. Click slice → filter candidate pipeline by source.

### Section D: Vacancy Performance (Full width)
**Chart Type:** Horizontal Bar Chart (Recharts BarChart layout="vertical")
**Data:** Top 10 active vacancies by candidate count. X-axis: candidate count, Y-axis: job title.
**Visual:** Horizontal bars, gradient fill dari left (primary) ke right (transparent). Bar height 40px. Label kanan: quota / applied count.
**Interaktif:** Hover bar → tooltip: job title, department, quota, applied, remaining. Click bar → jump to vacancy settings.

### Section E: Time-to-Fill Trend (Left, 50%)
**Chart Type:** Line Chart (Recharts LineChart)
**Data:** Last 6 months: avg days to fill per month. Secondary line: total vacancies posted per month.
**Visual:** Dual-axis line chart. Line 1 (left axis): avg days to fill (stroke: amber). Line 2 (right axis): vacancies posted (stroke: blue). Area fill under line 1 dengan opacity 10%. Grid dashed light.
**Interaktif:** Hover point → tooltip: month, avg days, vacancy count.

### Section F: Stage Conversion Rates (Right, 50%)
**Chart Type:** Horizontal Bar Chart (Recharts BarChart)
**Data:** Conversion rate % for each stage transition: Sourcing→Screening, Screening→Psikotes, Psikotes→Interview, Interview→Offering, Offering→Hired.
**Visual:** Bars dengan color coding: green (>70%), yellow (40-70%), red (<40%). Bar labels: "{stage} → {nextStage}: {rate}%".
**Interaktif:** Hover bar → tooltip: total entered, total progressed, drop-off count.

### Section G: AI Score Distribution (Full width, compact)
**Chart Type:** Horizontal Bar Chart (BarChart) — mini chart
**Data:** AI Score buckets: 0-30, 31-50, 51-70, 71-85, 86-100
**Visual:** Compact bar chart, height 120px. Bar gradient: red → orange → yellow → green. Labels di atas bar: count.
**Interaktif:** Hover bar → tooltip: score range, candidate count.

### Section H: Recent Activity & Upcoming (Bottom, 2 columns)
**Left Column (Recent Activity):** List of 10 latest events: candidate applied, stage advanced, interview scheduled, test completed, email sent. Icon + timestamp + description.
**Right Column (Upcoming):** Calendar strip of next 7 days: interviews scheduled, test dates, batch schedules. Date chips + event list.
**Visual:** White cards, soft shadow. Left: timeline-style with dots. Right: calendar strip with day pills.

---

## 3. Chart Specifications (Recharts)

### Funnel Chart (Custom)
- Component: Custom Recharts BarChart dengan barWidth decreasing
- Data format: `{ stage: string, count: number, rate: number }[]`
- Bar width logic: width = count / maxCount * 100%
- Colors: `#0f766e` → `#059669` → `#d97706` → `#dc2626` → `#7c3aed` → `#2563eb`

### Donut Chart
- Recharts: `<PieChart><Pie innerRadius={60} outerRadius={100} ... /></PieChart>`
- Center text: `<text>` element SVG di tengah
- Colors: `['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1']`

### Horizontal Bar Chart
- Recharts: `<BarChart layout="vertical"><Bar dataKey="count" fill="url(#gradient)" /></BarChart>`
- Gradient: `<linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0f172a"/><stop offset="100%" stopColor="#334155"/></linearGradient>`

### Line Chart
- Recharts: `<LineChart><Line type="monotone" dataKey="daysToFill" stroke="#d97706" /><Line type="monotone" dataKey="vacancies" stroke="#2563eb" /></LineChart>`
- Grid: `<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />`

---

## 4. Color Palette (Elegant, High Contrast)

### Primary Chart Colors
```
Teal (Sourcing):     #0f766e (rgb 15, 118, 110)
Green (Screening): #059669 (rgb 5, 150, 105)
Amber (Psikotes):  #d97706 (rgb 217, 119, 6)
Orange (Interview):#ea580c (rgb 234, 88, 12)
Red (Offering):    #dc2626 (rgb 220, 38, 38)
Blue (Hired):      #2563eb (rgb 37, 99, 235)
Purple (Completed):#7c3aed (rgb 124, 58, 237)
```

### Background & Surface
```
Page canvas:        #f5f7fb (surface)
Card background:    #ffffff (surface_container_lowest)
Toolbar band:       #eef2f7 (surface_container_low)
Chart grid:         #e2e8f0 (outline_variant)
```

### Text
```
Headings:           #0f172a (on_surface)
Body:               #1e293b (on_surface with 90% opacity)
Labels/Metadata:    #64748b (on_surface_variant)
```

### KPI Card Accents
```
Active:    bg-teal-50 text-teal-700 border-teal-200
Candidates:bg-blue-50 text-blue-700 border-blue-200
Hired:     bg-green-50 text-green-700 border-green-200
Overdue:   bg-red-50 text-red-700 border-red-200
Time:      bg-amber-50 text-amber-700 border-amber-200
Email:     bg-purple-50 text-purple-700 border-purple-200
```

---

## 5. API Requirements (Server Actions)

### `getRecruitmentDashboardData()`
Returns all data needed for dashboard in one batched query.

```typescript
type DashboardData = {
  // KPIs
  activeVacancies: number;
  totalCandidates: number;
  hiredThisMonth: number;
  avgTimeToFill: number;
  overdueVacancies: number;
  emailDeliveryRate: number;

  // Pipeline
  pipeline: { stage: string; count: number; conversionRate: number }[];

  // Source
  sources: { source: string; count: number; percentage: number }[];

  // Vacancy performance
  topVacancies: { id: number; title: string; department: string; quota: number; applied: number }[];

  // Time-to-fill trend
  timeToFillTrend: { month: string; avgDays: number; vacancyCount: number }[];

  // Conversion rates
  conversionRates: { from: string; to: string; rate: number; entered: number; progressed: number }[];

  // AI scores
  aiScoreDistribution: { range: string; count: number; color: string }[];

  // Recent activity
  recentActivity: { type: string; icon: string; timestamp: Date; description: string }[];

  // Upcoming events
  upcomingEvents: { date: Date; title: string; type: string; candidateName?: string }[];
};
```

---

## 6. Implementation Plan

### Phase 1: Foundation (1 day)
1. Create new tab "Dashboard" di RecruitmentTabBar
2. Create route: `/dashboard/hc/recruitment/dashboard`
3. Create `getRecruitmentDashboardData()` server action
4. Create page.tsx skeleton dengan `AdminPageShell`

### Phase 2: KPI Cards (0.5 day)
1. Create `RecruitmentKpiCards` component
2. 6 card layout dengan icon + angka + label
3. Color-coded accents

### Phase 3: Charts (2-3 days)
1. Funnel Chart (custom BarChart) — 1 day
2. Donut Chart (PieChart) — 0.5 day
3. Horizontal Bar Charts (Vacancy + Conversion) — 0.5 day
4. Line Chart (Time-to-fill) — 0.5 day
5. AI Score mini chart — 0.25 day

### Phase 4: Activity & Events (0.5 day)
1. Recent Activity list
2. Upcoming Events calendar strip

### Phase 5: Polish & Responsive (0.5 day)
1. Responsive grid (mobile: single column, desktop: 2-3 columns)
2. Loading skeletons
3. Empty states
4. Tooltips dan interaktivitas

### Total Estimation: 4-5 hari

---

## 7. Responsive Breakpoints

```
Mobile (< 768px):
  - KPI: 2x3 grid
  - All charts: full width stacked
  - Activity: stacked

Tablet (768px - 1024px):
  - KPI: 3x2 grid
  - Funnel + Source: side by side
  - Charts: 2 columns

Desktop (> 1024px):
  - KPI: 6 horizontal cards
  - Funnel (60%) + Source (40%)
  - Time-to-fill (50%) + Conversion (50%)
  - Activity: 2 columns
```

---

## 8. File Structure

```
app/dashboard/hc/recruitment/dashboard/
  page.tsx                    # Server page, fetch data
  layout.tsx                  # (optional) Dashboard layout
  
components/hc/recruitment/
  recruitment-dashboard.tsx   # Main dashboard component
  recruitment-kpi-cards.tsx   # KPI cards section
  recruitment-funnel-chart.tsx  # Pipeline funnel
  recruitment-source-chart.tsx  # Source donut
  recruitment-vacancy-chart.tsx # Vacancy performance
  recruitment-time-chart.tsx    # Time-to-fill trend
  recruitment-conversion-chart.tsx # Conversion rates
  recruitment-ai-chart.tsx      # AI score distribution
  recruitment-activity-feed.tsx # Recent activity
  recruitment-upcoming-events.tsx # Upcoming calendar
  
app/actions/recruitment.ts
  # Add: getRecruitmentDashboardData()
```

---

## 9. Design Notes

- **No decorative gradients** on cards. Use solid surfaces with subtle borders.
- **Typography**: Manrope for headings (chart titles), Inter for labels.
- **Chart titles**: text-lg, font-semibold, on_surface color.
- **Chart labels**: text-xs, on_surface_variant.
- **Animation**: Recharts default animation (300ms). No custom animation needed.
- **Spacing**: 24px gap between sections. 16px gap between cards.
- **Shadows**: Only on elevated cards (KPI cards). Charts: no shadow, clean border.
- **Borders**: 1px solid outline_variant (15% opacity) untuk cards.

---

## 10. Acceptance Criteria

- [ ] Dashboard tab tampil di recruitment navigation
- [ ] 6 KPI cards tampil dengan angka real-time dari database
- [ ] Funnel chart tampilkan 6 stages dengan count dan conversion rate
- [ ] Donut chart tampilkan source breakdown dengan percentage
- [ ] Horizontal bar chart top 10 vacancies
- [ ] Line chart 6-month trend time-to-fill + vacancy count
- [ ] Conversion rate chart dengan color coding (green/yellow/red)
- [ ] AI score distribution chart
- [ ] Recent activity list 10 items
- [ ] Upcoming events 7-day strip
- [ ] Responsive: mobile, tablet, desktop
- [ ] All charts have hover tooltips
- [ ] Type-check pass
- [ ] No console errors

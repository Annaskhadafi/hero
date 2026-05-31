# Enhanced Safety Dashboard Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance `/dashboard/safety` into a richer command-center dashboard that visualizes all data managed in `/dashboard/safety/data`.

**Architecture:** Extend pure aggregation helpers in `lib/safety-dashboard/aggregations.ts` so charts and insight panels are derived server-side from all safety datasets. Replace `SafetyDashboardCharts` with a fuller client visualization component using Recharts and lightweight insight cards, while keeping `/dashboard/safety/data` as the form/table management page.

**Tech Stack:** Next.js App Router, React, TypeScript, Recharts, existing HERO admin UI components, current safety query model.

---

## File Structure

- Modify `lib/safety-dashboard/aggregations.ts` — add richer chart datasets and insight panel data.
- Modify `tests/safety-dashboard-aggregations.test.ts` — assert new chart/insight outputs.
- Modify `components/safety-dashboard/safety-dashboard-charts.tsx` — add all visual sections.
- Modify `app/dashboard/safety/page.tsx` — add extra KPI cards and pass enhanced charts.

---

### Task 1: Extend Safety Aggregations

**Files:**
- Modify: `lib/safety-dashboard/aggregations.ts`
- Modify: `tests/safety-dashboard-aggregations.test.ts`

- [ ] **Step 1: Add failing aggregation assertions**

Extend `tests/safety-dashboard-aggregations.test.ts` to assert:

```ts
expect(charts.incidentCategoryDistribution).toEqual(expect.arrayContaining([{ category: 'PD', count: 4 }]))
expect(charts.yearlyIncidentHistory[0]).toMatchObject({ year: '2026', total: 15 })
expect(charts.certificationByLocation).toEqual(expect.arrayContaining([{ location: 'Balikpapan', expired: 1, active: 1 }]))
expect(charts.topExpiredCertifications[0]).toMatchObject({ equipmentName: 'Compressor', status: 'EXPIRED' })
expect(charts.activitiesByPic).toEqual(expect.arrayContaining([{ pic: 'Ade', count: 2 }]))
expect(charts.siteAchievement[0]).toMatchObject({ location: 'Balikpapan', achievement: 33 })
```

- [ ] **Step 2: Update aggregation input types**

Add richer type fields for yearly summaries, incident reports, certifications, weekly activities, and manhours.

- [ ] **Step 3: Implement new chart outputs**

Extend `buildSafetyCharts()` to return:

- `incidentCategoryDistribution`
- `yearlyIncidentHistory`
- `incidentReportsByCategory`
- `incidentReportsByLocation`
- `recentIncidents`
- `certificationByLocation`
- `topExpiredCertifications`
- `certificationRegulationBreakdown`
- `activitiesByPic`
- `activityTimeline`
- `latestActivities`
- `siteAchievement`

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm test -- --runInBand tests/safety-dashboard-aggregations.test.ts
npm run type-check
```

Expected: both PASS.

---

### Task 2: Build Rich Dashboard Visual Component

**Files:**
- Modify: `components/safety-dashboard/safety-dashboard-charts.tsx`

- [ ] **Step 1: Expand chart type**

Add chart prop fields matching Task 1 outputs.

- [ ] **Step 2: Add reusable visual primitives**

Add small components in the same file:

- `ChartCard`
- `InsightListCard`
- `ProgressCard`
- `EmptyState`

- [ ] **Step 3: Add sections**

Render these sections:

1. `Incident Analytics`
   - Monthly incident trend
   - Incident category distribution
   - Yearly incident history
   - Incident by location
   - Recent incidents list

2. `Safety Man Hours`
   - Manhours vs target by location
   - Site achievement progress cards
   - Monthly manhours trend

3. `Certification Monitoring`
   - Certification status donut
   - Certification by location stacked bar
   - Regulation breakdown
   - Top expired certifications list

4. `Weekly Activity Intelligence`
   - Activities by category
   - Activities by PIC
   - Activity timeline
   - Latest activities list

5. `Performance Thresholds`
   - Existing threshold vs actual chart

- [ ] **Step 4: Run typecheck**

Run: `npm run type-check`

Expected: PASS.

---

### Task 3: Upgrade Dashboard Page KPIs and Commit

**Files:**
- Modify: `app/dashboard/safety/page.tsx`

- [ ] **Step 1: Add KPI cards**

Add cards for:

- LTI
- MTC
- Open Incident Reports
- Certification Expiring Soon if available from aggregation; if not, use expired count only.

- [ ] **Step 2: Keep CTA to data management**

Ensure the `Kelola Data Safety` button remains visible.

- [ ] **Step 3: Verify**

Run:

```bash
npm run type-check
npm run lint
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/safety-dashboard/aggregations.ts tests/safety-dashboard-aggregations.test.ts components/safety-dashboard/safety-dashboard-charts.tsx app/dashboard/safety/page.tsx docs/superpowers/plans/2026-05-30-enhanced-safety-dashboard-visuals.md

git commit -m "feat(safety): enhance dashboard visual analytics" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- Spec coverage: All safety data sources now feed the dashboard: yearly/monthly summaries, detail incidents, certifications, performance, manhours, monthly manhours, and weekly activities.
- Placeholder scan: No placeholders remain.
- Type consistency: Chart field names in plan are used consistently across aggregation tests, aggregation implementation, and chart component.

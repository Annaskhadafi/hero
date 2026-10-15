'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Heart,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Home,
  MapPin,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import type { MaritalStatusAnalyticsData } from '@/lib/marital-status-data';

interface MaritalStatusAnalyticsTabProps {
  analytics: MaritalStatusAnalyticsData;
  onNavigateToTab?: (tab: 'dashboard' | 'directory' | 'requests') => void;
  onOpenCreateModal?: () => void;
}

export function MaritalStatusAnalyticsTab({
  analytics,
  onNavigateToTab,
  onOpenCreateModal,
}: MaritalStatusAnalyticsTabProps) {
  const marriedPercentage =
    analytics.totalEmployees > 0
      ? Math.round((analytics.totalMarriedOnSite / analytics.totalEmployees) * 100)
      : 0;

  const singlePercentage =
    analytics.totalEmployees > 0
      ? Math.round((analytics.totalSingleOnSite / analytics.totalEmployees) * 100)
      : 0;

  const maxSiteCount =
    analytics.siteDistribution.length > 0
      ? Math.max(...analytics.siteDistribution.map((s) => s.count))
      : 1;

  const maxDeptCount =
    analytics.departmentDistribution.length > 0
      ? Math.max(...analytics.departmentDistribution.map((d) => d.count))
      : 1;

  const totalResidence = analytics.residenceDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Married On Site */}
        <Card
          className="border-l-4 border-l-rose-500 shadow-xs cursor-pointer hover:shadow-md transition-all"
          onClick={() => onNavigateToTab?.('directory')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Married On Site
              </p>
              <h3 className="text-2xl font-black mt-1 text-gray-900">
                {analytics.totalMarriedOnSite}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {marriedPercentage}% dari total {analytics.totalEmployees} karyawan
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shadow-xs">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Single On Site */}
        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Single On Site
              </p>
              <h3 className="text-2xl font-black mt-1 text-gray-900">
                {analytics.totalSingleOnSite}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {singlePercentage}% dari total karyawan aktif
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Menunggu Persetujuan */}
        <Card
          className="border-l-4 border-l-amber-500 shadow-xs cursor-pointer hover:shadow-md transition-all"
          onClick={() => onNavigateToTab?.('requests')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Pengajuan Pending
              </p>
              <h3 className="text-2xl font-black mt-1 text-amber-900">
                {analytics.pendingRequests}
              </h3>
              <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                Tiket butuh review / approval
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Disetujui */}
        <Card
          className="border-l-4 border-l-emerald-500 shadow-xs cursor-pointer hover:shadow-md transition-all"
          onClick={() => onNavigateToTab?.('requests')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Total Disetujui
              </p>
              <h3 className="text-2xl font-black mt-1 text-emerald-900">
                {analytics.approvedRequests}
              </h3>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                Dari {analytics.recentRequestsCount} total riwayat tiket
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Distribution Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Site Distribution */}
        <Card className="lg:col-span-2 shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <CardTitle className="text-sm font-bold text-gray-900">
                  Sebaran Karyawan Married On Site per Lokasi Kerja
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {analytics.siteDistribution.length} Sites Aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {analytics.siteDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Belum ada data distribusi site untuk status married on site.
              </p>
            ) : (
              analytics.siteDistribution.map((site) => {
                const pct = Math.round((site.count / maxSiteCount) * 100);
                const shareTotal =
                  analytics.totalMarriedOnSite > 0
                    ? Math.round((site.count / analytics.totalMarriedOnSite) * 100)
                    : 0;
                return (
                  <div key={site.siteName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {site.siteName}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        <strong className="text-gray-900">{site.count}</strong> orang ({shareTotal}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 bg-muted rounded-full" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Residence Status Breakdown */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-gray-900">
                Status Tempat Tinggal On Site
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {analytics.residenceDistribution.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Belum ada data tempat tinggal tercatat.
              </div>
            ) : (
              analytics.residenceDistribution.map((res) => {
                const share = Math.round((res.count / totalResidence) * 100);
                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                if (res.residenceStatus.toLowerCase().includes('mess')) {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (res.residenceStatus.toLowerCase().includes('perumahan')) {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                }
                return (
                  <div
                    key={res.residenceStatus}
                    className="p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{res.residenceStatus}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {share}% dari total tercatat
                      </p>
                    </div>
                    <Badge variant="outline" className={`font-mono text-xs font-bold ${badgeColor}`}>
                      {res.count} Karyawan
                    </Badge>
                  </div>
                );
              })
            )}

            <div className="pt-2 border-t text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Tipe hunian diverifikasi saat proses persetujuan HR & Site Admin.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Departments & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Departments */}
        <Card className="lg:col-span-2 shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-gray-900">
                  Departemen dengan Karyawan Married On Site Terbanyak
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Top 7 Departemen
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            {analytics.departmentDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Belum ada data sebaran departemen.
              </p>
            ) : (
              analytics.departmentDistribution.map((dept, idx) => {
                const pct = Math.round((dept.count / maxDeptCount) * 100);
                return (
                  <div key={dept.departmentName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">
                        {idx + 1}. {dept.departmentName}
                      </span>
                      <span className="font-mono font-semibold text-gray-900">
                        {dept.count} org
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-muted rounded-full" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Action Guide */}
        <Card className="shadow-xs border-border/80 bg-gradient-to-br from-slate-50 to-emerald-50/40">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <CardTitle className="text-sm font-bold text-emerald-950">
                Pusat Kendali Status On Site
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Modul ini mengatur siklus hidup perubahan status pernikahan karyawan aktif di site,
              mulai dari pengajuan mandiri/HR, verifikasi dokumen buku nikah, hingga sinkronisasi
              otomatis ke profil master <code className="font-mono text-emerald-800">hero_employees</code>.
            </p>

            <div className="space-y-2 pt-1">
              <div
                onClick={() => onNavigateToTab?.('directory')}
                className="p-2.5 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span className="font-semibold text-gray-800">Buka Direktori Karyawan</span>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {analytics.totalMarriedOnSite} data
                </Badge>
              </div>

              <div
                onClick={() => onNavigateToTab?.('requests')}
                className="p-2.5 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-gray-800">Lihat Antrean Permohonan</span>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {analytics.pendingRequests} pending
                </Badge>
              </div>
            </div>

            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="w-full mt-3 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                + Buat Pengajuan Baru
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { IconChevronLeft, IconChevronRight, IconVideo, IconMapPin, IconStethoscope, IconCalendarEvent } from "@tabler/icons-react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface InterviewEvent {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  interviewType: string;
  locationOrLink: string;
  interviewerName: string;
  status: string;
}

interface McuEvent {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string | null;
  scheduledDate: Date | string;
  klinikName: string;
  paketMcu: string;
  status: string;
}

export function RecruitmentCalendarClientPage({
  interviews,
  mcus,
}: {
  interviews: InterviewEvent[];
  mcus: McuEvent[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { interviews: InterviewEvent[]; mcus: McuEvent[] }>();
    for (const iv of interviews) {
      const key = format(new Date(iv.scheduledAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, { interviews: [], mcus: [] });
      map.get(key)!.interviews.push(iv);
    }
    for (const m of mcus) {
      const key = format(new Date(m.scheduledDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, { interviews: [], mcus: [] });
      map.get(key)!.mcus.push(m);
    }
    return map;
  }, [interviews, mcus]);

  const selectedEvents = selectedDate
    ? eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? { interviews: [], mcus: [] }
    : { interviews: [], mcus: [] };

  const today = new Date();

  return (
    <AdminPageShell
      eyebrow="M7 • Recruitment"
      title="Interview & MCU Calendar"
      description="Jadwal interview dan medical check up untuk melihat conflict dan ketersediaan."
      badge={`${interviews.length + mcus.length} events`}
    >
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <IconChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <IconChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key);
              const ivCount = dayEvents?.interviews.length ?? 0;
              const mcuCount = dayEvents?.mcus.length ?? 0;
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[80px] rounded-md border p-1 text-left transition-colors text-sm flex flex-col gap-1",
                    !isCurrentMonth && "opacity-40 bg-muted/30",
                    isSelected && "ring-2 ring-primary bg-primary/5",
                    isToday && !isSelected && "border-blue-300 bg-blue-50/50",
                    !isSelected && isCurrentMonth && "hover:bg-muted/50 bg-white"
                  )}
                >
                  <span className={cn("font-medium text-xs", isToday && "text-blue-600")}>{format(day, "d")}</span>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {ivCount > 0 && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-medium">
                        <IconVideo className="w-2.5 h-2.5 mr-0.5" />{ivCount}
                      </span>
                    )}
                    {mcuCount > 0 && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium">
                        <IconStethoscope className="w-2.5 h-2.5 mr-0.5" />{mcuCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <IconCalendarEvent className="w-4 h-4" />
                  {format(selectedDate, "EEEE, dd MMMM yyyy")}
                </h3>
                {selectedEvents.interviews.length === 0 && selectedEvents.mcus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.interviews.map(iv => (
                      <div key={`iv-${iv.id}`} className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50/40">
                        <div className="mt-0.5"><IconVideo className="w-4 h-4 text-amber-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/dashboard/hc/recruitment/candidates/${iv.candidateId}`} className="font-medium text-sm hover:underline truncate">
                              {iv.candidateName}
                            </Link>
                            <Badge variant="outline" className="text-[10px] h-5">{iv.interviewType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{iv.jobTitle || "Unknown Position"}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(iv.scheduledAt), "HH:mm")}</span>
                            <span>{iv.durationMinutes} min</span>
                            <span className="flex items-center gap-1"><IconMapPin className="w-3 h-3" />{iv.locationOrLink || "-"}</span>
                          </div>
                          {iv.interviewerName && <p className="text-xs mt-1">Interviewer: {iv.interviewerName}</p>}
                        </div>
                      </div>
                    ))}
                    {selectedEvents.mcus.map(mcu => (
                      <div key={`mcu-${mcu.id}`} className="flex items-start gap-3 p-3 rounded-lg border bg-emerald-50/40">
                        <div className="mt-0.5"><IconStethoscope className="w-4 h-4 text-emerald-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/dashboard/hc/recruitment/candidates/${mcu.candidateId}`} className="font-medium text-sm hover:underline truncate">
                              {mcu.candidateName}
                            </Link>
                            <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">MCU</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{mcu.jobTitle || "Unknown Position"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{mcu.klinikName} — {mcu.paketMcu}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <IconVideo className="w-4 h-4 text-amber-600" />
                  Scheduled Interviews ({interviews.length})
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {interviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interviews scheduled.</p>
                  ) : (
                    interviews.map(iv => (
                      <div key={iv.id} className="p-3 rounded-lg border text-sm">
                        <div className="flex items-center justify-between">
                          <Link href={`/dashboard/hc/recruitment/candidates/${iv.candidateId}`} className="font-medium hover:underline">{iv.candidateName}</Link>
                          <span className="text-xs text-muted-foreground">{format(new Date(iv.scheduledAt), "dd MMM yyyy HH:mm")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{iv.jobTitle || "Unknown Position"}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{iv.interviewType}</span>
                          <span>·</span>
                          <span>{iv.durationMinutes} min</span>
                          <span>·</span>
                          <span>{iv.interviewerName || "-"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <IconStethoscope className="w-4 h-4 text-emerald-600" />
                  Scheduled MCUs ({mcus.length})
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {mcus.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No MCUs scheduled.</p>
                  ) : (
                    mcus.map(mcu => (
                      <div key={mcu.id} className="p-3 rounded-lg border text-sm">
                        <div className="flex items-center justify-between">
                          <Link href={`/dashboard/hc/recruitment/candidates/${mcu.candidateId}`} className="font-medium hover:underline">{mcu.candidateName}</Link>
                          <span className="text-xs text-muted-foreground">{format(new Date(mcu.scheduledDate), "dd MMM yyyy")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{mcu.jobTitle || "Unknown Position"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mcu.klinikName} — {mcu.paketMcu}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

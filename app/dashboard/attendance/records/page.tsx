"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { getTodayAttendanceLogs } from "@/app/actions/attendance";

export default function AttendanceRecordsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    getTodayAttendanceLogs().then(res => {
      if (res.success) {
        setLogs(res.logs);
      }
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Attendance Records</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
              <th className="p-4">Time</th>
              <th className="p-4">Type</th>
              <th className="p-4">Location</th>
              <th className="p-4">GPS Coordinates</th>
              <th className="p-4">Photo Evidence</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No attendance records found for today.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-medium">{format(new Date(log.eventTime), "PPpp")}</td>
                  <td className="p-4 capitalize">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${log.eventType === 'checked-in' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {log.eventType.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-4">{log.locationNote}</td>
                  <td className="p-4 text-xs font-mono text-slate-500">
                    {log.latitude ? `${log.latitude}, ${log.longitude}` : 'No GPS'}
                  </td>
                  <td className="p-4">
                    {log.photoUrl ? (
                      <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        View Photo
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

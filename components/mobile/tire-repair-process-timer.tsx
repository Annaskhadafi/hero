'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TireRepairProcessTimerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  processName?: string;
}

function parseDurationStringToSeconds(str: string): number {
  if (!str) return 0;
  const s = str.trim().toLowerCase();

  if (s.includes(':')) {
    const parts = s.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }

  let totalSec = 0;
  const hrMatch = s.match(/([\d\.]+)\s*(jam|j|h|hrs|hour|hours)/);
  if (hrMatch) {
    totalSec += parseFloat(hrMatch[1]) * 3600;
  }
  const minMatch = s.match(/([\d\.]+)\s*(m|min|menit|minute|minutes)/);
  if (minMatch) {
    totalSec += parseFloat(minMatch[1]) * 60;
  }
  const secMatch = s.match(/([\d\.]+)\s*(s|sec|detik|second|seconds)/);
  if (secMatch) {
    totalSec += parseFloat(secMatch[1]);
  }

  if (totalSec === 0 && !isNaN(Number(s))) {
    const num = Number(s);
    if (num <= 24) return num * 3600;
    return num * 60;
  }

  return Math.round(totalSec);
}

export function TireRepairProcessTimer({
  value,
  onChange,
  placeholder = 'Contoh: 45m / 2 jam',
  processName,
}: TireRepairProcessTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value && !isRunning) {
      const parsed = parseDurationStringToSeconds(value);
      setSeconds(parsed);
    }
  }, [value, isRunning]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTimerDisplay = (secTotal: number) => {
    const hrs = Math.floor(secTotal / 3600);
    const mins = Math.floor((secTotal % 3600) / 60);
    const secs = secTotal % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const formatToDurationString = (secTotal: number) => {
    if (secTotal <= 0) return '';
    const hrs = Math.floor(secTotal / 3600);
    const mins = Math.floor((secTotal % 3600) / 60);
    const secs = secTotal % 60;

    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs} jam`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  };

  const handleApplyTimer = () => {
    const formatted = formatToDurationString(seconds);
    if (formatted) {
      onChange(formatted);
    }
    setIsRunning(false);
    setPopoverOpen(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  return (
    <div className="space-y-1 min-w-0">
      <div className="relative flex items-center gap-1 min-w-0">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs bg-white border-slate-200 pr-8 w-full min-w-0 font-medium text-[#082033]"
        />

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Buka Stopwatch Pengerjaan"
              className={`h-7 w-7 rounded-lg absolute right-0.5 shrink-0 transition-all ${
                isRunning
                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 animate-pulse'
                  : seconds > 0
                  ? 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-64 p-3 rounded-2xl shadow-xl border border-slate-200 bg-white z-50 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-4 h-4 text-[#003f78] shrink-0" />
                <span className="text-xs font-black text-[#082033] font-mono uppercase truncate max-w-[140px]">
                  {processName || 'Stopwatch'}
                </span>
              </div>
              {isRunning && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 animate-pulse shrink-0">
                  RUNNING
                </span>
              )}
            </div>

            {/* Timer Display */}
            <div className="bg-slate-900 text-emerald-400 font-mono text-center py-2.5 rounded-xl shadow-inner text-xl font-bold tracking-widest border border-slate-800">
              {formatTimerDisplay(seconds)}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              {!isRunning ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsRunning(true)}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsRunning(false)}
                  className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="h-8 px-2.5 rounded-lg text-slate-600 border-slate-200 hover:bg-slate-100 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </Button>
            </div>

            {/* Quick preset buttons */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">Preset Cepat Durasi:</span>
              <div className="grid grid-cols-4 gap-1">
                {['15m', '30m', '45m', '1 jam'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onChange(preset);
                      setPopoverOpen(false);
                    }}
                    className="py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <Button
              type="button"
              size="sm"
              disabled={seconds === 0}
              onClick={handleApplyTimer}
              className="w-full h-8 rounded-xl bg-[#003f78] hover:bg-[#002d56] text-white font-bold text-xs gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Set Durasi ({formatToDurationString(seconds) || '0s'})</span>
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

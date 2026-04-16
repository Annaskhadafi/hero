"use client";

import React, { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { Camera, MapPin, Settings, LogIn, LogOut } from "lucide-react";
import { submitAttendance, getTodayAttendanceLogs } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gpsLocked, setGpsLocked] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setTimeStr(format(new Date(), "hh:mm a"));
      setDateStr(format(new Date(), "EEEE, MMM d").toUpperCase());
    }, 1000);
    setTimeStr(format(new Date(), "hh:mm a"));
    setDateStr(format(new Date(), "EEEE, MMM d").toUpperCase());

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Init Live Camera
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }

    startCamera();

    // Lock GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLocked(true);
        },
        (err) => console.error("GPS error:", err)
      );
    }
    
    // Fetch today's logs
    getTodayAttendanceLogs().then(res => {
      if (res.success) {
        setLogs(res.logs);
      }
    });

  }, []);

  const handleClock = async (type: "checked-in" | "checked-out") => {
    if (!videoRef.current || !canvasRef.current || !location) {
      alert("Please ensure Camera and GPS are allowed.");
      return;
    }
    
    // Take photo snapshot
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const file = new File([blob], `${type}-photo.jpg`, { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("locationName", "Site North (Pit 3)"); 

      const res = await submitAttendance(formData);
      if (res.success) {
        alert("Attendance logged successfully!");
        // Refresh logs
        getTodayAttendanceLogs().then(r => r.success && setLogs(r.logs));
      } else {
        alert("Failed to log attendance");
      }
    }, "image/jpeg");
  };

  return (
    <div className="flex md:items-center justify-center min-h-[90vh] bg-slate-100 p-4">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-[8px] border-slate-900 flex flex-col relative h-[85vh]">
        
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-xs">HERO</span>
            </div>
          </div>
          <Settings className="w-5 h-5 text-slate-400" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 hide-scrollbar flex flex-col gap-6">
          
          {/* Time & User */}
          <div>
            <h1 className="text-sm font-semibold text-slate-500 mb-1">Attendance</h1>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tighter text-slate-900">
                {timeStr.split(" ")[0]}
              </span>
              <span className="text-xl font-bold text-slate-600">
                {timeStr.split(" ")[1]}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">{dateStr}</p>
            
            {/* User Profile Card */}
            <div className="mt-4 flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden">
                <img src="/logo HERO.png" className="w-full h-full object-cover" alt="User" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Ahmad Riva'i</p>
                <p className="text-xs text-slate-500 font-medium">Heavy Equipment Specialist</p>
              </div>
            </div>
          </div>

          {/* Camera View */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-[4/5] shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-90"
            />
            {/* GPS Overlay */}
            <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${gpsLocked ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400">
                  {gpsLocked ? "GPS LOCKED" : "ACQUIRING GPS..."}
                </p>
                <p className="text-xs font-bold text-slate-800">Site North (Pit 3)</p>
              </div>
            </div>

            {/* Camera Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-lg">
              <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white">
                 <Camera className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="absolute bottom-6 right-4 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white tracking-wider">
              LIVE
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
                onClick={() => handleClock("checked-in")}
                disabled={!gpsLocked}
                className="flex-1 rounded-2xl h-14 bg-slate-900 text-white hover:bg-slate-800 flex flex-col gap-1 items-center justify-center shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Clock In</span>
            </Button>
            <Button 
                onClick={() => handleClock("checked-out")}
                disabled={!gpsLocked}
                variant="outline"
                className="flex-1 rounded-2xl h-14 bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 flex flex-col gap-1 items-center justify-center"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Clock Out</span>
            </Button>
          </div>

          {/* Today's Log */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Today's Log</h3>
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
              
              {logs.length === 0 ? (
                <div className="pl-8 text-xs text-slate-500 pb-2">No records found for today.</div>
              ) : (
                logs.map((log: any, idx: number) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute left-[3px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      {format(new Date(log.eventTime), "hh:mm a")}
                    </span>
                    <p className="font-bold text-sm text-slate-900 capitalize">
                      {log.eventType.replace('-', ' ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      {log.locationNote} • Verified
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
        
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

      </div>
      
      {/* Global styles fix for hiding scrollbar if not available */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

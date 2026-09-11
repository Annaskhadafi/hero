"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SpeechInputButtonProps {
  onFinalTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  className?: string;
}

export function SpeechInputButton({ onFinalTranscript, onPartialTranscript, className }: SpeechInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onPartialTranscriptRef = useRef(onPartialTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
    onPartialTranscriptRef.current = onPartialTranscript;
  });

  useEffect(() => {
    isMountedRef.current = true;
    const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && onFinalTranscriptRef.current) {
          onFinalTranscriptRef.current(finalTranscript + " ");
        }
        if (onPartialTranscriptRef.current) {
          onPartialTranscriptRef.current(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error || 'unknown';
        if (isMountedRef.current) {
          setIsRecording(false);
        }
        if (err === 'no-speech' || err === 'aborted') {
          return;
        }

        console.warn('Speech recognition warning:', err);

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          toast.error('Izin mikrofon diblokir. Silakan aktifkan izin mikrofon pada browser Anda.');
        } else if (err === 'audio-capture') {
          toast.error('Mikrofon tidak terdeteksi pada perangkat Anda.');
        } else if (err === 'network') {
          toast.error('Koneksi jaringan terputus saat memproses suara.');
        } else {
          toast.error(`Error mikrofon: ${err}`);
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch(e){}
      if (isMountedRef.current) {
        setIsRecording(false);
      }
      return;
    }

    if (!recognitionRef.current) {
      toast.error("Browser Anda (iOS Safari / Chrome jadul) mungkin tidak mendukung fitur ini.");
      return;
    }

    try {
      recognitionRef.current.start();
      if (isMountedRef.current) {
        setIsRecording(true);
      }
    } catch (err: any) {
      if (err?.name === 'InvalidStateError') {
        if (isMountedRef.current) {
          setIsRecording(true);
        }
      } else {
        console.warn('Speech recognition start error:', err);
        toast.error('Gagal memulai mikrofon. Pastikan izin mikrofon telah diberikan.');
        if (isMountedRef.current) {
          setIsRecording(false);
        }
      }
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "secondary"}
      size="icon"
      className={`shrink-0 rounded-full ${className} ${
        isRecording ? "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" : ""
      }`}
      onClick={toggleRecording}
      title="Bicara untuk mengetik otomatis"
    >
      {isRecording ? (
        <MicOff className="size-4" />
      ) : (
        <Mic className="size-4 text-gray-700" />
      )}
    </Button>
  );
}

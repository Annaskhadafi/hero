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

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

        if (finalTranscript) {
          onFinalTranscript(finalTranscript + " ");
        }
        if (onPartialTranscript) {
          onPartialTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
          toast.error("Error mikrofon: " + event.error);
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Automatically set state to false when it stops recording natively (e.g., timeout or user stopped)
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, [onFinalTranscript, onPartialTranscript]);

  const toggleRecording = () => {
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch(e){}
      setIsRecording(false);
      return;
    }

    if (!recognitionRef.current) {
      toast.error("Browser Anda (iOS Safari / Chrome jadul) mungkin tidak mendukung fitur ini.");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memulai perekaman. Coba muat ulang halaman.");
      setIsRecording(false);
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

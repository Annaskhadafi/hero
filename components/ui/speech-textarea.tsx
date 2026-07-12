"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { SpeechInputButton } from "@/components/ui/speech-input-button";
import { cn } from "@/lib/utils";

export interface SpeechTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const SpeechTextarea = React.forwardRef<HTMLTextAreaElement, SpeechTextareaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    
    const handleTranscript = (text: string) => {
      const currentValue = typeof value === "string" ? value : "";
      const newValue = currentValue ? currentValue + " " + text : text;
      
      if (onChange) {
        // Create a synthetic event
        const e = {
          target: { value: newValue },
          currentTarget: { value: newValue },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange(e);
      }
    };

    return (
      <div className="relative w-full">
        <Textarea
          value={value}
          onChange={onChange}
          ref={ref}
          className={cn("pr-12", className)}
          {...props}
        />
        <div className="absolute right-2 top-2">
          <SpeechInputButton 
            onFinalTranscript={handleTranscript} 
            className="size-8 bg-blue-50 text-blue-600 hover:bg-blue-100" 
          />
        </div>
      </div>
    );
  }
);

SpeechTextarea.displayName = "SpeechTextarea";

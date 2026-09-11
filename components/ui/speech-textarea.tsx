"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { SpeechInputButton } from "@/components/ui/speech-input-button";
import { cn } from "@/lib/utils";

export interface SpeechTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const SpeechTextarea = React.forwardRef<HTMLTextAreaElement, SpeechTextareaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    
    const valueRef = React.useRef(value);
    const onChangeRef = React.useRef(onChange);

    React.useEffect(() => {
      valueRef.current = value;
      onChangeRef.current = onChange;
    });

    const handleTranscript = React.useCallback((text: string) => {
      const currentValue = typeof valueRef.current === "string" ? valueRef.current : "";
      const newValue = currentValue ? currentValue + " " + text : text;

      if (onChangeRef.current) {
        const e = {
          target: { value: newValue },
          currentTarget: { value: newValue },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLTextAreaElement>;

        onChangeRef.current(e);
      }
    }, []);

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

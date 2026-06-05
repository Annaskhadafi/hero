"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";

// Dynamically import our wrapper to ensure Quill is registered with blotFormatter
const ReactQuill = dynamic(() => import("./quill-wrapper"), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse bg-muted rounded-md border border-input" />,
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  // Memoize modules to avoid unnecessary re-renders of the editor
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image", "clean"],
      ],
      blotFormatter: {},
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "link",
    "image",
  ];

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-background rounded-md [&_.ql-container]:min-h-[150px] [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-editor]:text-foreground [&_.ql-toolbar]:border-input [&_.ql-container]:border-input [&_.ql-picker]:text-foreground [&_.ql-stroke]:stroke-foreground [&_.ql-fill]:fill-foreground"
      />
    </div>
  );
}

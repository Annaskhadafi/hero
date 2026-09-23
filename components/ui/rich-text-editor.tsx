"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useCallback } from "react";
import "react-quill-new/dist/quill.snow.css";
import { uploadFile } from "@/app/actions/upload";
import { uploadLmsImage } from "@/lib/lms-image-upload";

import { toast } from "sonner";

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
  const quillRef = useRef<any>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const directUrl = await uploadLmsImage(file).catch(() => null);
        const res = directUrl ? { success: true as const, url: directUrl } : await uploadFile(formData);
        if (res.success && res.url) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true) || { index: quill.getLength() };
            quill.insertEmbed(range.index, "image", res.url);
            quill.setSelection(range.index + 1);
          }
          toast.success("Gambar berhasil disisipkan");
        } else {
          toast.error("Gagal upload gambar: " + ("error" in res && res.error ? res.error : "Gagal mengunggah file"));
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Terjadi kesalahan saat mengupload gambar.");
      }
    };
  }, []);

  // Memoize modules to avoid unnecessary re-renders of the editor
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      blotFormatter: {},
    }),
    [imageHandler]
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
        // @ts-expect-error ReactQuill dynamic import type missing ref
        ref={quillRef}
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

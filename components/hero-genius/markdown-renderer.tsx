"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split by double newlines to form paragraphs/blocks
  const blocks = content.split(/\n\n+/);

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, blockIdx) => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return null;

        // Check if block is a bullet list (lines starting with '-' or '*')
        const lines = trimmedBlock.split("\n");
        const isBulletList = lines.every((line) => /^[-*•]\s+/.test(line.trim()));
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

        if (isBulletList) {
          return (
            <ul key={blockIdx} className="list-disc pl-5 space-y-1 my-1.5">
              {lines.map((line, lineIdx) => {
                const itemText = line.trim().replace(/^[-*•]\s+/, "");
                return (
                  <li key={lineIdx} className="leading-relaxed">
                    {renderInlineFormatting(itemText)}
                  </li>
                );
              })}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={blockIdx} className="list-decimal pl-5 space-y-1 my-1.5">
              {lines.map((line, lineIdx) => {
                const itemText = line.trim().replace(/^\d+\.\s+/, "");
                return (
                  <li key={lineIdx} className="leading-relaxed">
                    {renderInlineFormatting(itemText)}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Headings (###, ##, #)
        if (trimmedBlock.startsWith("### ")) {
          return (
            <h4 key={blockIdx} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
              {renderInlineFormatting(trimmedBlock.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmedBlock.startsWith("## ")) {
          return (
            <h3 key={blockIdx} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2.5">
              {renderInlineFormatting(trimmedBlock.replace(/^##\s+/, ""))}
            </h3>
          );
        }
        if (trimmedBlock.startsWith("# ")) {
          return (
            <h2 key={blockIdx} className="text-lg font-black text-slate-900 dark:text-slate-100 mt-3">
              {renderInlineFormatting(trimmedBlock.replace(/^#\s+/, ""))}
            </h2>
          );
        }

        // Standard Paragraph (can contain single \n lines)
        return (
          <p key={blockIdx} className="leading-relaxed">
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {renderInlineFormatting(line)}
                {lineIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), italic (*text*), inline code (`code`), and citation markers ([Sumber #X])
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return "";

  // Regex tokenizer for bold (**...**), italic (*...*), inline code (`...`), and links ([text](url))
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex matching **bold**, `code`, or *italic*
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
      // Bold
      const inner = matchedStr.slice(2, -2);
      tokens.push(
        <strong key={keyIdx++} className="font-bold text-slate-900 dark:text-slate-100">
          {inner}
        </strong>
      );
    } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      // Inline Code
      const inner = matchedStr.slice(1, -1);
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[12px] text-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          {inner}
        </code>
      );
    } else if (matchedStr.startsWith("*") && matchedStr.endsWith("*")) {
      // Italic
      const inner = matchedStr.slice(1, -1);
      tokens.push(
        <em key={keyIdx++} className="italic">
          {inner}
        </em>
      );
    } else if (matchedStr.startsWith("[") && matchedStr.includes("](")) {
      // Link [label](url)
      const linkMatch = matchedStr.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 underline hover:text-sky-800 font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        tokens.push(matchedStr);
      }
    } else {
      tokens.push(matchedStr);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens.length > 0 ? <>{tokens}</> : text;
}

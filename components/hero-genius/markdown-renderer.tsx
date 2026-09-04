"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, Maximize2, X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { resolveRagDocumentUrl } from "@/lib/hero-genius/client";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "code"; language: string; code: string }
  | {
      type: "table";
      headers: string[];
      alignments: ("left" | "center" | "right")[];
      rows: string[][];
    }
  | { type: "blockquote"; lines: string[] }
  | { type: "bullet-list"; items: string[] }
  | { type: "numbered-list"; items: string[] }
  | { type: "hr" }
  | { type: "paragraph"; lines: string[] };

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "table":
            return (
              <TableBlock
                key={idx}
                headers={block.headers}
                alignments={block.alignments}
                rows={block.rows}
              />
            );

          case "code":
            return (
              <CodeBlock
                key={idx}
                language={block.language}
                code={block.code}
              />
            );

          case "heading": {
            if (block.level === 1) {
              return (
                <h2
                  key={idx}
                  className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-4 mb-2 tracking-tight"
                >
                  {renderInlineFormatting(block.text)}
                </h2>
              );
            }
            if (block.level === 2) {
              return (
                <h3
                  key={idx}
                  className="text-base sm:text-lg font-bold text-sky-800 dark:text-sky-300 mt-3.5 mb-1.5"
                >
                  {renderInlineFormatting(block.text)}
                </h3>
              );
            }
            if (block.level === 3) {
              return (
                <h4
                  key={idx}
                  className="text-sm sm:text-base font-bold text-sky-700 dark:text-sky-400 mt-3 mb-1"
                >
                  {renderInlineFormatting(block.text)}
                </h4>
              );
            }
            if (block.level === 4) {
              return (
                <h5
                  key={idx}
                  className="text-xs sm:text-sm font-bold text-sky-900 dark:text-sky-200 mt-2.5 mb-1"
                >
                  {renderInlineFormatting(block.text)}
                </h5>
              );
            }
            return (
              <h6
                key={idx}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 mb-0.5"
              >
                {renderInlineFormatting(block.text)}
              </h6>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="my-2 border-l-3 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-400 pl-3.5 py-2 rounded-r-lg text-slate-700 dark:text-slate-300 italic text-xs leading-relaxed"
              >
                {block.lines.map((line, lIdx) => (
                  <div key={lIdx}>{renderInlineFormatting(line)}</div>
                ))}
              </blockquote>
            );

          case "bullet-list":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 my-1.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ul>
            );

          case "numbered-list":
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1 my-1.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ol>
            );

          case "hr":
            return (
              <hr
                key={idx}
                className="my-3 border-slate-200 dark:border-slate-800"
              />
            );

          case "paragraph":
          default:
            return (
              <p key={idx} className="leading-relaxed">
                {block.lines.map((line, lineIdx) => (
                  <React.Fragment key={lineIdx}>
                    {renderInlineFormatting(line)}
                    {lineIdx < block.lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}

/**
 * Renders Markdown table as interactive, responsive, accessible HTML table
 */
function TableBlock({
  headers,
  alignments,
  rows,
}: {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
}) {
  return (
    <div className="my-4 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        <table className="w-full min-w-[340px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#002647] bg-[#003461] text-white">
              {headers.map((h, hIdx) => {
                const align = alignments[hIdx] || "left";
                const alignClass =
                  align === "center"
                    ? "text-center"
                    : align === "right"
                    ? "text-right"
                    : "text-left";
                return (
                  <th
                    key={hIdx}
                    className={`px-4 py-3 font-bold tracking-wider text-xs text-white uppercase border-r last:border-r-0 border-white/20 whitespace-nowrap ${alignClass}`}
                  >
                    {renderInlineFormatting(h)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="even:bg-slate-50/80 odd:bg-white hover:bg-sky-50/70 dark:even:bg-slate-900/80 dark:odd:bg-slate-950/90 dark:hover:bg-sky-950/40 transition-colors"
              >
                {headers.map((_, cIdx) => {
                  const cell = row[cIdx] || "";
                  const align = alignments[cIdx] || "left";
                  const alignClass =
                    align === "center"
                      ? "text-center"
                      : align === "right"
                      ? "text-right"
                      : "text-left";
                  const isFirstCol = cIdx === 0;
                  return (
                    <td
                      key={cIdx}
                      className={`px-4 py-2.5 align-top leading-relaxed border-r last:border-r-0 border-slate-200 dark:border-slate-800/80 ${
                        isFirstCol
                          ? "font-semibold text-sky-950 dark:text-sky-300 [&_strong]:text-sky-950 dark:[&_strong]:text-sky-300"
                          : "font-normal text-slate-800 dark:text-slate-200 [&_strong]:text-slate-900 dark:[&_strong]:text-white"
                      } ${alignClass}`}
                    >
                      {renderInlineFormatting(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Fenced Code Block with Copy Button
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-xs shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="font-semibold">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Salin Kode"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[10px]">Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Lexer/Parser for Markdown Blocks (Headings, Tables, Lists, Code, Quotes, Paragraphs)
 */
function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Skip empty lines between blocks
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block: ```lang
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++; // skip closing ```
      }
      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 3. Horizontal Rule: --- or *** or ___
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 4. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // 5. Blockquote: > text
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        lines: quoteLines,
      });
      continue;
    }

    // 6. Table: Header line followed by delimiter line
    if (isTableStart(lines, i)) {
      const headers = parseTableRow(line);
      const delimiterLine = lines[i + 1].trim();
      const alignments = parseTableAlignments(delimiterLine, headers.length);
      const rows: string[][] = [];
      i += 2; // skip header and delimiter

      while (
        i < lines.length &&
        lines[i].trim() &&
        lines[i].includes("|") &&
        !lines[i].trim().startsWith("```") &&
        !lines[i].trim().startsWith("#")
      ) {
        const rowCells = parseTableRow(lines[i]);
        rows.push(rowCells);
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        alignments,
        rows,
      });
      continue;
    }

    // 7. Bullet List: starts with -, *, +, or •
    if (/^[-*+•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+•]\s+/, ""));
        i++;
      }
      blocks.push({
        type: "bullet-list",
        items,
      });
      continue;
    }

    // 8. Numbered List: starts with 1., 2., etc.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({
        type: "numbered-list",
        items,
      });
      continue;
    }

    // 9. Regular Paragraph (read until blank line or next block element)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(?:-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !isTableStart(lines, i) &&
      !/^[-*+•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        lines: paraLines,
      });
    }
  }

  return blocks;
}

function isTableDelimiter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(trimmed);
}

function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false;
  const current = lines[index].trim();
  const next = lines[index + 1].trim();
  if (
    !current.includes("|") ||
    current.startsWith("```") ||
    current.startsWith("#") ||
    current.startsWith(">")
  ) {
    return false;
  }
  return isTableDelimiter(next);
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseTableAlignments(
  delimiterLine: string,
  count: number
): ("left" | "center" | "right")[] {
  const cells = parseTableRow(delimiterLine);
  const alignments: ("left" | "center" | "right")[] = [];

  for (let i = 0; i < count; i++) {
    const cell = (cells[i] || "").trim();
    const startsWithColon = cell.startsWith(":");
    const endsWithColon = cell.endsWith(":");

    if (startsWithColon && endsWithColon) {
      alignments.push("center");
    } else if (endsWithColon) {
      alignments.push("right");
    } else {
      alignments.push("left");
    }
  }

  return alignments;
}

/**
 * Parses bold (**text**), italic (*text*), inline code (`code`), and links ([text](url))
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return "";

  const tokens: React.ReactNode[] = [];
  let keyIdx = 0;

  // Regex matching ![alt](url), **bold**, `code`, *italic*, or [link](url)
  const pattern = /(!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith("![") && matchedStr.includes("](")) {
      const imgMatch = matchedStr.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        const alt = imgMatch[1] || "Gambar Dokumen";
        const rawUrl = imgMatch[2];
        const resolvedUrl = resolveRagDocumentUrl(rawUrl);
        tokens.push(
          <InlineImageItem
            key={keyIdx++}
            src={resolvedUrl}
            alt={alt}
          />
        );
      } else {
        tokens.push(matchedStr);
      }
    } else if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
      const inner = matchedStr.slice(2, -2);
      tokens.push(
        <strong
          key={keyIdx++}
          className="font-bold text-slate-900 dark:text-white"
        >
          {inner}
        </strong>
      );
    } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
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
      const inner = matchedStr.slice(1, -1);
      tokens.push(
        <em key={keyIdx++} className="italic">
          {inner}
        </em>
      );
    } else if (matchedStr.startsWith("[") && matchedStr.includes("](")) {
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

function InlineImageItem({ src, alt }: { src: string; alt: string; key?: React.Key }) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setZoom(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (hasError) return null;

  return (
    <>
      <span className="my-2.5 block max-w-full">
        <span
          onClick={() => {
            setIsOpen(true);
            setZoom(1);
          }}
          className="group relative inline-block cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-xs transition hover:border-sky-400 hover:shadow-md dark:border-slate-800"
        >
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="max-h-72 max-w-full rounded-lg object-contain transition duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
              <Maximize2 className="size-3" /> Klik untuk memperbesar
            </span>
          </span>
        </span>
        <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          🖼️ {alt}
        </span>
      </span>

      {/* Lightbox Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => {
            setIsOpen(false);
            setZoom(1);
          }}
        >
          <div
            className="relative flex max-h-[92vh] max-w-[92vw] w-[950px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-2.5">
              <span className="truncate text-xs font-bold text-slate-200 max-w-md">
                🖼️ {alt}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="rounded bg-slate-800 p-1.5 text-xs font-bold hover:bg-slate-700"
                  title="Perkecil (-)"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="w-11 text-center font-mono text-xs text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="rounded bg-slate-800 p-1.5 text-xs font-bold hover:bg-slate-700"
                  title="Perbesar (+)"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="rounded bg-slate-800 p-1.5 text-xs hover:bg-slate-700"
                  title="Reset Zoom"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                  title="Buka di Tab Baru / Unduh"
                >
                  <Download className="size-3" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setZoom(1);
                  }}
                  className="rounded bg-rose-600 p-1.5 text-xs font-bold text-white hover:bg-rose-500"
                  title="Tutup (Esc)"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
            <div
              className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-950 min-h-[350px]"
              onClick={() => {
                setIsOpen(false);
                setZoom(1);
              }}
            >
              <img
                src={src}
                alt={alt}
                style={{ transform: `scale(${zoom})` }}
                className="max-h-[75vh] max-w-full object-contain transition-transform duration-150 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

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
                  className="text-lg font-black text-slate-900 dark:text-slate-100 mt-3.5 mb-1.5"
                >
                  {renderInlineFormatting(block.text)}
                </h2>
              );
            }
            if (block.level === 2) {
              return (
                <h3
                  key={idx}
                  className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1"
                >
                  {renderInlineFormatting(block.text)}
                </h3>
              );
            }
            if (block.level === 3) {
              return (
                <h4
                  key={idx}
                  className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1"
                >
                  {renderInlineFormatting(block.text)}
                </h4>
              );
            }
            return (
              <h5
                key={idx}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 mb-0.5"
              >
                {renderInlineFormatting(block.text)}
              </h5>
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
    <div className="my-3.5 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
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
                    className={`px-4 py-2.5 font-bold tracking-wider text-xs text-white uppercase border-r last:border-r-0 border-white/20 whitespace-nowrap ${alignClass}`}
                  >
                    {renderInlineFormatting(h)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="even:bg-slate-100/60 odd:bg-white hover:bg-sky-50 dark:even:bg-slate-900/60 dark:odd:bg-slate-950 dark:hover:bg-sky-950/60 transition-colors"
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
                      className={`px-4 py-2.5 align-top leading-relaxed border-r last:border-r-0 border-slate-200 dark:border-slate-800 ${
                        isFirstCol
                          ? "font-bold text-[#003461] dark:text-sky-300"
                          : "font-normal text-slate-900 dark:text-slate-100"
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

  // Regex matching **bold**, `code`, *italic*, or [link](url)
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
      const inner = matchedStr.slice(2, -2);
      tokens.push(
        <strong
          key={keyIdx++}
          className="font-bold text-slate-900 dark:text-slate-100"
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

/**
 * Web Scraper, HTML Cleaner & Hierarchical Markdown Chunker for RAG
 * 100% Free, Native, No-API dependencies.
 */

export interface ParsedWebResult {
  url: string;
  title: string;
  description?: string;
  siteName?: string;
  markdown: string;
  rawText: string;
  charCount: number;
  wordCount: number;
  estimatedTokens: number;
  headings: string[];
  chunks: WebChunk[];
  scrapedAt: string;
  isAiEnhanced?: boolean;
  modelUsed?: string;
}

export interface WebChunk {
  chunkIndex: number;
  heading: string;
  headingPath: string[];
  content: string;
  charCount: number;
  estimatedTokens: number;
}

export interface ParseWebOptions {
  chunkSize?: number; // Target characters per chunk (default: 800)
  chunkOverlap?: number; // Characters overlap between sub-chunks (default: 120)
  timeoutMs?: number; // Request timeout in ms (default: 15000)
  customUserAgent?: string;
  enableAiClean?: boolean; // Automatically clean & structure markdown with AI before chunking (default: true)
}

/**
 * 1. Clean HTML and extract core semantic content
 */
export function cleanHtml(rawHtml: string): {
  title: string;
  description: string;
  siteName: string;
  bodyHtml: string;
} {
  // Extract Title
  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : "";
  title = decodeHtmlEntities(title);

  // Extract meta description
  const descMatch =
    rawHtml.match(
      /<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([\s\S]*?)["']/i
    ) ||
    rawHtml.match(
      /<meta\s+content=["']([\s\S]*?)["']\s+(?:name|property)=["'](?:description|og:description)["']/i
    );
  const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : "";

  // Extract og:site_name
  const siteNameMatch = rawHtml.match(
    /<meta\s+(?:property|name)=["']og:site_name["']\s+content=["']([\s\S]*?)["']/i
  );
  const siteName = siteNameMatch ? decodeHtmlEntities(siteNameMatch[1].trim()) : "";

  // Remove unwanted non-content tags & their children
  let cleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/gi, "") // Comments
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "") // Styles
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "") // Noscript
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "") // SVG icons
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Iframes
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "") // Navigation bars
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "") // Page Header
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "") // Page Footer
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "") // Sidebars
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ""); // Forms

  // Target main content container if available (<article>, <main>, or [role="main"])
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);

  const bodyHtml = articleMatch
    ? articleMatch[1]
    : mainMatch
    ? mainMatch[1]
    : bodyMatch
    ? bodyMatch[1]
    : cleaned;

  return {
    title: title || "Web Document",
    description,
    siteName,
    bodyHtml,
  };
}

/**
 * 2. Convert Clean HTML to Structured Markdown
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Normalize line breaks
  md = md.replace(/\r\n/g, "\n");

  // Headers (h1 - h6)
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n\n##### $1\n\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n\n###### $1\n\n");

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```\n$1\n```\n\n");
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n\n```\n$1\n```\n\n");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
    return `\n\n${convertHtmlTableToMarkdown(tableContent)}\n\n`;
  });

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, content) => {
    const lines = stripTags(content)
      .trim()
      .split("\n")
      .map((l) => `> ${l.trim()}`)
      .join("\n");
    return `\n\n${lines}\n\n`;
  });

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n\n$1\n\n");
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n\n$1\n\n");
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  // Paragraphs & Divs & Line Breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // Bold & Italic
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");

  // Links (Extract Text + Href)
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Strip remaining HTML tags
  md = stripTags(md);

  // Decode HTML entities
  md = decodeHtmlEntities(md);

  // Clean excessive spaces and newlines
  md = md
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return md;
}

/**
 * 3. Convert HTML Table structure to Markdown Table syntax
 */
function convertHtmlTableToMarkdown(tableHtml: string): string {
  const rows: string[][] = [];

  // Match all <tr>
  const trMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const tr of trMatches) {
    const cells: string[] = [];
    const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
    for (const cell of cellMatches) {
      const cellText = stripTags(cell).replace(/[\r\n\t]+/g, " ").trim();
      cells.push(cellText || "-");
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return "";

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalizedRows = rows.map((r) => {
    while (r.length < maxCols) r.push("-");
    return r;
  });

  const headerRow = normalizedRows[0];
  const separatorRow = headerRow.map(() => "---");
  const dataRows = normalizedRows.slice(1);

  const lines = [
    `| ${headerRow.join(" | ")} |`,
    `| ${separatorRow.join(" | ")} |`,
    ...dataRows.map((r) => `| ${r.join(" | ")} |`),
  ];

  return lines.join("\n");
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®");
}

/**
 * 4. Hierarchical Smart Markdown Chunker
 * Splits by #, ##, ### headers, preserving context and metadata on every chunk.
 */
export function chunkMarkdown(
  markdown: string,
  options: { chunkSize?: number; chunkOverlap?: number; docTitle?: string; sourceUrl?: string } = {}
): WebChunk[] {
  const chunkSize = options.chunkSize || 800;
  const chunkOverlap = options.chunkOverlap || 120;
  const docTitle = options.docTitle || "Dokumen Web";
  const sourceUrl = options.sourceUrl || "";

  // Split into sections based on headings
  const lines = markdown.split("\n");
  interface RawSection {
    heading: string;
    level: number;
    lines: string[];
    path: string[];
  }

  const sections: RawSection[] = [];
  let currentSection: RawSection = {
    heading: docTitle,
    level: 1,
    lines: [],
    path: [docTitle],
  };

  const headingStack: { level: number; title: string }[] = [{ level: 1, title: docTitle }];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection.lines.length > 0) {
        sections.push({ ...currentSection });
      }

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, title });

      currentSection = {
        heading: title,
        level,
        lines: [line],
        path: headingStack.map((h) => h.title),
      };
    } else {
      currentSection.lines.push(line);
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  const chunks: WebChunk[] = [];
  let globalChunkIndex = 1;

  for (const sec of sections) {
    const sectionText = sec.lines.join("\n").trim();
    if (!sectionText) continue;

    const headingContext = sec.path.join(" > ");

    if (sectionText.length <= chunkSize) {
      const enrichedContent = formatChunkContent(docTitle, headingContext, sourceUrl, sectionText);
      chunks.push({
        chunkIndex: globalChunkIndex++,
        heading: sec.heading,
        headingPath: sec.path,
        content: enrichedContent,
        charCount: enrichedContent.length,
        estimatedTokens: Math.ceil(enrichedContent.length / 4),
      });
    } else {
      const subChunks = splitLongTextWithOverlap(sectionText, chunkSize, chunkOverlap);
      for (let i = 0; i < subChunks.length; i++) {
        const subText = subChunks[i];
        const subHeading = `${sec.heading} (Part ${i + 1}/${subChunks.length})`;
        const enrichedContent = formatChunkContent(
          docTitle,
          `${headingContext} [Part ${i + 1}]`,
          sourceUrl,
          subText
        );

        chunks.push({
          chunkIndex: globalChunkIndex++,
          heading: subHeading,
          headingPath: [...sec.path, `Part ${i + 1}`],
          content: enrichedContent,
          charCount: enrichedContent.length,
          estimatedTokens: Math.ceil(enrichedContent.length / 4),
        });
      }
    }
  }

  return chunks;
}

function formatChunkContent(
  docTitle: string,
  headingContext: string,
  sourceUrl: string,
  body: string
): string {
  const metadataLines: string[] = [];
  if (docTitle) metadataLines.push(`[Dokumen]: ${docTitle}`);
  if (headingContext) metadataLines.push(`[Bagian]: ${headingContext}`);
  if (sourceUrl) metadataLines.push(`[Sumber]: ${sourceUrl}`);

  const headerBlock = metadataLines.length > 0 ? `${metadataLines.join("\n")}\n\n` : "";
  return `${headerBlock}${body}`;
}

function splitLongTextWithOverlap(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const result: string[] = [];
  let currentBuffer = "";

  for (const para of paragraphs) {
    if ((currentBuffer + "\n\n" + para).trim().length <= chunkSize) {
      currentBuffer = currentBuffer ? `${currentBuffer}\n\n${para}` : para;
    } else {
      if (currentBuffer) {
        result.push(currentBuffer.trim());
        const overlapSlice = currentBuffer.slice(-chunkOverlap);
        currentBuffer = `${overlapSlice}\n\n${para}`.trim();
      } else {
        let remaining = para;
        while (remaining.length > 0) {
          const slice = remaining.slice(0, chunkSize);
          result.push(slice.trim());
          remaining = remaining.slice(chunkSize - chunkOverlap);
          if (remaining.length <= chunkOverlap) break;
        }
        currentBuffer = "";
      }
    }
  }

  if (currentBuffer.trim()) {
    result.push(currentBuffer.trim());
  }

  return result.length > 0 ? result : [text];
}

/**
 * 5. Master Orchestrator: Fetch URL, Clean, Parse to Markdown & Generate Semantic Chunks
 */
export async function parseWebUrl(
  targetUrl: string,
  options: ParseWebOptions = {}
): Promise<ParsedWebResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Protokol URL harus diawali dengan http:// atau https://");
    }
  } catch {
    throw new Error(`URL tidak valid: "${targetUrl}"`);
  }

  const timeout = options.timeoutMs || 15000;
  const userAgent =
    options.customUserAgent ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (One-Chitra-Hero-RAG/1.0)";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let rawHtml = "";
  try {
    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Gagal mengambil halaman web (${res.status} ${res.statusText})`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error(`Tipe konten bukan HTML/Text (${contentType})`);
    }

    rawHtml = await res.text();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request timeout setelah ${timeout / 1000} detik. Situs web lambat merespons.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const { title, description, siteName, bodyHtml } = cleanHtml(rawHtml);
  let rawMarkdown = htmlToMarkdown(bodyHtml);

  if (!rawMarkdown || rawMarkdown.trim().length < 20) {
    throw new Error("Konten teks halaman terlalu sedikit atau situs web diblokir/memerlukan JavaScript interaktif.");
  }

  // 3. AUTO AI CLEAN & STRUCTURING (Enabled by default)
  let markdown = rawMarkdown;
  let isAiEnhanced = false;
  let modelUsed: string | undefined;

  if (options.enableAiClean !== false) {
    try {
      const aiRes = await cleanMarkdownWithAi(rawMarkdown, {
        docTitle: title,
        sourceUrl: parsedUrl.toString(),
      });
      markdown = aiRes.cleanMarkdown;
      isAiEnhanced = aiRes.isAiEnhanced;
      modelUsed = aiRes.modelUsed;
    } catch (cleanErr) {
      console.warn("[parseWebUrl] AI cleanup failed, using heuristic sanitizer:", cleanErr);
      markdown = sanitizeMarkdownHeuristically(rawMarkdown, title);
    }
  }

  const headings = (markdown.match(/^(#{1,4})\s+(.+)$/gm) || []).map((h) => h.trim());

  // 4. SMART HIERARCHICAL CHUNKING ON AI-CLEANED MARKDOWN
  const chunks = chunkMarkdown(markdown, {
    chunkSize: options.chunkSize || 800,
    chunkOverlap: options.chunkOverlap || 120,
    docTitle: title,
    sourceUrl: parsedUrl.toString(),
  });

  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  const charCount = markdown.length;
  const estimatedTokens = Math.ceil(charCount / 4);

  return {
    url: parsedUrl.toString(),
    title: title || parsedUrl.hostname,
    description,
    siteName,
    markdown,
    rawText: markdown.replace(/[#*`_\[\]()>-]/g, " ").replace(/\s+/g, " ").trim(),
    charCount,
    wordCount,
    estimatedTokens,
    headings,
    chunks,
    scrapedAt: new Date().toISOString(),
    isAiEnhanced,
    modelUsed,
  };
}

/**
 * 6. AI-Powered Markdown Structurer & Boilerplate Cleaner
 * Uses integrated OpenRouter / LLM to restructure raw parsed text into professional markdown.
 */
export async function cleanMarkdownWithAi(
  rawContent: string,
  options: { docTitle?: string; sourceUrl?: string; timeoutMs?: number } = {}
): Promise<{
  cleanMarkdown: string;
  isAiEnhanced: boolean;
  modelUsed?: string;
}> {
  if (!rawContent || rawContent.trim().length < 20) {
    return { cleanMarkdown: rawContent, isAiEnhanced: false };
  }

  const apiKey =
    process.env.INSPECTION_AI_API_KEY ||
    process.env.OLLAMA_API_KEY ||
    process.env.TIRE_PATTERN_API_KEY ||
    "";

  const apiUrl =
    process.env.INSPECTION_AI_URL ||
    process.env.OLLAMA_URL ||
    "https://openrouter.ai/api/v1/chat/completions";

  const model =
    process.env.INSPECTION_AI_MODEL ||
    process.env.TIRE_PATTERN_MODEL ||
    process.env.OLLAMA_MODEL ||
    "openai/gpt-4o-mini";

  // If no API key configured, use intelligent rule-based sanitizer fallback
  if (!apiKey) {
    const heuristicCleaned = sanitizeMarkdownHeuristically(rawContent, options.docTitle);
    return { cleanMarkdown: heuristicCleaned, isAiEnhanced: false };
  }

  const promptSystem = `Anda adalah Enterprise Technical Document Structurer & AI Content Cleaner untuk PT Chitra Paratama.

Tugas Anda:
Bersihkan, rapikan, dan susun kembali teks dokumen / hasil web scraping mentah menjadi Clean Markdown berkualitas tinggi, mudah dibaca, kaya informasi, dan optimal untuk Chunking RAG.

Aturan Wajib:
1. ELIMINASI SAMPAH UI: Hapus semua teks tombol, navigasi, header/footer web, popup, dan artefak seperti "Back to search", "Close", "Loading...", "Search by size", "Terms & Conditions", "Cookie policy", "Share on social media", "mailto:", menu dropdown, pagination, dll.
2. PERTAHANKAN DATA TEKNIS: Jangan pernah membuang spesifikasi teknis, dimensi, ukuran ban, kompon (compound), tekanan angin (PSI), rating beban, indeks kecepatan, keunggulan fitur, dan petunjuk keselamatan.
3. BUAT TABEL MARKDOWN: Jika menemukan spesifikasi teknis, ukuran, atau data berpasangan, WAJIB susun dalam format Tabel Markdown yang rapi (| Parameter | Nilai | atau | Ukuran | Rekomendasi PSI | dll).
4. SUSUN HIERARKI HEADING: Gunakan hierarki heading yang jelas (# Judul Dokumen, ## Kategori / Spesifikasi Utama, ### Sub-bagian / Fitur).
5. TATA BAHASA & PARAGRAF: Rangkai kalimat yang terpotong menjadi paragraf penjelasan yang mengalir profesional dalam Bahasa Indonesia (pertahankan istilah teknis baku).
6. OUTPUT RULE: Kembalikan HANYA teks markdown bersih. JANGAN berikan kata pengantar ("Berikut adalah..."), JANGAN gunakan code fence (\`\`\`markdown ... \`\`\`), langsung berikan isi konten markdown.`;

  const userContent = `Judul Dokumen: ${options.docTitle || "Dokumen"}
Sumber: ${options.sourceUrl || "-"}

Teks Mentah yang Perlu Dibersihkan & Disusun:
"""
${rawContent.slice(0, 15000)}
"""`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chitraparatama.com",
        "X-Title": "Hero Genius AI Structurer",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: promptSystem },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      let content = data.choices?.[0]?.message?.content?.trim() || "";

      // Strip code fence if LLM wrapped it
      if (content.startsWith("```markdown")) {
        content = content.replace(/^```markdown\s*/, "").replace(/\s*```$/, "");
      } else if (content.startsWith("```")) {
        content = content.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
      }

      if (content && content.length > 30) {
        return { cleanMarkdown: content.trim(), isAiEnhanced: true, modelUsed: model };
      }
    }
  } catch (err) {
    console.warn("[cleanMarkdownWithAi] AI cleaning request failed, falling back to heuristic:", err);
  }

  // Fallback to heuristic sanitizer
  const heuristicCleaned = sanitizeMarkdownHeuristically(rawContent, options.docTitle);
  return { cleanMarkdown: heuristicCleaned, isAiEnhanced: false };
}

/**
 * Intelligent Rule-Based Heuristic Sanitizer (Instant fallback if offline)
 */
export function sanitizeMarkdownHeuristically(markdown: string, docTitle?: string): string {
  const noisePatterns = [
    /\[\s*Back to search\s*\]\([^\)]*\)/gi,
    /\[\s*Close\s*\]\([^\)]*\)/gi,
    /\bLoading…\b/gi,
    /\bLoading\.\.\.\b/gi,
    /\[\s*\]\(mailto:[^\)]*\)/gi,
    /mailto:\?subject=[^\s\n\r]+/gi,
    /What kind of usages\?/gi,
    /For which vehicles\?/gi,
    /\bSearch by size\b/gi,
    /\bCookie (?:Policy|Settings|Preferences)\b/gi,
    /\bTerms (?:and|&) Conditions\b/gi,
    /\bAll rights reserved\b/gi,
  ];

  let cleaned = markdown;
  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove empty lines and redundant whitespace
  cleaned = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "**" && l !== "*")
    .join("\n\n");

  return cleaned.trim();
}

export interface BatchParseItemResult {
  url: string;
  success: boolean;
  data?: ParsedWebResult;
  error?: string;
}

export interface BatchParseResult {
  total: number;
  successCount: number;
  failureCount: number;
  totalChunks: number;
  totalWords: number;
  items: BatchParseItemResult[];
}

/**
 * 6. Batch Web Scraper & Chunker with concurrency control
 */
export async function parseBatchWebUrls(
  urls: string[],
  options: ParseWebOptions = {},
  concurrency = 3
): Promise<BatchParseResult> {
  const cleanUrls = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
  const results: BatchParseItemResult[] = [];

  for (let i = 0; i < cleanUrls.length; i += concurrency) {
    const batch = cleanUrls.slice(i, i + concurrency);
    const promises = batch.map(async (targetUrl) => {
      try {
        const data = await parseWebUrl(targetUrl, options);
        return { url: targetUrl, success: true, data };
      } catch (err: any) {
        return { url: targetUrl, success: false, error: err.message || "Failed to parse" };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  const successItems = results.filter((r) => r.success && r.data);
  const totalChunks = successItems.reduce((acc, curr) => acc + (curr.data?.chunks.length || 0), 0);
  const totalWords = successItems.reduce((acc, curr) => acc + (curr.data?.wordCount || 0), 0);

  return {
    total: cleanUrls.length,
    successCount: successItems.length,
    failureCount: results.length - successItems.length,
    totalChunks,
    totalWords,
    items: results,
  };
}


import { cleanHtml, htmlToMarkdown, chunkMarkdown } from "@/lib/hero-genius/web-parser";

describe("Web Parser & Chunking Engine (100% Free / No-API)", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <title>Panduan SOP Keselamatan Kerja PT Chitra Paratama</title>
      <meta name="description" content="SOP Keselamatan Kerja Tambang dan Pergudangan">
      <style>.ads { color: red; }</style>
      <script>console.log("tracking script");</script>
    </head>
    <body>
      <nav>
        <ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul>
      </nav>
      <header>
        <h1>Header Navigasi Web</h1>
      </header>

      <main>
        <article>
          <h1>Panduan Keselamatan Kerja Operasional</h1>
          <p>Setiap teknisi wajib mematuhi standar <strong>K3</strong> saat bertugas di area tambang.</p>

          <h2>1. Penggunaan APD</h2>
          <p>Alat Pelindung Diri (APD) meliputi:</p>
          <ul>
            <li>Helm Pengaman (Safety Helmet)</li>
            <li>Rompi Reflektor (Hi-Vis Vest)</li>
            <li>Sepatu Safety (Steel Toe Boots)</li>
          </ul>

          <h2>2. Matriks Risiko Operasional</h2>
          <table>
            <thead>
              <tr>
                <th>Aktivitas</th>
                <th>Tingkat Risiko</th>
                <th>Mitigasi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pemasangan Ban OTR</td>
                <td>Tinggi</td>
                <td>Gunakan Tyre Handler & Lock Ring Guard</td>
              </tr>
              <tr>
                <td>Inspeksi Tekanan Udara</td>
                <td>Sedang</td>
                <td>Gunakan Calibrated Pressure Gauge</td>
              </tr>
            </tbody>
          </table>

          <blockquote>
            Keselamatan kerja adalah prioritas utama sebelum memulai pekerjaan.
          </blockquote>
        </article>
      </main>

      <aside>
        <div>Iklan Sponsor & Banner</div>
      </aside>
      <footer>
        <p>&copy; 2026 PT Chitra Paratama. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `;

  test("cleanHtml: should extract title, description, and strip scripts/nav/footer/aside", () => {
    const cleaned = cleanHtml(sampleHtml);

    expect(cleaned.title).toBe("Panduan SOP Keselamatan Kerja PT Chitra Paratama");
    expect(cleaned.description).toBe("SOP Keselamatan Kerja Tambang dan Pergudangan");
    expect(cleaned.bodyHtml).not.toContain("<script>");
    expect(cleaned.bodyHtml).not.toContain("<nav>");
    expect(cleaned.bodyHtml).not.toContain("<footer>");
    expect(cleaned.bodyHtml).not.toContain("<aside>");
    expect(cleaned.bodyHtml).toContain("Panduan Keselamatan Kerja Operasional");
  });

  test("htmlToMarkdown: should convert clean HTML to structured markdown with headers, lists, tables, and blockquotes", () => {
    const cleaned = cleanHtml(sampleHtml);
    const md = htmlToMarkdown(cleaned.bodyHtml);

    expect(md).toContain("# Panduan Keselamatan Kerja Operasional");
    expect(md).toContain("## 1. Penggunaan APD");
    expect(md).toContain("- Helm Pengaman (Safety Helmet)");
    expect(md).toContain("| Aktivitas | Tingkat Risiko | Mitigasi |");
    expect(md).toContain("| Pemasangan Ban OTR | Tinggi | Gunakan Tyre Handler & Lock Ring Guard |");
    expect(md).toContain("> Keselamatan kerja adalah prioritas utama sebelum memulai pekerjaan.");
  });

  test("chunkMarkdown: should split markdown by header hierarchy and inject contextual metadata", () => {
    const cleaned = cleanHtml(sampleHtml);
    const md = htmlToMarkdown(cleaned.bodyHtml);

    const chunks = chunkMarkdown(md, {
      chunkSize: 500,
      chunkOverlap: 50,
      docTitle: "SOP Keselamatan Kerja",
      sourceUrl: "https://intra.chitraparatama.com/sop-k3",
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunkIndex).toBe(1);

    // Verify metadata injection
    const firstChunkContent = chunks[0].content;
    expect(firstChunkContent).toContain("[Dokumen]: SOP Keselamatan Kerja");
    expect(firstChunkContent).toContain("[Sumber]: https://intra.chitraparatama.com/sop-k3");
    expect(firstChunkContent).toContain("[Bagian]:");

    // Verify headers tracking
    const headingsInChunks = chunks.map((c) => c.heading);
    expect(headingsInChunks.some((h) => h.includes("Penggunaan APD") || h.includes("Keselamatan"))).toBe(true);
  });
});

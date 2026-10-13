import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol: must be http or https", { status: 400 });
    }

    // Fetch the target webpage
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";
    const finalUrl = response.url || targetUrl;

    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Buat base tag agar file gambar, style CSS, dan JS relatif memuat dari domain asli
      const baseTag = `<base href="${finalUrl}">`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
      } else {
        html = `${baseTag}\n${html}`;
      }

      // Netralkan script frame busting sederhana jika ada (misal: if(top !== self) top.location = self.location)
      html = html.replace(/top\.location\s*=\s*(self|window)\.location/gi, "/* framebuster bypassed */");
      html = html.replace(/window\.top\.location\s*=\s*/gi, "/* framebuster bypassed */ window.location = ");

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      // Explicitly pastikan tidak ada header pelarangan frame
      responseHeaders.delete("X-Frame-Options");
      responseHeaders.delete("Content-Security-Policy");

      return new NextResponse(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Untuk file non-HTML (gambar, pdf, dll.)
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gagal Memuat Halaman</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          h2 { color: #0f172a; margin-top: 0; font-size: 1.25rem; }
          p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
          .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #003461; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
          .btn:hover { background: #002647; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Gagal Memuat Konten</h2>
          <p>Sistem tidak dapat memuat konten halaman terproteksi ini: ${error.message || "Koneksi ke server tujuan terputus"}.</p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });
  }
}

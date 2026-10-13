/**
 * Iframe Embed & Smart URL Transformation Helper
 * Membantu mengubah URL biasa menjadi format yang ramah embed/iframe
 * dan menyediakan endpoint proxy untuk bypass batasan X-Frame-Options.
 */

export interface EmbedTransformResult {
  url: string;
  isTransformed: boolean;
  platform?: string;
  suggestProxy?: boolean;
}

/**
 * Otomatis mendeteksi dan mengubah URL layanan populer ke format embed
 */
export function transformToEmbedUrl(rawUrl: string): EmbedTransformResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { url: rawUrl, isTransformed: false };
  }

  const trimmed = rawUrl.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // 1. Google Sheets
    if (host.includes("docs.google.com") && pathname.includes("/spreadsheets/d/")) {
      // Ubah /edit... menjadi /preview
      if (pathname.includes("/edit")) {
        const newPath = pathname.replace(/\/edit.*$/, "/preview");
        parsed.pathname = newPath;
        parsed.search = "";
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Google Sheets",
        };
      }
    }

    // 2. Google Docs
    if (host.includes("docs.google.com") && pathname.includes("/document/d/")) {
      if (pathname.includes("/edit")) {
        const newPath = pathname.replace(/\/edit.*$/, "/preview");
        parsed.pathname = newPath;
        parsed.search = "";
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Google Docs",
        };
      }
    }

    // 3. Google Slides / Presentations
    if (host.includes("docs.google.com") && pathname.includes("/presentation/d/")) {
      if (pathname.includes("/edit")) {
        const newPath = pathname.replace(/\/edit.*$/, "/embed");
        parsed.pathname = newPath;
        parsed.search = "start=false&loop=false&delayms=3000";
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Google Slides",
        };
      }
    }

    // 4. Google Drive File View
    if (host.includes("drive.google.com") && pathname.includes("/file/d/")) {
      if (pathname.includes("/view")) {
        const newPath = pathname.replace(/\/view.*$/, "/preview");
        parsed.pathname = newPath;
        parsed.search = "";
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Google Drive Preview",
        };
      }
    }

    // 5. Google Forms
    if (host.includes("docs.google.com") && pathname.includes("/forms/")) {
      if (!parsed.searchParams.has("embedded")) {
        parsed.searchParams.set("embedded", "true");
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Google Forms",
        };
      }
    }

    // 6. Looker Studio (Google Data Studio)
    if (host.includes("lookerstudio.google.com") || host.includes("datastudio.google.com")) {
      if (pathname.startsWith("/reporting/") && !pathname.startsWith("/embed/reporting/")) {
        parsed.pathname = `/embed${pathname}`;
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Looker Studio",
        };
      }
    }

    // 7. YouTube
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      let videoId = "";
      if (host.includes("youtu.be")) {
        videoId = pathname.slice(1);
      } else if (parsed.searchParams.has("v")) {
        videoId = parsed.searchParams.get("v") || "";
      }

      if (videoId && !pathname.startsWith("/embed/")) {
        return {
          url: `https://www.youtube.com/embed/${videoId}`,
          isTransformed: true,
          platform: "YouTube",
        };
      }
    }

    // 8. Vimeo
    if (host === "vimeo.com") {
      const match = pathname.match(/^\/(\d+)/);
      if (match && match[1]) {
        return {
          url: `https://player.vimeo.com/video/${match[1]}`,
          isTransformed: true,
          platform: "Vimeo",
        };
      }
    }

    // 9. Figma
    if (host.includes("figma.com") && (pathname.includes("/file/") || pathname.includes("/design/"))) {
      if (!pathname.includes("/embed")) {
        return {
          url: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(trimmed)}`,
          isTransformed: true,
          platform: "Figma",
        };
      }
    }

    // 10. OneDrive / Excel Online
    if (host.includes("onedrive.live.com") || host.includes("office.live.com")) {
      if (parsed.searchParams.get("action") === "default" || parsed.searchParams.get("action") === "view") {
        parsed.searchParams.set("action", "embedview");
        return {
          url: parsed.toString(),
          isTransformed: true,
          platform: "Microsoft Office",
        };
      }
    }

    // Deteksi umum website yang diketahui sering menerapkan X-Frame-Options ketat
    const strictFrameSites = [
      "google.com",
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "github.com",
      "kompas.com",
      "detik.com",
      "tempo.co",
      "wikipedia.org",
    ];

    const isStrict = strictFrameSites.some((s) => host === s || host.endsWith(`.${s}`));
    if (isStrict) {
      return {
        url: trimmed,
        isTransformed: false,
        suggestProxy: true,
      };
    }
  } catch {
    // URL tidak valid, kembalikan apa adanya
  }

  return {
    url: trimmed,
    isTransformed: false,
  };
}

/**
 * Menghasilkan URL proxy untuk bypass pembatasan iframe
 */
export function getProxyIframeUrl(targetUrl: string): string {
  if (!targetUrl) return "";
  return `/api/iframe-proxy?url=${encodeURIComponent(targetUrl)}`;
}

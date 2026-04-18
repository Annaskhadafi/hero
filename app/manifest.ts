import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HERO",
    short_name: "HERO",
    description: "Hub for Employee Reporting & Operations untuk pelaporan, approval, dan aktivitas harian.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#041c27",
    theme_color: "#0f766e",
    lang: "id-ID",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Daily Activity",
        short_name: "Activity",
        description: "Buka Daily Activity System",
        url: "/dashboard/activity-hub/my-day",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Approval Queue",
        short_name: "Approval",
        description: "Buka approval inbox",
        url: "/dashboard/approval",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

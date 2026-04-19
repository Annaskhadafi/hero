import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HERO",
    short_name: "HERO",
    description: "Hub for Employee Reporting & Operations untuk offline activity, attendance, HSE, dan emergency response.",
    start_url: "/mobile/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3faff",
    theme_color: "#003461",
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
        name: "Daily Activity Input",
        short_name: "Activity",
        description: "Buka input aktivitas lapangan",
        url: "/mobile/activity/input",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Mobile Attendance",
        short_name: "Attendance",
        description: "Check-in / check-out dengan GPS",
        url: "/mobile/attendance",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Emergency Report",
        short_name: "Emergency",
        description: "Laporkan emergency incident cepat",
        url: "/mobile/hse?mode=emergency",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

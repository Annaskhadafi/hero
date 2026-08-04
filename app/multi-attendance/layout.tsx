import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multi Attendance Terminal — HERO",
  description: "Raray Vision face recognition attendance kiosk terminal for PT Chitra Paratama",
  robots: "noindex, nofollow",
};

export default function MultiAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Intentionally no auth wrapper — this is a public kiosk terminal
  return <>{children}</>;
}

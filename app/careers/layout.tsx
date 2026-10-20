import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Karir PT Chitra Paratama",
    template: "%s | Karir PT Chitra Paratama",
  },
  description: "Portal resmi informasi lowongan kerja dan karir profesional PT Chitra Paratama.",
  icons: {
    icon: "/cp_logo-removebg-preview.png",
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

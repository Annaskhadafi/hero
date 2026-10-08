import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import { HeroInstallPrompt } from "@/components/hero-install-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { NavigationProgressBar } from "@/components/navigation-progress-bar";
import { GlobalInputAutoSelect } from "@/components/global-input-auto-select";
import { DomCleanupPatch } from "@/components/dom-cleanup-patch";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HERO",
  description:
    "Hub for Employee Reporting & Operations",
  applicationName: "HERO",
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HERO",
  },
  formatDetection: {
    telephone: false,
  },
  referrer: "strict-origin-when-cross-origin",
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  themeColor: "#003461",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`notranslate ${inter.variable} ${manrope.variable}`}
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DomCleanupPatch />
          <Suspense fallback={null}>
            <NavigationProgressBar />
          </Suspense>
          <PwaRegistration />
          <HeroInstallPrompt />
          <GlobalInputAutoSelect />
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

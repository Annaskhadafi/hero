import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
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
};

export const viewport: Viewport = {
  themeColor: "#003461",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const removeBisAttributes = (node) => {
                  if (node.nodeType === 1) {
                    if (node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                    const children = node.querySelectorAll('[bis_skin_checked]');
                    for (let i = 0; i < children.length; i++) {
                      children[i].removeAttribute('bis_skin_checked');
                    }
                  }
                };
                const observer = new MutationObserver((mutations) => {
                  for (let i = 0; i < mutations.length; i++) {
                    const addedNodes = mutations[i].addedNodes;
                    for (let j = 0; j < addedNodes.length; j++) {
                      removeBisAttributes(addedNodes[j]);
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
                document.addEventListener('DOMContentLoaded', () => {
                  observer.disconnect();
                  const elements = document.querySelectorAll('[bis_skin_checked]');
                  for (let i = 0; i < elements.length; i++) {
                    elements[i].removeAttribute('bis_skin_checked');
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

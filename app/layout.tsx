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

const stripExtensionHydrationAttrs = `
(() => {
  const fixedAttributes = new Set([
    "bis_skin_checked",
    "bis_register",
    "data-atm-ext-installed"
  ]);

  const shouldStrip = (name) => fixedAttributes.has(name) || /^__processed_[\\w-]+__$/.test(name);

  const shouldRemoveNode = (node) => {
    if (!node || node.nodeType !== 1) return false;
    if (node.tagName !== "SCRIPT") return false;

    const src = node.getAttribute("src") || "";
    return (
      src.startsWith("chrome-extension://") ||
      src.startsWith("moz-extension://") ||
      node.hasAttribute("bis_use") ||
      node.hasAttribute("data-bis-config") ||
      node.hasAttribute("data-dynamic-id")
    );
  };

  const stripNode = (node) => {
    if (!node || node.nodeType !== 1) return;
    if (shouldRemoveNode(node)) {
      node.remove();
      return;
    }

    for (const attr of Array.from(node.attributes)) {
      if (shouldStrip(attr.name)) node.removeAttribute(attr.name);
    }
  };

  const stripTree = (root) => {
    stripNode(root);
    if (!document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      stripNode(node);
      node = walker.nextNode();
    }
  };

  const start = () => {
    stripTree(document.documentElement);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          stripNode(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          stripTree(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true
    });
    window.addEventListener("load", () => window.setTimeout(() => observer.disconnect(), 3000), {
      once: true
    });
  };

  if (document.readyState === "loading") {
    start();
  } else {
    start();
  }
})();
`;

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
          id="strip-extension-hydration-attrs"
          dangerouslySetInnerHTML={{ __html: stripExtensionHydrationAttrs }}
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

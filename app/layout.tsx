import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vantorflow.com.ng"),
  title: {
    default: "Vantorflow - Bid and Tender Response Platform",
    template: "%s | Vantorflow",
  },
  description:
    "Vantorflow turns RFQs and tender documents into structured, branded bid responses. Built for companies that bid for contracts.",
  keywords: [
    "bid response software",
    "tender response platform",
    "RFQ automation",
    "bid management",
    "tender software",
  ],
  openGraph: {
    type: "website",
    url: "https://vantorflow.com.ng",
    siteName: "Vantorflow",
    title: "Vantorflow - Bid and Tender Response Platform",
    description:
      "Turn RFQs and tender documents into structured, branded bid responses.",
    images: ["https://vantorflow.com.ng/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vantorflow - Bid and Tender Response Platform",
    description:
      "Turn RFQs and tender documents into structured, branded bid responses.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Root layout: wraps every page. Keep it simple.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-bone antialiased">{children}</body>
    </html>
  );
}

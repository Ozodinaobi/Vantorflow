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
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Vantorflow - Bid and Tender Response Platform",
    description:
      "Turn RFQs and tender documents into structured, branded bid responses.",
    images: ["/logo.png"],
  },
  icons: { icon: "/logo.png" },
};

// Root layout: wraps every page. Keep it simple.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}

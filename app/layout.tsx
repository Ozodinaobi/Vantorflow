import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Vantorflow",
  description: "Bid and tender operations platform",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: undefined,
  themeColor: "#050505",
};

// Root layout: Inter for UI and body, Newsreader for display headings. Dark Cyber Serif theme.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${newsreader.variable}`} style={{ colorScheme: "dark" }}>
      <body className="min-h-screen font-sans antialiased">
        <div aria-hidden="true" className="aurora" />
        {children}
      </body>
    </html>
  );
}

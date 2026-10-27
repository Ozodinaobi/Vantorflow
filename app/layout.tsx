import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Vantorflow",
  description: "Bid and tender operations platform",
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

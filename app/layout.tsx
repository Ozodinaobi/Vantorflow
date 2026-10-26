import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantorflow",
  description: "Bid and tender operations platform",
};

// Root layout: wraps every page. Keep it simple.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-ink" style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-ink font-sans text-bone antialiased">{children}</body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// Public sitemap for crawlers. Only marketing/auth pages; dashboard stays out.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vantorflow.com.ng";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}

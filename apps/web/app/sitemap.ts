import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://chetana.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const theories = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

  const marketingPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/indicators`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/try`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/vedanta`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const theoryPages: MetadataRoute.Sitemap = theories.map((theory) => ({
    url: `${BASE_URL}/theories/${theory}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const utilityPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/support`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  return [...marketingPages, ...theoryPages, ...utilityPages];
}

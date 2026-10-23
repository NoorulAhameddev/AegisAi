import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aegisai.dev";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/maintenance/", "/settings/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

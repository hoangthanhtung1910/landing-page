import type { MetadataRoute } from "next"
import { resolveMetadataBase } from "@/lib/metadata"
export default function robots(): MetadataRoute.Robots { const base=resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL); return {rules:{userAgent:"*",allow:"/",disallow:["/api/"]},sitemap:new URL("/sitemap.xml",base).toString()} }

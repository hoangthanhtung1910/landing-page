import type { MetadataRoute } from "next"
import { resolveMetadataBase } from "@/lib/metadata"
export default function sitemap(): MetadataRoute.Sitemap { const base=resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL); return [{url:base.toString(),lastModified:new Date(),changeFrequency:"weekly",priority:1}] }

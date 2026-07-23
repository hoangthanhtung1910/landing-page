import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isRevalidateAuthorized } from "@/lib/revalidate-auth"

/**
 * On-publish revalidation (T017). The CMS calls this with the shared
 * REVALIDATE_SECRET (via the `x-revalidate-secret` header ONLY — P2-01) after a
 * successful publish; it regenerates the landing page (FR-031/FR-048). The secret
 * is compared against env — never hardcoded, never read from the query string.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: "revalidate not configured" }, { status: 500 })
  }

  if (!isRevalidateAuthorized(req.headers, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Regenerate the landing page (single-page site). The content fetch is also
  // tagged (CONTENT_TAG) for future tag-scoped invalidation.
  revalidatePath("/", "page")
  return NextResponse.json({ revalidated: true, path: "/", now: Date.now() })
}

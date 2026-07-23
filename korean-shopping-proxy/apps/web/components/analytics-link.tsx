"use client"

import type { AnchorHTMLAttributes, ReactNode } from "react"
import { track } from "@vercel/analytics"

export function AnalyticsLink({ placement, channel, children, onClick, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { placement: string; channel: string; children: ReactNode }) {
  return <a {...props} href={href ?? "/"} onClick={(event) => {
    onClick?.(event)
    const consent = localStorage.getItem("vyvy_analytics_consent")
    if (consent === "granted" && navigator.doNotTrack !== "1" && !navigator.globalPrivacyControl) {
      track("contact_cta", { channel, placement })
    }
  }}>{children}</a>
}

declare global { interface Navigator { globalPrivacyControl?: boolean } }

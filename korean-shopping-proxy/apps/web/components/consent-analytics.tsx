"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"

export function ConsentAnalytics() {
  const [consent, setConsent] = useState<"unknown" | "granted" | "denied">("unknown")
  useEffect(() => {
    const saved = localStorage.getItem("vyvy_analytics_consent")
    setConsent(saved === "granted" ? "granted" : saved === "denied" ? "denied" : "unknown")
  }, [])
  function choose(value: "granted" | "denied") { localStorage.setItem("vyvy_analytics_consent", value); setConsent(value) }
  return <>{process.env.NODE_ENV === "production" && consent === "granted" ? <Analytics /> : null}{consent === "unknown" ? <aside aria-label="Lựa chọn quyền riêng tư" className="fixed bottom-16 left-4 right-4 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-background p-4 shadow-xl md:bottom-4"><p className="text-sm">Bạn có đồng ý cho phép đo lường ẩn danh lượt bấm Zalo/Kakao để chúng tôi cải thiện website không? Không gửi nội dung tin nhắn hay thông tin cá nhân.</p><div className="mt-3 flex gap-3"><button type="button" onClick={() => choose("granted")} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">Đồng ý</button><button type="button" onClick={() => choose("denied")} className="min-h-11 rounded-lg border border-border px-4 font-semibold">Từ chối</button></div></aside> : null}</>
}

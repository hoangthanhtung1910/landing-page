"use client"

import { useState } from "react"
import { Menu, X, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Danh mục", href: "#danh-muc" },
  { label: "Quy trình", href: "#quy-trinh" },
  { label: "Bảng phí", href: "#bang-phi" },
  { label: "Đánh giá", href: "#danh-gia" },
  { label: "Hỏi đáp", href: "#hoi-dap" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Seoul<span className="text-primary">Box</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="font-semibold">
            Đăng nhập
          </Button>
          <Button className="font-semibold">Đặt hàng ngay</Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Điều hướng di động">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button variant="outline" className="w-full font-semibold">
                Đăng nhập
              </Button>
              <Button className="w-full font-semibold">Đặt hàng ngay</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

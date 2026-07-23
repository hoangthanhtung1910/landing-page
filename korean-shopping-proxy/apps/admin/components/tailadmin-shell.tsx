"use client"

import {
  ArchiveRestore,
  Boxes,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Eye,
  FileClock,
  FileText,
  Image,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  PanelTop,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

type View = string

const ICONS: Record<string, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  brand: Palette,
  hero: PanelTop,
  services: Boxes,
  "trust-points": ShieldCheck,
  "process-steps": ClipboardList,
  categories: Tags,
  reviews: MessageCircle,
  faq: CircleHelp,
  cta: Sparkles,
  contact: MessageCircle,
  footer: FileText,
  seo: Search,
  visibility: Eye,
  media: Image,
  releases: ArchiveRestore,
  audit: FileClock,
  password: LockKeyhole,
}

const GROUPS = [
  { label: "TỔNG QUAN", items: ["overview", "visibility", "media", "releases", "audit"] },
  {
    label: "NỘI DUNG WEBSITE",
    items: ["brand", "hero", "services", "trust-points", "process-steps", "categories", "reviews", "faq"],
  },
  { label: "CẤU HÌNH", items: ["cta", "contact", "footer", "seo", "password"] },
] as const

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("vyvy-admin-theme")
    const initial = stored === "dark"
    document.documentElement.classList.toggle("dark", initial)
    setDark(initial)
    setReady(true)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem("vyvy-admin-theme", next ? "dark" : "light")
    document.documentElement.classList.toggle("dark", next)
  }

  return (
    <button
      type="button"
      className="header-icon-button"
      onClick={toggle}
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {ready && dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}

export function TailAdminShell({
  items,
  activeView,
  labels,
  username,
  onViewChange,
  onLogout,
  children,
}: {
  items: readonly View[]
  activeView: View
  labels: Record<string, string>
  username: string
  onViewChange: (view: View) => void
  onLogout: () => void
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const available = useMemo(() => new Set(items), [items])
  const currentLabel = labels[activeView] ?? activeView

  function select(view: string) {
    onViewChange(view)
    setMobileOpen(false)
  }

  return (
    <div className="admin-shell">
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        />
      ) : null}

      <aside
        className={[
          "tail-sidebar",
          expanded ? "tail-sidebar-expanded" : "tail-sidebar-collapsed",
          mobileOpen ? "tail-sidebar-mobile-open" : "",
        ].join(" ")}
      >
        <div className="tail-sidebar-logo">
          <button type="button" className="brand-lockup" onClick={() => select("overview")}>
            <span className="brand-mark">V</span>
            {expanded || mobileOpen ? (
              <span>
                <strong>VyVy Order Korea</strong>
                <small>Quản trị nội dung</small>
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="tail-nav custom-scrollbar" aria-label="Chức năng quản trị">
          {GROUPS.map((group) => {
            const groupItems = group.items.filter((item) => available.has(item))
            if (!groupItems.length) return null
            return (
              <section className="tail-nav-group" key={group.label}>
                {expanded || mobileOpen ? <p className="tail-nav-label">{group.label}</p> : <span className="nav-dots">•••</span>}
                <ul>
                  {groupItems.map((item) => {
                    const Icon = ICONS[item] ?? Settings2
                    const active = activeView === item
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          className={`tail-nav-item ${active ? "tail-nav-item-active" : ""}`}
                          onClick={() => select(item)}
                          title={!expanded ? labels[item] ?? item : undefined}
                        >
                          <Icon className="size-5 shrink-0" />
                          {expanded || mobileOpen ? <span>{labels[item] ?? item}</span> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{username.slice(0, 1).toUpperCase()}</div>
          {expanded || mobileOpen ? (
            <div className="sidebar-user-copy">
              <strong>{username}</strong>
              <span>Quản trị viên</span>
            </div>
          ) : null}
          {expanded || mobileOpen ? (
            <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Đăng xuất">
              <LogOut className="size-5" />
            </button>
          ) : null}
        </div>
      </aside>

      <div className={`tail-main ${expanded ? "tail-main-expanded" : "tail-main-collapsed"}`}>
        <header className="tail-header">
          <div className="header-leading">
            <button
              type="button"
              className="header-icon-button desktop-sidebar-toggle"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Thu gọn menu" : "Mở rộng menu"}
            >
              {expanded ? <ChevronLeft className="size-5" /> : <Menu className="size-5" />}
            </button>
            <button
              type="button"
              className="header-icon-button mobile-sidebar-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="header-eyebrow">VYVY CMS</p>
              <h1>{currentLabel}</h1>
            </div>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <div className="header-user">
              <span className="user-avatar">{username.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{username}</strong>
                <small>Administrator</small>
              </span>
            </div>
            <button type="button" className="header-icon-button" onClick={onLogout} aria-label="Đăng xuất">
              <LogOut className="size-5" />
            </button>
          </div>
        </header>

        <main className="workspace">{children}</main>
      </div>
    </div>
  )
}

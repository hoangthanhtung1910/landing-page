"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api, ApiError, restoreSession, setCsrf } from "@/lib/api"
import { TailAdminShell } from "@/components/tailadmin-shell"

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type RecordValue = Record<string, Json>
type View = "overview" | "visibility" | "media" | "releases" | "audit" | "password" | string

const singletonSections = ["brand", "hero", "cta", "footer", "seo"]
const listSections = ["services", "trust-points", "process-steps", "categories", "reviews", "faq", "contact"]
const labels: Record<string, string> = {
  overview: "Tổng quan & xuất bản", visibility: "Ẩn/hiện section", media: "Thư viện ảnh",
  releases: "Lịch sử & rollback", audit: "Nhật ký thay đổi", password: "Đổi mật khẩu",
  brand: "Thương hiệu", hero: "Hero", cta: "Khối liên hệ", footer: "Chân trang", seo: "SEO",
  services: "Dịch vụ", "trust-points": "Vì sao chọn chúng tôi", "process-steps": "Quy trình đặt hàng",
  categories: "Danh mục", reviews: "Đánh giá", faq: "FAQ", contact: "Kênh liên hệ",
  name: "Tên", slogan: "Khẩu hiệu", tagline: "Mô tả ngắn", headline: "Tiêu đề", subheadline: "Mô tả",
  title: "Tiêu đề", description: "Mô tả", text: "Nội dung", question: "Câu hỏi", answer: "Câu trả lời",
  icon: "Tên biểu tượng", rating: "Số sao", location: "Địa điểm", blurb: "Dòng mô tả", approved: "Đã duyệt",
  consentGiven: "Đã có sự đồng ý", label: "Nhãn", handle: "Địa chỉ/số điện thoại", external: "Mở cửa sổ mới",
  contactSummary: "Thông tin liên hệ", copyright: "Bản quyền", canonical: "URL chính thức", alt: "Mô tả ảnh",
  src: "URL ảnh", width: "Chiều rộng", height: "Chiều cao", primaryCta: "Nút chính", secondaryCta: "Nút phụ",
  channels: "Các nút liên hệ", links: "Liên kết", socials: "Mạng xã hội", image: "Ảnh",
  ogImage: "Ảnh chia sẻ", type: "Loại kênh", channel: "Kênh", target: "Đích", subtext: "Nội dung phụ",
  order: "Thứ tự",
}

const contactFieldOrder = ["type", "label", "handle", "icon", "external", "order"] as const

const templates: Record<string, RecordValue> = {
  services: { title: "", description: "", icon: "sparkles" },
  "trust-points": { title: "", description: "", icon: "shield-check" },
  "process-steps": { title: "", description: "", icon: "circle" },
  categories: { name: "", image: { src: "/images/placeholder.jpg", alt: "" }, blurb: "" },
  reviews: { name: "", text: "", rating: 5, location: "", approved: false, consentGiven: false },
  faq: { question: "", answer: "" },
  contact: { type: "phone", label: "", handle: "", icon: "phone", external: false },
}

const listTableColumns: Record<string, readonly string[]> = {
  services: ["title", "description", "icon"],
  "trust-points": ["title", "description", "icon"],
  "process-steps": ["title", "description", "icon"],
  categories: ["name", "blurb"],
  reviews: ["name", "rating", "location", "approved"],
  faq: ["question", "answer"],
  contact: ["type", "label", "handle", "external"],
}

const channelTypeLabels: Record<string, string> = {
  zalo: "Zalo",
  kakao: "Kakao",
  messenger: "Messenger",
  phone: "Điện thoại",
  email: "Email",
  social: "Mạng xã hội",
}

const adminKeys = new Set(["id", "_id", "version", "publishState", "seedKey", "createdAt", "updatedAt", "__v"])
function editable(value: Json): Json {
  if (Array.isArray(value)) return value.map(editable)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !adminKeys.has(key)).map(([key, child]) => [key, editable(child)]))
  return value
}
function blankLike(value: Json): Json {
  if (Array.isArray(value)) return []
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, blankLike(child)]))
  if (typeof value === "boolean") return false
  if (typeof value === "number") return 0
  return ""
}

function displayListValue(key: string, value: Json): string {
  if (key === "type" && typeof value === "string") return channelTypeLabels[value] ?? value
  if (typeof value === "boolean") return value ? "Có" : "Không"
  if (value === null || value === "") return "—"
  if (Array.isArray(value)) return `${value.length} mục`
  if (typeof value === "object") return "Đã cấu hình"
  return String(value)
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    if (error.status === 409) return "Nội dung đã được thay đổi ở nơi khác. Hãy tải lại trước khi lưu."
    if (error.status === 422) return `${error.message}${error.details ? ` — ${JSON.stringify(error.details)}` : ""}`
    return error.message
  }
  return "Đã có lỗi không xác định."
}

function StructuredFields({ value, onChange, prefix = "", fieldOrder }: { value: RecordValue; onChange: (next: RecordValue) => void; prefix?: string; fieldOrder?: readonly string[] }) {
  const rank = new Map(fieldOrder?.map((key, index) => [key, index]) ?? [])
  const entries = Object.entries(value).sort(([left], [right]) => (rank.get(left) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right) ?? Number.MAX_SAFE_INTEGER))
  return <div className="fields">{entries.map(([key, child]) => {
    const id = `${prefix}-${key}`
    const label = labels[key] ?? key
    const set = (next: Json) => onChange({ ...value, [key]: next })
    if (typeof child === "boolean") return <label className="switch" key={key} htmlFor={id}><span>{label}</span><input id={id} type="checkbox" checked={child} onChange={(event) => set(event.target.checked)} /></label>
    if (typeof child === "number") return <label key={key} htmlFor={id}>{label}<input id={id} type="number" value={child} min={key === "rating" ? 1 : undefined} max={key === "rating" ? 5 : undefined} onChange={(event) => set(Number(event.target.value))} /></label>
    if (typeof child === "string") {
      if (key === "type" || key === "channel") return <label key={key} htmlFor={id}>{label}<select id={id} value={child} onChange={(event) => set(event.target.value)}><option value="zalo">Zalo</option><option value="kakao">Kakao</option><option value="messenger">Messenger</option><option value="phone">Điện thoại</option><option value="email">Email</option><option value="social">Mạng xã hội</option>{key === "channel" && <option value="anchor">Liên kết trong trang</option>}</select></label>
      const long = ["description", "text", "answer", "subheadline", "contactSummary", "subtext"].includes(key)
      return <label key={key} htmlFor={id}>{label}{long ? <textarea id={id} value={child} onChange={(event) => set(event.target.value)} /> : <input id={id} value={child} onChange={(event) => set(event.target.value)} />}</label>
    }
    if (Array.isArray(child)) return <fieldset className="nested" key={key}><legend>{label}</legend>{child.map((item, index) => <div className="array-item" key={index}>{item && typeof item === "object" && !Array.isArray(item) ? <StructuredFields value={item as RecordValue} prefix={`${id}-${index}`} onChange={(next) => set(child.map((entry, i) => i === index ? next : entry))} /> : <input aria-label={`${label} ${index + 1}`} value={String(item ?? "")} onChange={(event) => set(child.map((entry, i) => i === index ? event.target.value : entry))} />}<button type="button" className="danger" onClick={() => set(child.filter((_, i) => i !== index))}>Xóa dòng</button></div>)}<button type="button" className="secondary" onClick={() => set([...child, child[0] ? blankLike(child[0]) : ""])}>Thêm dòng</button></fieldset>
    if (child && typeof child === "object") return <fieldset className="nested" key={key}><legend>{label}</legend><StructuredFields value={child as RecordValue} prefix={id} onChange={(next) => set(next)} /><button type="button" className="secondary" onClick={() => { const next = { ...value }; delete next[key]; onChange(next) }}>Bỏ trường tùy chọn</button></fieldset>
    return <button type="button" className="secondary" key={key} onClick={() => set("")}>Thêm {label}</button>
  })}</div>
}

function ItemEditorModal({
  mode,
  section,
  value,
  fieldOrder,
  busy,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit"
  section: string
  value: RecordValue
  fieldOrder?: readonly string[]
  busy: boolean
  error: string
  onChange: (next: RecordValue) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const modalRef = useRef<HTMLFormElement>(null)
  const titleId = `${mode}-${section}-title`
  const isCreate = mode === "create"

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    modalRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose()
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [busy, onClose])

  return (
    <div className="modal-backdrop">
      <form
        ref={modalRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">{isCreate ? "TẠO NỘI DUNG MỚI" : "CHỈNH SỬA NỘI DUNG"}</p>
            <h3 id={titleId}>{isCreate ? "Thêm" : "Chỉnh sửa"} {labels[section]}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={busy} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="modal-body custom-scrollbar">
          {error ? <div className="error" role="alert">{error}</div> : null}
          <StructuredFields value={value} prefix={`${mode}-${section}`} fieldOrder={fieldOrder} onChange={onChange} />
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" disabled={busy}>
            {busy ? (isCreate ? "Đang tạo…" : "Đang lưu…") : (isCreate ? "Tạo bản nháp" : "Lưu thay đổi")}
          </button>
        </div>
      </form>
    </div>
  )
}

function ListItemsTable({
  section,
  records,
  originals,
  busy,
  onEdit,
  onMove,
  onRemove,
}: {
  section: string
  records: RecordValue[]
  originals: RecordValue[]
  busy: boolean
  onEdit: (index: number) => void
  onMove: (index: number, delta: number) => void
  onRemove: (index: number) => void
}) {
  const columns = listTableColumns[section] ?? Object.keys(records[0] ?? {}).slice(0, 3)
  return (
    <div className="list-table-card">
      <div className="list-table-scroll custom-scrollbar">
        <table className="list-table">
          <caption className="sr-only">Danh sách {labels[section]}</caption>
          <thead>
            <tr>
              <th className="table-order-column">#</th>
              {columns.map((key) => <th key={key}>{labels[key] ?? key}</th>)}
              <th>Trạng thái</th>
              <th className="table-actions-column">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const original = originals[index]
              const publishState = String(original?.publishState ?? "draft")
              return (
                <tr key={String(original?.id ?? index)}>
                  <td className="table-order-cell">{index + 1}</td>
                  {columns.map((key) => (
                    <td key={key}>
                      <span className="table-cell-text" title={displayListValue(key, record[key])}>
                        {displayListValue(key, record[key])}
                      </span>
                    </td>
                  ))}
                  <td>
                    <span className={`badge ${publishState === "published" ? "badge-published" : "badge-draft"}`}>
                      {publishState === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => onEdit(index)} disabled={busy}>Chỉnh sửa</button>
                      <button type="button" className="secondary table-icon-action" onClick={() => onMove(index, -1)} disabled={busy || index === 0} aria-label={`Đưa mục ${index + 1} lên`}>↑</button>
                      <button type="button" className="secondary table-icon-action" onClick={() => onMove(index, 1)} disabled={busy || index === records.length - 1} aria-label={`Đưa mục ${index + 1} xuống`}>↓</button>
                      <button type="button" className="danger" onClick={() => onRemove(index)} disabled={busy}>Xóa</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (username: string) => void }) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("")
    const form = new FormData(event.currentTarget)
    try {
      const result = await api<{ username: string; csrfToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) })
      setCsrf(result.csrfToken); onLogin(result.username)
    } catch (err) { setError(describeError(err)) } finally { setBusy(false) }
  }
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><div><span className="badge">CMS nội bộ</span><h1>VyVy Order Korea</h1><p className="muted">Đăng nhập để cập nhật nội dung website.</p></div>{error && <div className="error" role="alert">{error}</div>}<label>Tên đăng nhập<input name="username" autoComplete="username" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button></form></main>
}

function ContentEditor({ section }: { section: string }) {
  const isList = listSections.includes(section)
  const [data, setData] = useState<RecordValue | RecordValue[] | null>(null)
  const [drafts, setDrafts] = useState<RecordValue[]>([])
  const [creating, setCreating] = useState<RecordValue | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<RecordValue | null>(null)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async (clearStatus = true) => {
    setBusy(true); setError(""); if (clearStatus) setStatus("")
    try {
      const result = await api<RecordValue | RecordValue[]>(`/content/${section}`)
      setData(result)
      setDrafts((Array.isArray(result) ? result : [result]).map((item) => editable(item) as RecordValue))
      setDirty(false)
      return true
    } catch (err) {
      setError(describeError(err))
      return false
    } finally { setBusy(false) }
  }, [section])
  useEffect(() => { void load() }, [load])
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }; addEventListener("beforeunload", handler); return () => removeEventListener("beforeunload", handler) }, [dirty])

  async function save(index: number, nextDraft = drafts[index]) {
    if (!data) return
    setBusy(true); setError(""); setStatus("")
    const original = (Array.isArray(data) ? data[index] : data) as RecordValue
    try {
      await api(`/content/${section}${isList ? `/${original.id}` : ""}`, { method: "PUT", body: JSON.stringify({ ...nextDraft, version: original.version }) })
      setEditing(null)
      setEditingIndex(null)
      await load(false); setStatus("Đã lưu bản nháp. Website công khai chưa thay đổi cho tới khi bạn Xuất bản.")
    } catch (err) { setError(describeError(err)) } finally { setBusy(false) }
  }
  async function create() {
    if (!creating) return
    setBusy(true); setError("")
    try { await api(`/content/${section}`, { method: "POST", body: JSON.stringify(creating) }); setCreating(null); await load(false); setStatus("Đã tạo bản nháp mới.") } catch (err) { setError(describeError(err)) } finally { setBusy(false) }
  }
  async function reload() {
    setReloading(true)
    const loaded = await load(false)
    if (loaded) setStatus("Đã tải lại dữ liệu mới nhất.")
    setReloading(false)
  }
  function openCreate() {
    setError("")
    setStatus("")
    setCreating(structuredClone(templates[section]))
  }
  const closeCreate = useCallback(() => {
    setCreating(null)
    setError("")
  }, [])
  function openEdit(index: number) {
    setError("")
    setStatus("")
    setEditingIndex(index)
    setEditing(structuredClone(drafts[index]))
  }
  const closeEdit = useCallback(() => {
    setEditing(null)
    setEditingIndex(null)
    setError("")
    setDirty(false)
  }, [])
  async function remove(index: number) {
    if (!data || !confirm("Xóa mục này khỏi bản nháp?")) return
    const original = (data as RecordValue[])[index]
    try { await api(`/content/${section}/${original.id}?version=${original.version}`, { method: "DELETE" }); await load() } catch (err) { setError(describeError(err)) }
  }
  async function move(index: number, delta: number) {
    if (!Array.isArray(data)) return
    try {
      const order = await api<{ orderedIds: string[]; version: number }>(`/content/${section}/order`)
      const ids = [...order.orderedIds]; const target = index + delta
      if (target < 0 || target >= ids.length) return
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      await api(`/content/${section}/reorder`, { method: "POST", body: JSON.stringify({ orderedIds: ids, orderVersion: order.version }) }); await load()
    } catch (err) { setError(describeError(err)) }
  }

  const fieldOrder = section === "contact" ? contactFieldOrder : undefined
  const originals = Array.isArray(data) ? data : []
  return (
    <section>
      <div className="toolbar">
        <div>
          <h2>{labels[section]}</h2>
          <p className="muted">Chỉnh sửa ở đây tạo bản nháp; dùng “Xuất bản” khi đã sẵn sàng.</p>
        </div>
        <div className="actions">
          <button className="secondary" disabled={busy || reloading} onClick={() => void reload()}>
            {reloading ? "Đang tải…" : "Tải lại"}
          </button>
          {isList && <button onClick={openCreate}>Thêm mục</button>}
        </div>
      </div>

      {error && !creating && !editing ? <div className="error" role="alert">{error}</div> : null}
      {status ? <div className="status" role="status">{status}</div> : null}
      {busy && !data ? (
        <p>Đang tải…</p>
      ) : drafts.length === 0 ? (
        <div className="card empty">Section này chưa có nội dung.</div>
      ) : isList ? (
        <ListItemsTable
          section={section}
          records={drafts}
          originals={originals}
          busy={busy}
          onEdit={openEdit}
          onMove={(index, delta) => void move(index, delta)}
          onRemove={(index) => void remove(index)}
        />
      ) : (
        <article className="card">
          <div className="item-head">
            <h3>{labels[section]}</h3>
            <span className="badge">{String((data as RecordValue)?.publishState ?? "draft")}</span>
          </div>
          <StructuredFields
            value={drafts[0]}
            prefix={section}
            onChange={(next) => {
              setDrafts([next])
              setDirty(true)
            }}
          />
          <div className="actions" style={{ marginTop: "1rem" }}>
            <button disabled={busy} onClick={() => void save(0)}>Lưu bản nháp</button>
          </div>
        </article>
      )}

      {creating ? (
        <ItemEditorModal
          mode="create"
          section={section}
          value={creating}
          fieldOrder={fieldOrder}
          busy={busy}
          error={error}
          onChange={setCreating}
          onClose={closeCreate}
          onSubmit={() => void create()}
        />
      ) : null}
      {editing && editingIndex !== null ? (
        <ItemEditorModal
          mode="edit"
          section={section}
          value={editing}
          fieldOrder={fieldOrder}
          busy={busy}
          error={error}
          onChange={(next) => {
            setEditing(next)
            setDirty(true)
          }}
          onClose={closeEdit}
          onSubmit={() => void save(editingIndex, editing)}
        />
      ) : null}
    </section>
  )
}

function VisibilityPanel() {
  const [data, setData] = useState<{ visibility: Record<string, boolean>; version: number } | null>(null)
  const [error, setError] = useState(""); const [status,setStatus] = useState("")
  const load = useCallback(() => api<{visibility:Record<string,boolean>;version:number}>("/sections/visibility").then(setData).catch((e)=>setError(describeError(e))),[])
  useEffect(()=>{void load()},[load])
  async function save(){if(!data)return;try{const next=await api<typeof data>("/sections/visibility",{method:"PUT",body:JSON.stringify({version:data.version,...data.visibility})});setData(next);setStatus("Đã lưu cấu hình bản nháp. Hãy xuất bản để áp dụng.")}catch(e){setError(describeError(e))}}
  return <section><div className="toolbar"><div><h2>Ẩn/hiện section</h2><p className="muted">Hero, khối liên hệ và chân trang luôn bật.</p></div></div>{error&&<div className="error" role="alert">{error}</div>}{status&&<div className="status">{status}</div>}{data&&<div className="card fields">{Object.entries(data.visibility).map(([key,value])=><label className="switch" key={key}>{labels[key]??key}<input type="checkbox" checked={value} onChange={(e)=>setData({...data,visibility:{...data.visibility,[key]:e.target.checked}})}/></label>)}<button onClick={()=>void save()}>Lưu cấu hình</button></div>}</section>
}

function MediaPanel() {
  const [items,setItems]=useState<RecordValue[]>([]); const [error,setError]=useState(""); const [status,setStatus]=useState("")
  const load=useCallback(()=>api<{items:RecordValue[]}>("/media").then((r)=>setItems(r.items)).catch((e)=>setError(describeError(e))),[])
  useEffect(()=>{void load()},[load])
  async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const form=new FormData(e.currentTarget);try{await api("/media",{method:"POST",body:form});e.currentTarget.reset();setStatus("Tải ảnh thành công.");await load()}catch(err){setError(describeError(err))}}
  async function remove(id:Json){if(!confirm("Xóa ảnh này? Ảnh đang được trang live dùng sẽ được bảo vệ."))return;try{await api(`/media/${id}`,{method:"DELETE"});await load()}catch(e){setError(describeError(e))}}
  async function updateAlt(item:RecordValue){const next=prompt("Mô tả ảnh mới",String(item.alt??""))?.trim();if(!next)return;try{await api(`/media/${item.id}`,{method:"PUT",body:JSON.stringify({alt:next})});await load();setStatus("Đã cập nhật mô tả ảnh.")}catch(e){setError(describeError(e))}}
  async function copyUrl(item:RecordValue){try{await navigator.clipboard.writeText(String(item.url));setStatus("Đã sao chép URL. Bạn có thể dán vào trường URL ảnh của nội dung.")}catch{setError("Không thể sao chép tự động. Hãy chọn URL hiển thị và sao chép thủ công.")}}
  return <section><div className="toolbar"><div><h2>Thư viện ảnh</h2><p className="muted">PNG, JPEG hoặc WebP; mô tả ảnh là bắt buộc.</p></div></div>{error&&<div className="error" role="alert">{error}</div>}{status&&<div className="status">{status}</div>}<form className="card grid" onSubmit={upload}><label>Chọn ảnh<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/></label><label>Mô tả ảnh<input name="alt" required/></label><button>Tải ảnh lên</button></form>{items.length===0?<div className="card empty">Chưa có ảnh tải lên.</div>:<div className="media-grid">{items.map((item)=><article className="card" key={String(item.id)}><img src={String(item.url)} alt={String(item.alt)}/><p>{String(item.alt)}</p><code>{String(item.url)}</code><div className="actions"><button className="secondary" onClick={()=>void copyUrl(item)}>Sao chép URL</button><button className="secondary" onClick={()=>void updateAlt(item)}>Sửa mô tả</button><button className="danger" onClick={()=>void remove(item.id)}>Xóa</button></div></article>)}</div>}</section>
}

function Overview() {
  const [current,setCurrent]=useState<RecordValue|null>(null); const [error,setError]=useState(""); const [status,setStatus]=useState(""); const [busy,setBusy]=useState(false)
  const load=useCallback(()=>api<RecordValue>("/releases/current").then(setCurrent).catch((e)=>setError(describeError(e))),[])
  useEffect(()=>{void load()},[load])
  async function action(path:string){
    if(path==="/rollback"&&!confirm("Rollback về release trước? Nội dung live sẽ thay đổi ngay và website sẽ được làm mới."))return
    setBusy(true);setError("")
    try{const result=await api<RecordValue>(path,{method:"POST",body:"{}"});await load();setStatus(path==="/publish"?`Đã xuất bản release #${result.releaseNumber}.`:path==="/rollback"?`Đã rollback về release #${result.releaseNumber}.`:`Đã làm mới website cho release #${result.releaseNumber}.`)}
    catch(e){setError(describeError(e))}
    finally{setBusy(false)}
  }
  const revalidation=current?.revalidation as RecordValue|undefined
  const revalidationStatus=String(revalidation?.status??"")
  const revalidationLabel=revalidationStatus==="succeeded"?"Đã làm mới":revalidationStatus==="failed"?"Chưa làm mới được":revalidationStatus==="skipped"?"Chưa cấu hình":"Chưa ghi nhận"
  return <section><div className="toolbar"><div><h2>Xuất bản website</h2><p className="muted">Mọi thay đổi đã lưu vẫn là bản nháp cho tới bước này.</p></div><div className="actions"><button disabled={busy} onClick={()=>void action("/publish")}>Xuất bản tất cả</button><button className="secondary" disabled={busy} onClick={()=>void action("/rollback")}>Rollback</button></div></div>{error&&<div className="error" role="alert">{error}</div>}{status&&<div className="status" role="status">{status}</div>}<div className="grid"><div className="card"><h3>Release đang chạy</h3><p className="badge">#{String(current?.releaseNumber??"—")}</p><p>{current?.publishedAt?new Date(String(current.publishedAt)).toLocaleString("vi-VN"):"Chưa có dữ liệu"}</p></div><div className="card"><h3>Làm mới website</h3><p>{revalidationLabel}</p>{revalidationStatus==="failed"&&<><p className="muted">Release đã xuất bản thành công, nhưng landing page chưa tải dữ liệu mới{revalidation?.error?` (${String(revalidation.error)})`:""}.</p><button disabled={busy} onClick={()=>void action("/revalidate")}>Thử làm mới lại</button></>}{revalidationStatus!=="failed"&&<p className="muted">Landing page được làm mới sau khi xuất bản hoặc rollback.</p>}</div></div></section>
}

function TablePanel({kind}:{kind:"releases"|"audit"}) {
  const [items,setItems]=useState<RecordValue[]>([]); const [error,setError]=useState("")
  useEffect(()=>{void api<{items:RecordValue[]}>(kind==="releases"?"/releases":"/audit").then((r)=>setItems(r.items)).catch((e)=>setError(describeError(e)))},[kind])
  return <section><h2>{labels[kind]}</h2>{error&&<div className="error" role="alert">{error}</div>}<div className="card">{items.length===0?<div className="empty">Chưa có dữ liệu.</div>:<table><thead><tr>{Object.keys(items[0]).filter((key)=>!["id","before","after"].includes(key)).map((key)=><th key={key}>{labels[key]??key}</th>)}</tr></thead><tbody>{items.map((item,index)=><tr key={String(item.id??index)}>{Object.entries(item).filter(([key])=>!["id","before","after"].includes(key)).map(([key,value])=><td key={key}>{typeof value==="object"?JSON.stringify(value):String(value??"")}</td>)}</tr>)}</tbody></table>}</div></section>
}

function PasswordPanel(){const[error,setError]=useState("");const[status,setStatus]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);if(form.get("newPassword")!==form.get("confirm")){setError("Mật khẩu xác nhận không khớp.");return}try{await api("/auth/password",{method:"POST",body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")})});e.currentTarget.reset();setStatus("Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị thu hồi.")}catch(err){setError(describeError(err))}}return <section><h2>Đổi mật khẩu</h2>{error&&<div className="error" role="alert">{error}</div>}{status&&<div className="status">{status}</div>}<form className="card fields" onSubmit={submit}><label>Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>Mật khẩu mới (ít nhất 12 ký tự)<input name="newPassword" type="password" minLength={12} autoComplete="new-password" required/></label><label>Xác nhận mật khẩu mới<input name="confirm" type="password" minLength={12} autoComplete="new-password" required/></label><button>Đổi mật khẩu</button></form></section>}

export function AdminDashboard() {
  const [session,setSession]=useState<{username:string}|null|undefined>(undefined); const [view,setView]=useState<View>("overview")
  useEffect(()=>{void restoreSession().then(setSession).catch(()=>setSession(null))},[])
  const nav=useMemo(()=>["overview",...singletonSections,...listSections,"visibility","media","releases","audit","password"],[])
  async function logout(){try{await api("/auth/logout",{method:"POST",body:"{}"})}finally{setSession(null)}}
  if(session===undefined)return <main className="login-shell"><p>Đang kiểm tra phiên đăng nhập…</p></main>
  if(!session)return <Login onLogin={(username)=>setSession({username})}/>
  return <TailAdminShell items={nav} activeView={view} labels={labels} username={session.username} onViewChange={setView} onLogout={()=>void logout()}>{view==="overview"?<Overview/>:view==="visibility"?<VisibilityPanel/>:view==="media"?<MediaPanel/>:view==="releases"||view==="audit"?<TablePanel kind={view}/>:view==="password"?<PasswordPanel/>:<ContentEditor section={view}/>}</TailAdminShell>
}

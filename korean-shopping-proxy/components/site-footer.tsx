import { Package, MessageCircle, Send, Mail, Phone } from "lucide-react"

const columns = [
  {
    title: "Dịch vụ",
    links: ["Mua hộ Hàn Quốc", "Vận chuyển quốc tế", "Gom đơn", "Nhập hàng kinh doanh"],
  },
  {
    title: "Danh mục",
    links: ["Mỹ phẩm K-beauty", "Thời trang", "Đồ ăn vặt", "Đồ điện tử"],
  },
  {
    title: "Hỗ trợ",
    links: ["Quy trình đặt hàng", "Bảng phí & tỷ giá", "Câu hỏi thường gặp", "Chính sách đổi trả"],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Package className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                Seoul<span className="text-primary">Box</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Dịch vụ mua hộ và vận chuyển hàng Hàn Quốc về Việt Nam. Chính hãng, minh bạch, giao tận nhà.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="tel:19001234" className="flex items-center gap-2 hover:text-foreground">
                <Phone className="size-4" /> 1900 1234
              </a>
              <a href="mailto:hotro@seoulbox.vn" className="flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" /> hotro@seoulbox.vn
              </a>
            </div>
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href="#"
                aria-label="Zalo"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <Send className="size-4" />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} SeoulBox. Bảo lưu mọi quyền.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">
              Điều khoản
            </a>
            <a href="#" className="hover:text-foreground">
              Bảo mật
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

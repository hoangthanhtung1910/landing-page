import { BadgeCheck, Wallet, MessagesSquare, ShieldCheck, RefreshCcw, Boxes } from "lucide-react"

const features = [
  {
    icon: BadgeCheck,
    title: "Cam kết chính hãng",
    desc: "Mua trực tiếp tại cửa hàng và sàn uy tín Hàn Quốc, hoàn tiền 100% nếu phát hiện hàng giả.",
  },
  {
    icon: Wallet,
    title: "Phí minh bạch",
    desc: "Báo giá đầy đủ giá gốc, phí dịch vụ, phí ship và tỷ giá trước khi bạn thanh toán.",
  },
  {
    icon: MessagesSquare,
    title: "Hỗ trợ tiếng Việt 24/7",
    desc: "Đội ngũ CSKH người Việt tư vấn, cập nhật đơn hàng qua Zalo, Facebook mọi lúc.",
  },
  {
    icon: ShieldCheck,
    title: "Đóng gói an toàn",
    desc: "Bọc chống sốc, niêm phong cẩn thận, bảo hiểm cho các món hàng giá trị cao.",
  },
  {
    icon: RefreshCcw,
    title: "Đổi trả linh hoạt",
    desc: "Hỗ trợ đổi trả với cửa hàng Hàn khi hàng lỗi hoặc không đúng mô tả.",
  },
  {
    icon: Boxes,
    title: "Gom đơn tiết kiệm",
    desc: "Gộp nhiều đơn thành một kiện để tối ưu chi phí vận chuyển quốc tế cho bạn.",
  },
]

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Vì sao chọn SeoulBox</p>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Yên tâm mua sắm, chúng tôi lo mọi khâu
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

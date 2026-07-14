import { Link2, Receipt, ShoppingBag, PackageCheck } from "lucide-react"

const steps = [
  {
    icon: Link2,
    title: "Gửi link hoặc yêu cầu",
    desc: "Dán link sản phẩm Hàn Quốc hoặc mô tả món hàng bạn muốn mua.",
  },
  {
    icon: Receipt,
    title: "Nhận báo giá minh bạch",
    desc: "Xem chi tiết giá gốc, phí mua hộ, phí vận chuyển và tỷ giá trước khi chốt.",
  },
  {
    icon: ShoppingBag,
    title: "Chúng tôi mua & gom hàng",
    desc: "Đội ngũ tại Seoul đặt mua, kiểm tra và gom đơn về kho.",
  },
  {
    icon: PackageCheck,
    title: "Giao tận nhà tại VN",
    desc: "Hàng được vận chuyển và giao đến tận tay bạn trong 7–10 ngày.",
  },
]

export function HowItWorks() {
  return (
    <section id="quy-trinh" className="scroll-mt-20 bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Quy trình 4 bước</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Đặt mua hộ đơn giản chưa từng có
          </h2>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex flex-col rounded-2xl border border-border bg-background p-6">
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-muted/70">{i + 1}</span>
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <step.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

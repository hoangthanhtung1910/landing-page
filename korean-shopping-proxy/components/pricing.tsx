import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Tiêu chuẩn",
    price: "5%",
    unit: "phí dịch vụ / đơn",
    desc: "Phù hợp cho đơn mua lẻ, số lượng ít.",
    features: ["Mua hộ mọi sản phẩm", "Vận chuyển 7–10 ngày", "Hỗ trợ qua Zalo", "Cập nhật trạng thái đơn"],
    cta: "Bắt đầu",
    highlight: false,
  },
  {
    name: "Thân thiết",
    price: "3%",
    unit: "phí dịch vụ / đơn",
    desc: "Dành cho khách mua thường xuyên & sỉ nhỏ.",
    features: [
      "Ưu đãi tỷ giá tốt hơn",
      "Miễn phí gom đơn",
      "Ưu tiên xử lý & vận chuyển",
      "Quản lý riêng 1-1",
      "Bảo hiểm hàng giá trị cao",
    ],
    cta: "Trở thành thành viên",
    highlight: true,
  },
  {
    name: "Doanh nghiệp",
    price: "Liên hệ",
    unit: "báo giá riêng",
    desc: "Nhập hàng số lượng lớn, kinh doanh online.",
    features: ["Chiết khấu theo sản lượng", "Hợp đồng & hoá đơn VAT", "Kho gom hàng riêng", "Đội ngũ hỗ trợ chuyên biệt"],
    cta: "Nhận tư vấn",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="bang-phi" className="scroll-mt-20 bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Bảng phí dịch vụ</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Chi phí rõ ràng, không phụ phí ẩn
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Phí vận chuyển tính theo cân nặng thực tế. Bạn luôn thấy tổng chi phí trước khi thanh toán.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                plan.highlight
                  ? "border-primary bg-background shadow-xl ring-1 ring-primary"
                  : "border-border bg-background"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Phổ biến nhất
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="pb-1 text-sm text-muted-foreground">{plan.unit}</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7 h-11 w-full font-semibold"
                variant={plan.highlight ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

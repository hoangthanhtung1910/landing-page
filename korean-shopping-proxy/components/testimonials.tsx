import { Star } from "lucide-react"

const reviews = [
  {
    name: "Nguyễn Thu Hà",
    city: "Hà Nội",
    initials: "TH",
    text: "Đặt mỹ phẩm Olive Young qua SeoulBox, hàng chính hãng y như mua tại Hàn. Phí rõ ràng, giao đúng hẹn 8 ngày.",
  },
  {
    name: "Trần Minh Quân",
    city: "TP. Hồ Chí Minh",
    initials: "MQ",
    text: "Mình order áo khoác Musinsa, được tư vấn size nhiệt tình bằng tiếng Việt. Đóng gói chắc chắn, rất yên tâm.",
  },
  {
    name: "Lê Phương Anh",
    city: "Đà Nẵng",
    initials: "PA",
    text: "Gom nhiều đơn ăn vặt cho cả nhóm, tiết kiệm được kha khá phí ship. Sẽ tiếp tục ủng hộ dài dài!",
  },
  {
    name: "Phạm Hoàng Long",
    city: "Hải Phòng",
    initials: "HL",
    text: "Nhập hàng kinh doanh online, chiết khấu tốt và có hoá đơn đầy đủ. Đối tác cực kỳ chuyên nghiệp.",
  },
  {
    name: "Vũ Ngọc Mai",
    city: "Cần Thơ",
    initials: "NM",
    text: "Lần đầu mua hộ hơi lo, nhưng CSKH hỗ trợ từng bước. Tỷ giá tốt hơn mình tự tính, quá ưng.",
  },
  {
    name: "Đỗ Gia Bảo",
    city: "Biên Hòa",
    initials: "GB",
    text: "Theo dõi đơn hàng từng chặng rất tiện. Tai nghe mình đặt về nhanh và nguyên seal.",
  },
]

export function Testimonials() {
  return (
    <section id="danh-gia" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Khách hàng nói gì</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hơn 50.000 khách hàng tin tưởng
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.name} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex gap-0.5" aria-label="5 trên 5 sao">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">{r.text}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {r.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.city}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

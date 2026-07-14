"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "SeoulBox hoạt động như thế nào?",
    a: "Bạn gửi link sản phẩm hoặc mô tả món hàng cần mua. Chúng tôi báo giá trọn gói (giá gốc, phí dịch vụ, phí vận chuyển), sau khi bạn xác nhận và thanh toán, đội ngũ tại Hàn Quốc sẽ mua và vận chuyển hàng về Việt Nam cho bạn.",
  },
  {
    q: "Phí dịch vụ và phí vận chuyển được tính ra sao?",
    a: "Phí dịch vụ từ 3–5% giá trị đơn hàng tuỳ hạng thành viên. Phí vận chuyển quốc tế tính theo cân nặng thực tế hoặc cân nặng quy đổi. Toàn bộ chi phí được hiển thị rõ ràng trước khi bạn thanh toán.",
  },
  {
    q: "Thời gian nhận hàng mất bao lâu?",
    a: "Thông thường hàng về đến tay bạn trong khoảng 7–10 ngày kể từ khi mua thành công, tuỳ khu vực và loại hàng. Đơn ưu tiên có thể nhanh hơn.",
  },
  {
    q: "Làm sao để đảm bảo hàng chính hãng?",
    a: "Chúng tôi chỉ mua tại các cửa hàng và sàn thương mại điện tử uy tín ở Hàn Quốc như Olive Young, Musinsa, Coupang… Nếu phát hiện hàng giả, SeoulBox hoàn tiền 100%.",
  },
  {
    q: "Tôi thanh toán bằng cách nào?",
    a: "Bạn có thể thanh toán qua chuyển khoản ngân hàng nội địa, ví điện tử (Momo, ZaloPay) hoặc thẻ. Mọi giao dịch đều có hoá đơn và xác nhận rõ ràng.",
  },
  {
    q: "Nếu hàng bị lỗi hoặc giao sai thì sao?",
    a: "Chúng tôi hỗ trợ đổi trả hoặc làm việc với cửa hàng Hàn Quốc để xử lý khi hàng lỗi, sai mô tả. Hàng giá trị cao được mua kèm bảo hiểm vận chuyển.",
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="hoi-dap" className="scroll-mt-20 bg-card">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Hỏi đáp</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Câu hỏi thường gặp
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div key={faq.q} className="overflow-hidden rounded-2xl border border-border bg-background">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold">{faq.q}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

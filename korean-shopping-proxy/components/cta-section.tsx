import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 lg:py-20">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Sẵn sàng săn hàng Hàn Quốc cùng SeoulBox?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/85">
          Gửi link sản phẩm đầu tiên và nhận báo giá miễn phí trong vài phút. Không phí đăng ký, không ràng buộc.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            className="h-12 gap-2 px-6 text-base font-semibold"
          >
            Đặt mua hộ ngay
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-primary-foreground/30 bg-transparent px-6 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            Chat với tư vấn viên
          </Button>
        </div>
      </div>
    </section>
  )
}

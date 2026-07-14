import Image from "next/image"
import { ArrowRight, ShieldCheck, Truck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-accent-foreground">
            <span className="flex size-2 rounded-full bg-primary" />
            Mua hộ Hàn Quốc · Giao tận nhà tại Việt Nam
          </span>

          <h1 className="mt-6 text-pretty text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Săn hàng Hàn Quốc <span className="text-primary">chính hãng</span>, để chúng tôi lo phần còn lại
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            SeoulBox mua hộ thời trang, mỹ phẩm K-beauty, đồ ăn vặt và đồ điện tử trực tiếp từ các cửa hàng Hàn Quốc,
            đóng gói an toàn và vận chuyển nhanh về tận tay bạn. Minh bạch phí, tỷ giá tốt, không lo hàng giả.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 gap-2 px-6 text-base font-semibold">
              Đặt mua hộ ngay
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base font-semibold">
              Xem bảng phí
            </Button>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6">
            <div>
              <dt className="text-2xl font-extrabold">50K+</dt>
              <dd className="text-sm text-muted-foreground">Đơn đã giao</dd>
            </div>
            <div>
              <dt className="text-2xl font-extrabold">7–10</dt>
              <dd className="text-sm text-muted-foreground">Ngày về VN</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-2xl font-extrabold">
                4.9<Star className="size-4 fill-primary text-primary" />
              </dt>
              <dd className="text-sm text-muted-foreground">Đánh giá</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <Image
              src="/images/hero-shopping.png"
              alt="Khách hàng cầm túi mua sắm tại khu phố mua sắm ở Seoul, Hàn Quốc"
              width={720}
              height={820}
              priority
              className="h-full w-full object-cover"
            />
          </div>

          <div className="absolute -left-3 top-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg sm:-left-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">100% chính hãng</p>
              <p className="text-xs text-muted-foreground">Hoàn tiền nếu hàng giả</p>
            </div>
          </div>

          <div className="absolute -right-3 bottom-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg sm:-right-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Theo dõi tận nơi</p>
              <p className="text-xs text-muted-foreground">Cập nhật từng chặng</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

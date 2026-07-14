import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

const categories = [
  {
    title: "Mỹ phẩm K-beauty",
    desc: "Skincare, cushion, son môi chính hãng Olive Young.",
    image: "/images/cat-beauty.png",
  },
  {
    title: "Thời trang Hàn",
    desc: "Áo khoác, len, phụ kiện từ Musinsa, 29CM.",
    image: "/images/cat-fashion.png",
  },
  {
    title: "Đồ ăn vặt",
    desc: "Mì, bánh kẹo, đồ ăn liền hot trend.",
    image: "/images/cat-food.png",
  },
  {
    title: "Đồ điện tử",
    desc: "Tai nghe, phụ kiện công nghệ và gia dụng.",
    image: "/images/cat-tech.png",
  },
]

export function Categories() {
  return (
    <section id="danh-muc" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Danh mục nổi bật</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Mua hộ mọi thứ bạn yêu thích từ Hàn Quốc
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Chỉ cần gửi link sản phẩm hoặc mô tả món hàng, chúng tôi sẽ mua và giao về Việt Nam cho bạn.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <a
              key={cat.title}
              href="#quy-trinh"
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={cat.image || "/placeholder.svg"}
                  alt={cat.title}
                  width={480}
                  height={360}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">{cat.title}</h3>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{cat.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

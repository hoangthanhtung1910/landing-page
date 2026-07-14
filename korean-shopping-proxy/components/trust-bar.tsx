const partners = ["Musinsa", "OliveYoung", "Coupang", "Gmarket", "29CM", "Kakao"]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Mua hộ từ hàng nghìn cửa hàng &amp; sàn thương mại điện tử uy tín tại Hàn Quốc
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((p) => (
            <span key={p} className="text-lg font-bold tracking-tight text-muted-foreground/70">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// Clearly-labeled NON-PRODUCTION seed content (T015). Vietnamese placeholder copy;
// real content + verified contact/testimonials are supplied via the launch gate
// (FR-045). Media URLs are placeholders under the configured media base.

export type SeedData = ReturnType<typeof buildSeed>;

export function buildSeed(mediaBase: string) {
  void mediaBase;
  const staticAssets: Record<string, string> = {
    'logo.png': '/placeholder-logo.png',
    'hero.png': '/images/hero-shopping.png',
    'cat-beauty.png': '/images/cat-beauty.png',
    'cat-fashion.png': '/images/cat-fashion.png',
    'cat-tech.png': '/images/cat-tech.png',
    'cat-kpop.png': '/placeholder.svg',
  };
  const img = (name: string, alt: string) => ({
    src: staticAssets[name] ?? '/placeholder.svg',
    alt,
  });

  return {
    brand: {
      name: 'VyVy Order Korea',
      slogan: 'Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn',
      tagline: 'Mua hộ & vận chuyển Hàn – Việt',
      logo: img('logo.png', 'VyVy Order Korea'),
      publishState: 'published',
    },
    hero: {
      headline: 'Săn hàng Hàn Quốc chính hãng, để chúng tôi lo phần còn lại',
      subheadline:
        'Mua hộ mỹ phẩm, thời trang, đồ điện tử và đồ K-pop trực tiếp từ Hàn Quốc, giao tận nhà tại Việt Nam.',
      primaryCta: { label: 'Liên hệ qua Zalo', channel: 'zalo' },
      secondaryCta: { label: 'Xem quy trình', channel: 'anchor', target: '#quy-trinh' },
      media: img('hero.png', 'Mua hộ hàng Hàn Quốc'),
      publishState: 'published',
    },
    services: [
      { title: 'Mua hộ tận nơi', description: 'Đặt mua mọi sản phẩm từ shop Hàn Quốc theo yêu cầu.', icon: 'shopping-bag', order: 1, publishState: 'published' },
      { title: 'Vận chuyển Hàn → Việt', description: 'Gom hàng và vận chuyển quốc tế nhanh, an toàn.', icon: 'truck', order: 2, publishState: 'published' },
      { title: 'Kiểm hàng & đóng gói', description: 'Kiểm tra, đóng gói cẩn thận trước khi gửi về.', icon: 'shield-check', order: 3, publishState: 'published' },
    ],
    trustPoints: [
      { title: 'Giá minh bạch', description: 'Báo giá rõ ràng, không phí ẩn.', icon: 'badge-check', order: 1, publishState: 'published' },
      { title: 'Hàng chính hãng', description: 'Mua trực tiếp từ cửa hàng uy tín tại Hàn.', icon: 'star', order: 2, publishState: 'published' },
      { title: 'Theo dõi đơn hàng', description: 'Cập nhật trạng thái đơn theo thời gian thực.', icon: 'map-pin', order: 3, publishState: 'published' },
    ],
    processSteps: [
      { title: 'Gửi link sản phẩm', description: 'Bạn gửi link hoặc yêu cầu sản phẩm cần mua.', icon: 'link', order: 1, publishState: 'published' },
      { title: 'Nhận báo giá', description: 'Chúng tôi báo giá trọn gói (hàng + phí).', icon: 'file-text', order: 2, publishState: 'published' },
      { title: 'Xác nhận & thanh toán', description: 'Bạn xác nhận và thanh toán đơn hàng.', icon: 'credit-card', order: 3, publishState: 'published' },
      { title: 'Mua hàng tại Hàn', description: 'Chúng tôi đặt mua và kiểm hàng tại Hàn Quốc.', icon: 'shopping-cart', order: 4, publishState: 'published' },
      { title: 'Vận chuyển quốc tế', description: 'Gom hàng và vận chuyển về Việt Nam.', icon: 'plane', order: 5, publishState: 'published' },
      { title: 'Giao hàng tại Việt Nam', description: 'Giao tận tay bạn trên toàn quốc.', icon: 'home', order: 6, publishState: 'published' },
    ],
    categories: [
      { name: 'Mỹ phẩm', image: img('cat-beauty.png', 'Mỹ phẩm Hàn Quốc'), blurb: 'K-beauty chính hãng', order: 1, publishState: 'published' },
      { name: 'Thời trang', image: img('cat-fashion.png', 'Thời trang Hàn Quốc'), blurb: 'Xu hướng mới nhất', order: 2, publishState: 'published' },
      { name: 'Đồ điện tử', image: img('cat-tech.png', 'Đồ điện tử Hàn Quốc'), blurb: 'Công nghệ Hàn Quốc', order: 3, publishState: 'published' },
      { name: 'Đồ K-pop', image: img('cat-kpop.png', 'Đồ K-pop'), blurb: 'Album, merch, goods', order: 4, publishState: 'published' },
    ],
    // Reviews are seeded UNAPPROVED so they never appear publicly; the reviews
    // section is disabled by default (honest empty state, FR-043).
    reviews: [
      { name: '[Seed] Khách hàng mẫu A', text: 'Nội dung đánh giá mẫu — chưa duyệt.', rating: 5, location: 'Hà Nội', approved: false, consentGiven: false, order: 1, publishState: 'published' },
      { name: '[Seed] Khách hàng mẫu B', text: 'Nội dung đánh giá mẫu — chưa duyệt.', rating: 4, location: 'TP.HCM', approved: false, consentGiven: false, order: 2, publishState: 'published' },
    ],
    faq: [
      { question: 'Phí dịch vụ tính như thế nào?', answer: 'Phí được báo trọn gói trước khi bạn xác nhận đơn.', order: 1, publishState: 'published' },
      { question: 'Thời gian vận chuyển bao lâu?', answer: 'Thông thường 7–14 ngày tuỳ loại hàng.', order: 2, publishState: 'published' },
    ],
    contactChannels: [
      { type: 'zalo', label: 'Zalo', handle: '0900000000', icon: 'message-circle', external: true, order: 1, publishState: 'published' },
      { type: 'kakao', label: 'KakaoTalk', handle: 'vyvyorder', icon: 'message-square', external: true, order: 2, publishState: 'published' },
      { type: 'phone', label: 'Hotline', handle: '+84900000000', icon: 'phone', external: false, order: 3, publishState: 'published' },
    ],
    cta: {
      headline: 'Bắt đầu đơn hàng Hàn Quốc của bạn ngay hôm nay',
      subtext: 'Nhắn Zalo hoặc Kakao để được tư vấn miễn phí.',
      channels: [
        { label: 'Liên hệ Zalo', channel: 'zalo' },
        { label: 'Liên hệ Kakao', channel: 'kakao' },
      ],
      publishState: 'published',
    },
    footer: {
      contactSummary: 'VyVy Order Korea — Mua hộ & vận chuyển Hàn – Việt',
      links: [
        { label: 'Chính sách bảo mật', href: '/privacy' },
        { label: 'Điều khoản', href: '/terms' },
      ],
      copyright: '© 2026 VyVy Order Korea',
      publishState: 'published',
    },
    seo: {
      title: 'VyVy Order Korea — Mua hộ & vận chuyển hàng Hàn Quốc về Việt Nam',
      description:
        'Dịch vụ mua hộ và vận chuyển hàng Hàn Quốc chính hãng về Việt Nam: mỹ phẩm, thời trang, đồ điện tử, đồ K-pop.',
      canonical: undefined,
      ogImage: img('og.png', 'VyVy Order Korea'),
      publishState: 'published',
    },
  };
}

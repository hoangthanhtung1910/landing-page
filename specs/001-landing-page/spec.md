# Feature Specification: VyVy Order Korea Landing Page

**Feature Branch**: `001-landing-page`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Create a landing page for a Korea-Vietnam shopping order and shipping service. Brand: VyVy Order Korea. Business: Help Vietnamese customers buy Korean products and ship from Korea to Vietnam. Target customers: Vietnamese people who love Korean products; customers buying cosmetics, fashion, electronics, K-pop goods. Main goals: increase customer trust, get customers contacting via Zalo/Kakao, explain ordering process clearly. Requirements: Vietnamese language, mobile first, Korean premium style, SEO optimized. Sections: Hero, Services, Why choose us, Ordering process, Product categories, Customer reviews, Contact CTA, Footer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor decides to make contact (Priority: P1)

A Vietnamese shopper who loves Korean products lands on the page (often from a phone, via a social ad or search result). Within seconds they understand what VyVy Order Korea does, feel the service is trustworthy, and tap a Zalo or Kakao button to start a conversation about ordering.

**Why this priority**: Contact conversion is the single business outcome that pays for the page. Everything else (trust, clarity) exists to move the visitor toward tapping a contact button. If only this works, the business still gets leads.

**Independent Test**: Load the page on a mobile device, confirm the hero communicates the service and displays a working Zalo/Kakao contact action, and confirm at least one contact action is reachable from every screen position (persistent or repeated). Tapping it opens the correct external contact channel.

**Acceptance Scenarios**:

1. **Given** a visitor opens the page on a mobile phone, **When** the hero renders, **Then** they see the brand name, a one-line value proposition in Vietnamese, and a primary contact call-to-action above the fold.
2. **Given** a visitor has scrolled to any section, **When** they decide to act, **Then** a contact action (Zalo and/or Kakao) is reachable without scrolling back to the top.
3. **Given** a visitor taps the Zalo contact action, **When** the action fires, **Then** the visitor is taken to the business's Zalo contact channel; **And** tapping the Kakao action opens the business's Kakao channel.

---

### User Story 2 - Visitor understands the ordering process (Priority: P2)

A first-time visitor is unsure how a "buy-for-me" proxy service works. They read the ordering-process section and come away understanding the steps from sending a product link to receiving the parcel in Vietnam, which removes hesitation before contacting.

**Why this priority**: Process confusion is the biggest objection for proxy-buying services. Clear steps directly increase the quality and volume of contacts driven by User Story 1.

**Independent Test**: Load the page and confirm the ordering-process section presents a clear, ordered sequence of steps in Vietnamese that a new visitor can follow end-to-end without external explanation.

**Acceptance Scenarios**:

1. **Given** a visitor reaches the ordering-process section, **When** it renders, **Then** they see numbered/sequential steps covering: sending the product link/request, receiving a quote, confirming and paying, purchase in Korea, international shipping, and delivery in Vietnam.
2. **Given** a visitor finishes reading the process, **When** they reach the end of the section, **Then** a contact call-to-action invites them to start an order.

---

### User Story 3 - Visitor builds trust and explores what can be bought (Priority: P3)

A cautious visitor wants reassurance before contacting a stranger with their money. They read the "why choose us" points, browse the product categories they care about (cosmetics, fashion, electronics, K-pop goods), and see reviews from prior customers, which raises confidence enough to reach out.

**Why this priority**: Trust and relevance amplify conversion but are supporting content; the page still functions for decided visitors without them. They lift the contact rate rather than enable it.

**Independent Test**: Load the page and confirm the "why choose us", product categories, and customer reviews sections each render with relevant Vietnamese content and that product categories clearly include cosmetics, fashion, electronics, and K-pop goods.

**Acceptance Scenarios**:

1. **Given** a visitor reaches the "why choose us" section, **When** it renders, **Then** they see distinct trust-building reasons (e.g., transparent pricing, genuine products, order tracking, support).
2. **Given** a visitor reaches the product categories section, **When** it renders, **Then** they see at least the categories cosmetics, fashion, electronics, and K-pop goods, each visually distinguishable.
3. **Given** a visitor reaches the reviews section, **When** it renders, **Then** they see multiple customer testimonials attributed to a name (and optionally rating), presented as credible social proof.

---

### Edge Cases

- **No content yet**: When reviews or categories have not been populated with real content, the section still renders acceptable placeholder content and never appears broken or empty.
- **Slow or metered mobile connection**: On a slow 3G/4G connection the page's above-the-fold content and primary contact action become usable before all imagery finishes loading.
- **Contact app not installed**: When a visitor taps Zalo/Kakao without the app installed, the action still resolves to a usable fallback (web/profile page) rather than a dead link.
- **Very small and very large screens**: Layout remains readable and tappable from small phones up to desktop widths without horizontal scrolling or overlapping elements.
- **Accessibility**: Text remains legible at increased system font sizes, and interactive elements meet minimum tap-target sizing.
- **Diacritics/encoding**: Vietnamese diacritics render correctly across all copy.

## Brand Identity

The page MUST express a consistent brand identity across all sections.

- **Name**: VyVy Order Korea
- **Slogan**: "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn"
- **Personality / style**: Korean lifestyle; friendly; trustworthy; premium but approachable. The design should feel welcoming and warm rather than cold/luxury-austere, while still reading as polished and high-quality.
- **Color palette**:
  - **Main**: soft pink — the dominant brand color, used for primary emphasis (headlines accents, primary buttons/CTAs, key highlights).
  - **Secondary**: beige — supporting surfaces, section backgrounds, and cards.
  - **Accent**: Korea red — reserved for high-emphasis moments (e.g., the primary contact call-to-action, badges, small highlights) to draw the eye and evoke Korean branding.
  - **Background**: warm white — the base page background, giving generous, airy whitespace.
- **Palette usage intent**: soft pink + warm white + beige carry the friendly, approachable premium feel; Korea red is used sparingly as a deliberate accent so it stays impactful and the contact actions stand out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST present all visitor-facing copy in Vietnamese.
- **FR-002**: The page MUST be designed mobile-first, remaining fully usable and readable on phone-sized screens and scaling up gracefully to tablet and desktop widths.
- **FR-003**: The page MUST convey a premium, Korean-inspired visual style consistent with the "VyVy Order Korea" brand identity (see Brand Identity section) — friendly, trustworthy, and premium-but-approachable, evoking a Korean lifestyle feel.
- **FR-004**: The page MUST include a hero section showing the brand name, a concise Vietnamese value proposition, and a primary contact call-to-action above the fold.
- **FR-005**: The page MUST include a services section describing what VyVy Order Korea does (buying Korean products on the customer's behalf and shipping them from Korea to Vietnam).
- **FR-006**: The page MUST include a "why choose us" section presenting distinct trust-building reasons to use the service.
- **FR-007**: The page MUST include an ordering-process section that explains the end-to-end steps in a clear, sequential order understandable to a first-time visitor.
- **FR-008**: The page MUST include a product-categories section that presents at least cosmetics, fashion, electronics, and K-pop goods as distinguishable categories.
- **FR-009**: The page MUST include a customer-reviews section presenting multiple testimonials as social proof.
- **FR-010**: The page MUST include a prominent contact call-to-action section offering Zalo and Kakao as contact channels.
- **FR-011**: Contact actions MUST link to the business's actual Zalo and Kakao channels and open the appropriate channel when activated, with a usable fallback when the corresponding app is unavailable.
- **FR-012**: A contact action MUST be reachable from any scroll position on the page (e.g., a persistent/sticky action or repeated calls-to-action), so a decided visitor never has to hunt for how to make contact.
- **FR-013**: The page MUST include a footer with brand identity, contact details, and supporting links appropriate to a business landing page.
- **FR-014**: The page MUST be optimized for search engines, including a descriptive page title, meta description, semantic heading structure, descriptive image alternate text, and social-share preview metadata, all in Vietnamese and relevant to Korea–Vietnam shopping/proxy keywords.
- **FR-015**: The page MUST present its eight content sections in this order: Hero, Services, Why choose us, Ordering process, Product categories, Customer reviews, Contact CTA, Footer.
- **FR-016**: Textual content that changes over time (reviews, category labels, contact handles, value-proposition copy) MUST be maintainable without requiring a visitor-facing redesign, so the business can update it as the service evolves.
- **FR-017**: The page MUST render correctly with Vietnamese diacritics and remain legible when the visitor increases their device/system font size.
- **FR-018**: The page MUST display the brand slogan "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn" prominently (e.g., in the hero and/or footer) as part of the brand messaging.
- **FR-019**: The page MUST apply the brand color palette consistently: soft pink as the main color, beige as the secondary color, Korea red as a sparingly-used accent (notably for the primary contact call-to-action), and warm white as the page background — while maintaining sufficient text contrast for legibility.
- **FR-020**: The page's tone and visual treatment MUST reflect the brand personality — friendly, trustworthy, and premium-but-approachable — avoiding both a cold/austere luxury look and a cheap/cluttered look.

### Key Entities *(include if feature involves data)*

- **Service offering**: A described capability of the business (e.g., "order on your behalf", "ship Korea→Vietnam"), with a short title and description used in the services section.
- **Process step**: An ordered step in the buy-and-ship journey, with a sequence position, title, and short description.
- **Product category**: A shopping category the service supports (cosmetics, fashion, electronics, K-pop goods, and any others), with a name and representative imagery/icon.
- **Customer review**: A testimonial with attribution (customer name), review text, and optional rating and location.
- **Contact channel**: A way to reach the business (Zalo, Kakao, and any supporting phone/social), with a channel type and its destination/handle.
- **Trust point**: A single reason-to-choose statement with a short title and description used in the "why choose us" section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 8% of visitors who reach the page tap a contact call-to-action (Zalo or Kakao).
- **SC-002**: A first-time visitor can locate a working contact action within 10 seconds of the page loading on a mobile device.
- **SC-003**: A first-time visitor can correctly describe the ordering process (from sending a product link to receiving the parcel) after reading the ordering-process section, in a 5-person comprehension check, with at least 4 of 5 succeeding.
- **SC-004**: The above-the-fold content and primary contact action become usable in under 3 seconds on a representative mid-range phone over a typical mobile connection.
- **SC-005**: The page is rated "trustworthy / would consider using" by at least 80% of a small target-audience test panel (Vietnamese shoppers of Korean products).
- **SC-006**: The page achieves a strong technical SEO baseline: a unique descriptive title and meta description, a single top-level heading with a logical heading hierarchy, alternate text on all meaningful images, and valid social-share preview metadata — verified by a standard site auditing check with no critical issues.
- **SC-007**: The layout produces no horizontal scrolling or overlapping/clipped content across common screen widths from small phones (~320px) to desktop.

## Assumptions

- The page is a single-page marketing landing page (no on-site checkout or account system); the intended conversion is starting a conversation via Zalo/Kakao, not completing an order on the page.
- The site targets Vietnamese-speaking users only; no additional languages or in-page language switcher are required for this version.
- Actual Zalo/Kakao handles, phone number, real customer reviews, brand assets (logo, imagery), and final marketing copy will be provided by the business; the spec assumes credible placeholder content is acceptable until real content is supplied. The brand name, slogan, and color palette are now specified (see Brand Identity) and are no longer open items.
- "Korean premium style" is interpreted as a warm, friendly, premium-but-approachable aesthetic with generous whitespace and refined typography, built on the specified palette (soft pink main, beige secondary, Korea red accent, warm white background) — welcoming rather than cold/austere luxury, while still polished.
- Exact color values (hex codes) are left to implementation; "soft pink", "beige", "Korea red", and "warm white" define the intended tones, and specific shades may be tuned for accessibility/contrast during design.
- No user login, personalization, payment processing, or order-management functionality is in scope; those are handled off-page via the contact channels.
- Analytics/measurement instrumentation sufficient to evaluate the contact-tap success criteria is assumed to be available or added as part of delivery.
- Legal/compliance pages (privacy, terms) are represented as footer links but their full content is out of scope for this feature.

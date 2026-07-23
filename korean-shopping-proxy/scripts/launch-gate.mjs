const required = ['NEXT_PUBLIC_SITE_URL', 'CMS_PUBLIC_URL', 'PRODUCTION_CONTACTS_VERIFIED', 'PRODUCTION_BRAND_ASSETS_VERIFIED', 'PRODUCTION_SEO_APPROVED', 'PRODUCTION_BUSINESS_APPROVER']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.error(`Launch blocked. Missing verified production inputs: ${missing.join(', ')}`)
  process.exit(1)
}
if (process.env.PRODUCTION_CONTACTS_VERIFIED !== 'true' || process.env.PRODUCTION_BRAND_ASSETS_VERIFIED !== 'true' || process.env.PRODUCTION_SEO_APPROVED !== 'true') {
  console.error('Launch blocked. Verification flags must explicitly equal true.')
  process.exit(1)
}
console.log(`Launch gate approved by ${process.env.PRODUCTION_BUSINESS_APPROVER}.`)

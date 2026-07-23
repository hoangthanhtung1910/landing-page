import { test } from "node:test"
import assert from "node:assert/strict"
import { buildStructuredData } from "./structured-data"
test("AggregateRating is omitted unless eligible public reviews have ratings", () => {
  const base = { brand:{name:"VyVy",slogan:"Tin cậy"}, hero:{headline:"Mua hộ",subheadline:"Nhanh",primaryCta:{label:"Zalo",channel:"zalo"}}, cta:{headline:"Liên hệ",channels:[{label:"Zalo",channel:"zalo"},{label:"Kakao",channel:"kakao"}]}, footer:{contactSummary:"Liên hệ",links:[],copyright:"2026"}, contact:[{type:"zalo",label:"Zalo",handle:"0900000000",icon:"message",external:true},{type:"kakao",label:"Kakao",handle:"vyvy",icon:"message",external:true}], seo:{title:"VyVy",description:"Mua hộ"}, meta:{releaseNumber:1,publishedAt:new Date().toISOString()} } as const
  const noReviews = buildStructuredData(base as never,"https://example.com")
  assert.ok(!("aggregateRating" in (noReviews["@graph"][0] as Record<string,unknown>)))
  const withReviews = buildStructuredData({...base,reviews:[{id:"1",name:"A",text:"Tốt",rating:5}]} as never,"https://example.com")
  assert.equal(((withReviews["@graph"][0] as Record<string,unknown>).aggregateRating as Record<string,unknown>).reviewCount,1)
})

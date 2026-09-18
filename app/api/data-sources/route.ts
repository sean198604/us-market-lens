import { env } from "cloudflare:workers";
import { getTradePartners } from "@/lib/comtrade-reference";
import { getComtradeClientStatus } from "@/lib/comtrade-client";
import { fetchJsonCached, getOpenDataCacheStatus } from "@/lib/open-data-client";

type Check = { id: string; name: string; authority: string; coverage: string; cadence: string; companyLevel: boolean; valueLevel: string; free: boolean; keyRequirement: string; url: string; available: boolean; detail: string };

async function checked(id: string, task: () => Promise<unknown>, base: Omit<Check, "id" | "available" | "detail">): Promise<Check> {
  const started = Date.now();
  try {
    await task();
    return { id, ...base, available: true, detail: `连接正常 · ${Date.now() - started} ms` };
  } catch (error) {
    return { id, ...base, available: false, detail: error instanceof Error ? error.message : "连接失败" };
  }
}

export async function GET() {
  const sources = await Promise.all([
    checked("comtrade", () => getTradePartners(), { name: "UN Comtrade", authority: "United Nations", coverage: "美国进口：来源国 × HS × 年/月", cadence: "月度", companyLevel: false, valueLevel: "官方贸易金额", free: true, keyRequirement: "无需 Key", url: "https://comtradeplus.un.org/" }),
    checked("worldbank", () => fetchJsonCached("world-bank-us-merchandise-imports", "https://api.worldbank.org/v2/country/USA/indicator/TM.VAL.MRCH.CD.WT?format=json&per_page=10", { headers: { Accept: "application/json" } }, 86400000), { name: "World Bank Open Data", authority: "World Bank", coverage: "美国商品进口宏观总额", cadence: "年度", companyLevel: false, valueLevel: "宏观交叉校验", free: true, keyRequirement: "无需 Key", url: "https://data.worldbank.org/indicator/TM.VAL.MRCH.CD.WT" }),
    checked("gleif", () => fetchJsonCached("gleif-health", "https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=1", { headers: { Accept: "application/vnd.api+json" } }, 3600000), { name: "GLEIF LEI", authority: "Global Legal Entity Identifier Foundation", coverage: "企业法律名称、LEI、地址和状态", cadence: "实时查询", companyLevel: true, valueLevel: "企业身份，不含采购金额", free: true, keyRequirement: "无需 Key", url: "https://www.gleif.org/en/lei-data/gleif-api" }),
    checked("sec", () => fetchJsonCached("sec-health", "https://efts.sec.gov/LATEST/search-index?keysTyped=Apple&category=custom&forms=10-K", { headers: { Accept: "application/json", "User-Agent": "US-Market-Lens/1.0 local-research-dashboard" } }, 3600000), { name: "SEC EDGAR", authority: "U.S. Securities and Exchange Commission", coverage: "上市公司身份、财报和申报文件", cadence: "盘中持续更新", companyLevel: true, valueLevel: "公开财务，不等于采购额", free: true, keyRequirement: "无需 Key", url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces" }),
    checked("usaspending", () => fetchJsonCached("usaspending-health", "https://api.usaspending.gov/api/v2/autocomplete/recipient/", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ search_text: "Apple" }) }, 3600000), { name: "USAspending", authority: "U.S. Department of the Treasury", coverage: "联邦合同、拨款和其他公开奖项受款方", cadence: "按官方提交更新", companyLevel: true, valueLevel: "联邦奖项金额，不是采购额", free: true, keyRequirement: "无需 Key", url: "https://www.usaspending.gov/" }),
  ]);

  const censusConfigured = Boolean(env.CENSUS_API_KEY);
  sources.push({
    id: "census", name: "U.S. Census International Trade API", authority: "U.S. Census Bureau",
    coverage: "美国进口：国家 × HS10 × 口岸 × 运输方式", cadence: "月度", companyLevel: false,
    valueLevel: "美国官方进口金额、数量与重量", free: true, keyRequirement: "需要免费 Key",
    url: "https://api.census.gov/data/timeseries/intltrade/imports/hs.html", available: censusConfigured,
    detail: censusConfigured ? "免费 Key 已配置" : "接口已接好；申请免费 Key 后自动启用",
  });

  return Response.json({
    checkedAt: new Date().toISOString(),
    summary: { connected: sources.filter((item) => item.available).length, total: sources.length, companySources: sources.filter((item) => item.available && item.companyLevel).length, paidSources: 0 },
    sources,
    runtime: { comtrade: getComtradeClientStatus(), openData: getOpenDataCacheStatus() },
    companySpend: { actualAvailable: false, rule: "仅客户订单、ERP、报关单或可审计财务资料可标记为公司实际采购额。" },
  }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

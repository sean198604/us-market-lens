import { fetchJsonCached } from "@/lib/open-data-client";

type SecSearch = { hits?: { hits?: Array<{ _id?: string; _source?: { entity?: string; tickers?: string | string[] } }> } };
type GleifPayload = {
  meta?: { goldenCopy?: { publishDate?: string } };
  data?: Array<{
    id?: string;
    attributes?: {
      lei?: string;
      entity?: {
        legalName?: { name?: string };
        legalAddress?: { addressLines?: string[]; city?: string; region?: string; country?: string; postalCode?: string };
        headquartersAddress?: { addressLines?: string[]; city?: string; region?: string; country?: string; postalCode?: string };
        jurisdiction?: string;
        status?: string;
      };
      registration?: { status?: string; lastUpdateDate?: string };
    };
  }>;
};
type SpendingPayload = { results?: Array<{ id?: string; name?: string; uei?: string | null; duns?: string | null; recipient_level?: string | null; amount?: number }> };

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const relevance = (candidate: string, query: string) => {
  const name = normalize(candidate);
  const target = normalize(query);
  if (name === target) return 100;
  if (name.startsWith(target)) return 80;
  if (name.includes(target)) return 60;
  return 10;
};

async function searchSec(query: string) {
  const params = new URLSearchParams({ keysTyped: query, category: "custom", forms: "10-K" });
  const payload = await fetchJsonCached<SecSearch>(
    `sec-entity-search-${normalize(query)}`,
    `https://efts.sec.gov/LATEST/search-index?${params}`,
    { headers: { Accept: "application/json", "User-Agent": "US-Market-Lens/1.0 local-research-dashboard" } },
    6 * 60 * 60 * 1000,
  );
  return (payload.hits?.hits ?? []).map((hit) => {
    const entity = hit._source?.entity ?? "";
    const tickerValue = hit._source?.tickers;
    const ticker = Array.isArray(tickerValue) ? tickerValue[0] ?? "" : tickerValue ?? entity.match(/\(([^)]+)\)\s*$/)?.[1] ?? "";
    return { cik: String(hit._id ?? "").padStart(10, "0"), name: entity.replace(/\s*\([^)]+\)\s*$/, ""), ticker, exchange: "SEC EDGAR" };
  }).filter((item) => relevance(`${item.name} ${item.ticker}`, query) >= 60)
    .sort((a, b) => relevance(`${b.name} ${b.ticker}`, query) - relevance(`${a.name} ${a.ticker}`, query))
    .slice(0, 6);
}

async function searchGleif(query: string) {
  const params = new URLSearchParams({ "filter[fulltext]": query, "filter[entity.legalAddress.country]": "US", "page[size]": "60" });
  const payload = await fetchJsonCached<GleifPayload>(`gleif-${normalize(query)}`, `https://api.gleif.org/api/v1/lei-records?${params}`, { headers: { Accept: "application/vnd.api+json" } }, 12 * 60 * 60 * 1000);
  const matches = (payload.data ?? []).map((record) => {
    const entity = record.attributes?.entity;
    const address = entity?.legalAddress;
    return {
      lei: record.attributes?.lei ?? record.id ?? "",
      name: entity?.legalName?.name ?? "",
      jurisdiction: entity?.jurisdiction ?? "",
      entityStatus: entity?.status ?? "",
      registrationStatus: record.attributes?.registration?.status ?? "",
      lastUpdated: record.attributes?.registration?.lastUpdateDate ?? "",
      address: [...(address?.addressLines ?? []), address?.city, address?.region, address?.postalCode, address?.country].filter(Boolean).join(", "),
    };
  }).sort((a, b) => relevance(b.name, query) - relevance(a.name, query)).slice(0, 6);
  return { matches, publishedAt: payload.meta?.goldenCopy?.publishDate ?? null };
}

async function searchFederalRecipients(query: string) {
  const payload = await fetchJsonCached<SpendingPayload>(`usaspending-${normalize(query)}`, "https://api.usaspending.gov/api/v2/recipient/", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: query, award_type: "all", page: 1, limit: 100, sort: "amount", order: "desc" }),
  }, 6 * 60 * 60 * 1000);
  const unique = new Map<string, { id: string; name: string; uei: string; duns: string; amount: number }>();
  for (const item of payload.results ?? []) {
    const name = item.name ?? "";
    if (!name || relevance(name, query) < 60) continue;
    const key = item.uei || normalize(name);
    const current = unique.get(key);
    if (!current || (item.amount ?? 0) > current.amount) unique.set(key, { id: item.id ?? "", name, uei: item.uei ?? "", duns: item.duns ?? "", amount: Number(item.amount ?? 0) });
  }
  return [...unique.values()].sort((a, b) => relevance(b.name, query) - relevance(a.name, query) || b.amount - a.amount).slice(0, 6);
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return Response.json({ error: "企业名称需为 2—100 个字符" }, { status: 400 });

  const [sec, gleif, federal] = await Promise.allSettled([searchSec(query), searchGleif(query), searchFederalRecipients(query)]);
  return Response.json({
    query,
    generatedAt: new Date().toISOString(),
    sec: { ok: sec.status === "fulfilled", matches: sec.status === "fulfilled" ? sec.value : [], error: sec.status === "rejected" ? String(sec.reason) : null },
    gleif: { ok: gleif.status === "fulfilled", matches: gleif.status === "fulfilled" ? gleif.value.matches : [], publishedAt: gleif.status === "fulfilled" ? gleif.value.publishedAt : null, error: gleif.status === "rejected" ? String(gleif.reason) : null },
    federal: { ok: federal.status === "fulfilled", matches: federal.status === "fulfilled" ? federal.value : [], error: federal.status === "rejected" ? String(federal.reason) : null },
    boundary: "这些免费来源用于企业识别、公开财务与美国联邦奖项核验，不包含该企业的海关采购明细。",
  }, { headers: { "Cache-Control": "no-store" } });
}

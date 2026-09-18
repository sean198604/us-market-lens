import { fetchJsonCached } from "@/lib/open-data-client";

type WorldBankPayload = [
  { lastupdated?: string; total?: number },
  Array<{ date?: string; value?: number | null; indicator?: { value?: string }; country?: { value?: string } }>,
];

export async function GET() {
  try {
    const payload = await fetchJsonCached<WorldBankPayload>(
      "world-bank-us-merchandise-imports",
      "https://api.worldbank.org/v2/country/USA/indicator/TM.VAL.MRCH.CD.WT?format=json&per_page=10",
      { headers: { Accept: "application/json" } },
      24 * 60 * 60 * 1000,
    );
    return Response.json({
      source: "World Bank Open Data",
      indicator: payload[1]?.[0]?.indicator?.value ?? "Merchandise imports (current US$)",
      country: payload[1]?.[0]?.country?.value ?? "United States",
      sourceUpdatedAt: payload[0]?.lastupdated ?? null,
      observations: (payload[1] ?? []).filter((item) => item.value !== null && item.value !== undefined).slice(0, 6).map((item) => ({ year: item.date, valueUsd: Number(item.value) })),
      scope: "美国全部商品进口年度宏观值，用于交叉核验趋势，不提供企业或品类明细。",
    }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch (error) {
    return Response.json({ error: "World Bank 数据加载失败", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

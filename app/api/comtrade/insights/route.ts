import { hsName } from "@/lib/trade";
import { fetchComtradeRows, type ComtradeRow } from "@/lib/comtrade-client";
import { resolveTradePartner } from "@/lib/comtrade-reference";

const CODES = ["39", "61", "62", "64", "84", "85", "87", "94"];

const valueOf = (rows: ComtradeRow[], code: string) => {
  const row = rows.find((item) => item.cmdCode === code);
  return Number(row?.primaryValue ?? row?.cifvalue ?? 0);
};

export async function GET(request: Request) {
  const partner = new URL(request.url).searchParams.get("partner") ?? "156";
  const partnerRecord = /^\d{1,3}$/.test(partner) ? await resolveTradePartner(partner) : null;
  if (!partnerRecord) return Response.json({ error: "来源地无效" }, { status: 400 });
  const latestYear = new Date().getUTCFullYear() - 1;
  try {
    const previousRows = await fetchComtradeRows({ frequency: "A", period: String(latestYear - 1), partnerCodes: [partner], commodityCodes: ["TOTAL", ...CODES] });
    const latestRows = await fetchComtradeRows({ frequency: "A", period: String(latestYear), partnerCodes: [partner], commodityCodes: ["TOTAL", ...CODES] });
    const total = valueOf(latestRows, "TOTAL");
    const categories = CODES.map((code) => {
      const valueUsd = valueOf(latestRows, code);
      const previousValueUsd = valueOf(previousRows, code);
      const yoy = previousValueUsd ? (valueUsd / previousValueUsd - 1) * 100 : 0;
      const share = total ? valueUsd / total * 100 : 0;
      const score = Math.max(0, Math.min(100, 50 + yoy * 1.4 + Math.min(share * 1.2, 25)));
      return { hsCode: code, hsName: hsName(code), valueUsd, previousValueUsd, yoy, share, score };
    }).sort((a, b) => b.score - a.score);
    const tracked = categories.reduce((sum, item) => sum + item.valueUsd, 0);
    const topThree = [...categories].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 3).reduce((sum, item) => sum + item.valueUsd, 0);
    const positive = categories.filter((item) => item.yoy > 0).length;

    return Response.json({
      source: "UN Comtrade Public API",
      quality: "derived_from_official_aggregate",
      generatedAt: new Date().toISOString(),
      partnerCode: partner,
      partnerName: partnerRecord.name,
      latestYear,
      previousYear: latestYear - 1,
      summary: { totalUsd: total, trackedUsd: tracked, trackedShare: total ? tracked / total * 100 : 0, topThreeConcentration: tracked ? topThree / tracked * 100 : 0, positiveCategories: positive },
      categories,
      methodology: "机会分 = 50 + 同比增长×1.4 + 品类占来源地进口份额×1.2（份额贡献上限 25），结果限制在 0–100。",
    }, { headers: { "Cache-Control": "public, max-age=1800, s-maxage=21600" } });
  } catch (error) {
    return Response.json({ error: "洞察计算失败", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

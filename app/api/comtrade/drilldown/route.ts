import { hsName, partnerName, TRADE_PARTNERS } from "@/lib/trade";
import { fetchComtradeRows, type ComtradeRow } from "@/lib/comtrade-client";
import { resolveTradePartner } from "@/lib/comtrade-reference";

function valueOf(rows: ComtradeRow[], code: string, partner?: string) {
  const row = rows.find((item) => item.cmdCode === code && (partner === undefined || String(item.partnerCode) === partner));
  return Number(row?.primaryValue ?? row?.cifvalue ?? 0);
}

function monthCode(date: Date, offset: number) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
  return `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hs = params.get("hs")?.trim() ?? "85";
  const partner = params.get("partner") ?? "156";
  if (!/^(?:\d{2}|\d{4}|\d{6}|\d{10})$/.test(hs)) return Response.json({ error: "HS 编码无效" }, { status: 400 });
  const partnerRecord = /^\d{1,3}$/.test(partner) ? await resolveTradePartner(partner) : null;
  if (!partnerRecord) return Response.json({ error: "来源地无效" }, { status: 400 });

  const lastYear = new Date().getUTCFullYear() - 1;
  const years = Array.from({ length: 5 }, (_, index) => String(lastYear - 4 + index));

  try {
    const annual = [];
    for (const year of years) {
      const rows = await fetchComtradeRows({ frequency: "A", period: year, partnerCodes: [partner], commodityCodes: ["TOTAL", hs] });
      const valueUsd = valueOf(rows, hs);
      const totalUsd = valueOf(rows, "TOTAL");
      annual.push({ period: year, valueUsd, totalUsd, share: totalUsd ? valueUsd / totalUsd * 100 : 0 });
    }

    const monthly: Array<{ period: string; valueUsd: number }> = [];
    let latestOffset = 1;
    for (; latestOffset <= 6; latestOffset += 1) {
      const period = monthCode(new Date(), latestOffset);
      const rows = await fetchComtradeRows({ frequency: "M", period, partnerCodes: [partner], commodityCodes: [hs] });
      const valueUsd = valueOf(rows, hs);
      if (valueUsd > 0) { monthly.push({ period: `${period.slice(0, 4)}-${period.slice(4)}`, valueUsd }); break; }
    }
    for (let extra = 1; extra <= 2; extra += 1) {
      const period = monthCode(new Date(), latestOffset + extra);
      const rows = await fetchComtradeRows({ frequency: "M", period, partnerCodes: [partner], commodityCodes: [hs] });
      monthly.unshift({ period: `${period.slice(0, 4)}-${period.slice(4)}`, valueUsd: valueOf(rows, hs) });
    }

    const comparePartnerCodes = TRADE_PARTNERS.filter((item) => item.code !== "0").map((item) => item.code);
    const comparisonRows = await fetchComtradeRows({ frequency: "A", period: String(lastYear), partnerCodes: comparePartnerCodes, commodityCodes: [hs] });
    const comparison = comparePartnerCodes.map((code) => ({
      partnerCode: code,
      partnerName: partnerName(code),
      valueUsd: valueOf(comparisonRows, hs, code),
    })).sort((a, b) => b.valueUsd - a.valueUsd);

    const latest = annual.at(-1)!;
    const prior = annual.at(-2)!;
    const first = annual[0];
    const yoy = prior.valueUsd ? (latest.valueUsd / prior.valueUsd - 1) * 100 : 0;
    const cagr = first.valueUsd && latest.valueUsd ? (Math.pow(latest.valueUsd / first.valueUsd, 1 / Math.max(annual.length - 1, 1)) - 1) * 100 : 0;
    const growthRates = annual.slice(1).map((item, index) => annual[index].valueUsd ? (item.valueUsd / annual[index].valueUsd - 1) * 100 : 0);
    const mean = growthRates.reduce((sum, value) => sum + value, 0) / Math.max(growthRates.length, 1);
    const volatility = Math.sqrt(growthRates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(growthRates.length, 1));

    return Response.json({
      source: "UN Comtrade Public API",
      quality: "official_aggregate",
      generatedAt: new Date().toISOString(),
      hsCode: hs,
      hsName: hsName(hs),
      partnerCode: partner,
      partnerName: partnerRecord.name,
      metrics: { latestValueUsd: latest.valueUsd, latestShare: latest.share, yoy, cagr, volatility },
      annual,
      monthly,
      comparison,
    }, { headers: { "Cache-Control": "public, max-age=1800, s-maxage=21600" } });
  } catch (error) {
    return Response.json({ error: "钻取数据加载失败", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

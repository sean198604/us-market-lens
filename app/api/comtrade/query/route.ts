import { hsName } from "@/lib/trade";
import { fetchComtradeRows } from "@/lib/comtrade-client";
import { resolveTradePartner } from "@/lib/comtrade-reference";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const partner = params.get("partner") ?? "156";
  const period = params.get("period") ?? String(new Date().getUTCFullYear() - 1);
  const rawCodes = params.get("hs") ?? "84";
  const codes = [...new Set(rawCodes.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 20);
  const frequency = /^\d{4}-\d{2}$/.test(period) ? "M" : "A";
  const apiPeriod = period.replace("-", "");

  const partnerRecord = /^\d{1,3}$/.test(partner) ? await resolveTradePartner(partner) : null;
  if (!partnerRecord) return Response.json({ error: "来源地无效" }, { status: 400 });
  if (!/^\d{4}(?:-\d{2})?$/.test(period)) return Response.json({ error: "期间格式无效" }, { status: 400 });
  if (!codes.length || codes.some((code) => !/^(?:\d{2}|\d{4}|\d{6}|\d{10})$/.test(code))) {
    return Response.json({ error: "HS 编码需为 2、4、6 或 10 位数字" }, { status: 400 });
  }

  try {
    const sourceRows = await fetchComtradeRows({ frequency, period: apiPeriod, partnerCodes: [partner], commodityCodes: codes });
    const byCode = new Map<string, (typeof sourceRows)[number]>();
    for (const row of sourceRows) if (row.cmdCode && !byCode.has(row.cmdCode)) byCode.set(row.cmdCode, row);
    const rows = codes.map((code) => {
      const row = byCode.get(code);
      return {
        hsCode: code,
        hsName: hsName(code),
        valueUsd: Number(row?.primaryValue ?? row?.cifvalue ?? 0),
        found: Boolean(row),
        aggregation: Boolean(row?.isAggregate),
      };
    });

    return Response.json({
      source: "UN Comtrade Public API",
      quality: "official_aggregate",
      reporter: "美国",
      partnerCode: partner,
      partnerName: partnerRecord.name,
      period,
      frequency,
      generatedAt: new Date().toISOString(),
      rows,
    }, { headers: { "Cache-Control": "public, max-age=1800, s-maxage=21600" } });
  } catch (error) {
    return Response.json({ error: "官方数据查询失败", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

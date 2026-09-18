import { fetchComtradeRows, type ComtradeRow } from "@/lib/comtrade-client";
import { resolveTradePartner } from "@/lib/comtrade-reference";

const CATEGORIES = [
  { code: "39", name: "塑料及制品" },
  { code: "61", name: "针织服装" },
  { code: "62", name: "非针织服装" },
  { code: "64", name: "鞋靴" },
  { code: "84", name: "机械设备" },
  { code: "85", name: "电气设备" },
  { code: "87", name: "车辆及零部件" },
  { code: "94", name: "家具与照明" },
];

async function requestPeriod(frequency: "A" | "M", period: string, partnerCode: string) {
  const rows = await fetchComtradeRows({ frequency, period, partnerCodes: [partnerCode], commodityCodes: ["TOTAL", ...CATEGORIES.map((item) => item.code)] });
  const byCode = new Map<string, ComtradeRow>();
  for (const row of rows) if (row.cmdCode && !byCode.has(row.cmdCode)) byCode.set(row.cmdCode, row);
  return byCode;
}

function subtractMonths(date: Date, count: number) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - count, 1));
  return `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalize(period: string, rows: Map<string, ComtradeRow>) {
  const total = rows.get("TOTAL");
  return {
    period,
    totalUsd: Number(total?.primaryValue ?? total?.cifvalue ?? 0),
    categories: CATEGORIES.map((item) => {
      const row = rows.get(item.code);
      return {
        ...item,
        valueUsd: Number(row?.primaryValue ?? row?.cifvalue ?? 0),
      };
    }),
  };
}

export async function GET(request: Request) {
  const partnerCode = new URL(request.url).searchParams.get("partner") ?? "156";
  const partner = /^\d{1,3}$/.test(partnerCode) ? await resolveTradePartner(partnerCode) : null;
  if (!partner) {
    return Response.json({ error: "暂不支持该来源地" }, { status: 400 });
  }

  const lastCompleteYear = new Date().getUTCFullYear() - 1;
  const years = Array.from({ length: 5 }, (_, index) => String(lastCompleteYear - 4 + index));

  try {
    const annual = [];
    for (const year of years) {
      annual.push(normalize(year, await requestPeriod("A", year, partnerCode)));
    }

    let latestMonth = null;
    for (let offset = 1; offset <= 6; offset += 1) {
      const period = subtractMonths(new Date(), offset);
      const rows = await requestPeriod("M", period, partnerCode);
      if (rows.size > 0 && Number(rows.get("TOTAL")?.primaryValue ?? 0) > 0) {
        latestMonth = normalize(`${period.slice(0, 4)}-${period.slice(4)}`, rows);
        break;
      }
    }

    return Response.json({
      source: "UN Comtrade Public API",
      sourceUrl: "https://comtradeplus.un.org/",
      reporter: "美国",
      partnerCode,
      partnerName: partner.name,
      generatedAt: new Date().toISOString(),
      valueBasis: "官方贸易统计中的美国进口额（CIF/Primary Value）",
      quality: "official_aggregate",
      annual,
      latestMonth,
      categories: CATEGORIES,
      limitation: "这是美国按来源地和 HS 品类汇总的官方进口金额，不是单一公司的采购金额。",
    }, {
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return Response.json({
      error: "官方数据暂时不可用",
      detail: error instanceof Error ? error.message : "unknown",
    }, { status: 502 });
  }
}

const HS_PATTERN = /^(?:\d{2}|\d{4}|\d{6}|\d{10})$/;
const COUNTRY_PATTERN = /^\d{4}$/;
const PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const censusApiKey = process.env.CENSUS_API_KEY?.trim();
  if (!censusApiKey) {
    return Response.json({ error: "Census API 尚未配置", code: "source_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const hs = url.searchParams.get("hs")?.trim() ?? "";
  const country = url.searchParams.get("country")?.trim() ?? "";
  const period = url.searchParams.get("period")?.trim() ?? "";

  if (!HS_PATTERN.test(hs) || !COUNTRY_PATTERN.test(country) || !PERIOD_PATTERN.test(period)) {
    return Response.json({ error: "参数无效：HS 需为 2/4/6/10 位，国家需为 4 位 Census 代码，期间需为 YYYY-MM" }, { status: 400 });
  }

  const query = new URLSearchParams({
    get: "CTY_CODE,CTY_NAME,I_COMMODITY,I_COMMODITY_LDESC,COMM_LVL,GEN_VAL_MO,GEN_VAL_YR,GEN_QY1_MO,UNIT_QY1,VES_VAL_MO,AIR_VAL_MO,LAST_UPDATE",
    time: period,
    I_COMMODITY: hs,
    CTY_CODE: country,
    key: censusApiKey,
  });
  const endpoint = `https://api.census.gov/data/timeseries/intltrade/imports/hs?${query}`;

  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    const payload = await response.json() as unknown;
    if (!response.ok) {
      return Response.json({ error: "Census 返回查询错误", detail: payload }, { status: response.status });
    }
    if (!Array.isArray(payload) || payload.length < 2 || !Array.isArray(payload[0])) {
      return Response.json({ error: "未找到匹配的官方贸易数据" }, { status: 404 });
    }

    const headers = payload[0] as string[];
    const records = (payload.slice(1) as unknown[][]).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
    const normalized = records.map((row) => ({
      countryCode: String(row.CTY_CODE ?? country),
      countryName: String(row.CTY_NAME ?? ""),
      hsCode: String(row.I_COMMODITY ?? hs),
      hsDescription: String(row.I_COMMODITY_LDESC ?? ""),
      commodityLevel: String(row.COMM_LVL ?? ""),
      monthValueUsd: Number(row.GEN_VAL_MO ?? 0),
      yearToDateValueUsd: Number(row.GEN_VAL_YR ?? 0),
      monthQuantity: Number(row.GEN_QY1_MO ?? 0),
      quantityUnit: String(row.UNIT_QY1 ?? ""),
      vesselValueUsd: Number(row.VES_VAL_MO ?? 0),
      airValueUsd: Number(row.AIR_VAL_MO ?? 0),
      lastUpdated: String(row.LAST_UPDATE ?? ""),
      period,
    }));

    return Response.json({
      source: "U.S. Census Bureau International Trade API",
      quality: "official_aggregate",
      scope: "美国进口市场聚合值，不代表单一公司采购额",
      records: normalized,
    }, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return Response.json({ error: "无法连接 Census 官方数据源", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

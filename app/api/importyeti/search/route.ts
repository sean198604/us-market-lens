export async function GET(request: Request) {
  const importYetiApiKey = process.env.IMPORTYETI_API_KEY?.trim();
  if (!importYetiApiKey) {
    return Response.json({ error: "ImportYeti API 尚未配置", code: "source_not_configured" }, { status: 503 });
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ error: "客户名称需为 2—100 个字符" }, { status: 400 });
  }

  const params = new URLSearchParams({ name: query, page_size: "10", offset: "0" });
  try {
    const response = await fetch(`https://data.importyeti.com/v1.0/company/search?${params}`, {
      headers: { IYApiKey: importYetiApiKey, Accept: "application/json" },
    });
    const payload = await response.json() as { data?: Array<Record<string, unknown>>; requestCost?: number; creditsRemaining?: number; message?: string };
    if (!response.ok) {
      return Response.json({ error: payload.message ?? "ImportYeti 查询失败" }, { status: response.status });
    }
    return Response.json({
      source: "ImportYeti U.S. customs manifest data",
      quality: "observed_manifest",
      valueWarning: "提单记录不包含真实成交金额",
      requestCost: payload.requestCost ?? 0,
      creditsRemaining: payload.creditsRemaining ?? null,
      companies: (payload.data ?? []).map((item) => ({
        name: String(item.title ?? ""),
        address: String(item.address ?? ""),
        totalShipments: Number(item.totalShipments ?? 0),
        mostRecentShipment: String(item.mostRecentShipment ?? ""),
        topSuppliers: Array.isArray(item.topSuppliers) ? item.topSuppliers.map(String) : [],
        slug: String(item.key ?? "").replace(/^company\//, ""),
      })),
    }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return Response.json({ error: "无法连接 ImportYeti", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

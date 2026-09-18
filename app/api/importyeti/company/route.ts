const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const importYetiApiKey = process.env.IMPORTYETI_API_KEY?.trim();
  if (!importYetiApiKey) {
    return Response.json({ error: "ImportYeti API 尚未配置", code: "source_not_configured" }, { status: 503 });
  }
  const body = await request.json() as { slug?: string };
  const slug = body.slug?.trim().toLowerCase() ?? "";
  if (!SLUG_PATTERN.test(slug)) {
    return Response.json({ error: "公司标识无效" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://data.importyeti.com/v1.0/company/${encodeURIComponent(slug)}`, {
      headers: { IYApiKey: importYetiApiKey, Accept: "application/json" },
    });
    const payload = await response.json() as { data?: unknown; requestCost?: number; creditsRemaining?: number; message?: string };
    if (!response.ok) {
      return Response.json({ error: payload.message ?? "ImportYeti 公司详情查询失败" }, { status: response.status });
    }
    return Response.json({
      source: "ImportYeti U.S. customs manifest data",
      quality: "observed_manifest",
      valueWarning: "该资料可证明进口活动、品类和供应关系，不能证明真实采购金额。",
      requestCost: payload.requestCost ?? null,
      creditsRemaining: payload.creditsRemaining ?? null,
      company: payload.data ?? null,
    });
  } catch (error) {
    return Response.json({ error: "无法连接 ImportYeti", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

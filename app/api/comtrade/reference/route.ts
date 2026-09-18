import { getTradePartners } from "@/lib/comtrade-reference";

export async function GET() {
  try {
    return Response.json({
      source: "UN Comtrade reference tables",
      updatedAt: new Date().toISOString(),
      partners: await getTradePartners(),
    }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
  } catch (error) {
    return Response.json({ error: "来源地字典暂时不可用", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

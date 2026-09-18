import { getComtradeClientStatus } from "@/lib/comtrade-client";

export async function GET() {
  return Response.json({
    service: "UN Comtrade data gateway",
    state: "ready",
    policy: { cacheTtlHours: 6, upstreamMinIntervalMs: 1050, retryCount: 3, authenticationRequired: false },
    runtime: getComtradeClientStatus(),
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}

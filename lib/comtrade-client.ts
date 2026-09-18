export type ComtradeRow = {
  partnerCode?: number;
  cmdCode?: string;
  primaryValue?: number;
  cifvalue?: number;
  isAggregate?: boolean;
  refYear?: number;
  refMonth?: number;
};

type ClientState = {
  cache: Map<string, { expiresAt: number; rows: ComtradeRow[] }>;
  inFlight: Map<string, Promise<ComtradeRow[]>>;
  serial: Promise<void>;
  lastRequestAt: number;
  lastSuccessfulAt: string | null;
  requestCount: number;
  cacheHits: number;
};

type GlobalWithComtrade = typeof globalThis & { __comtradeClientState?: ClientState };
const globalScope = globalThis as GlobalWithComtrade;
const state = globalScope.__comtradeClientState ??= {
  cache: new Map(),
  inFlight: new Map(),
  serial: Promise.resolve(),
  lastRequestAt: 0,
  lastSuccessfulAt: null,
  requestCount: 0,
  cacheHits: 0,
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function serializedFetch(url: string) {
  let resolveResult!: (response: Response) => void;
  let rejectResult!: (error: unknown) => void;
  const result = new Promise<Response>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });

  state.serial = state.serial.then(async () => {
    const remaining = Math.max(0, 1050 - (Date.now() - state.lastRequestAt));
    if (remaining) await wait(remaining);
    state.lastRequestAt = Date.now();
    state.requestCount += 1;
    try { resolveResult(await fetch(url, { headers: { Accept: "application/json" } })); }
    catch (error) { rejectResult(error); }
  }).catch(() => undefined);

  return result;
}

export async function fetchComtradeRows({ frequency, period, partnerCodes, commodityCodes, ttlMs = 6 * 60 * 60 * 1000 }: {
  frequency: "A" | "M";
  period: string;
  partnerCodes: string[];
  commodityCodes: string[];
  ttlMs?: number;
}) {
  const query = new URLSearchParams({
    period,
    reporterCode: "842",
    flowCode: "M",
    partnerCode: partnerCodes.join(","),
    partner2Code: "0",
    cmdCode: commodityCodes.join(","),
    maxRecords: "500",
  });
  const url = `https://comtradeapi.un.org/public/v1/preview/C/${frequency}/HS?${query}`;
  const cached = state.cache.get(url);
  if (cached && cached.expiresAt > Date.now()) { state.cacheHits += 1; return cached.rows; }
  const existing = state.inFlight.get(url);
  if (existing) { state.cacheHits += 1; return existing; }

  const task = (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await serializedFetch(url);
      if (response.status === 429) { await wait(1100 * (attempt + 1)); continue; }
      const payload = await response.json() as { data?: ComtradeRow[]; error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error || `UN Comtrade 返回 ${response.status}`);
      const rows = payload.data ?? [];
      state.cache.set(url, { expiresAt: Date.now() + ttlMs, rows });
      state.lastSuccessfulAt = new Date().toISOString();
      return rows;
    }
    throw new Error("UN Comtrade 请求频率受限，请稍后重试");
  })();

  state.inFlight.set(url, task);
  try { return await task; }
  finally { state.inFlight.delete(url); }
}

export function getComtradeClientStatus() {
  for (const [key, value] of state.cache) if (value.expiresAt <= Date.now()) state.cache.delete(key);
  return {
    cacheEntries: state.cache.size,
    inFlightRequests: state.inFlight.size,
    requestCount: state.requestCount,
    cacheHits: state.cacheHits,
    lastSuccessfulAt: state.lastSuccessfulAt,
    lastRequestAt: state.lastRequestAt ? new Date(state.lastRequestAt).toISOString() : null,
  };
}

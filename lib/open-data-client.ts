type CacheEntry = { expiresAt: number; value: unknown };

type OpenDataState = {
  cache: Map<string, CacheEntry>;
  inFlight: Map<string, Promise<unknown>>;
};

type GlobalWithOpenData = typeof globalThis & { __openDataState?: OpenDataState };
const globalScope = globalThis as GlobalWithOpenData;
const state = globalScope.__openDataState ??= { cache: new Map(), inFlight: new Map() };

export async function fetchJsonCached<T>(key: string, url: string, init?: RequestInit, ttlMs = 6 * 60 * 60 * 1000): Promise<T> {
  const cached = state.cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const pending = state.inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const task = (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt === 0) {
            const retryAfter = Number(response.headers.get("retry-after"));
            await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 1500) : 500));
            continue;
          }
          throw new Error(`${new URL(url).hostname} 返回 ${response.status}`);
        }
        const value = await response.json() as T;
        state.cache.set(key, { expiresAt: Date.now() + ttlMs, value });
        return value;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`${new URL(url).hostname} 请求失败`);
  })();

  state.inFlight.set(key, task);
  try { return await task; }
  finally { state.inFlight.delete(key); }
}

export function getOpenDataCacheStatus() {
  for (const [key, entry] of state.cache) if (entry.expiresAt <= Date.now()) state.cache.delete(key);
  return { entries: state.cache.size, inFlight: state.inFlight.size };
}

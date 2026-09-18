import { fetchJsonCached } from "@/lib/open-data-client";

export type TradePartner = { code: string; name: string; iso2: string; iso3: string; major: boolean };

const CHINESE_NAMES: Record<string, string> = {
  "0": "全球", "124": "加拿大", "156": "中国", "276": "德国", "356": "印度", "392": "日本",
  "410": "韩国", "458": "马来西亚", "484": "墨西哥", "528": "荷兰", "702": "新加坡", "704": "越南",
  "764": "泰国", "826": "英国", "840": "美国", "918": "欧盟",
};
const MAJOR_CODES = ["0", "156", "704", "356", "484", "276", "124", "392", "410", "458", "764", "826"];

type PartnerPayload = {
  results?: Array<{
    id?: number;
    PartnerCode?: number;
    PartnerDesc?: string;
    text?: string;
    PartnerCodeIsoAlpha2?: string;
    PartnerCodeIsoAlpha3?: string;
    isGroup?: boolean;
  }>;
};

export async function getTradePartners(): Promise<TradePartner[]> {
  const payload = await fetchJsonCached<PartnerPayload>(
    "comtrade-partners",
    "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json",
    { headers: { Accept: "application/json" } },
    7 * 24 * 60 * 60 * 1000,
  );
  const records = (payload.results ?? [])
    .filter((item) => item.isGroup === false && Number.isFinite(item.PartnerCode ?? item.id))
    .map((item) => {
      const code = String(item.PartnerCode ?? item.id);
      return {
        code,
        name: CHINESE_NAMES[code] ?? item.PartnerDesc ?? item.text ?? code,
        iso2: item.PartnerCodeIsoAlpha2 ?? "",
        iso3: item.PartnerCodeIsoAlpha3 ?? "",
        major: MAJOR_CODES.includes(code),
      };
    });

  const all = records.some((item) => item.code === "0") ? records : [{ code: "0", name: "全球", iso2: "", iso3: "", major: true }, ...records];
  return all.sort((a, b) => {
    const aIndex = MAJOR_CODES.indexOf(a.code);
    const bIndex = MAJOR_CODES.indexOf(b.code);
    if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

export async function resolveTradePartner(code: string) {
  const partners = await getTradePartners();
  return partners.find((item) => item.code === code) ?? null;
}

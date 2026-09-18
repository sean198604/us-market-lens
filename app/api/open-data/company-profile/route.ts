import { fetchJsonCached } from "@/lib/open-data-client";

type FactUnit = { fy?: number; fp?: string; form?: string; filed?: string; start?: string; end?: string; val?: number };
type CompanyFacts = { entityName?: string; facts?: { "us-gaap"?: Record<string, { label?: string; units?: Record<string, FactUnit[]> }> } };
type Submissions = {
  name?: string; tickers?: string[]; exchanges?: string[]; sic?: string; sicDescription?: string; stateOfIncorporation?: string;
  fiscalYearEnd?: string; website?: string; investorWebsite?: string;
  filings?: { recent?: Record<string, string[]> };
};

const CONCEPTS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "Revenues"],
  costOfRevenue: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold"],
  grossProfit: ["GrossProfit"],
  inventory: ["InventoryNet"],
  assets: ["Assets"],
  accountsPayable: ["AccountsPayableCurrent", "AccountsPayableAndAccruedLiabilitiesCurrent"],
} as const;

function annualFacts(facts: CompanyFacts, candidates: readonly string[]) {
  const concepts = facts.facts?.["us-gaap"] ?? {};
  for (const concept of candidates) {
    const rows = concepts[concept]?.units?.USD ?? [];
    const byYear = new Map<number, FactUnit>();
    for (const row of rows) {
      if (row.form !== "10-K" || row.fp !== "FY" || !row.end || !Number.isFinite(row.val)) continue;
      // A 10-K also repeats prior-year comparatives, but SEC assigns those rows the
      // filing's current `fy`. Group by the fact's actual period end instead, or a
      // 2025 filing can incorrectly label its 2023 comparison as FY2025.
      const periodYear = Number(row.end.slice(0, 4));
      if (!Number.isInteger(periodYear)) continue;
      const current = byYear.get(periodYear);
      if (!current || String(row.filed) > String(current.filed)) byYear.set(periodYear, row);
    }
    if (byYear.size) return { concept, values: byYear };
  }
  return { concept: null, values: new Map<number, FactUnit>() };
}

export async function GET(request: Request) {
  const rawCik = new URL(request.url).searchParams.get("cik")?.trim() ?? "";
  if (!/^\d{1,10}$/.test(rawCik)) return Response.json({ error: "CIK 无效" }, { status: 400 });
  const cik = rawCik.padStart(10, "0");
  const headers = { Accept: "application/json", "User-Agent": "US-Market-Lens/1.0 local-research-dashboard" };

  try {
    const [facts, submissions] = await Promise.all([
      fetchJsonCached<CompanyFacts>(`sec-facts-${cik}`, `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers }, 6 * 60 * 60 * 1000),
      fetchJsonCached<Submissions>(`sec-submissions-${cik}`, `https://data.sec.gov/submissions/CIK${cik}.json`, { headers }, 6 * 60 * 60 * 1000),
    ]);
    const series = Object.fromEntries(Object.entries(CONCEPTS).map(([key, concepts]) => [key, annualFacts(facts, concepts)])) as Record<string, { concept: string | null; values: Map<number, FactUnit> }>;
    const years = [...new Set(Object.values(series).flatMap((item) => [...item.values.keys()]))].sort((a, b) => b - a).slice(0, 5);
    const financials = years.map((fiscalYear) => ({
      fiscalYear,
      revenue: Number(series.revenue.values.get(fiscalYear)?.val ?? 0),
      costOfRevenue: Number(series.costOfRevenue.values.get(fiscalYear)?.val ?? 0),
      grossProfit: Number(series.grossProfit.values.get(fiscalYear)?.val ?? 0),
      inventory: Number(series.inventory.values.get(fiscalYear)?.val ?? 0),
      assets: Number(series.assets.values.get(fiscalYear)?.val ?? 0),
      accountsPayable: Number(series.accountsPayable.values.get(fiscalYear)?.val ?? 0),
      filedAt: series.revenue.values.get(fiscalYear)?.filed ?? series.assets.values.get(fiscalYear)?.filed ?? null,
    }));

    const recent = submissions.filings?.recent ?? {};
    const forms = recent.form ?? [];
    const filings = forms.map((form, index) => ({
      form,
      filedAt: recent.filingDate?.[index] ?? "",
      reportDate: recent.reportDate?.[index] ?? "",
      accessionNumber: recent.accessionNumber?.[index] ?? "",
      primaryDocument: recent.primaryDocument?.[index] ?? "",
      description: recent.primaryDocDescription?.[index] ?? "",
    })).filter((item) => ["10-K", "10-Q", "8-K", "20-F", "40-F"].includes(item.form)).slice(0, 8);

    return Response.json({
      source: "U.S. SEC EDGAR",
      updatedAt: new Date().toISOString(),
      identity: {
        cik, name: submissions.name ?? facts.entityName ?? "", tickers: submissions.tickers ?? [], exchanges: submissions.exchanges ?? [],
        sic: submissions.sic ?? "", sicDescription: submissions.sicDescription ?? "", stateOfIncorporation: submissions.stateOfIncorporation ?? "",
        fiscalYearEnd: submissions.fiscalYearEnd ?? "", website: submissions.website ?? "", investorWebsite: submissions.investorWebsite ?? "",
      },
      financials,
      concepts: Object.fromEntries(Object.entries(series).map(([key, item]) => [key, item.concept])),
      filings,
      boundary: "成本、库存和应付账款来自企业公开财报，不等于采购额，也不包含供应国家分布。",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "SEC 企业资料加载失败", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}

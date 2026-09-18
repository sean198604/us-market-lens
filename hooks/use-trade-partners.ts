"use client";

import { useEffect, useState } from "react";
import { TRADE_PARTNERS } from "@/lib/trade";

export type TradePartnerOption = { code: string; name: string; iso2?: string; iso3?: string; major?: boolean };

export function useTradePartners() {
  const [partners, setPartners] = useState<TradePartnerOption[]>([...TRADE_PARTNERS]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/comtrade/reference", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("reference unavailable")))
      .then((payload: { partners?: TradePartnerOption[] }) => {
        if (payload.partners?.length) setPartners(payload.partners);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return partners;
}

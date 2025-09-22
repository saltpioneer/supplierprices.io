// Lightweight FX helper using exchangerate.host with simple caching

type RatesCache = {
  [base: string]: {
    rates: Record<string, number>;
    fetchedAt: number;
  };
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const cache: RatesCache = {};

async function fetchRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error("Failed to load exchange rates");
  const json = await res.json();
  return json.rates || {};
}

export async function loadRates(base: string): Promise<void> {
  const now = Date.now();
  const cached = cache[base];
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return;
  const rates = await fetchRates(base);
  cache[base] = { rates, fetchedAt: now };
}

export function getRate(from: string, to: string): number | undefined {
  if (from === to) return 1;
  const entry = cache[from];
  return entry?.rates?.[to];
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  if (!cache[from]) await loadRates(from);
  const rate = getRate(from, to);
  if (!rate) return amount;
  return amount * rate;
}

export function tryConvertAmount(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const rate = getRate(from, to);
  if (!rate) return amount;
  return amount * rate;
}



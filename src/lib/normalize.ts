// Price normalization utilities

// Mock exchange rates (in production, this would come from an API)
const EXCHANGE_RATES: Record<string, number> = {
  AUD: 1.0,
  USD: 1.5,
  EUR: 1.6,
  GBP: 1.8,
};

// Unit conversion map (to standard units)
const UNIT_CONVERSIONS: Record<string, { standard: string; factor: number }> = {
  // Length
  mm: { standard: "m", factor: 0.001 },
  cm: { standard: "m", factor: 0.01 },
  m: { standard: "m", factor: 1 },
  km: { standard: "m", factor: 1000 },
  inch: { standard: "m", factor: 0.0254 },
  ft: { standard: "m", factor: 0.3048 },
  
  // Weight
  g: { standard: "kg", factor: 0.001 },
  kg: { standard: "kg", factor: 1 },
  t: { standard: "kg", factor: 1000 },
  lb: { standard: "kg", factor: 0.453592 },
  oz: { standard: "kg", factor: 0.0283495 },
  
  // Volume
  ml: { standard: "L", factor: 0.001 },
  L: { standard: "L", factor: 1 },
  gal: { standard: "L", factor: 3.78541 },
  
  // Count
  pcs: { standard: "pcs", factor: 1 },
  each: { standard: "pcs", factor: 1 },
  dozen: { standard: "pcs", factor: 12 },
  
  // Area
  sqm: { standard: "sqm", factor: 1 },
  sqft: { standard: "sqm", factor: 0.092903 },
};

// Category to default unit mapping
const CATEGORY_DEFAULT_UNITS: Record<string, string> = {
  "Pipe & Fittings": "m",
  "Electrical": "m",
  "Concrete & Cement": "kg",
  "Steel & Rebar": "kg",
  "Insulation": "sqm",
  "Roofing": "sqm",
  "Timber": "m",
  "Fasteners": "pcs",
  "Paint & Coatings": "L",
  "Tools": "pcs",
};

export function normalizePrice(
  rawPrice: number,
  rawCurrency: string,
  packQty: number = 1,
  packUnit: string = "pcs",
  targetUnit: string = "pcs",
  baseCurrency: string = "AUD"
): { normalizedPrice: number; normalizedUnit: string } {
  // Convert currency to base currency
  const exchangeRate = EXCHANGE_RATES[rawCurrency] || 1;
  const priceInBaseCurrency = rawPrice / exchangeRate;
  
  // Convert to per-unit price
  const pricePerPackUnit = priceInBaseCurrency / packQty;
  
  // Convert units if needed
  const packConversion = UNIT_CONVERSIONS[packUnit];
  const targetConversion = UNIT_CONVERSIONS[targetUnit];
  
  if (packConversion && targetConversion && packConversion.standard === targetConversion.standard) {
    // Both units can be converted to the same standard
    const priceInStandardUnit = pricePerPackUnit / packConversion.factor;
    const normalizedPrice = priceInStandardUnit * targetConversion.factor;
    
    return {
      normalizedPrice: Math.round(normalizedPrice * 100) / 100,
      normalizedUnit: targetUnit,
    };
  }
  
  // If no conversion possible, use pack unit
  return {
    normalizedPrice: Math.round(pricePerPackUnit * 100) / 100,
    normalizedUnit: packUnit,
  };
}

export function getDefaultUnitForCategory(category: string): string {
  return CATEGORY_DEFAULT_UNITS[category] || "pcs";
}

export function formatPrice(price: number, currency: string = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatUnit(unit: string): string {
  const unitLabels: Record<string, string> = {
    m: "per meter",
    kg: "per kg",
    L: "per liter",
    pcs: "per piece",
    sqm: "per sqm",
    ft: "per foot",
    lb: "per pound",
    gal: "per gallon",
  };
  
  return unitLabels[unit] || `per ${unit}`;
}

// Mock normalization for demo purposes
export function mockNormalizeOffers(rawOffers: any[]): any[] {
  return rawOffers.map(offer => ({
    ...offer,
    normalizedPricePerUnit: normalizePrice(
      offer.rawPrice,
      offer.rawCurrency,
      offer.packQty || 1,
      offer.packUnit || "pcs",
      getDefaultUnitForCategory(offer.category || ""),
    ).normalizedPrice,
    normalizedUnit: normalizePrice(
      offer.rawPrice,
      offer.rawCurrency,
      offer.packQty || 1,
      offer.packUnit || "pcs",
      getDefaultUnitForCategory(offer.category || ""),
    ).normalizedUnit,
  }));
}
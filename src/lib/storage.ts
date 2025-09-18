// localStorage utilities for persisting demo data

import { Supplier, Product, Offer, Source, Settings, SavedView } from "./types";

const STORAGE_KEYS = {
  suppliers: "price-aggregator-suppliers",
  products: "price-aggregator-products", 
  offers: "price-aggregator-offers",
  sources: "price-aggregator-sources",
  settings: "price-aggregator-settings",
  savedViews: "price-aggregator-saved-views",
  favorites: "price-aggregator-favorite-products",
} as const;

// Generic storage functions
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage for key ${key}:`, error);
  }
}

// Suppliers
export function getSuppliers(): Supplier[] {
  return getFromStorage(STORAGE_KEYS.suppliers, []);
}

export function setSuppliers(suppliers: Supplier[]): void {
  setToStorage(STORAGE_KEYS.suppliers, suppliers);
}

export function addSupplier(supplier: Supplier): void {
  const suppliers = getSuppliers();
  setSuppliers([...suppliers, supplier]);
}

export function updateSupplier(supplierId: string, updates: Partial<Supplier>): void {
  const suppliers = getSuppliers();
  const updatedSuppliers = suppliers.map(s => 
    s.id === supplierId ? { ...s, ...updates } : s
  );
  setSuppliers(updatedSuppliers);
}

export function deleteSupplier(supplierId: string): void {
  const suppliers = getSuppliers();
  setSuppliers(suppliers.filter(s => s.id !== supplierId));
}

// Products
export function getProducts(): Product[] {
  return getFromStorage(STORAGE_KEYS.products, []);
}

export function setProducts(products: Product[]): void {
  setToStorage(STORAGE_KEYS.products, products);
}

export function addProduct(product: Product): void {
  const products = getProducts();
  setProducts([...products, product]);
}

// Offers
export function getOffers(): Offer[] {
  return getFromStorage(STORAGE_KEYS.offers, []);
}

export function setOffers(offers: Offer[]): void {
  setToStorage(STORAGE_KEYS.offers, offers);
}

export function addOffers(newOffers: Offer[]): void {
  const offers = getOffers();
  setOffers([...offers, ...newOffers]);
}

export function getOffersByProduct(productId: string): Offer[] {
  return getOffers().filter(offer => offer.productId === productId);
}

export function getOffersBySupplier(supplierId: string): Offer[] {
  return getOffers().filter(offer => offer.supplierId === supplierId);
}

// Sources
export function getSources(): Source[] {
  return getFromStorage(STORAGE_KEYS.sources, []);
}

export function setSources(sources: Source[]): void {
  setToStorage(STORAGE_KEYS.sources, sources);
}

export function addSource(source: Source): void {
  const sources = getSources();
  setSources([...sources, source]);
}

export function deleteSource(sourceId: string): void {
  const sources = getSources();
  setSources(sources.filter(s => s.id !== sourceId));
  
  // Also remove offers from this source
  const offers = getOffers();
  setOffers(offers.filter(o => o.sourceId !== sourceId));
}

// Settings
export function getSettings(): Settings {
  return getFromStorage(STORAGE_KEYS.settings, {
    baseCurrency: "AUD",
    taxIncluded: true,
    roundingPrecision: 2,
    density: "compact",
  });
}

export function setSettings(settings: Settings): void {
  setToStorage(STORAGE_KEYS.settings, settings);
}

// Saved Views
export function getSavedViews(): SavedView[] {
  return getFromStorage(STORAGE_KEYS.savedViews, []);
}

export function setSavedViews(views: SavedView[]): void {
  setToStorage(STORAGE_KEYS.savedViews, views);
}

export function addSavedView(view: SavedView): void {
  const views = getSavedViews();
  setSavedViews([...views, view]);
}

export function deleteSavedView(viewId: string): void {
  const views = getSavedViews();
  setSavedViews(views.filter(v => v.id !== viewId));
}

// Favorites (product pinning)
export function getFavoriteProductIds(): string[] {
  return getFromStorage<string[]>(STORAGE_KEYS.favorites, []);
}

export function setFavoriteProducts(ids: string[]): void {
  setToStorage<string[]>(STORAGE_KEYS.favorites, ids);
}

export function isProductFavorited(productId: string): boolean {
  const ids = getFavoriteProductIds();
  return ids.includes(productId);
}

export function toggleFavoriteProduct(productId: string): string[] {
  const ids = new Set(getFavoriteProductIds());
  if (ids.has(productId)) {
    ids.delete(productId);
  } else {
    ids.add(productId);
  }
  const next = Array.from(ids);
  setFavoriteProducts(next);
  return next;
}

// Reset all data
export function resetDemoData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Check if demo data exists
export function hasDemoData(): boolean {
  return getSuppliers().length > 0 || getProducts().length > 0 || getOffers().length > 0;
}
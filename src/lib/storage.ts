// localStorage utilities for persisting demo data

import { Supplier, Product, Offer, Source, Settings, SavedView, OrderRecord, Customer, SalesOrder, PurchaseOrder, InvoiceDoc, InventoryItem, Project, PurchaseReceiptDoc } from "./types";

const STORAGE_KEYS = {
  suppliers: "price-aggregator-suppliers",
  products: "price-aggregator-products", 
  offers: "price-aggregator-offers",
  sources: "price-aggregator-sources",
  settings: "price-aggregator-settings",
  savedViews: "price-aggregator-saved-views",
  orders: "price-aggregator-orders",
  customers: "price-aggregator-customers",
  salesOrders: "price-aggregator-sales-orders",
  purchaseOrders: "price-aggregator-purchase-orders",
  invoices: "price-aggregator-invoices",
  inventory: "price-aggregator-inventory",
  projects: "price-aggregator-projects",
  purchaseReceipts: "price-aggregator-purchase-receipts",
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

// Orders / Invoices
export function getOrders(): OrderRecord[] {
  return getFromStorage(STORAGE_KEYS.orders, []);
}

export function setOrders(orders: OrderRecord[]): void {
  setToStorage(STORAGE_KEYS.orders, orders);
}

export function addOrder(order: OrderRecord): void {
  const orders = getOrders();
  setOrders([order, ...orders]);
}

export function updateOrder(id: string, updates: Partial<OrderRecord>) {
  const orders = getOrders();
  setOrders(orders.map(o => (o.id === id ? { ...o, ...updates } : o)));
}

// Customers
export const getCustomers = () => getFromStorage<Customer[]>(STORAGE_KEYS.customers, []);
export const setCustomers = (rows: Customer[]) => setToStorage(STORAGE_KEYS.customers, rows);
export const addCustomer = (row: Customer) => setCustomers([row, ...getCustomers()]);
export const updateCustomer = (id: string, updates: Partial<Customer>) => setCustomers(getCustomers().map(r => r.id === id ? { ...r, ...updates } : r));
export const deleteCustomer = (id: string) => setCustomers(getCustomers().filter(r => r.id !== id));

// Sales Orders
export const getSalesOrders = () => getFromStorage<SalesOrder[]>(STORAGE_KEYS.salesOrders, []);
export const setSalesOrders = (rows: SalesOrder[]) => setToStorage(STORAGE_KEYS.salesOrders, rows);
export const addSalesOrder = (row: SalesOrder) => setSalesOrders([row, ...getSalesOrders()]);
export const updateSalesOrder = (id: string, updates: Partial<SalesOrder>) => setSalesOrders(getSalesOrders().map(r => r.id === id ? { ...r, ...updates } : r));

// Purchase Orders
export const getPurchaseOrders = () => getFromStorage<PurchaseOrder[]>(STORAGE_KEYS.purchaseOrders, []);
export const setPurchaseOrders = (rows: PurchaseOrder[]) => setToStorage(STORAGE_KEYS.purchaseOrders, rows);
export const addPurchaseOrder = (row: PurchaseOrder) => setPurchaseOrders([row, ...getPurchaseOrders()]);
export const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => setPurchaseOrders(getPurchaseOrders().map(r => r.id === id ? { ...r, ...updates } : r));

// Invoices
export const getInvoices = () => getFromStorage<InvoiceDoc[]>(STORAGE_KEYS.invoices, []);
export const setInvoices = (rows: InvoiceDoc[]) => setToStorage(STORAGE_KEYS.invoices, rows);
export const addInvoice = (row: InvoiceDoc) => setInvoices([row, ...getInvoices()]);
export const updateInvoice = (id: string, updates: Partial<InvoiceDoc>) => setInvoices(getInvoices().map(r => r.id === id ? { ...r, ...updates } : r));

// Inventory
export const getInventory = () => getFromStorage<InventoryItem[]>(STORAGE_KEYS.inventory, []);
export const setInventory = (rows: InventoryItem[]) => setToStorage(STORAGE_KEYS.inventory, rows);
export const upsertInventory = (row: InventoryItem) => {
  const list = getInventory();
  const idx = list.findIndex(i => i.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  setInventory([...list]);
};

// Projects
export const getProjects = () => getFromStorage<Project[]>(STORAGE_KEYS.projects, []);
export const setProjects = (rows: Project[]) => setToStorage(STORAGE_KEYS.projects, rows);
export const addProject = (row: Project) => setProjects([row, ...getProjects()]);
export const updateProject = (id: string, updates: Partial<Project>) => setProjects(getProjects().map(r => r.id === id ? { ...r, ...updates } : r));

// Purchase Receipts
export const getPurchaseReceipts = () => getFromStorage<PurchaseReceiptDoc[]>(STORAGE_KEYS.purchaseReceipts, []);
export const setPurchaseReceipts = (rows: PurchaseReceiptDoc[]) => setToStorage(STORAGE_KEYS.purchaseReceipts, rows);
export const addPurchaseReceipt = (row: PurchaseReceiptDoc) => setPurchaseReceipts([row, ...getPurchaseReceipts()]);
export const updatePurchaseReceipt = (id: string, updates: Partial<PurchaseReceiptDoc>) => setPurchaseReceipts(getPurchaseReceipts().map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
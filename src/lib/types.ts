import { z } from "zod";

// Core data models for the price aggregator

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(), // e.g., "kg", "m", "pcs", "L"
});

export const OfferSchema = z.object({
  id: z.string(),
  productId: z.string(),
  supplierId: z.string(),
  rawPrice: z.number(),
  rawCurrency: z.enum(["AUD", "USD", "EUR", "GBP"]),
  packQty: z.number().optional(),
  packUnit: z.string().optional(),
  normalizedPricePerUnit: z.number(),
  normalizedUnit: z.string(),
  sourceId: z.string(),
  updatedAt: z.string(),
  inStock: z.boolean().optional(),
});

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["pdf", "csv", "text", "email"]),
  status: z.enum(["parsed", "failed", "pending"]),
  rowCount: z.number(),
  uploadedAt: z.string(),
  mapping: z.record(z.string(), z.string()),
});

// Settings schemas
export const SettingsSchema = z.object({
  baseCurrency: z.enum(["AUD", "USD", "EUR", "GBP"]).default("AUD"),
  taxIncluded: z.boolean().default(true),
  roundingPrecision: z.number().min(0).max(4).default(2),
  density: z.enum(["compact", "comfortable"]).default("compact"),
  defaultUnits: z.record(z.string(), z.string()).optional(),
});

// Saved view schema
export const SavedViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    suppliers: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
    inStockOnly: z.boolean().optional(),
  }),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  sorting: z.array(z.object({
    id: z.string(),
    desc: z.boolean(),
  })).optional(),
  createdAt: z.string(),
});

// Type exports
export type Supplier = z.infer<typeof SupplierSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type SavedView = z.infer<typeof SavedViewSchema>;

// Dashboard view types
export interface ProductOffer {
  product: Product;
  bestOffer: Offer;
  bestSupplier: Supplier;
  totalOffers: number;
  otherOffers: Offer[];
  lastUpdated: string;
}

// Upload types
export interface ParsedRow {
  [key: string]: string | number;
}

export interface ColumnMapping {
  supplier?: string;
  product?: string;
  category?: string;
  unit?: string;
  price?: string;
  currency?: string;
  packQty?: string;
  packUnit?: string;
  lastUpdated?: string;
}

// Filter types
export interface DashboardFilters {
  search?: string;
  category?: string;
  suppliers?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  inStockOnly?: boolean;
}

// Table column visibility
export interface ColumnVisibility {
  [key: string]: boolean;
}

// Orders / Invoices
export interface OrderRecord {
  id: string;
  supplier: string;
  product: string;
  quantity: number;
  status: "open" | "invoiced" | "paid";
  date: string;
  invoiceId?: string;
}

// Enterprise entities (inspired by ERP systems, renamed for this app)
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  tags?: string[];
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  customerId: string;
  orderDate: string;
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  currency: "AUD" | "USD" | "EUR" | "GBP";
  items: Array<{ productId: string; description?: string; qty: number; unit: string; unitPrice: number }>;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: string;
  status: "draft" | "sent" | "received" | "cancelled";
  currency: "AUD" | "USD" | "EUR" | "GBP";
  items: Array<{ productId: string; description?: string; qty: number; unit: string; unitPrice: number }>;
  total: number;
}

export interface InvoiceDoc {
  id: string;
  customerId: string;
  issueDate: string;
  dueDate?: string;
  status: "draft" | "issued" | "paid" | "overdue" | "void";
  currency: "AUD" | "USD" | "EUR" | "GBP";
  items: Array<{ productId?: string; description: string; qty: number; unit: string; unitPrice: number }>;
  subtotal: number;
  tax?: number;
  total: number;
  linkedSalesOrderId?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku?: string;
  location?: string;
  onHand: number;
  reorderPoint?: number;
  unit: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  customerId?: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate?: string;
  endDate?: string;
  notes?: string;
}

// Purchase Receipt document
export interface PurchaseReceiptItem {
  id: string;
  itemCode: string;
  acceptedQty: number; // qty
  rejectedQty: number; // rejected_qty
  unit: string;
  rate: number; // in receipt currency
  amount: number; // computed: acceptedQty * rate
}

export interface PurchaseReceiptTax {
  id: string;
  type: "addition" | "deduction";
  accountHead: string;
  taxRate: number; // percentage
  amount: number; // computed on subtotal
}

export interface PurchaseReceiptDoc {
  id: string; // PR-00001
  namingSeries: string; // e.g., MAT-PRE-.YYYY-
  supplier: string;
  supplierDeliveryNote?: string;
  postingDate: string; // YYYY-MM-DD
  postingTime: string; // HH:mm:ss
  setPostingTime?: boolean;
  applyPutawayRule?: boolean;
  isReturn?: boolean;
  acceptedWarehouse?: string;
  rejectedWarehouse?: string;
  isSubcontracted?: boolean;
  currency: "USD" | "AUD" | "EUR" | "GBP";
  priceList?: string;
  items: PurchaseReceiptItem[];
  taxes: PurchaseReceiptTax[];
  totals: {
    totalQty: number;
    subtotal: number; // sum of item amounts
    taxesAdded: number; // sum addition taxes
    taxesDeducted: number; // sum deduction taxes
    totalTaxesAndCharges: number; // added - deducted
    additionalDiscount?: number; // flat
    grandTotal: number; // subtotal + totalTaxesAndCharges - discount
    roundingAdjustment?: number;
    roundedTotal?: number;
    disableRoundedTotal?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  status: "draft" | "submitted" | "cancelled";
}
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
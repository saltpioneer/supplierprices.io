// Demo seed data for the price aggregator

import { Supplier, Product, Offer, Source } from "./types";
import { normalizePrice, getDefaultUnitForCategory } from "./normalize";

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: "supplier-1",
    name: "Ace Metals",
    contact: "sales@acemetals.com.au",
    tags: ["Metal", "Steel", "Bulk"],
  },
  {
    id: "supplier-2", 
    name: "Metro Supplies",
    contact: "orders@metrosupplies.com.au",
    tags: ["General", "Local", "Fast Delivery"],
  },
  {
    id: "supplier-3",
    name: "BuildCo",
    contact: "procurement@buildco.com.au", 
    tags: ["Concrete", "Bulk", "Trade Only"],
  },
  {
    id: "supplier-4",
    name: "ElectroTech",
    contact: "sales@electrotech.com.au",
    tags: ["Electrical", "Conduit", "Cable"],
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "product-1",
    name: "Copper Pipe 15mm",
    category: "Pipe & Fittings",
    unit: "m",
  },
  {
    id: "product-2",
    name: "PVC Conduit 20mm",
    category: "Electrical",
    unit: "m",
  },
  {
    id: "product-3",
    name: "Rebar D12",
    category: "Steel & Rebar",
    unit: "kg",
  },
  {
    id: "product-4",
    name: "Cement 20kg Bag",
    category: "Concrete & Cement",
    unit: "kg",
  },
  {
    id: "product-5",
    name: "Galvanized Bolts M8x50",
    category: "Fasteners",
    unit: "pcs",
  },
  {
    id: "product-6",
    name: "Insulation Batts R2.5",
    category: "Insulation",
    unit: "sqm",
  },
];

export const DEMO_SOURCES: Source[] = [
  {
    id: "source-1",
    name: "Ace Metals Weekly Prices",
    type: "pdf",
    status: "parsed",
    rowCount: 156,
    uploadedAt: "2024-01-15T09:00:00Z",
    mapping: {
      product: "Item Description",
      price: "Unit Price",
      currency: "Currency",
      packQty: "Pack Size",
    },
  },
  {
    id: "source-2",
    name: "Metro Supplies Catalog",
    type: "csv",
    status: "parsed",
    rowCount: 89,
    uploadedAt: "2024-01-14T14:30:00Z",
    mapping: {
      product: "Product Name",
      price: "Price",
      category: "Category",
      unit: "Unit",
    },
  },
  {
    id: "source-3",
    name: "BuildCo Price List",
    type: "csv",
    status: "parsed",
    rowCount: 234,
    uploadedAt: "2024-01-13T11:15:00Z",
    mapping: {
      product: "Description",
      price: "Cost",
      currency: "Currency",
      packQty: "Quantity",
    },
  },
];

// Generate demo offers with realistic price variations
function createDemoOffers(): Offer[] {
  const offers: Offer[] = [];
  const baseDate = new Date();
  
  // Copper Pipe 15mm offers
  offers.push(
    {
      id: "offer-1",
      productId: "product-1",
      supplierId: "supplier-1",
      rawPrice: 485.00,
      rawCurrency: "AUD",
      packQty: 5,
      packUnit: "m",
      normalizedPricePerUnit: 97.00,
      normalizedUnit: "m",
      sourceId: "source-1",
      updatedAt: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    },
    {
      id: "offer-2",
      productId: "product-1",
      supplierId: "supplier-2",
      rawPrice: 105.50,
      rawCurrency: "AUD",
      packQty: 1,
      packUnit: "m",
      normalizedPricePerUnit: 105.50,
      normalizedUnit: "m",
      sourceId: "source-2",
      updatedAt: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    }
  );
  
  // PVC Conduit 20mm offers
  offers.push(
    {
      id: "offer-3",
      productId: "product-2",
      supplierId: "supplier-4",
      rawPrice: 125.00,
      rawCurrency: "AUD",
      packQty: 5,
      packUnit: "m",
      normalizedPricePerUnit: 25.00,
      normalizedUnit: "m",
      sourceId: "source-1",
      updatedAt: new Date(baseDate.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    },
    {
      id: "offer-4",
      productId: "product-2",
      supplierId: "supplier-2",
      rawPrice: 28.75,
      rawCurrency: "AUD",
      packQty: 1,
      packUnit: "m",
      normalizedPricePerUnit: 28.75,
      normalizedUnit: "m",
      sourceId: "source-2",
      updatedAt: new Date(baseDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      inStock: false,
    }
  );
  
  // Rebar D12 offers
  offers.push(
    {
      id: "offer-5",
      productId: "product-3",
      supplierId: "supplier-1",
      rawPrice: 1250.00,
      rawCurrency: "AUD",
      packQty: 1000,
      packUnit: "kg",
      normalizedPricePerUnit: 1.25,
      normalizedUnit: "kg",
      sourceId: "source-1",
      updatedAt: new Date(baseDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    },
    {
      id: "offer-6",
      productId: "product-3",
      supplierId: "supplier-3",
      rawPrice: 580.00,
      rawCurrency: "AUD",
      packQty: 500,
      packUnit: "kg",
      normalizedPricePerUnit: 1.16,
      normalizedUnit: "kg",
      sourceId: "source-3",
      updatedAt: new Date(baseDate.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    }
  );
  
  // Cement 20kg Bag offers
  offers.push(
    {
      id: "offer-7",
      productId: "product-4", 
      supplierId: "supplier-3",
      rawPrice: 8.95,
      rawCurrency: "AUD",
      packQty: 20,
      packUnit: "kg",
      normalizedPricePerUnit: 0.45,
      normalizedUnit: "kg",
      sourceId: "source-3",
      updatedAt: new Date(baseDate.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    },
    {
      id: "offer-8",
      productId: "product-4",
      supplierId: "supplier-2",
      rawPrice: 9.50,
      rawCurrency: "AUD",
      packQty: 20,
      packUnit: "kg",
      normalizedPricePerUnit: 0.48,
      normalizedUnit: "kg",
      sourceId: "source-2",
      updatedAt: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    }
  );
  
  // Galvanized Bolts offers
  offers.push(
    {
      id: "offer-9",
      productId: "product-5",
      supplierId: "supplier-2",
      rawPrice: 24.50,
      rawCurrency: "AUD",
      packQty: 50,
      packUnit: "pcs",
      normalizedPricePerUnit: 0.49,
      normalizedUnit: "pcs",
      sourceId: "source-2",
      updatedAt: new Date(baseDate.getTime() - 96 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    },
    {
      id: "offer-10",
      productId: "product-5",
      supplierId: "supplier-1",
      rawPrice: 22.00,
      rawCurrency: "AUD",
      packQty: 50,
      packUnit: "pcs",
      normalizedPricePerUnit: 0.44,
      normalizedUnit: "pcs",
      sourceId: "source-1",
      updatedAt: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    }
  );
  
  // Insulation Batts offers
  offers.push(
    {
      id: "offer-11",
      productId: "product-6",
      supplierId: "supplier-2",
      rawPrice: 45.80,
      rawCurrency: "AUD",
      packQty: 8.64,
      packUnit: "sqm",
      normalizedPricePerUnit: 5.30,
      normalizedUnit: "sqm",
      sourceId: "source-2",
      updatedAt: new Date(baseDate.getTime() - 120 * 60 * 60 * 1000).toISOString(),
      inStock: true,
    }
  );
  
  return offers;
}

export const DEMO_OFFERS = createDemoOffers();

// Function to initialize demo data
export function initializeDemoData() {
  // Don't overwrite existing data
  const hasData = localStorage.getItem("price-aggregator-suppliers");
  if (hasData) return;
  
  localStorage.setItem("price-aggregator-suppliers", JSON.stringify(DEMO_SUPPLIERS));
  localStorage.setItem("price-aggregator-products", JSON.stringify(DEMO_PRODUCTS));  
  localStorage.setItem("price-aggregator-offers", JSON.stringify(DEMO_OFFERS));
  localStorage.setItem("price-aggregator-sources", JSON.stringify(DEMO_SOURCES));
}
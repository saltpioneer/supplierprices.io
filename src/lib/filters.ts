// Filtering and search utilities

import { Product, Offer, Supplier, ProductOffer, DashboardFilters } from "./types";
import { isWithinInterval, parseISO } from "date-fns";

// Fuzzy text search
export function fuzzySearch(text: string, query: string): boolean {
  if (!query) return true;
  
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  // Simple fuzzy matching - checks if all characters in query exist in order
  let queryIndex = 0;
  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === normalizedQuery.length || normalizedText.includes(normalizedQuery);
}

// Filter product offers based on dashboard filters
export function filterProductOffers(
  productOffers: ProductOffer[],
  filters: DashboardFilters
): ProductOffer[] {
  return productOffers.filter(productOffer => {
    const { product, bestOffer, bestSupplier } = productOffer;
    
    // Text search - check product name and supplier name
    if (filters.search) {
      const searchMatches = 
        fuzzySearch(product.name, filters.search) ||
        fuzzySearch(bestSupplier.name, filters.search) ||
        fuzzySearch(product.category, filters.search);
      
      if (!searchMatches) return false;
    }
    
    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }
    
    // Supplier filter
    if (filters.suppliers && filters.suppliers.length > 0) {
      if (!filters.suppliers.includes(bestSupplier.id)) {
        return false;
      }
    }
    
    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const offerDate = parseISO(bestOffer.updatedAt);
      
      if (filters.dateRange.from && filters.dateRange.to) {
        if (!isWithinInterval(offerDate, {
          start: filters.dateRange.from,
          end: filters.dateRange.to,
        })) {
          return false;
        }
      } else if (filters.dateRange.from) {
        if (offerDate < filters.dateRange.from) {
          return false;
        }
      } else if (filters.dateRange.to) {
        if (offerDate > filters.dateRange.to) {
          return false;
        }
      }
    }
    
    // In-stock filter
    if (filters.inStockOnly && !bestOffer.inStock) {
      return false;
    }
    
    return true;
  });
}

// Get unique categories from products
export function getUniqueCategories(products: Product[]): string[] {
  const categories = new Set(products.map(p => p.category));
  return Array.from(categories).sort();
}

// Get unique suppliers from offers
export function getUniqueSuppliersFromOffers(
  offers: Offer[],
  suppliers: Supplier[]
): Supplier[] {
  const supplierIds = new Set(offers.map(o => o.supplierId));
  return suppliers.filter(s => supplierIds.has(s.id));
}

// Create product offers from raw data
export function createProductOffers(
  products: Product[],
  offers: Offer[],
  suppliers: Supplier[]
): ProductOffer[] {
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));
  
  return products.map(product => {
    const productOffers = offers.filter(o => o.productId === product.id);
    
    if (productOffers.length === 0) {
      return null;
    }
    
    // Find best offer (lowest normalized price per unit)
    const bestOffer = productOffers.reduce((best, current) => 
      current.normalizedPricePerUnit < best.normalizedPricePerUnit ? current : best
    );
    
    const bestSupplier = supplierMap.get(bestOffer.supplierId);
    
    if (!bestSupplier) {
      return null;
    }
    
    // Get latest update time
    const lastUpdated = productOffers.reduce((latest, current) => 
      current.updatedAt > latest ? current.updatedAt : latest, 
      productOffers[0].updatedAt
    );
    
    return {
      product,
      bestOffer,
      bestSupplier,
      totalOffers: productOffers.length,
      otherOffers: productOffers.filter(o => o.id !== bestOffer.id),
      lastUpdated,
    };
  }).filter((po): po is ProductOffer => po !== null);
}

// Export to CSV
export function exportToCSV(productOffers: ProductOffer[]): string {
  const headers = [
    "Product",
    "Category", 
    "Unit",
    "Best Supplier",
    "Best Price",
    "Normalized Unit",
    "Other Offers",
    "Last Updated",
  ];
  
  const rows = productOffers.map(po => [
    po.product.name,
    po.product.category,
    po.product.unit,
    po.bestSupplier.name,
    po.bestOffer.normalizedPricePerUnit.toFixed(2),
    po.bestOffer.normalizedUnit,
    po.totalOffers - 1,
    new Date(po.lastUpdated).toLocaleDateString(),
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");
  
  return csvContent;
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string = "price-comparison.csv"): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
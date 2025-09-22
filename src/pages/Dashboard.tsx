import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ProductMatrixDrawer } from "@/components/product-matrix-drawer";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  Package,
  TrendingUp,
  Users,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  createProductOffers, 
  filterProductOffers, 
  getUniqueCategories,
  exportToCSV,
  downloadCSV
} from "@/lib/filters";
import { formatPrice } from "@/lib/normalize";
import { loadRates, tryConvertAmount } from "@/lib/fx";
import { getSettings } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";
import type { ProductOffer, DashboardFilters } from "@/lib/types";
import { getFavoriteProductIds, toggleFavoriteProduct, isProductFavorited } from "@/lib/storage";
import { Star, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Maximize, X } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOffer | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [counts, setCounts] = useState({ products: 0, suppliers: 0, offers: 0 });
  
  const [filters, setFilters] = useState<DashboardFilters>({
    search: "",
    category: "",
    suppliers: [],
    inStockOnly: false,
  });
  const [sortKey, setSortKey] = useState<"az" | "price" | "updated" | "offers">("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteProductIds());
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState<{ id: string; name: string; products: ProductOffer[] } | null>(null);
  const [fxVersion, setFxVersion] = useState(0);
  

  // Load data from Supabase
  const loadData = async () => {
    const [prodRes, supRes, offRes] = await Promise.all([
      supabase.from("products").select("id,name,category,unit"),
      supabase.from("suppliers").select("id,name,contact,tags"),
      supabase.from("offers").select(
        "id,product_id,supplier_id,raw_price,raw_currency,pack_qty,pack_unit,normalized_price_per_unit,normalized_unit,source_id,updated_at,in_stock"
      ),
    ]);

    if (!prodRes.error && prodRes.data) setProducts(prodRes.data);
    if (!supRes.error && supRes.data) setSuppliers(supRes.data);
    if (!offRes.error && offRes.data) setOffers(offRes.data);

    // Lightweight, accurate counts directly from DB
    const [pCount, sCount, oCount] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("offers").select("*", { count: "exact", head: true }),
    ]);
    setCounts({
      products: pCount.count ?? 0,
      suppliers: sCount.count ?? 0,
      offers: oCount.count ?? 0,
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Preload FX rates for base AUD
  useEffect(() => {
    loadRates("AUD").then(() => setFxVersion((v) => v + 1)).catch(() => {});
  }, []);

  // Re-render when settings change in localStorage (currency/precision)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "price-aggregator-settings") setFxVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Listen for navigation to refresh data when coming from upload
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Create product offers data
  const allProductOffers = useMemo(() => 
    createProductOffers(
      products.map(p => ({ id: p.id, name: p.name, category: p.category, unit: p.unit })),
      offers.map(o => ({
        id: o.id,
        productId: o.product_id,
        supplierId: o.supplier_id,
        rawPrice: Number(o.raw_price),
        rawCurrency: o.raw_currency,
        packQty: o.pack_qty != null ? Number(o.pack_qty) : undefined,
        packUnit: o.pack_unit || undefined,
        normalizedPricePerUnit: Number(o.normalized_price_per_unit),
        normalizedUnit: o.normalized_unit,
        sourceId: o.source_id,
        updatedAt: o.updated_at,
        inStock: o.in_stock ?? undefined,
      })),
      suppliers.map(s => ({ id: s.id, name: s.name, contact: s.contact || undefined, tags: s.tags || [] }))
    ), 
    [products, offers, suppliers]
  );

  // Apply filters
  const filteredProductOffers = useMemo(() => {
    const base = filterProductOffers(allProductOffers, filters);
    // sort favorites to the top (strict pinning)
    const withFavFirst = [...base].sort((a, b) => {
      const af = favoriteIds.includes(a.product.id);
      const bf = favoriteIds.includes(b.product.id);
      if (af === bf) return 0;
      return af ? -1 : 1;
    });
    const sorted = [...withFavFirst].sort((a, b) => {
      if (sortKey === "az") return a.product.name.localeCompare(b.product.name);
      if (sortKey === "price") return a.bestOffer.normalizedPricePerUnit - b.bestOffer.normalizedPricePerUnit;
      if (sortKey === "updated") return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
      // offers
      return a.totalOffers - b.totalOffers;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [allProductOffers, filters, sortKey, sortDir, favoriteIds, fxVersion]);

  const categories = useMemo(() => getUniqueCategories(
    products.map(p => ({ id: p.id, name: p.name, category: p.category, unit: p.unit }))
  ), [products]);

  // Stats
  const stats = useMemo(() => ({
    totalProducts: counts.products,
    totalSuppliers: counts.suppliers,
    totalOffers: counts.offers,
    avgSavings: allProductOffers.reduce((acc, po) => {
      const otherPrices = po.otherOffers.map(o => o.normalizedPricePerUnit);
      if (otherPrices.length === 0) return acc;
      const avgOtherPrice = otherPrices.reduce((sum, price) => sum + price, 0) / otherPrices.length;
      const savings = ((avgOtherPrice - po.bestOffer.normalizedPricePerUnit) / avgOtherPrice) * 100;
      return acc + Math.max(0, savings);
    }, 0) / Math.max(1, allProductOffers.length)
  }), [allProductOffers, counts.products, counts.suppliers, counts.offers]);

  const handleExport = () => {
    const csvContent = exportToCSV(filteredProductOffers);
    downloadCSV(csvContent, `price-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export successful",
      description: `Exported ${filteredProductOffers.length} products to CSV`,
    });
  };

  const handleViewMatrix = (productOffer: ProductOffer) => {
    setSelectedProduct(productOffer);
    setMatrixOpen(true);
  };

  const toggleFavorite = (productId: string) => {
    const next = toggleFavoriteProduct(productId);
    setFavoriteIds(next);
  };

  const openSupplierProducts = (supplierId: string, supplierName: string) => {
    // Build product list for supplier from allProductOffers
    const productsForSupplier = allProductOffers.filter(po => po.bestSupplier.id === supplierId);
    setSupplierDialog({ id: supplierId, name: supplierName, products: productsForSupplier });
    setSupplierDialogOpen(true);
  };

  // Table columns
  const columns = [
    {
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {favoriteIds.includes(row.original.product.id) && (
            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          )}
          <button
            className="font-medium text-sm underline-offset-2 hover:underline"
            onClick={() => handleViewMatrix(row.original)}
          >
            {row.original.product.name}
          </button>
        </div>
      ),
    },
    {
      accessorKey: "product.category", 
      header: "Category",
      cell: ({ row }: any) => (
        <Badge variant="secondary" className="text-[10px]">
          {row.original.product.category}
        </Badge>
      ),
    },
    {
      accessorKey: "product.unit",
      header: "Unit",
      cell: ({ row }: any) => <span className="text-xs text-muted-foreground">{row.original.product.unit}</span>,
    },
    {
      accessorKey: "bestSupplier.name",
      header: "Best Supplier",
      cell: ({ row }: any) => (
        <button
          className="font-medium text-sm underline-offset-2 hover:underline"
          onClick={() => openSupplierProducts(row.original.bestSupplier.id, row.original.bestSupplier.name)}
        >
          {row.original.bestSupplier.name}
        </button>
      ),
    },
    {
      accessorKey: "bestOffer.normalizedPricePerUnit",
      header: "Best Price",
      cell: ({ row }: any) => (
        (() => {
          const s = getSettings();
          const converted = tryConvertAmount(row.original.bestOffer.normalizedPricePerUnit, "AUD", s.baseCurrency);
          const formatted = new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: s.baseCurrency,
            minimumFractionDigits: s.roundingPrecision,
            maximumFractionDigits: s.roundingPrecision,
          }).format(converted);
          return (
            <div className="price-highlight text-sm">
              {formatted}
              <span className="text-xs text-muted-foreground ml-1">/ {row.original.bestOffer.normalizedUnit}</span>
            </div>
          );
        })()
      ),
    },
    {
      accessorKey: "totalOffers",
      header: "Other Offers",
      cell: ({ row }: any) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.totalOffers - 1}
        </Badge>
      ),
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated", 
      cell: ({ row }: any) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.lastUpdated), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active in comparison
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Price sources
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOffers}</div>
            <p className="text-xs text-muted-foreground">
              Price comparisons
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSavings.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              vs other offers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Price Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search products, suppliers..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="max-w-sm"
              />
            </div>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">In stock</span>
              <Switch
                checked={!!filters.inStockOnly}
                onCheckedChange={(v) => setFilters(prev => ({ ...prev, inStockOnly: v }))}
              />
            </div>

            <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">A–Z</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="offers">Number of offers</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
              {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="table-container">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredProductOffers}
            searchKey="product.name"
            getRowId={(row: ProductOffer) => row.product.id}
            onBulkExportCsv={(rows: ProductOffer[]) => {
              const csv = exportToCSV(rows);
              downloadCSV(csv, `selected-products-${new Date().toISOString().slice(0,10)}.csv`);
            }}
            onBulkDelete={async (rows: ProductOffer[]) => {
              // delete products (and their offers) by product id
              const productIds = rows.map(r => r.product.id);
              if (productIds.length === 0) return;
              // Delete offers first
              await supabase.from("offers").delete().in("product_id", productIds);
              // Then delete products
              await supabase.from("products").delete().in("id", productIds);
              await loadData();
              toast({ title: "Deleted", description: `Removed ${productIds.length} product(s)` });
            }}
            onRowFavoriteToggle={(row: ProductOffer) => toggleFavorite(row.product.id)}
            isRowFavorited={(row: ProductOffer) => favoriteIds.includes(row.product.id)}
          />
        </CardContent>
      </Card>

      {/* Product Matrix Drawer */}
      <ProductMatrixDrawer
        open={matrixOpen}
        onOpenChange={setMatrixOpen}
        productOffer={selectedProduct}
      />

      {/* Supplier Products Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-3xl">
          {supplierDialog && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle>Products from {supplierDialog.name}</DialogTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSupplierDialogOpen(false)
                        window.location.href = `/app/suppliers/${supplierDialog.id}`
                      }}
                      aria-label="Maximize"
                      className="rounded-sm opacity-70 hover:opacity-100"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSupplierDialogOpen(false)}
                      aria-label="Close"
                      className="rounded-sm opacity-70 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="table-header">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Best Price</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierDialog.products.map((po) => (
                      <TableRow key={po.product.id}>
                        <TableCell>
                          <button
                            className="font-medium text-sm underline-offset-2 hover:underline"
                            onClick={() => handleViewMatrix(po)}
                          >
                            {po.product.name}
                          </button>
                        </TableCell>
                        <TableCell className="price-highlight">
                          {(() => {
                            const s = getSettings();
                            const converted = tryConvertAmount(po.bestOffer.normalizedPricePerUnit, "AUD", s.baseCurrency);
                            return new Intl.NumberFormat("en-AU", {
                              style: "currency",
                              currency: s.baseCurrency,
                              minimumFractionDigits: s.roundingPrecision,
                              maximumFractionDigits: s.roundingPrecision,
                            }).format(converted);
                          })()}
                          <span className="text-xs text-muted-foreground ml-1">/ {po.bestOffer.normalizedUnit}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(po.lastUpdated), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
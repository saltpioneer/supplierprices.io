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
import { formatDistanceToNow } from "date-fns";
import type { ProductOffer, DashboardFilters } from "@/lib/types";

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
  const [sortKey, setSortKey] = useState<string>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
    if (sortKey === "price") {
      return [...base].sort((a, b) =>
        sortDir === "asc"
          ? a.bestOffer.normalizedPricePerUnit - b.bestOffer.normalizedPricePerUnit
          : b.bestOffer.normalizedPricePerUnit - a.bestOffer.normalizedPricePerUnit
      );
    }
    if (sortKey === "updated") {
      return [...base].sort((a, b) => (sortDir === "asc" ? a.lastUpdated.localeCompare(b.lastUpdated) : b.lastUpdated.localeCompare(a.lastUpdated)));
    }
    return base;
  }, [allProductOffers, filters, sortKey, sortDir]);

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

  // Table columns
  const columns = [
    {
      id: "rowNumber",
      header: "#",
      cell: ({ row }: any) => <span className="text-xs text-muted-foreground">{Number(row.id) + 1}</span>,
    },
    {
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }: any) => (
        <div className="font-medium text-sm">
          {row.original.product.name}
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
        <div className="font-medium text-sm">
          {row.original.bestSupplier.name}
        </div>
      ),
    },
    {
      accessorKey: "bestOffer.normalizedPricePerUnit",
      header: "Best Price",
      cell: ({ row }: any) => (
        <div className="price-highlight text-sm">
          {formatPrice(row.original.bestOffer.normalizedPricePerUnit)}
          <span className="text-xs text-muted-foreground ml-1">
            / {row.original.bestOffer.normalizedUnit}
          </span>
        </div>
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewMatrix(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
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

      {/* Filters */}
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

            <Select value={sortKey} onValueChange={(v) => setSortKey(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Sort by Price</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc") }>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Asc</SelectItem>
                <SelectItem value="desc">Desc</SelectItem>
              </SelectContent>
            </Select>
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
          />
        </CardContent>
      </Card>

      {/* Product Matrix Drawer */}
      <ProductMatrixDrawer
        open={matrixOpen}
        onOpenChange={setMatrixOpen}
        productOffer={selectedProduct}
      />
    </div>
  );
}
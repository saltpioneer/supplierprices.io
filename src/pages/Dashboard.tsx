import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { getProducts, getOffers, getSuppliers } from "@/lib/storage";
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
  const [products] = useState(() => getProducts());
  const [offers] = useState(() => getOffers());
  const [suppliers] = useState(() => getSuppliers());
  const [selectedProduct, setSelectedProduct] = useState<ProductOffer | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    search: "",
    category: "",
    suppliers: [],
    inStockOnly: false,
  });

  // Create product offers data
  const allProductOffers = useMemo(() => 
    createProductOffers(products, offers, suppliers), 
    [products, offers, suppliers]
  );

  // Apply filters
  const filteredProductOffers = useMemo(() => 
    filterProductOffers(allProductOffers, filters),
    [allProductOffers, filters]
  );

  const categories = useMemo(() => getUniqueCategories(products), [products]);

  // Stats
  const stats = useMemo(() => ({
    totalProducts: allProductOffers.length,
    totalSuppliers: suppliers.length,
    totalOffers: offers.length,
    avgSavings: allProductOffers.reduce((acc, po) => {
      const otherPrices = po.otherOffers.map(o => o.normalizedPricePerUnit);
      if (otherPrices.length === 0) return acc;
      const avgOtherPrice = otherPrices.reduce((sum, price) => sum + price, 0) / otherPrices.length;
      const savings = ((avgOtherPrice - po.bestOffer.normalizedPricePerUnit) / avgOtherPrice) * 100;
      return acc + Math.max(0, savings);
    }, 0) / Math.max(1, allProductOffers.length)
  }), [allProductOffers, suppliers.length, offers.length]);

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
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }: any) => (
        <div className="font-medium">
          {row.original.product.name}
        </div>
      ),
    },
    {
      accessorKey: "product.category", 
      header: "Category",
      cell: ({ row }: any) => (
        <Badge variant="secondary">
          {row.original.product.category}
        </Badge>
      ),
    },
    {
      accessorKey: "product.unit",
      header: "Unit",
    },
    {
      accessorKey: "bestSupplier.name",
      header: "Best Supplier",
      cell: ({ row }: any) => (
        <div className="font-medium">
          {row.original.bestSupplier.name}
        </div>
      ),
    },
    {
      accessorKey: "bestOffer.normalizedPricePerUnit",
      header: "Best Price",
      cell: ({ row }: any) => (
        <div className="price-highlight">
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
        <Badge variant="outline">
          {row.original.totalOffers - 1}
        </Badge>
      ),
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated", 
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
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
          <div className="flex flex-col gap-4 md:flex-row">
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
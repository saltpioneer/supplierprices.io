import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Package, 
  TrendingUp, 
  Building2,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { getProducts, getOffers, getSuppliers } from "@/lib/storage";
import { formatPrice } from "@/lib/normalize";
import { formatDistanceToNow } from "date-fns";
import type { Product, Offer, Supplier } from "@/lib/types";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [products] = useState(() => getProducts());
  const [offers] = useState(() => getOffers());
  const [suppliers] = useState(() => getSuppliers());

  const product = products.find(p => p.id === id);
  
  const productOffers = useMemo(() => {
    if (!product) return [];
    
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));
    
    return offers
      .filter(o => o.productId === product.id)
      .map(offer => ({
        ...offer,
        supplier: supplierMap.get(offer.supplierId)!,
      }))
      .filter(o => o.supplier)
      .sort((a, b) => a.normalizedPricePerUnit - b.normalizedPricePerUnit);
  }, [product, offers, suppliers]);

  const bestOffer = productOffers[0];
  
  const stats = useMemo(() => {
    if (productOffers.length === 0) return null;
    
    const prices = productOffers.map(o => o.normalizedPricePerUnit);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const savingsPercent = maxPrice > minPrice ? ((maxPrice - minPrice) / maxPrice) * 100 : 0;
    
    return {
      totalOffers: productOffers.length,
      avgPrice,
      maxPrice,
      minPrice,
      savingsPercent,
      inStockCount: productOffers.filter(o => o.inStock).length,
    };
  }, [productOffers]);

  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Product Not Found</h2>
          <Button onClick={() => navigate("/app/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (productOffers.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{product.category}</Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{product.unit}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">No Offers Available</h3>
            <p className="text-muted-foreground">
              This product doesn't have any price offers yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{product.category}</Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{product.unit}</span>
            <span className="text-muted-foreground">•</span>
            <Badge variant="outline">{stats?.totalOffers} offers</Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold price-highlight">
                {formatPrice(stats.minPrice)}
              </div>
              <p className="text-xs text-muted-foreground">
                per {bestOffer?.normalizedUnit}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(stats.avgPrice)}
              </div>
              <p className="text-xs text-muted-foreground">
                across all offers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Savings</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {stats.savingsPercent.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                vs highest price
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.inStockCount}
              </div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalOffers} offers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Comparison Matrix */}
      <Card className="table-container">
        <CardHeader>
          <CardTitle>Price Comparison Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header">
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Normalized Price</TableHead>
                <TableHead>Raw Price</TableHead>
                <TableHead>Pack Size</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productOffers.map((offer, index) => (
                <TableRow key={offer.id} className="table-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{offer.supplier.name}</span>
                      {index === 0 && (
                        <Badge variant="default" className="ml-2">
                          Best
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={index === 0 ? "price-highlight" : "font-medium"}>
                      {formatPrice(offer.normalizedPricePerUnit)}
                      <span className="text-xs text-muted-foreground ml-1">
                        / {offer.normalizedUnit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatPrice(offer.rawPrice)} {offer.rawCurrency}
                  </TableCell>
                  <TableCell>
                    {offer.packQty ? `${offer.packQty} ${offer.packUnit}` : "-"}
                  </TableCell>
                  <TableCell>
                    {offer.inStock ? (
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        In Stock
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Out of Stock
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(offer.updatedAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {offer.sourceId.replace('source-', 'Source ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
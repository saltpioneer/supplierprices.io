import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Building2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  TrendingUp
} from "lucide-react";
import { getOffers, getSuppliers } from "@/lib/storage";
import { formatPrice } from "@/lib/normalize";
import { formatDistanceToNow } from "date-fns";
import type { ProductOffer } from "@/lib/types";

interface ProductMatrixDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productOffer: ProductOffer | null;
}

export function ProductMatrixDrawer({ 
  open, 
  onOpenChange, 
  productOffer 
}: ProductMatrixDrawerProps) {
  const [offers] = useState(() => getOffers());
  const [suppliers] = useState(() => getSuppliers());

  const allOffers = useMemo(() => {
    if (!productOffer) return [];
    
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));
    
    return offers
      .filter(o => o.productId === productOffer.product.id)
      .map(offer => ({
        ...offer,
        supplier: supplierMap.get(offer.supplierId)!,
      }))
      .filter(o => o.supplier)
      .sort((a, b) => a.normalizedPricePerUnit - b.normalizedPricePerUnit);
  }, [productOffer, offers, suppliers]);

  const stats = useMemo(() => {
    if (allOffers.length === 0) return null;
    
    const prices = allOffers.map(o => o.normalizedPricePerUnit);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    return {
      totalOffers: allOffers.length,
      avgPrice,
      maxPrice,
      minPrice,
      inStockCount: allOffers.filter(o => o.inStock).length,
    };
  }, [allOffers]);

  if (!productOffer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:w-[900px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {productOffer.product.name}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Product Info */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{productOffer.product.category}</Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{productOffer.product.unit}</span>
            <span className="text-muted-foreground">•</span>
            <Badge variant="outline">{stats?.totalOffers} offers</Badge>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Best Price</p>
                <p className="text-2xl font-bold price-highlight">
                  {formatPrice(stats.minPrice)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Average Price</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.avgPrice)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">In Stock</p>
                <p className="text-lg font-semibold text-success">
                  {stats.inStockCount} of {stats.totalOffers}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Max Savings</p>
                <p className="text-lg font-semibold text-success">
                  {stats.maxPrice > stats.minPrice 
                    ? (((stats.maxPrice - stats.minPrice) / stats.maxPrice) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Offers Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader className="table-header">
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Normalized Price</TableHead>
                  <TableHead>Raw Price</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOffers.map((offer, index) => (
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
                      <div className="text-sm">
                        {formatPrice(offer.rawPrice)} {offer.rawCurrency}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {offer.packQty ? `${offer.packQty} ${offer.packUnit}` : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.inStock ? (
                        <div className="flex items-center gap-1 text-success text-sm">
                          <CheckCircle className="h-3 w-3" />
                          In Stock
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <XCircle className="h-3 w-3" />
                          Out of Stock
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(offer.updatedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
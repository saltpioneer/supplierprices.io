import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
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
  const [offers, setOffers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Load data from Supabase when dialog opens
  useEffect(() => {
    if (!open || !productOffer) return;
    
    const load = async () => {
      const [offRes, supRes] = await Promise.all([
        supabase.from("offers").select(
          "id,product_id,supplier_id,raw_price,raw_currency,pack_qty,pack_unit,normalized_price_per_unit,normalized_unit,source_id,updated_at,in_stock"
        ),
        supabase.from("suppliers").select("id,name,contact,tags"),
      ]);

      if (!offRes.error && offRes.data) {
        setOffers(offRes.data.map(o => ({
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
        })));
      }
      if (!supRes.error && supRes.data) {
        setSuppliers(supRes.data.map(s => ({ 
          id: s.id, 
          name: s.name, 
          contact: s.contact || undefined, 
          tags: s.tags || [] 
        })));
      }
    };
    
    load();
  }, [open, productOffer]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {productOffer.product.name}
          </DialogTitle>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Package, Clock, Maximize } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { formatPrice } from "@/lib/normalize";
import { getSettings } from "@/lib/storage";
import { tryConvertAmount } from "@/lib/fx";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, o, p] = await Promise.all([
        supabase.from("suppliers").select("id,name,contact,tags").eq("id", id!).maybeSingle(),
        supabase.from("offers").select("id,product_id,supplier_id,normalized_price_per_unit,normalized_unit,raw_price,raw_currency,updated_at,in_stock").eq("supplier_id", id!),
        supabase.from("products").select("id,name,category,unit"),
      ]);
      if (!s.error) setSupplier(s.data);
      if (!o.error && o.data) setOffers(o.data);
      if (!p.error && p.data) setProducts(p.data);
    };
    if (id) load();
  }, [id]);

  const items = useMemo(() => {
    const productMap = new Map<string, any>();
    for (const o of offers) {
      const prod = products.find((p) => p.id === o.product_id);
      if (!prod) continue;
      const key = prod.id;
      const entry = productMap.get(key) || {
        product: prod,
        bestOffer: o,
        lastUpdated: o.updated_at,
      };
      if (o.normalized_price_per_unit < entry.bestOffer.normalized_price_per_unit) {
        entry.bestOffer = o;
      }
      if (o.updated_at > entry.lastUpdated) entry.lastUpdated = o.updated_at;
      productMap.set(key, entry);
    }
    return Array.from(productMap.values()).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [offers, products]);

  if (!supplier) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center text-muted-foreground">Loading supplier...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {supplier?.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {supplier?.contact && <span className="text-muted-foreground">{supplier.contact}</span>}
            {supplier?.tags?.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                {supplier.tags.slice(0, 3).map((t: string) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Products from supplier */}
      <Card className="table-container">
        <CardHeader>
          <CardTitle>Products ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Best Price</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const s = getSettings();
                const converted = tryConvertAmount(Number(it.bestOffer.normalized_price_per_unit), "AUD", s.baseCurrency);
                const formatted = new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: s.baseCurrency,
                  minimumFractionDigits: s.roundingPrecision,
                  maximumFractionDigits: s.roundingPrecision,
                }).format(converted);
                return (
                  <TableRow key={it.product.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {it.product.name}
                    </TableCell>
                    <TableCell className="price-highlight">
                      {formatted}
                      <span className="text-xs text-muted-foreground ml-1">/ {it.bestOffer.normalized_unit}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(it.lastUpdated), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}



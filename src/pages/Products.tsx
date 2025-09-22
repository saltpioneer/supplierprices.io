import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getProducts, getOffers } from "@/lib/storage";

export default function Products() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(() => getProducts());
  const [offers, setOffers] = useState(() => getOffers());

  useEffect(() => {
    setProducts(getProducts());
    setOffers(getOffers());
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, { name: string; category: string; unit: string; offerCount: number }>();
    for (const p of products) {
      map.set(p.id, { name: p.name, category: p.category, unit: p.unit, offerCount: 0 });
    }
    for (const o of offers) {
      const item = map.get(o.productId);
      if (item) item.offerCount += 1;
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, offers, search]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Search and drill into product pricing</p>
        </div>
        <div className="w-64">
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="table-container">
        <CardHeader>
          <CardTitle>Catalog ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Offers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{r.category}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.unit}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.offerCount}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/app/products/${r.id}`)}>View</Button>
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



import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { getInventory, upsertInventory, getProducts } from "@/lib/storage";
import type { InventoryItem } from "@/lib/types";

export default function Inventory() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const products = useMemo(() => getProducts(), []);

  useEffect(() => setRows(getInventory()), []);

  const filtered = rows.filter(r => (products.find(p => p.id === r.productId)?.name || "").toLowerCase().includes(search.toLowerCase()));

  const adjust = (id: string, delta: number) => {
    const current = rows.find(r => r.id === id);
    if (!current) return;
    const next = { ...current, onHand: Math.max(0, current.onHand + delta), updatedAt: new Date().toISOString() };
    upsertInventory(next);
    setRows(rows.map(r => (r.id === id ? next : r)));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track on-hand quantities</p>
        </div>
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Stock ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const p = products.find(p => p.id === r.productId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{p?.name || r.productId}</TableCell>
                    <TableCell>{r.onHand}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.unit}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => adjust(r.id, 1)}>+1</Button>
                      <Button size="sm" variant="outline" onClick={() => adjust(r.id, -1)}>-1</Button>
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



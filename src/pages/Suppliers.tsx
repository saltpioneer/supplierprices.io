import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Edit, 
  Tag,
  Building2,
  Mail,
  Phone,
  ArrowUp,
  ArrowDown,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import type { Supplier } from "@/lib/types";
import { downloadCSV } from "@/lib/filters";

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    tags: [] as string[],
  });
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listDialogData, setListDialogData] = useState<{ id: string; name: string; items: { id: string; name: string; updatedAt: string | null }[] } | null>(null);
  const [sortKey, setSortKey] = useState<"az" | "offers" | "updated">("az");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Load suppliers, products, and offers from Supabase
  useEffect(() => {
    const load = async () => {
      const [supRes, offRes] = await Promise.all([
        supabase.from("suppliers").select("id,name,contact,tags"),
        supabase.from("offers").select("id,product_id,supplier_id,updated_at"),
      ]);
      if (!supRes.error && supRes.data) setSuppliers(supRes.data);
      if (!offRes.error && offRes.data) setOffers(offRes.data);
      const prodRes = await supabase.from("products").select("id,name");
      if (!prodRes.error && prodRes.data) setProducts(prodRes.data);
    };
    load();
  }, []);

  // Get offer stats per supplier (fix field names)
  const supplierStats = useMemo(() => suppliers.map((supplier) => {
    const supplierOffers = offers.filter((o) => o.supplier_id === supplier.id);
    const lastUpdated = supplierOffers.length > 0
      ? supplierOffers.reduce((latest: string, current: any) =>
          (current.updated_at || "") > latest ? current.updated_at : latest,
          supplierOffers[0].updated_at || ""
        )
      : null;
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact || "",
      tags: supplier.tags || [],
      offerCount: supplierOffers.length,
      lastUpdated,
    };
  }), [suppliers, offers]);

  const sortedSuppliers = useMemo(() => {
    const arr = [...supplierStats];
    arr.sort((a, b) => {
      if (sortKey === "az") {
        return a.name.localeCompare(b.name);
      }
      if (sortKey === "offers") {
        return a.offerCount - b.offerCount;
      }
      // updated
      const ta = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const tb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return ta - tb;
    });
    return sortDir === "asc" ? arr : arr.reverse();
  }, [supplierStats, sortKey, sortDir]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact: supplier.contact || "",
        tags: supplier.tags || [],
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        contact: "",
        tags: [],
      });
    }
    setDialogOpen(true);
  };
  const openSupplierProducts = (supplierId: string, supplierName: string) => {
    const itemsMap = new Map<string, { id: string; name: string; updatedAt: string | null }>();
    for (const o of offers) {
      if (o.supplier_id !== supplierId) continue;
      const prod = products.find((p) => p.id === o.product_id);
      if (!prod) continue;
      const current = itemsMap.get(prod.id);
      const upd = o.updated_at || null;
      if (!current) {
        itemsMap.set(prod.id, { id: prod.id, name: prod.name, updatedAt: upd });
      } else if (upd && (!current.updatedAt || upd > current.updatedAt)) {
        current.updatedAt = upd;
      }
    }
    setListDialogData({ id: supplierId, name: supplierName, items: Array.from(itemsMap.values()) });
    setListDialogOpen(true);
  };

  const exportSuppliersCsv = (rows: any[]) => {
    const header = ["Supplier","Contact","Tags","Offers","Last Updated"];
    const lines = rows.map((r) => [
      r.name,
      r.contact || "",
      (r.tags || []).join(";"),
      String(r.offerCount),
      r.lastUpdated || "",
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadCSV(csv, `suppliers-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const deleteSuppliers = async (rows: any[]) => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    await supabase.from("offers").delete().in("supplier_id", ids);
    await supabase.from("suppliers").delete().in("id", ids);
    const [supRes, offRes] = await Promise.all([
      supabase.from("suppliers").select("id,name,contact,tags"),
      supabase.from("offers").select("id,product_id,supplier_id,updated_at"),
    ]);
    if (!supRes.error && supRes.data) setSuppliers(supRes.data);
    if (!offRes.error && offRes.data) setOffers(offRes.data);
    toast({ title: "Deleted", description: `Removed ${ids.length} supplier(s)` });
  };

  const handleRowDelete = async (row: any) => deleteSuppliers([row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a supplier name",
        variant: "destructive",
      });
      return;
    }

    const supplierData = {
      name: formData.name.trim(),
      contact: formData.contact.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    };

    if (editingSupplier) {
      const { error } = await supabase
        .from("suppliers")
        .update({ name: supplierData.name, contact: supplierData.contact, tags: supplierData.tags || [] })
        .eq("id", editingSupplier.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Supplier updated", description: `${supplierData.name} has been updated` });
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from("suppliers")
        .insert([{ id, name: supplierData.name, contact: supplierData.contact, tags: supplierData.tags || [] }]);
      if (error) {
        toast({ title: "Insert failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Supplier added", description: `${supplierData.name} has been added to your supplier list` });
    }

    // Refresh lists
    const [supRes, offRes] = await Promise.all([
      supabase.from("suppliers").select("id,name,contact,tags"),
      supabase.from("offers").select("id,supplier_id,updated_at"),
    ]);
    if (!supRes.error && supRes.data) setSuppliers(supRes.data);
    if (!offRes.error && offRes.data) setOffers(offRes.data);
    setDialogOpen(false);
  };

  const handleTagsChange = (tagsText: string) => {
    const tags = tagsText
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (suppliers.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No Suppliers Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Add your first supplier to start tracking their price offers.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier network and track their offerings
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <Card className="table-container data-grid-compact">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Supplier Directory ({suppliers.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="az">A–Z</SelectItem>
                  <SelectItem value="offers">Number of offers</SelectItem>
                  <SelectItem value="updated">Last updated</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                accessorKey: "name",
                header: "Supplier",
                cell: ({ row }: any) => (
                  <button className="font-medium text-sm underline-offset-2 hover:underline flex items-center gap-2" onClick={() => openSupplierProducts(row.original.id, row.original.name)}>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {row.original.name}
                  </button>
                ),
              },
              {
                id: "contact",
                header: "Contact",
                cell: ({ row }: any) => (
                  row.original.contact ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {row.original.contact.includes("@") ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                      {row.original.contact}
                    </div>
                  ) : <span className="text-muted-foreground">-</span>
                ),
              },
              {
                id: "tags",
                header: "Tags",
                cell: ({ row }: any) => (
                  <div className="flex flex-wrap gap-1">
                    {row.original.tags?.length > 0 ? row.original.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    )) : <span className="text-muted-foreground">-</span>}
                  </div>
                ),
              },
              {
                accessorKey: "offerCount",
                header: "Offers",
                cell: ({ row }: any) => (
                  <Badge variant="outline">{row.original.offerCount}</Badge>
                ),
              },
              {
                accessorKey: "lastUpdated",
                header: "Last Updated",
                cell: ({ row }: any) => (
                  <span className="text-xs text-muted-foreground">
                    {row.original.lastUpdated ? formatDistanceToNow(new Date(row.original.lastUpdated), { addSuffix: true }) : "Never"}
                  </span>
                ),
              },
            ]}
            data={sortedSuppliers}
            searchKey="name"
            getRowId={(row: any) => row.id}
            onRowEdit={(row: any) => handleOpenDialog(row)}
            onRowDelete={handleRowDelete}
            onBulkExportCsv={exportSuppliersCsv}
            onBulkDelete={deleteSuppliers}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter supplier name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="contact">Contact (optional)</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                placeholder="Email or phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="tags">Tags (optional)</Label>
              <Textarea
                id="tags"
                value={formData.tags.join(", ")}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="Enter tags separated by commas (e.g., Metal, Bulk, Local)"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSupplier ? "Update" : "Add"} Supplier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier products list dialog */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="max-w-2xl">
          {listDialogData && (
            <>
              <DialogHeader>
                <DialogTitle>Products from {listDialogData.name}</DialogTitle>
              </DialogHeader>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="table-header">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listDialogData.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-sm">{it.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.updatedAt ? formatDistanceToNow(new Date(it.updatedAt), { addSuffix: true }) : "Never"}
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Phone
} from "lucide-react";
import { getSuppliers, getOffers, addSupplier, updateSupplier } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";
import type { Supplier } from "@/lib/types";

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(() => getSuppliers());
  const [offers] = useState(() => getOffers());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    tags: [] as string[],
  });

  // Get offer stats per supplier
  const supplierStats = suppliers.map(supplier => {
    const supplierOffers = offers.filter(o => o.supplierId === supplier.id);
    const lastUpdated = supplierOffers.length > 0 
      ? supplierOffers.reduce((latest, current) => 
          current.updatedAt > latest ? current.updatedAt : latest, 
          supplierOffers[0].updatedAt
        )
      : null;

    return {
      ...supplier,
      offerCount: supplierOffers.length,
      lastUpdated,
    };
  });

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

  const handleSubmit = (e: React.FormEvent) => {
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
      updateSupplier(editingSupplier.id, supplierData);
      toast({
        title: "Supplier updated",
        description: `${supplierData.name} has been updated`,
      });
    } else {
      const newSupplier: Supplier = {
        id: `supplier-${Date.now()}`,
        ...supplierData,
      };
      addSupplier(newSupplier);
      toast({
        title: "Supplier added",
        description: `${supplierData.name} has been added to your supplier list`,
      });
    }

    setSuppliers(getSuppliers());
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

      <Card className="table-container">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Supplier Directory ({suppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header">
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Offers</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierStats.map((supplier) => (
                <TableRow key={supplier.id} className="table-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{supplier.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.contact ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {supplier.contact.includes("@") ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <Phone className="h-3 w-3" />
                        )}
                        {supplier.contact}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {supplier.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      )) || <span className="text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {supplier.offerCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplier.lastUpdated 
                      ? formatDistanceToNow(new Date(supplier.lastUpdated), { addSuffix: true })
                      : "Never"
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
}
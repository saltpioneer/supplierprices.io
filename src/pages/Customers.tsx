import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/storage";
import type { Customer } from "@/lib/types";

export default function Customers() {
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => { setCustomersState(getCustomers()); }, []);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase()));

  const onSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateCustomer(editing.id, { name: form.name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined });
      setCustomersState(getCustomers());
    } else {
      const row: Customer = { id: crypto.randomUUID(), name: form.name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, createdAt: new Date().toISOString() };
      addCustomer(row);
      setCustomersState([row, ...customers]);
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: "", email: "", phone: "" });
  };

  const onEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, email: c.email || "", phone: c.phone || "" }); setOpen(true); };
  const onDelete = (id: string) => { deleteCustomer(id); setCustomersState(getCustomers()); };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customer accounts and contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setForm({ name: "", email: "", phone: "" }); }}>
                <Plus className="h-4 w-4 mr-2" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Customers ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || c.phone || "-"}</TableCell>
                  <TableCell>{(c.tags || []).map(t => (<Badge key={t} variant="secondary" className="text-[10px] mr-1">{t}</Badge>))}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Delete</Button>
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



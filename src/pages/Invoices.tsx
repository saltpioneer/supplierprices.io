import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus } from "lucide-react";
import { getInvoices, addInvoice, updateInvoice, getCustomers } from "@/lib/storage";
import type { InvoiceDoc } from "@/lib/types";

export default function Invoices() {
  const [rows, setRows] = useState<InvoiceDoc[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", description: "", qty: 1, unit: "pcs", unitPrice: 0 });
  const customers = useMemo(() => getCustomers(), []);

  useEffect(() => setRows(getInvoices()), []);

  const filtered = rows.filter(r =>
    r.items.some(i => i.description.toLowerCase().includes(search.toLowerCase())) ||
    (customers.find(c => c.id === r.customerId)?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const create = () => {
    if (!form.customerId || !form.description.trim()) return;
    const item = { description: form.description.trim(), qty: Number(form.qty) || 1, unit: form.unit, unitPrice: Number(form.unitPrice) || 0 };
    const subtotal = item.qty * item.unitPrice;
    const row: InvoiceDoc = {
      id: crypto.randomUUID(),
      customerId: form.customerId,
      issueDate: new Date().toISOString().slice(0, 10),
      status: "issued",
      currency: "AUD",
      items: [item],
      subtotal,
      total: subtotal,
    };
    addInvoice(row);
    setRows([row, ...rows]);
    setOpen(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Issue and track invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <select className="w-full border rounded h-9 px-3 text-sm" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Qty" value={form.qty} onChange={e => setForm({ ...form, qty: Number(e.target.value) })} />
                  <Input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                  <Input type="number" placeholder="Unit Price" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) })} />
                </div>
                <div className="flex justify-end"><Button onClick={create}>Create</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Invoices ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="text-sm">{inv.issueDate}</TableCell>
                  <TableCell>{customers.find(c => c.id === inv.customerId)?.name || "-"}</TableCell>
                  <TableCell><Badge variant={inv.status === "paid" ? "secondary" : inv.status === "overdue" ? "destructive" : "outline"}>{inv.status}</Badge></TableCell>
                  <TableCell className="font-medium">{inv.currency} {inv.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}



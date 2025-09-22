import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Receipt, Plus } from "lucide-react";
import { getOrders, addOrder as addOrderLocal, updateOrder } from "@/lib/storage";
import type { OrderRecord } from "@/lib/types";

type Order = OrderRecord;

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", product: "", quantity: 1 });

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  const addOrder = () => {
    const id = crypto.randomUUID();
    const newOrder: Order = {
      id,
      supplier: form.supplier || "Unknown Supplier",
      product: form.product || "Unnamed Product",
      quantity: Number(form.quantity) || 1,
      status: "open",
      date: new Date().toISOString().slice(0, 10),
    };
    addOrderLocal(newOrder);
    setOrders(prev => [newOrder, ...prev]);
    setDialogOpen(false);
  };

  const generateInvoice = (orderId: string) => {
    const invoiceId = `INV-${orderId.slice(0, 8).toUpperCase()}`;
    updateOrder(orderId, { status: "invoiced", invoiceId });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "invoiced", invoiceId } : o));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders & Invoices</h1>
          <p className="text-muted-foreground">Track orders and generate invoices per order</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Acme Metals" />
              </div>
              <div>
                <Label>Product</Label>
                <Input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Rebar #5" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={addOrder}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {o.date}</TableCell>
                  <TableCell>{o.supplier}</TableCell>
                  <TableCell>{o.product}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "paid" ? "secondary" : o.status === "invoiced" ? "outline" : "default"}>{o.status}</Badge>
                  </TableCell>
                  <TableCell>{o.invoiceId ?? "-"}</TableCell>
                  <TableCell className="space-x-2">
                    {o.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => generateInvoice(o.id)}>Generate Invoice</Button>
                    )}
                    {o.status === "invoiced" && (
                      <Select onValueChange={(val) => setOrders(prev => prev.map(or => or.id === o.id ? { ...or, status: val as Order["status"] } : or))}>
                        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Mark as" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
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



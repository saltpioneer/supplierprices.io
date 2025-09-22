import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { addPurchaseReceipt } from "@/lib/storage";
import type { PurchaseReceiptDoc, PurchaseReceiptItem, PurchaseReceiptTax } from "@/lib/types";

const today = () => new Date();
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtTime = (d: Date) => d.toTimeString().slice(0, 8);

export default function PurchaseReceiptNew() {
  const [namingSeries] = useState("MAT-PRE-.YYYY-");
  const [supplier, setSupplier] = useState("");
  const [supplierDeliveryNote, setSupplierDeliveryNote] = useState("");
  const [postingDate, setPostingDate] = useState(fmtDate(today()));
  const [postingTime, setPostingTime] = useState(fmtTime(today()));
  const [setPosting, setSetPosting] = useState(false);
  const [applyPutawayRule, setApplyPutawayRule] = useState(false);
  const [isReturn, setIsReturn] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "AUD" | "EUR" | "GBP">("USD");
  const [acceptedWarehouse, setAcceptedWarehouse] = useState("");
  const [rejectedWarehouse, setRejectedWarehouse] = useState("");
  const [isSubcontracted, setIsSubcontracted] = useState(false);

  const [items, setItems] = useState<PurchaseReceiptItem[]>([{
    id: crypto.randomUUID(),
    itemCode: "",
    acceptedQty: 0,
    rejectedQty: 0,
    unit: "pcs",
    rate: 0,
    amount: 0,
  }]);

  const [taxes, setTaxes] = useState<PurchaseReceiptTax[]>([]);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [roundingAdjustment, setRoundingAdjustment] = useState(0);
  const [disableRoundedTotal, setDisableRoundedTotal] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (it.acceptedQty * it.rate), 0);
    const totalQty = items.reduce((s, it) => s + it.acceptedQty, 0);
    const taxesAdded = taxes.filter(t => t.type === "addition").reduce((s, t) => s + t.amount, 0);
    const taxesDeducted = taxes.filter(t => t.type === "deduction").reduce((s, t) => s + t.amount, 0);
    const totalTaxesAndCharges = taxesAdded - taxesDeducted;
    const grandTotal = subtotal + totalTaxesAndCharges - (additionalDiscount || 0);
    const roundedTotal = disableRoundedTotal ? undefined : Math.round(grandTotal + roundingAdjustment);
    return { totalQty, subtotal, taxesAdded, taxesDeducted, totalTaxesAndCharges, grandTotal, roundingAdjustment, roundedTotal, disableRoundedTotal, additionalDiscount };
  }, [items, taxes, additionalDiscount, roundingAdjustment, disableRoundedTotal]);

  const updateItem = (id: string, patch: Partial<PurchaseReceiptItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch, amount: ((patch.acceptedQty ?? it.acceptedQty) * (patch.rate ?? it.rate)) } : it));
  };

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), itemCode: "", acceptedQty: 0, rejectedQty: 0, unit: "pcs", rate: 0, amount: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const addTax = (type: "addition" | "deduction") => {
    const id = crypto.randomUUID();
    setTaxes(prev => [...prev, { id, type, accountHead: "", taxRate: 0, amount: 0 }]);
  };
  const updateTax = (id: string, patch: Partial<PurchaseReceiptTax>) => {
    setTaxes(prev => prev.map(t => t.id === id ? { ...t, ...patch, amount: ((patch.taxRate ?? t.taxRate) / 100) * totals.subtotal } : t));
  };
  const removeTax = (id: string) => setTaxes(prev => prev.filter(t => t.id !== id));

  const onSave = () => {
    const doc: PurchaseReceiptDoc = {
      id: `PR-${Date.now()}`,
      namingSeries,
      supplier,
      supplierDeliveryNote,
      postingDate,
      postingTime,
      setPostingTime: setPosting,
      applyPutawayRule,
      isReturn,
      acceptedWarehouse,
      rejectedWarehouse,
      isSubcontracted,
      currency,
      items,
      taxes,
      totals: {
        totalQty: totals.totalQty,
        subtotal: totals.subtotal,
        taxesAdded: totals.taxesAdded,
        taxesDeducted: totals.taxesDeducted,
        totalTaxesAndCharges: totals.totalTaxesAndCharges,
        additionalDiscount,
        grandTotal: totals.grandTotal,
        roundingAdjustment,
        roundedTotal: totals.roundedTotal,
        disableRoundedTotal,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
    };
    addPurchaseReceipt(doc);
    alert("Purchase Receipt saved");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Purchase Receipt</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => addTax("addition")}>Add Tax</Button>
          <Button variant="outline" onClick={() => addTax("deduction")}>Add Deduction</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Series</label>
            <Input value={namingSeries} readOnly />
          </div>
          <div>
            <label className="text-sm">Supplier</label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="supplier" />
          </div>
          <div>
            <label className="text-sm">Supplier Delivery Note</label>
            <Input value={supplierDeliveryNote} onChange={e => setSupplierDeliveryNote(e.target.value)} placeholder="supplier_delivery_note" />
          </div>
          <div>
            <label className="text-sm">Date</label>
            <Input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Posting Time</label>
            <Input type="time" value={postingTime} onChange={e => setPostingTime(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Checkbox checked={setPosting} onCheckedChange={v => setSetPosting(Boolean(v))} />
            <span className="text-sm">Edit Posting Date and Time</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={applyPutawayRule} onCheckedChange={v => setApplyPutawayRule(Boolean(v))} />
            <span className="text-sm">Apply Putaway Rule</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isReturn} onCheckedChange={v => setIsReturn(Boolean(v))} />
            <span className="text-sm">Is Return</span>
          </div>
          <div>
            <label className="text-sm">Currency</label>
            <select className="w-full border rounded h-9 px-3 text-sm" value={currency} onChange={e => setCurrency(e.target.value as any)}>
              <option value="USD">USD</option>
              <option value="AUD">AUD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Accepted Warehouse</label>
            <Input value={acceptedWarehouse} onChange={e => setAcceptedWarehouse(e.target.value)} placeholder="set_warehouse" />
          </div>
          <div>
            <label className="text-sm">Rejected Warehouse</label>
            <Input value={rejectedWarehouse} onChange={e => setRejectedWarehouse(e.target.value)} placeholder="rejected_warehouse" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isSubcontracted} onCheckedChange={v => setIsSubcontracted(Boolean(v))} />
            <span className="text-sm">Is Subcontracted</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Accepted Quantity</TableHead>
                <TableHead>Rejected Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Rate ({currency})</TableHead>
                <TableHead>Amount ({currency})</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={it.id}>
                  <TableCell className="text-xs">{idx + 1}</TableCell>
                  <TableCell><Input value={it.itemCode} onChange={e => updateItem(it.id, { itemCode: e.target.value })} placeholder="item_code" /></TableCell>
                  <TableCell><Input type="number" value={it.acceptedQty} onChange={e => updateItem(it.id, { acceptedQty: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" value={it.rejectedQty} onChange={e => updateItem(it.id, { rejectedQty: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input value={it.unit} onChange={e => updateItem(it.id, { unit: e.target.value })} /></TableCell>
                  <TableCell><Input type="number" value={it.rate} onChange={e => updateItem(it.id, { rate: Number(e.target.value) })} /></TableCell>
                  <TableCell className="font-medium">{(it.acceptedQty * it.rate).toFixed(2)}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => removeItem(it.id)}>Remove</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-3"><Button size="sm" onClick={addItem}>Add Item</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Taxes and Charges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {taxes.length === 0 && <div className="text-sm text-muted-foreground">No Data</div>}
          {taxes.map((t) => (
            <div key={t.id} className="grid grid-cols-5 gap-2">
              <select className="border rounded h-9 px-2 text-sm" value={t.type} onChange={e => updateTax(t.id, { type: e.target.value as any })}>
                <option value="addition">Addition</option>
                <option value="deduction">Deduction</option>
              </select>
              <Input placeholder="Account Head" value={t.accountHead} onChange={e => updateTax(t.id, { accountHead: e.target.value })} />
              <Input type="number" placeholder="Tax Rate %" value={t.taxRate} onChange={e => updateTax(t.id, { taxRate: Number(e.target.value) })} />
              <div className="flex items-center">{t.amount.toFixed(2)}</div>
              <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => removeTax(t.id)}>Remove</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>Total Quantity
            <div className="font-medium">{totals.totalQty}</div>
          </div>
          <div>Total ({currency})
            <div className="font-medium">{totals.subtotal.toFixed(2)}</div>
          </div>
          <div>Taxes and Charges Added ({currency})
            <div className="font-medium">{totals.taxesAdded.toFixed(2)}</div>
          </div>
          <div>Taxes and Charges Deducted ({currency})
            <div className="font-medium">{totals.taxesDeducted.toFixed(2)}</div>
          </div>
          <div>Total Taxes and Charges ({currency})
            <div className="font-medium">{totals.totalTaxesAndCharges.toFixed(2)}</div>
          </div>
          <Separator className="my-2 md:col-span-3" />
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm">Additional Discount</label>
              <Input type="number" value={additionalDiscount} onChange={e => setAdditionalDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm">Rounding Adjustment</label>
              <Input type="number" value={roundingAdjustment} onChange={e => setRoundingAdjustment(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Checkbox checked={disableRoundedTotal} onCheckedChange={v => setDisableRoundedTotal(Boolean(v))} />
              <span>Disable Rounded Total</span>
            </div>
          </div>
          <div>Grand Total ({currency})
            <div className="font-medium">{totals.grandTotal.toFixed(2)}</div>
          </div>
          <div>Rounded Total ({currency})
            <div className="font-medium">{totals.roundedTotal?.toFixed(2) ?? "-"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



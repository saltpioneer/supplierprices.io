import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/file-dropzone";
import { ColumnMapper } from "@/components/column-mapper";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Table } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ParsedData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName?: string;
}

export default function Upload() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [textInput, setTextInput] = useState("");

  // Robust-ish CSV/TSV parsing (handles quoted fields)
  const parseDelimitedLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Minimal CSV/TSV parser for pasted text and simple files
  const parseTextToData = (text: string, fileName?: string): ParsedData => {
    const raw = (text || "").replace(/\r\n/g, "\n").trim();
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [], fileName };
    }
    // Detect delimiter: prefer tab, then comma, then semicolon
    const headerLine = lines[0];
    const tabCount = (headerLine.match(/\t/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount = (headerLine.match(/;/g) || []).length;
    const delimiter = tabCount >= commaCount && tabCount >= semiCount
      ? "\t"
      : commaCount >= semiCount
        ? ","
        : ";";

    const headerTokens = parseDelimitedLine(headerLine, delimiter).map((h) => h.trim());
    // If only a single line was provided, treat it as data (no headers)
    if (lines.length === 1) {
      const headers = headerTokens.map((_, idx) => `Column ${idx + 1}`);
      const row: Record<string, string | number> = {};
      headers.forEach((header, index) => {
        const cellRaw = (headerTokens[index] ?? "").trim();
        const maybeNum = Number(cellRaw.replace(/,/g, ""));
        row[header] = isFinite(maybeNum) && cellRaw !== "" ? maybeNum : cellRaw;
      });
      return { headers, rows: [row], fileName };
    }

    const headers = headerTokens;
    const rows = lines.slice(1).map((line) => {
      const values = parseDelimitedLine(line, delimiter);
      const row: Record<string, string | number> = {};
      headers.forEach((header, index) => {
        const cellRaw = (values[index] ?? "").trim();
        // Try to coerce numeric
        const maybeNum = Number(cellRaw.replace(/,/g, ""));
        row[header] = isFinite(maybeNum) && cellRaw !== "" ? maybeNum : cellRaw;
      });
      return row;
    });
    return { headers, rows, fileName };
  };

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      toast({ title: "No file", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    try {
      // Only parse CSV/TSV/plain text. For PDFs/Excels, ask user to paste/export CSV.
      const nameLower = (file.name || "").toLowerCase();
      const typeLower = (file.type || "").toLowerCase();
      if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || typeLower.includes('spreadsheet')) {
        toast({ title: "Excel not supported yet", description: "Please export your sheet to CSV and upload that.", variant: "destructive" });
        return;
      }
      if (nameLower.endsWith('.pdf') || typeLower.includes('pdf')) {
        toast({ title: "PDF parsing not supported", description: "Please paste table text or upload a CSV.", variant: "destructive" });
        return;
      }
      const text = await file.text();
      const parsed = parseTextToData(text, file.name);
      if (parsed.rows.length === 0) {
        toast({ title: "No rows detected", description: `${file.name}: Could not detect any data rows. Try pasting text or ensure CSV/TSV format.`, variant: "destructive" });
        return;
      }
      setParsedData(parsed);
      setStep(2);
      toast({ title: "File processed", description: `Parsed ${parsed.rows.length} rows from ${file.name}` });
    } catch (err: any) {
      toast({ title: "File parse failed", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleTextPaste = () => {
    if (!textInput.trim()) {
      toast({
        title: "No data",
        description: "Please paste some text data to process",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseTextToData(textInput, "Pasted Data");
    setParsedData(parsed);
    setStep(2);

    toast({
      title: "Text processed",
      description: `Parsed ${parsed.rows.length} rows from pasted data`,
    });
  };

  const handleIngestion = async (mapping: Record<string, string | undefined>) => {
    if (!parsedData) return;
    // Create a source record
    const sourceId = crypto.randomUUID();
    const { error: sourceErr } = await supabase.from("sources").insert([{ 
      id: sourceId,
      name: parsedData.fileName || "Upload",
      type: "csv",
      status: "parsed",
      row_count: parsedData.rows.length,
      uploaded_at: new Date().toISOString(),
      mapping,
    }]);
    if (sourceErr) {
      toast({ title: "Upload failed", description: sourceErr.message, variant: "destructive" });
      return;
    }

    // Upsert suppliers/products as minimal records, then insert offers
    // Note: simple naive upsert by name for demo; in production, use better identity resolution
    const supplierNameKey = mapping["supplier"];
    const productNameKey = mapping["product"];
    const categoryKey = mapping["category"];
    const unitKey = mapping["unit"];
    const priceKey = mapping["price"];
    const currencyKey = mapping["currency"];
    const packQtyKey = mapping["packQty"];
    const packUnitKey = mapping["packUnit"];

    const ensureSupplier = async (name: string) => {
      const { data } = await supabase.from("suppliers").select("id").ilike("name", name).limit(1);
      if (data && data[0]) return data[0].id as string;
      const id = crypto.randomUUID();
      await supabase.from("suppliers").insert([{ id, name }]);
      return id;
    };

    const ensureProduct = async (name: string, category?: string, unit?: string) => {
      const { data } = await supabase.from("products").select("id").ilike("name", name).limit(1);
      if (data && data[0]) return data[0].id as string;
      const id = crypto.randomUUID();
      await supabase.from("products").insert([{ id, name, category: category || "", unit: unit || "pcs" }]);
      return id;
    };

    const offerRows: any[] = [];
    for (const row of parsedData.rows) {
      const supplierName = supplierNameKey ? String(row[supplierNameKey] || "").trim() : "";
      const productName = productNameKey ? String(row[productNameKey] || "").trim() : "";
      if (!supplierName || !productName) continue;
      const category = categoryKey ? String(row[categoryKey] || "").trim() : undefined;
      const unit = unitKey ? String(row[unitKey] || "").trim() : undefined;
      const rawPrice = priceKey ? Number(row[priceKey]) : NaN;
      const rawCurrency = currencyKey ? String(row[currencyKey] || "AUD") : "AUD";
      const packQty = packQtyKey ? Number(row[packQtyKey]) : undefined;
      const packUnit = packUnitKey ? String(row[packUnitKey] || unit || "pcs") : unit || "pcs";

      const supplierId = await ensureSupplier(supplierName);
      const productId = await ensureProduct(productName, category, unit);

      if (!isFinite(rawPrice)) continue;
      // For now, use raw price as normalized; normalization can be run later server-side
      offerRows.push({
        id: crypto.randomUUID(),
        product_id: productId,
        supplier_id: supplierId,
        raw_price: rawPrice,
        raw_currency: rawCurrency,
        pack_qty: packQty,
        pack_unit: packUnit,
        normalized_price_per_unit: rawPrice,
        normalized_unit: packUnit,
        source_id: sourceId,
        updated_at: new Date().toISOString(),
        in_stock: true,
      });
    }

    if (offerRows.length > 0) {
      const { error: offersErr } = await supabase.from("offers").insert(offerRows);
      if (offersErr) {
        toast({ title: "Ingestion failed", description: offersErr.message, variant: "destructive" });
        return;
      }
    }

    toast({
      title: "Data ingested successfully!",
      description: `Added ${offerRows.length} new offers to the system`,
    });
    setStep(1);
    setParsedData(null);
    setTextInput("");
    navigate("/app/dashboard");
  };

  const handleBack = () => {
    setStep(1);
    setParsedData(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Price Data</h1>
          <p className="text-muted-foreground">
            Import supplier price lists from PDF, CSV, or text formats
          </p>
        </div>
        {step === 2 && (
          <Button variant="outline" onClick={handleBack}>
            Back to Upload
          </Button>
        )}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Step 1: Choose Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Paste
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="files" className="space-y-4">
                <div className="text-center space-y-4">
                  <FileDropzone onFileDrop={handleFileUpload} />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, CSV, Excel files
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your tab-separated or CSV data here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button onClick={handleTextPaste} className="w-full">
                    Process Text Data
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {step === 2 && parsedData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Step 2: Map Columns & Ingest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                data={parsedData}
                onIngest={handleIngestion}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
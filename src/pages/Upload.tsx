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
import { read as readXlsx, utils as xlsxUtils } from "xlsx";

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

  // Utilities: robust CSV/TSV parsing with BOM removal, quoted newlines, delimiter detection
  const stripBOM = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

  const detectDelimiterFromFirstRecord = (text: string): string => {
    const src = stripBOM(text).replace(/\r\n/g, "\n");
    let inQuotes = false;
    let i = 0;
    let tabCount = 0;
    let commaCount = 0;
    let semiCount = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"') {
        if (inQuotes && src[i + 1] === '"') {
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
        continue;
      }
      if (!inQuotes && (ch === "\n")) break;
      if (!inQuotes) {
        if (ch === "\t") tabCount++;
        else if (ch === ",") commaCount++;
        else if (ch === ";") semiCount++;
      }
      i++;
    }
    if (tabCount >= commaCount && tabCount >= semiCount) return "\t";
    if (commaCount >= semiCount) return ",";
    return ";";
  };

  const parseDelimitedText = (text: string, delimiter?: string): string[][] => {
    const src = stripBOM((text || "").replace(/\r\n/g, "\n"));
    const delim = delimiter || detectDelimiterFromFirstRecord(src);
    const rows: string[][] = [];
    let currentField = "";
    let currentRow: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '"') {
        if (inQuotes && src[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delim) {
        currentRow.push(currentField);
        currentField = "";
        continue;
      }
      if (!inQuotes && ch === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        continue;
      }
      currentField += ch;
    }
    // push last field/row
    currentRow.push(currentField);
    rows.push(currentRow);
    // filter out empty rows
    return rows.filter(r => r.some(cell => String(cell).trim().length > 0));
  };

  const coerceCell = (cellRaw: string): string | number => {
    const trimmed = (cellRaw ?? "").trim();
    if (trimmed === "") return "";
    // remove common currency/thousands symbols before numeric check
    const normalized = trimmed.replace(/[$£€%\s]/g, "");
    const maybeNum = Number(normalized.replace(/,/g, ""));
    return isFinite(maybeNum) ? maybeNum : trimmed;
  };

  const parseTextToData = (text: string, fileName?: string): ParsedData => {
    const rows = parseDelimitedText(text);
    if (rows.length === 0) return { headers: [], rows: [], fileName };
    if (rows.length === 1) {
      const headers = rows[0].map((_, idx) => `Column ${idx + 1}`);
      const row: Record<string, string | number> = {};
      headers.forEach((header, idx) => {
        row[header] = coerceCell(String(rows[0][idx] ?? ""));
      });
      return { headers, rows: [row], fileName };
    }
    const headerTokens = rows[0].map((h) => String(h).trim());
    const headers = headerTokens.map((h, idx) => (h === "" ? `Column ${idx + 1}` : h));
    const records = rows.slice(1).map((vals) => {
      const rec: Record<string, string | number> = {};
      headers.forEach((header, idx) => {
        rec[header] = coerceCell(String(vals[idx] ?? ""));
      });
      return rec;
    });
    return { headers, rows: records, fileName };
  };

  const parseExcelFile = async (file: File): Promise<ParsedData> => {
    const data = await file.arrayBuffer();
    const wb = readXlsx(data, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [], fileName: file.name };
    const ws = wb.Sheets[sheetName];
    const grid: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!grid || grid.length === 0) return { headers: [], rows: [], fileName: file.name };
    const headerRow = grid[0] as (string | number)[];
    const headers = headerRow.map((h, idx) => {
      const name = String(h ?? "").trim();
      return name === "" ? `Column ${idx + 1}` : name;
    });
    const records = grid.slice(1).filter(r => (r as any[]).some(c => String(c ?? "").trim().length > 0)).map((r) => {
      const rec: Record<string, string | number> = {};
      headers.forEach((header, idx) => {
        rec[header] = coerceCell(String((r as any[])[idx] ?? ""));
      });
      return rec;
    });
    return { headers, rows: records, fileName: file.name };
  };

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      toast({ title: "No file", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    try {
      const nameLower = (file.name || "").toLowerCase();
      const typeLower = (file.type || "").toLowerCase();
      if (nameLower.endsWith('.pdf') || typeLower.includes('pdf')) {
        toast({ title: "PDF parsing not supported", description: "Please paste table text or upload a CSV.", variant: "destructive" });
        return;
      }
      const isExcel = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || (typeLower.includes('spreadsheet') && !nameLower.endsWith('.csv'));
      const parsed = isExcel
        ? await parseExcelFile(file)
        : parseTextToData(await file.text(), file.name);
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
                    Supported formats: CSV/TSV, Excel (XLSX/XLS), and text files
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your CSV (comma-separated), TSV (tab-separated), or semicolon-separated data here..."
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/file-dropzone";
import { ColumnMapper } from "@/components/column-mapper";
import { AIColumnMapper } from "@/components/ai-column-mapper";
import { DynamicColumnMapper } from "@/components/dynamic-column-mapper";
import { DocumentAIConfig } from "@/components/document-ai-config";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Table, AlertCircle, CheckCircle, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseFile, getFileTypeInfo, type ParsedFileData } from "@/lib/file-parsers";
import { type ExtractedTable } from "@/lib/ai-table-extractor";
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
  const [uploadedFiles, setUploadedFiles] = useState<ParsedFileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTables, setExtractedTables] = useState<ExtractedTable[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [showDocumentAIConfig, setShowDocumentAIConfig] = useState(false);

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
    if (files.length === 0) {
      toast({ title: "No files", description: "Please select files to upload", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const parsedFiles: ParsedFileData[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process each file
      for (const file of files) {
        try {
          const parsed = await parseFile(file);
          parsedFiles.push(parsed);
          
          if (parsed.error) {
            errorCount++;
            toast({ 
              title: "File processing issue", 
              description: `${file.name}: ${parsed.error}`, 
              variant: "destructive" 
            });
          } else if (parsed.rows.length > 0) {
            successCount++;
          } else {
            errorCount++;
            toast({ 
              title: "No data found", 
              description: `${file.name}: Could not extract data`, 
              variant: "destructive" 
            });
          }
        } catch (err: any) {
          errorCount++;
          parsedFiles.push({
            headers: [],
            rows: [],
            fileName: file.name,
            fileType: 'unknown',
            error: err?.message || String(err)
          });
        }
      }

      setUploadedFiles(parsedFiles);
      
      // If we have at least one successful file with data, proceed to step 2
      const successfulFiles = parsedFiles.filter(f => !f.error && f.rows.length > 0);
      if (successfulFiles.length > 0) {
        const firstFile = successfulFiles[0];
        
        // Check if this file has AI-extracted tables
        if (firstFile.extractedTables && firstFile.extractedTables.length > 0) {
          setExtractedTables(firstFile.extractedTables);
          setUseAI(true);
        } else {
          // Use traditional column mapping
          setParsedData({
            headers: firstFile.headers,
            rows: firstFile.rows,
            fileName: firstFile.fileName
          });
          setUseAI(false);
        }
        setStep(2);
      }

      // Show summary toast
      if (successCount > 0 && errorCount === 0) {
        toast({ 
          title: "Files processed successfully", 
          description: `Successfully processed ${successCount} file(s)` 
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({ 
          title: "Partial success", 
          description: `Processed ${successCount} file(s), ${errorCount} had issues`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Processing failed", 
          description: `Could not process any files. Check file formats and try again.`,
          variant: "destructive" 
        });
      }

    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
            Import supplier price lists from PDF, CSV, XLSX, DOCX, and image formats with drag-and-drop support
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocumentAIConfig(!showDocumentAIConfig)}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            Document AI
          </Button>
          {step === 2 && (
            <Button variant="outline" onClick={handleBack}>
              Back to Upload
            </Button>
          )}
        </div>
      </div>

      {/* Document AI Configuration */}
      {showDocumentAIConfig && (
        <DocumentAIConfig onConfigured={() => setShowDocumentAIConfig(false)} />
      )}

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
                    Supports PDF, CSV, XLSX, DOCX, and image files with drag-and-drop and bulk upload
                  </p>
                </div>
                
                {/* File Processing Status */}
                {isProcessing && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">Processing files...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Uploaded Files Status */}
                {uploadedFiles.length > 0 && !isProcessing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">File Processing Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => {
                          const fileInfo = getFileTypeInfo({ name: file.fileName, type: file.fileType } as File);
                          const hasError = !!file.error;
                          const hasData = file.rows.length > 0;
                          
                          return (
                            <div
                              key={index}
                              className={`flex items-center gap-3 p-2 rounded-md border ${
                                hasError ? 'border-destructive bg-destructive/5' : 
                                hasData ? 'border-green-200 bg-green-50' : 'border-muted'
                              }`}
                            >
                              {hasError ? (
                                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                              ) : hasData ? (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{file.fileName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {fileInfo.type} • {file.rows.length} rows
                                </div>
                                {file.error && (
                                  <div className="text-xs text-destructive mt-1">{file.error}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
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

      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {useAI ? (
                  <>
                    <Brain className="h-5 w-5" />
                    Step 2: AI-Powered Column Mapping & Ingest
                  </>
                ) : (
                  <>
                <Table className="h-5 w-5" />
                Step 2: Map Columns & Ingest
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {useAI && extractedTables.length > 0 ? (
                <AIColumnMapper
                  extractedTables={extractedTables}
                  onMappingComplete={handleIngestion}
                  onBack={() => setStep(1)}
                />
              ) : parsedData ? (
                <DynamicColumnMapper
                  headers={parsedData.headers}
                  rawData={parsedData.rows}
                  fileName={parsedData.fileName || 'uploaded_file'}
                  onMappingComplete={(mappedData, mapping) => {
                    // Handle the mapped data
                    console.log('Mapped data:', mappedData);
                    console.log('Mapping:', mapping);
                    
                    // Convert to the format expected by handleIngestion
                    const mappingRecord: Record<string, string> = {};
                    mapping.forEach(m => {
                      if (m.originalColumn && m.customFieldName) {
                        mappingRecord[m.customFieldName] = m.originalColumn;
                      }
                    });
                    
                    // Create a new parsedData object with mapped data
                    const newParsedData = {
                      headers: mapping.filter(m => m.customFieldName).map(m => m.customFieldName),
                      rows: mappedData,
                      fileName: parsedData.fileName
                    };
                    
                    handleIngestion(mappingRecord);
                  }}
                  onBack={() => setStep(1)}
                />
              ) : (
                <div>No data available for mapping.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
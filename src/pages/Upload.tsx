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

  const handleFileUpload = (files: File[]) => {
    // Mock file processing
    const file = files[0];
    const fileName = file.name;
    
    // Mock parsed data - in real app, this would parse PDF/CSV
    const mockData: ParsedData = {
      fileName,
      headers: ["Supplier", "Product Name", "Category", "Unit Price", "Currency", "Pack Size", "Unit"],
      rows: [
        {
          "Supplier": "Ace Metals",
          "Product Name": "Copper Pipe 15mm",
          "Category": "Pipe & Fittings", 
          "Unit Price": 485.00,
          "Currency": "AUD",
          "Pack Size": 5,
          "Unit": "m"
        },
        {
          "Supplier": "Ace Metals",
          "Product Name": "PVC Conduit 20mm",
          "Category": "Electrical",
          "Unit Price": 125.00,
          "Currency": "AUD", 
          "Pack Size": 5,
          "Unit": "m"
        },
        {
          "Supplier": "Ace Metals",
          "Product Name": "Rebar D12",
          "Category": "Steel & Rebar",
          "Unit Price": 1250.00,
          "Currency": "AUD",
          "Pack Size": 1000,
          "Unit": "kg"
        }
      ]
    };

    setParsedData(mockData);
    setStep(2);
    
    toast({
      title: "File processed",
      description: `Successfully parsed ${mockData.rows.length} rows from ${fileName}`,
    });
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

    // Mock text processing
    const lines = textInput.trim().split('\n');
    const headers = lines[0].split('\t');
    const rows = lines.slice(1).map(line => {
      const values = line.split('\t');
      const row: Record<string, string | number> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    const mockData: ParsedData = {
      headers,
      rows,
      fileName: "Pasted Data"
    };

    setParsedData(mockData);
    setStep(2);

    toast({
      title: "Text processed",
      description: `Successfully parsed ${rows.length} rows from pasted data`,
    });
  };

  const handleIngestion = () => {
    toast({
      title: "Data ingested successfully!",
      description: `Added ${parsedData?.rows.length} new offers to the system`,
    });
    
    // Reset form
    setStep(1);
    setParsedData(null);
    setTextInput("");
    
    // Navigate to dashboard
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
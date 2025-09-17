import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Table as TableIcon } from "lucide-react";
import type { ColumnMapping } from "@/lib/types";

interface ParsedData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName?: string;
}

interface ColumnMapperProps {
  data: ParsedData;
  onIngest: () => void;
}

const REQUIRED_FIELDS = [
  { key: "supplier", label: "Supplier", required: true },
  { key: "product", label: "Product Name", required: true },
  { key: "price", label: "Price", required: true },
];

const OPTIONAL_FIELDS = [
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "currency", label: "Currency" },
  { key: "packQty", label: "Pack Quantity" },
  { key: "packUnit", label: "Pack Unit" },
  { key: "lastUpdated", label: "Last Updated" },
];

export function ColumnMapper({ data, onIngest }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  
  const mappedData = useMemo(() => {
    return data.rows.slice(0, 3).map(row => {
      const mapped: Record<string, any> = {};
      
      // Apply current mapping
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && row[column] !== undefined) {
          mapped[field] = row[column];
        }
      });
      
      return {
        original: row,
        mapped,
      };
    });
  }, [data.rows, mapping]);

  const handleMappingChange = (field: string, column: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: column === "none" ? undefined : column,
    }));
  };

  const isValidMapping = () => {
    return REQUIRED_FIELDS.every(field => 
      mapping[field.key as keyof ColumnMapping] !== undefined
    );
  };

  const getUnmappedColumns = () => {
    const mappedColumns = new Set(Object.values(mapping).filter(Boolean));
    return data.headers.filter(header => !mappedColumns.has(header));
  };

  return (
    <div className="space-y-6">
      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Map Columns to Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Required Fields */}
          <div>
            <h4 className="text-sm font-medium mb-3">Required Fields</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {REQUIRED_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {field.label}
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </label>
                  <Select
                    value={mapping[field.key as keyof ColumnMapping] || ""}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {data.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <h4 className="text-sm font-medium mb-3">Optional Fields</h4>
            <div className="grid gap-3 md:grid-cols-3">
              {OPTIONAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select
                    value={mapping[field.key as keyof ColumnMapping] || ""}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {data.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Unmapped Columns */}
          {getUnmappedColumns().length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Unmapped Columns</h4>
              <div className="flex flex-wrap gap-2">
                {getUnmappedColumns().map((column) => (
                  <Badge key={column} variant="outline">
                    {column}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                These columns will be ignored during ingestion
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Preview Mapped Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="table-header">
                <TableRow>
                  <TableHead>Row</TableHead>
                  {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
                    <TableHead key={field.key}>
                      <div className="flex items-center gap-2">
                        {field.label}
                        {REQUIRED_FIELDS.some(f => f.key === field.key) && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedData.map((row, index) => (
                  <TableRow key={index} className="table-row">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
                      <TableCell key={field.key}>
                        <div className="max-w-32 truncate">
                          {row.mapped[field.key] !== undefined ? (
                            <span className="font-medium">
                              {String(row.mapped[field.key])}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
              Showing first 3 rows of {data.rows.length} total rows
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ingest Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onIngest}
          disabled={!isValidMapping()}
          size="lg"
          className="min-w-32"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Ingest Data ({data.rows.length} rows)
        </Button>
      </div>
      
      {!isValidMapping() && (
        <p className="text-sm text-destructive text-center">
          Please map all required fields before ingesting data
        </p>
      )}
    </div>
  );
}
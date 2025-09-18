import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Table, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFileDrop: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

export function FileDropzone({ 
  onFileDrop, 
  maxFiles = 5,
  accept = {
    'application/pdf': ['.pdf'],
    // CSV variants
    'text/csv': ['.csv'],
    'application/csv': ['.csv'],
    'text/comma-separated-values': ['.csv'],
    'text/tab-separated-values': ['.tsv'],
    'text/plain': ['.txt', '.tsv', '.csv'],
    // Excel variants (often used for CSV on macOS too)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls', '.csv'],
  }
}: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileDrop(acceptedFiles);
  }, [onFileDrop]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    acceptedFiles,
  } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple: true,
  });

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return FileText;
    if (file.type.includes('csv') || file.type.includes('spreadsheet') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv')) return Table;
    return File;
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer",
          isDragActive && "border-primary bg-primary/5",
          isDragAccept && "border-success bg-success/5",
          isDragReject && "border-destructive bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">
              {isDragActive
                ? "Drop files here..."
                : "Drag & drop files here, or click to select"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports PDF, CSV, Excel, and text files (max {maxFiles} files)
            </p>
          </div>
          
          <Button variant="outline" type="button">
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
        </div>
      </Card>

      {/* File List */}
      {acceptedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files:</h4>
          <div className="space-y-2">
            {acceptedFiles.map((file, index) => {
              const IconComponent = getFileIcon(file);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
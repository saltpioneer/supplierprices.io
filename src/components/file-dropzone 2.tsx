import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Table, File, Image, FileSpreadsheet, FileType } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFileDrop: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

export function FileDropzone({ 
  onFileDrop, 
  maxFiles = 10,
  accept = {
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/tiff': ['.tiff', '.tif'],
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
    if (file.type.includes('csv') || file.type.includes('spreadsheet')) return Table;
    if (file.type.includes('word') || file.type.includes('document')) return FileType;
    if (file.type.includes('image')) return Image;
    if (file.type.includes('excel') || file.type.includes('sheet')) return FileSpreadsheet;
    return File;
  };

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeInfo = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return { type: 'PDF Document', pages: 'Unknown pages' };
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return { type: 'Excel Spreadsheet', pages: 'Multiple sheets' };
    if (name.endsWith('.docx') || name.endsWith('.doc')) return { type: 'Word Document', pages: 'Unknown pages' };
    if (name.match(/\.(jpg|jpeg|png|gif|webp|tiff|tif)$/)) return { type: 'Image File', pages: '1 page' };
    if (name.endsWith('.csv')) return { type: 'CSV Data', pages: 'Tabular data' };
    return { type: 'Text File', pages: 'Unknown pages' };
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
              Supports PDF, CSV, XLSX, DOCX, and image files (max {maxFiles} files)
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
          <h4 className="text-sm font-medium">Selected Files ({acceptedFiles.length}):</h4>
          <div className="space-y-2">
            {acceptedFiles.map((file, index) => {
              const IconComponent = getFileIcon(file);
              const fileInfo = getFileTypeInfo(file);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-md border"
                >
                  <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fileInfo.type} • {fileInfo.pages}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {getFileSize(file.size)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
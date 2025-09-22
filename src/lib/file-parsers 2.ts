// File parsing utilities for multi-format support
export interface ParsedFileData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName: string;
  fileType: string;
  pageCount?: number;
  error?: string;
  extractedTables?: any[]; // For multi-table support
  confidence?: number; // AI confidence score
}

// Robust CSV/TSV parsing (handles quoted fields)
export const parseDelimitedLine = (line: string, delimiter: string): string[] => {
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

// Parse CSV/TSV text data
export const parseCSVData = (text: string, fileName: string): ParsedFileData => {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], fileName, fileType: 'csv' };
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
    return { headers, rows: [row], fileName, fileType: 'csv' };
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
  
  return { headers, rows, fileName, fileType: 'csv' };
};

// Parse Excel files (XLSX/XLS) - PERFECT IMPLEMENTATION
export const parseExcelFile = async (file: File): Promise<ParsedFileData> => {
  try {
    console.log('📊 Parsing Excel file:', file.name);
    
    // Dynamic import to avoid bundling issues
    const XLSX = await import('xlsx');
    
    // Read the file using xlsx library
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    console.log('📊 Found sheets:', workbook.SheetNames);
    
    if (workbook.SheetNames.length === 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'excel',
        error: 'No sheets found in Excel file'
      };
    }
    
    // Use the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON array format
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Array format
      defval: '', // Default for empty cells
      raw: false // Convert to strings
    });
    
    console.log('📋 Raw data rows:', jsonData.length);
    
    if (jsonData.length === 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'excel',
        error: 'No data found in Excel sheet'
      };
    }
    
    // First row is headers
    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    const validHeaders = headers.filter(h => h.length > 0);
    
    console.log('🏷️ Headers found:', validHeaders);
    
    if (validHeaders.length === 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'excel',
        error: 'No valid headers found in Excel sheet'
      };
    }
    
    // Process data rows
    const rows = jsonData.slice(1).map((row: any[], index) => {
      const rowData: Record<string, string | number> = {};
      
      validHeaders.forEach((header, colIndex) => {
        const cellValue = row[colIndex];
        const cellStr = String(cellValue || '').trim();
        
        // Try to parse as number
        const numValue = Number(cellStr.replace(/[,$]/g, ''));
        rowData[header] = isFinite(numValue) && cellStr !== '' ? numValue : cellStr;
      });
      
      return rowData;
    }).filter(row => {
      // Remove completely empty rows
      return Object.values(row).some(value => String(value).trim() !== '');
    });
    
    console.log('✅ Successfully parsed', rows.length, 'data rows');
    
    return {
      headers: validHeaders,
      rows,
      fileName: file.name,
      fileType: 'excel',
      pageCount: workbook.SheetNames.length
    };
    
  } catch (error) {
    console.error('❌ Excel parsing failed:', error);
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'excel',
      error: `Failed to parse Excel file: ${error}`
    };
  }
};

// Parse PDF files using Google Cloud Document AI
export const parsePDFFile = async (file: File): Promise<ParsedFileData> => {
  try {
    console.log('📄 Parsing PDF file with Document AI:', file.name);

    // Dynamic import to avoid bundling issues
    const { documentAIService } = await import('./document-ai-service');
    
    // Check if Document AI is configured
    if (!documentAIService.isConfigured()) {
      const status = documentAIService.getConfigurationStatus();
      console.warn('⚠️ Document AI not configured:', status.missing);
      
      // Fallback to basic PDF parsing
      return await parsePDFFileFallback(file);
    }

    const result = await documentAIService.processPDF(file);
    
    if (result.error) {
      console.error('❌ Document AI error:', result.error);
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'pdf',
        error: result.error
      };
    }

    if (result.tables.length === 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'pdf',
        error: 'No tables found in PDF using Document AI'
      };
    }

    // Use the first table for now
    const firstTable = result.tables[0];
    
    return {
      headers: firstTable.headers,
      rows: firstTable.rows,
      fileName: file.name,
      fileType: 'pdf',
      pageCount: result.pageCount,
      extractedTables: result.tables,
      confidence: result.confidence
    };

  } catch (error) {
    console.error('❌ PDF parsing failed:', error);
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'pdf',
      error: `PDF parsing failed: ${error}`
    };
  }
};

// Fallback PDF parsing using basic text extraction
const parsePDFFileFallback = async (file: File): Promise<ParsedFileData> => {
  try {
    console.log('📄 Using fallback PDF parsing for:', file.name);

    // Dynamic import to avoid bundling issues
    const { aiTableExtractor } = await import('./ai-table-extractor');
    
    const result = await aiTableExtractor.extractTablesFromPDF(file);
    
    if (result.errors.length > 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'pdf',
        error: result.errors.join('; ')
      };
    }

    if (result.tables.length === 0) {
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'pdf',
        error: 'No tables detected in PDF. Please ensure the document contains tabular data.'
      };
    }

    // For now, return the first table (multi-table support will be handled in the UI)
    const firstTable = result.tables[0];
    return {
      headers: firstTable.headers,
      rows: firstTable.rows,
      fileName: file.name,
      fileType: 'pdf',
      pageCount: result.totalPages,
      // Store all tables for multi-table processing
      extractedTables: result.tables
    };
  } catch (error) {
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'pdf',
      error: `Failed to parse PDF file: ${error}`
    };
  }
};

// Parse Word documents - requires additional library
export const parseWordFile = async (file: File): Promise<ParsedFileData> => {
  try {
    // For now, return a placeholder - would need to add mammoth or similar
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'word',
      error: 'Word document parsing requires additional setup. Please copy text and paste manually.'
    };
  } catch (error) {
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'word',
      error: `Failed to parse Word file: ${error}`
    };
  }
};

// Parse image files - requires OCR library
export const parseImageFile = async (file: File): Promise<ParsedFileData> => {
  try {
    // For now, return a placeholder - would need to add Tesseract.js or similar
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'image',
      error: 'Image OCR requires additional setup. Please extract text manually and paste.'
    };
  } catch (error) {
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'image',
      error: `Failed to parse image file: ${error}`
    };
  }
};

// Main file parser that routes to appropriate parser
export const parseFile = async (file: File): Promise<ParsedFileData> => {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  try {
    // Handle CSV files
    if (fileName.endsWith('.csv') || fileType.includes('csv')) {
      try {
        const text = await file.text();
        return parseCSVData(text, file.name);
      } catch (error) {
        console.error('CSV parsing error:', error);
        return {
          headers: [],
          rows: [],
          fileName: file.name,
          fileType: 'csv',
          error: `CSV parsing failed: ${error}`
        };
      }
    }

    // Handle Excel files
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('spreadsheet')) {
      try {
        return await parseExcelFile(file);
      } catch (error) {
        console.error('Excel parsing error:', error);
        return {
          headers: [],
          rows: [],
          fileName: file.name,
          fileType: 'excel',
          error: `Excel parsing failed: ${error}`
        };
      }
    }

    // Handle PDF files
    if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
      return await parsePDFFile(file);
    }

    // Handle Word documents
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileType.includes('word')) {
      return await parseWordFile(file);
    }

    // Handle image files
    if (fileType.startsWith('image/')) {
      return await parseImageFile(file);
    }

    // Handle text files
    if (fileName.endsWith('.txt') || fileType.includes('text')) {
      try {
        const text = await file.text();
        return parseCSVData(text, file.name);
      } catch (error) {
        console.error('Text parsing error:', error);
        return {
          headers: [],
          rows: [],
          fileName: file.name,
          fileType: 'text',
          error: `Text parsing failed: ${error}`
        };
      }
    }

    // Default: try to parse as text
    try {
      const text = await file.text();
      return parseCSVData(text, file.name);
    } catch (error) {
      console.error('Default parsing error:', error);
      return {
        headers: [],
        rows: [],
        fileName: file.name,
        fileType: 'unknown',
        error: `File parsing failed: ${error}`
      };
    }

  } catch (error) {
    return {
      headers: [],
      rows: [],
      fileName: file.name,
      fileType: 'unknown',
      error: `Failed to parse file: ${error}`
    };
  }
};

// Utility to get file type information
export const getFileTypeInfo = (file: File) => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return { 
      type: 'PDF Document', 
      description: 'Portable Document Format',
      icon: '📄',
      canParse: false // Requires additional library
    };
  }
  
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet')) {
    return { 
      type: 'Excel Spreadsheet', 
      description: 'Microsoft Excel file',
      icon: '📊',
      canParse: false // Requires additional library
    };
  }
  
  if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word')) {
    return { 
      type: 'Word Document', 
      description: 'Microsoft Word file',
      icon: '📝',
      canParse: false // Requires additional library
    };
  }
  
  if (type.startsWith('image/')) {
    return { 
      type: 'Image File', 
      description: 'Scanned document or image',
      icon: '🖼️',
      canParse: false // Requires OCR
    };
  }
  
  if (name.endsWith('.csv') || type.includes('csv')) {
    return { 
      type: 'CSV Data', 
      description: 'Comma-separated values',
      icon: '📋',
      canParse: true
    };
  }
  
  return { 
    type: 'Text File', 
    description: 'Plain text file',
    icon: '📄',
    canParse: true
  };
};

// Custom AI-powered table extraction wrapper for supplier pricing data
export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: Record<string, string | number>[];
  confidence: number;
  pageNumber?: number;
  section?: string;
  tableType: 'price_list' | 'catalog' | 'inventory' | 'unknown';
}

export interface TableExtractionResult {
  tables: ExtractedTable[];
  totalPages: number;
  processingTime: number;
  errors: string[];
}

export interface HeaderMapping {
  originalHeader: string;
  suggestedField: string;
  confidence: number;
  synonyms: string[];
}

export interface AIExtractionConfig {
  enableMultiTableDetection: boolean;
  enableHeaderMapping: boolean;
  enableLearning: boolean;
  minConfidence: number;
  customFieldMappings?: Record<string, string[]>;
}

// Standard field mappings for supplier pricing data
const STANDARD_FIELDS = {
  'product_code': ['part no', 'part number', 'sku', 'item code', 'product id', 'model', 'part#'],
  'product_name': ['product name', 'description', 'item name', 'product', 'item description'],
  'supplier': ['supplier', 'vendor', 'manufacturer', 'brand', 'company'],
  'price': ['price', 'cost', 'unit price', 'list price', 'rate', 'amount'],
  'currency': ['currency', 'curr', 'ccy', 'unit'],
  'category': ['category', 'type', 'class', 'group', 'family'],
  'unit': ['unit', 'uom', 'unit of measure', 'pack size', 'quantity'],
  'pack_quantity': ['pack qty', 'pack quantity', 'qty per pack', 'pack size'],
  'pack_unit': ['pack unit', 'packaging', 'unit type'],
  'in_stock': ['in stock', 'available', 'stock', 'inventory', 'qty available'],
  'lead_time': ['lead time', 'delivery time', 'days', 'weeks'],
  'minimum_order': ['min order', 'minimum order', 'moq', 'min qty'],
  'notes': ['notes', 'comments', 'remarks', 'description', 'details']
};

export class AITableExtractor {
  private config: AIExtractionConfig;
  private learningData: Map<string, HeaderMapping[]> = new Map();

  constructor(config: AIExtractionConfig = {
    enableMultiTableDetection: true,
    enableHeaderMapping: true,
    enableLearning: true,
    minConfidence: 0.7
  }) {
    this.config = config;
    this.loadLearningData();
  }

  // Main extraction method for PDFs
  async extractTablesFromPDF(file: File): Promise<TableExtractionResult> {
    const startTime = Date.now();
    const result: TableExtractionResult = {
      tables: [],
      totalPages: 0,
      processingTime: 0,
      errors: []
    };

    try {
      // Step 1: Extract text from PDF
      const pdfText = await this.extractTextFromPDF(file);
      result.totalPages = this.estimatePageCount(pdfText);

      // Step 2: Detect and extract tables
      const rawTables = await this.detectTablesInText(pdfText);
      
      // Step 3: Process each table
      for (const rawTable of rawTables) {
        const processedTable = await this.processTable(rawTable);
        if (processedTable.confidence >= this.config.minConfidence) {
          result.tables.push(processedTable);
        }
      }

      // Step 4: Multi-table detection and splitting
      if (this.config.enableMultiTableDetection) {
        result.tables = await this.detectMultiSections(result.tables);
      }

      result.processingTime = Date.now() - startTime;
    } catch (error) {
      result.errors.push(`PDF extraction failed: ${error}`);
    }

    return result;
  }

  // Extract tables from Excel files
  async extractTablesFromExcel(file: File): Promise<TableExtractionResult> {
    const startTime = Date.now();
    const result: TableExtractionResult = {
      tables: [],
      totalPages: 0,
      processingTime: 0,
      errors: []
    };

    try {
      // This would integrate with xlsx library
      // For now, return placeholder
      result.errors.push('Excel extraction requires xlsx library integration');
      result.processingTime = Date.now() - startTime;
    } catch (error) {
      result.errors.push(`Excel extraction failed: ${error}`);
    }

    return result;
  }

  // AI-powered header mapping
  async mapHeaders(headers: string[]): Promise<HeaderMapping[]> {
    const mappings: HeaderMapping[] = [];

    for (const header of headers) {
      const mapping = await this.findBestFieldMapping(header);
      mappings.push(mapping);
    }

    return mappings;
  }

  // Learn from user corrections
  learnFromCorrection(originalHeader: string, userMapping: string, context?: string) {
    if (!this.config.enableLearning) return;

    const key = context || 'global';
    if (!this.learningData.has(key)) {
      this.learningData.set(key, []);
    }

    const existingMappings = this.learningData.get(key) || [];
    const existingIndex = existingMappings.findIndex(m => m.originalHeader === originalHeader);

    if (existingIndex >= 0) {
      // Update existing mapping
      existingMappings[existingIndex].suggestedField = userMapping;
      existingMappings[existingIndex].confidence = 1.0; // User confirmed
    } else {
      // Add new mapping
      existingMappings.push({
        originalHeader,
        suggestedField: userMapping,
        confidence: 1.0,
        synonyms: []
      });
    }

    this.learningData.set(key, existingMappings);
    this.saveLearningData();
  }

  // Private methods for table extraction
  private async extractTextFromPDF(file: File): Promise<string> {
    // This would integrate with pdf-parse or similar
    // For now, return placeholder
    throw new Error('PDF text extraction requires pdf-parse library');
  }

  private estimatePageCount(text: string): number {
    // Simple estimation based on text length
    const avgCharsPerPage = 2000;
    return Math.ceil(text.length / avgCharsPerPage);
  }

  private async detectTablesInText(text: string): Promise<any[]> {
    // AI-powered table detection logic
    const tables: any[] = [];
    
    // Split text into potential table sections
    const sections = this.splitIntoSections(text);
    
    for (const section of sections) {
      const table = this.identifyTableStructure(section);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  private splitIntoSections(text: string): string[] {
    // Split text into logical sections (pages, categories, etc.)
    const sections: string[] = [];
    
    // Look for common section delimiters
    const delimiters = [
      /\n\s*[A-Z][A-Z\s]+\n/g, // ALL CAPS headers
      /\n\s*Page\s+\d+/gi,     // Page breaks
      /\n\s*Category\s*:/gi,   // Category headers
      /\n\s*Supplier\s*:/gi,   // Supplier headers
      /\n\s*[-=]{3,}\n/g       // Separator lines
    ];

    let currentSection = text;
    for (const delimiter of delimiters) {
      const parts = currentSection.split(delimiter);
      if (parts.length > 1) {
        sections.push(...parts.filter(p => p.trim().length > 0));
        break;
      }
    }

    if (sections.length === 0) {
      sections.push(text);
    }

    return sections;
  }

  private identifyTableStructure(section: string): any | null {
    const lines = section.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 2) return null;

    // Look for tabular patterns
    const tabularLines = lines.filter(line => {
      // Check for common table indicators
      const hasMultipleSpaces = (line.match(/\s{2,}/g) || []).length > 0;
      const hasTabs = line.includes('\t');
      const hasMultipleCommas = (line.match(/,/g) || []).length > 1;
      const hasMultiplePipes = (line.match(/\|/g) || []).length > 1;
      
      return hasMultipleSpaces || hasTabs || hasMultipleCommas || hasMultiplePipes;
    });

    if (tabularLines.length < 2) return null;

    // Parse the table structure
    const headers = this.extractHeaders(tabularLines[0]);
    const rows = tabularLines.slice(1).map(line => this.parseTableRow(line, headers));

    return {
      headers,
      rows,
      rawText: section
    };
  }

  private extractHeaders(headerLine: string): string[] {
    // Extract headers from the first line
    const delimiters = ['\t', '|', ','];
    let bestDelimiter = '\t';
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      const columns = headerLine.split(delimiter).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        bestDelimiter = delimiter;
      }
    }

    return headerLine.split(bestDelimiter).map(h => h.trim());
  }

  private parseTableRow(rowLine: string, headers: string[]): Record<string, string | number> {
    const delimiters = ['\t', '|', ','];
    let bestDelimiter = '\t';
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      const columns = rowLine.split(delimiter).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        bestDelimiter = delimiter;
      }
    }

    const values = rowLine.split(bestDelimiter);
    const row: Record<string, string | number> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      // Try to parse as number
      const numValue = Number(value.replace(/[,$]/g, ''));
      row[header] = isFinite(numValue) && value !== '' ? numValue : value;
    });

    return row;
  }

  private async processTable(rawTable: any): Promise<ExtractedTable> {
    // Process and validate the extracted table
    const confidence = this.calculateTableConfidence(rawTable);
    const tableType = this.detectTableType(rawTable);

    return {
      id: crypto.randomUUID(),
      headers: rawTable.headers,
      rows: rawTable.rows,
      confidence,
      tableType,
      rawText: rawTable.rawText
    };
  }

  private calculateTableConfidence(table: any): number {
    let confidence = 0.5; // Base confidence

    // Check for price-related content
    const hasPriceIndicators = table.headers.some((h: string) => 
      h.toLowerCase().includes('price') || h.toLowerCase().includes('cost')
    );
    if (hasPriceIndicators) confidence += 0.2;

    // Check for product indicators
    const hasProductIndicators = table.headers.some((h: string) => 
      h.toLowerCase().includes('product') || h.toLowerCase().includes('item')
    );
    if (hasProductIndicators) confidence += 0.2;

    // Check for consistent row structure
    const avgRowLength = table.rows.reduce((sum: number, row: any) => 
      sum + Object.keys(row).length, 0) / table.rows.length;
    const headerLength = table.headers.length;
    
    if (Math.abs(avgRowLength - headerLength) <= 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private detectTableType(table: any): ExtractedTable['tableType'] {
    const headers = table.headers.join(' ').toLowerCase();
    
    if (headers.includes('price') || headers.includes('cost')) {
      return 'price_list';
    }
    if (headers.includes('category') || headers.includes('section')) {
      return 'catalog';
    }
    if (headers.includes('stock') || headers.includes('inventory')) {
      return 'inventory';
    }
    
    return 'unknown';
  }

  private async detectMultiSections(tables: ExtractedTable[]): Promise<ExtractedTable[]> {
    // Detect and split multi-section catalogs
    const processedTables: ExtractedTable[] = [];

    for (const table of tables) {
      // Check if table contains multiple sections
      const sections = this.detectSectionsInTable(table);
      
      if (sections.length > 1) {
        // Split into separate tables
        sections.forEach((section, index) => {
          processedTables.push({
            ...table,
            id: `${table.id}_section_${index}`,
            section: section.name,
            rows: section.rows
          });
        });
      } else {
        processedTables.push(table);
      }
    }

    return processedTables;
  }

  private detectSectionsInTable(table: ExtractedTable): Array<{name: string, rows: any[]}> {
    const sections: Array<{name: string, rows: any[]}> = [];
    let currentSection = { name: 'Default', rows: [] };

    for (const row of table.rows) {
      // Check if row indicates a new section
      const rowText = Object.values(row).join(' ').toLowerCase();
      
      if (rowText.includes('category:') || rowText.includes('section:')) {
        // Save current section
        if (currentSection.rows.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          name: Object.values(row).find(v => String(v).toLowerCase().includes('category') || 
                                          String(v).toLowerCase().includes('section')) as string || 'Unknown',
          rows: []
        };
      } else {
        currentSection.rows.push(row);
      }
    }

    // Add final section
    if (currentSection.rows.length > 0) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{ name: 'Default', rows: table.rows }];
  }

  private async findBestFieldMapping(header: string): Promise<HeaderMapping> {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check learning data first
    const learnedMapping = this.findLearnedMapping(normalizedHeader);
    if (learnedMapping) {
      return learnedMapping;
    }

    // Use standard field mappings
    let bestMatch = '';
    let bestConfidence = 0;
    const synonyms: string[] = [];

    for (const [field, patterns] of Object.entries(STANDARD_FIELDS)) {
      for (const pattern of patterns) {
        const similarity = this.calculateSimilarity(normalizedHeader, pattern);
        if (similarity > bestConfidence) {
          bestConfidence = similarity;
          bestMatch = field;
          synonyms.push(...patterns);
        }
      }
    }

    return {
      originalHeader: header,
      suggestedField: bestMatch || 'unknown',
      confidence: bestConfidence,
      synonyms: [...new Set(synonyms)]
    };
  }

  private findLearnedMapping(header: string): HeaderMapping | null {
    for (const mappings of this.learningData.values()) {
      const mapping = mappings.find(m => 
        m.originalHeader.toLowerCase() === header ||
        m.synonyms.some(s => s.toLowerCase() === header)
      );
      if (mapping) return mapping;
    }
    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation (can be enhanced with more sophisticated algorithms)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private loadLearningData() {
    try {
      const saved = localStorage.getItem('ai-table-extractor-learning');
      if (saved) {
        this.learningData = new Map(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  }

  private saveLearningData() {
    try {
      localStorage.setItem('ai-table-extractor-learning', JSON.stringify([...this.learningData]));
    } catch (error) {
      console.warn('Failed to save learning data:', error);
    }
  }
}

// Export a default instance
export const aiTableExtractor = new AITableExtractor();

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  TrendingUp,
  Target,
  Zap
} from "lucide-react";
import { aiTableExtractor, type HeaderMapping, type ExtractedTable } from "@/lib/ai-table-extractor";

interface AIColumnMapperProps {
  extractedTables: ExtractedTable[];
  onMappingComplete: (mappings: Record<string, string | undefined>) => void;
  onBack: () => void;
}

const FIELD_DESCRIPTIONS = {
  'product_code': 'Unique identifier for the product (SKU, Part Number, etc.)',
  'product_name': 'Name or description of the product',
  'supplier': 'Supplier or vendor name',
  'price': 'Unit price or cost of the product',
  'currency': 'Currency code (USD, EUR, etc.)',
  'category': 'Product category or type',
  'unit': 'Unit of measure (pcs, kg, m, etc.)',
  'pack_quantity': 'Quantity per package',
  'pack_unit': 'Unit for packaging',
  'in_stock': 'Stock availability status',
  'lead_time': 'Delivery lead time',
  'minimum_order': 'Minimum order quantity',
  'notes': 'Additional notes or comments'
};

export function AIColumnMapper({ extractedTables, onMappingComplete, onBack }: AIColumnMapperProps) {
  const { toast } = useToast();
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [headerMappings, setHeaderMappings] = useState<HeaderMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingConfidence, setMappingConfidence] = useState(0);
  const [userCorrections, setUserCorrections] = useState<Record<string, string>>({});

  const currentTable = extractedTables[currentTableIndex];

  useEffect(() => {
    if (currentTable) {
      processTableHeaders();
    }
  }, [currentTableIndex, extractedTables]);

  const processTableHeaders = async () => {
    if (!currentTable) return;

    setIsProcessing(true);
    try {
      const mappings = await aiTableExtractor.mapHeaders(currentTable.headers);
      setHeaderMappings(mappings);
      
      // Calculate overall confidence
      const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
      setMappingConfidence(avgConfidence);
      
      toast({
        title: "AI Analysis Complete",
        description: `Mapped ${mappings.length} columns with ${(avgConfidence * 100).toFixed(0)}% confidence`
      });
    } catch (error) {
      toast({
        title: "AI Processing Failed",
        description: "Could not analyze table headers. Please map manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldMappingChange = (originalHeader: string, newField: string) => {
    setUserCorrections(prev => ({ ...prev, [originalHeader]: newField }));
    
    // Learn from user correction
    aiTableExtractor.learnFromCorrection(originalHeader, newField);
    
    // Update mappings
    setHeaderMappings(prev => prev.map(mapping => 
      mapping.originalHeader === originalHeader 
        ? { ...mapping, suggestedField: newField, confidence: 1.0 }
        : mapping
    ));
  };

  const getFieldColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (confidence >= 0.6) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const handleProceed = () => {
    const finalMappings: Record<string, string | undefined> = {};
    
    headerMappings.forEach(mapping => {
      const field = userCorrections[mapping.originalHeader] || mapping.suggestedField;
      if (field && field !== 'unknown') {
        finalMappings[mapping.originalHeader] = field;
      }
    });

    onMappingComplete(finalMappings);
  };

  const requiredFields = ['product_code', 'product_name', 'supplier', 'price'];
  const mappedRequiredFields = headerMappings.filter(m => 
    requiredFields.includes(userCorrections[m.originalHeader] || m.suggestedField)
  );

  if (!currentTable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No tables available for mapping.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table Selection */}
      {extractedTables.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Multi-Table Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Select table to map:</span>
              <Select value={currentTableIndex.toString()} onValueChange={(v) => setCurrentTableIndex(parseInt(v))}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {extractedTables.map((table, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {table.section ? `${table.section} (${table.rows.length} rows)` : `Table ${index + 1} (${table.rows.length} rows)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              AI detected {extractedTables.length} separate tables/sections in your document
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <div>
                <div className="font-medium">AI Analyzing Headers...</div>
                <div className="text-sm text-muted-foreground">
                  Detecting field types and suggesting mappings
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Confidence Score */}
      {!isProcessing && headerMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Mapping Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Confidence</span>
                    <span className="text-sm text-muted-foreground">
                      {(mappingConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={mappingConfidence * 100} className="h-2" />
                </div>
                <div className="flex items-center gap-2">
                  {mappingConfidence >= 0.8 ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      High
                    </Badge>
                  ) : mappingConfidence >= 0.6 ? (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Medium
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Required fields mapped: {mappedRequiredFields.length}/{requiredFields.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>Learning from corrections: {Object.keys(userCorrections).length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI-Powered Column Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {headerMappings.map((mapping, index) => {
              const currentField = userCorrections[mapping.originalHeader] || mapping.suggestedField;
              const isRequired = requiredFields.includes(currentField);
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{mapping.originalHeader}</span>
                      {isRequired && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {getConfidenceIcon(mapping.confidence)}
                    </div>
                    {mapping.synonyms.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Similar: {mapping.synonyms.slice(0, 3).join(', ')}
                        {mapping.synonyms.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-64">
                    <Select 
                      value={currentField} 
                      onValueChange={(value) => handleFieldMappingChange(mapping.originalHeader, value)}
                    >
                      <SelectTrigger className={getFieldColor(mapping.confidence)}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Skip this column</SelectItem>
                        {Object.entries(FIELD_DESCRIPTIONS).map(([field, description]) => (
                          <SelectItem key={field} value={field}>
                            <div>
                              <div className="font-medium">{field.replace('_', ' ').toUpperCase()}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {mappingConfidence < 0.8 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong>AI Suggestion:</strong> Some mappings have low confidence. 
            Please review and correct any incorrect mappings. The AI will learn from your corrections 
            to improve future suggestions.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={processTableHeaders}
            disabled={isProcessing}
          >
            <Brain className="h-4 w-4 mr-2" />
            Re-analyze
          </Button>
          <Button 
            onClick={handleProceed}
            disabled={mappedRequiredFields.length < requiredFields.length}
          >
            Proceed with Mapping
          </Button>
        </div>
      </div>
    </div>
  );
}

// Clay-inspired Dynamic Column Mapper - Beautiful, intuitive UI
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
  Eye,
  Edit3,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap
} from "lucide-react";

interface DynamicColumnMapping {
  id: string;
  originalColumn: string;
  customFieldName: string;
  isRequired: boolean;
  dataType: 'text' | 'number' | 'date' | 'currency';
  sampleValue?: string;
}

interface DynamicColumnMapperProps {
  headers: string[];
  rawData: any[];
  fileName: string;
  onMappingComplete: (mappedData: any[], mapping: DynamicColumnMapping[]) => void;
  onBack: () => void;
}

export function DynamicColumnMapper({ 
  headers, 
  rawData, 
  fileName,
  onMappingComplete, 
  onBack 
}: DynamicColumnMapperProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<DynamicColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize mappings when headers change
  useEffect(() => {
    if (headers.length > 0) {
      const initialMappings: DynamicColumnMapping[] = headers.map((header, index) => {
        // Get sample value from first row
        const sampleValue = rawData[0]?.[header] || '';
        
        // Auto-detect data type
        let dataType: 'text' | 'number' | 'date' | 'currency' = 'text';
        if (typeof sampleValue === 'number' || !isNaN(Number(sampleValue))) {
          dataType = 'number';
        } else if (sampleValue.toString().includes('$') || sampleValue.toString().includes('€') || sampleValue.toString().includes('£')) {
          dataType = 'currency';
        } else if (Date.parse(sampleValue.toString())) {
          dataType = 'date';
        }

        return {
          id: `mapping_${index}`,
          originalColumn: header,
          customFieldName: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          isRequired: false,
          dataType,
          sampleValue: sampleValue.toString()
        };
      });
      
      setMappings(initialMappings);
    }
  }, [headers, rawData]);

  const updateMapping = (id: string, field: keyof DynamicColumnMapping, value: any) => {
    setMappings(prev => prev.map(mapping => 
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    ));
  };

  const addCustomField = () => {
    const newMapping: DynamicColumnMapping = {
      id: `custom_${Date.now()}`,
      originalColumn: '',
      customFieldName: `custom_field_${mappings.length + 1}`,
      isRequired: false,
      dataType: 'text',
      sampleValue: ''
    };
    setMappings([...mappings, newMapping]);
  };

  const removeMapping = (id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const generatePreview = () => {
    const processedData = rawData.slice(0, 5).map(row => {
      const mappedRow: any = {};
      
      mappings.forEach(mapping => {
        if (mapping.originalColumn && mapping.customFieldName) {
          let value = row[mapping.originalColumn];
          
          // Apply data type transformations
          switch (mapping.dataType) {
            case 'number':
              value = Number(value) || 0;
              break;
            case 'currency':
              value = String(value).replace(/[^0-9.-]/g, '');
              break;
            case 'date':
              value = new Date(value).toISOString().split('T')[0];
              break;
            default:
              value = String(value);
          }
          
          mappedRow[mapping.customFieldName] = value;
        }
      });
      
      return mappedRow;
    });
    
    setPreviewData(processedData);
    setShowPreview(true);
  };

  const exportCleanCSV = () => {
    const processedData = rawData.map(row => {
      const mappedRow: any = {};
      
      mappings.forEach(mapping => {
        if (mapping.originalColumn && mapping.customFieldName) {
          let value = row[mapping.originalColumn];
          
          // Apply data type transformations
          switch (mapping.dataType) {
            case 'number':
              value = Number(value) || 0;
              break;
            case 'currency':
              value = String(value).replace(/[^0-9.-]/g, '');
              break;
            case 'date':
              value = new Date(value).toISOString().split('T')[0];
              break;
            default:
              value = String(value);
          }
          
          mappedRow[mapping.customFieldName] = value;
        }
      });
      
      return mappedRow;
    });

    // Generate CSV
    const headers = mappings.filter(m => m.customFieldName).map(m => m.customFieldName);
    const csvRows = [headers.join(',')];

    processedData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    
    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}_mapped_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Clean CSV exported with ${processedData.length} rows`
    });
  };

  const completeMapping = () => {
    const validMappings = mappings.filter(m => m.originalColumn && m.customFieldName);
    
    if (validMappings.length === 0) {
      toast({
        title: "No Mappings",
        description: "Please map at least one column",
        variant: "destructive"
      });
      return;
    }

    const processedData = rawData.map(row => {
      const mappedRow: any = {};
      
      validMappings.forEach(mapping => {
        let value = row[mapping.originalColumn];
        
        // Apply data type transformations
        switch (mapping.dataType) {
          case 'number':
            value = Number(value) || 0;
            break;
          case 'currency':
            value = String(value).replace(/[^0-9.-]/g, '');
            break;
          case 'date':
            value = new Date(value).toISOString().split('T')[0];
            break;
          default:
            value = String(value);
        }
        
        mappedRow[mapping.customFieldName] = value;
      });
      
      return mappedRow;
    });

    onMappingComplete(processedData, validMappings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Clay-style Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Smart Column Mapping
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Transform "{fileName}" into your perfect data structure
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={onBack} className="rounded-xl">
              ← Back to Upload
            </Button>
          </div>
        </div>

        {/* Clay-style Mapping Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Edit3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Column Mappings
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {mappings.length} columns detected • Drag to reorder
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={addCustomField}
                className="rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-700">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Original Column</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Custom Field Name
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Data Type</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Sample Value</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Required</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, index) => (
                  <TableRow key={mapping.id} className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {mapping.originalColumn || 'Custom Field'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={mapping.customFieldName}
                        onChange={(e) => updateMapping(mapping.id, 'customFieldName', e.target.value)}
                        placeholder="field_name"
                        className="w-48 rounded-lg border-slate-300 dark:border-slate-600 focus:border-blue-400 focus:ring-blue-400"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={mapping.dataType}
                        onChange={(e) => updateMapping(mapping.id, 'dataType', e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:border-blue-400 focus:ring-blue-400"
                      >
                        <option value="text">📝 Text</option>
                        <option value="number">🔢 Number</option>
                        <option value="currency">💰 Currency</option>
                        <option value="date">📅 Date</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 dark:text-slate-400 max-w-32 truncate bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {mapping.sampleValue || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={mapping.isRequired ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateMapping(mapping.id, 'isRequired', !mapping.isRequired)}
                        className={`rounded-lg ${
                          mapping.isRequired 
                            ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {mapping.isRequired ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Required
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Optional
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(mapping.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Clay-style Preview Section */}
        {showPreview && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Data Preview
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    First 5 rows of your transformed data
                  </p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    {mappings.filter(m => m.customFieldName).map(mapping => (
                      <TableHead key={mapping.id} className="font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          {mapping.customFieldName}
                          {mapping.isRequired && (
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
                  {previewData.map((row, index) => (
                    <TableRow key={index} className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      {mappings.filter(m => m.customFieldName).map(mapping => (
                        <TableCell key={mapping.id} className="text-slate-900 dark:text-slate-100">
                          {row[mapping.customFieldName] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Clay-style Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={generatePreview}
                className="rounded-xl border-slate-300 dark:border-slate-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Data
              </Button>
              <Button 
                variant="outline" 
                onClick={exportCleanCSV}
                className="rounded-xl border-slate-300 dark:border-slate-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Clean CSV
              </Button>
            </div>
            
            <Button 
              onClick={completeMapping}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Complete Mapping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

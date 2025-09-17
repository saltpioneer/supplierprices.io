import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Eye, 
  Trash2, 
  FileText, 
  Table as TableIcon,
  Mail,
  File
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import type { Source } from "@/lib/types";

const sourceIcons = {
  pdf: FileText,
  csv: TableIcon,
  text: File,
  email: Mail,
};

const statusColors = {
  parsed: "default" as const,
  failed: "destructive" as const,
  pending: "secondary" as const,
};

export default function Library() {
  const { toast } = useToast();
  const [sources, setSources] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("id,name,type,status,row_count,uploaded_at,mapping");
      if (error) return;
      const normalized = (data || []).map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          status: s.status,
          rowCount: s.row_count,
          uploadedAt: s.uploaded_at,
          mapping: s.mapping || {},
        }));
      setSources(normalized);
    };
    load();
  }, []);

  const handleViewSource = (source: Source) => {
    setSelectedSource(source);
    setPreviewOpen(true);
  };

  const handleDeleteSource = async (sourceId: string) => {
    // Delete dependent offers FIRST to avoid FK/NOT NULL issues, then delete the source
    const { error: offersErr } = await supabase.from("offers").delete().eq("source_id", sourceId);
    if (offersErr) {
      toast({ title: "Delete failed", description: offersErr.message, variant: "destructive" });
      return;
    }

    const { error: sourceErr } = await supabase.from("sources").delete().eq("id", sourceId);
    if (sourceErr) {
      toast({ title: "Delete failed", description: sourceErr.message, variant: "destructive" });
      return;
    }
    // Refresh
    const { data } = await supabase.from("sources").select("id,name,type,status,row_count,uploaded_at,mapping");
    setSources(
      (data || []).map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        rowCount: s.row_count,
        uploadedAt: s.uploaded_at,
        mapping: s.mapping || {},
      }))
    );
    toast({
      title: "Source deleted",
      description: "The source and associated offers have been removed",
    });
  };

  if (sources.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <Database className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No Sources Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upload your first price list to start building your supplier library.
            </p>
          </div>
          <Button asChild>
            <a href="/app/upload">Upload Price Data</a>
          </Button>
        </div>
      </div>
    );
  }

  const sortedSources = [...sources].sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return sortOrder === "latest" ? tb - ta : ta - tb;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Source Library</h1>
          <p className="text-muted-foreground">
            Manage your ingested price sources and view parsing details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="table-container">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sources ({sources.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="table-header">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSources.map((source, idx) => {
                const IconComponent = sourceIcons[source.type];
                return (
                  <TableRow key={source.id} className="table-row">
                    <TableCell className="w-10 text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{source.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {source.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[source.status]}>
                        {source.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{source.rowCount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(source.uploadedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSource(source)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSource(source.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Source Preview Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-[600px] sm:w-[800px]">
          {selectedSource && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = sourceIcons[selectedSource.type];
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                  {selectedSource.name}
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSource.type.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      <Badge variant={statusColors[selectedSource.status]}>
                        {selectedSource.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rows Parsed</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSource.rowCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Uploaded</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedSource.uploadedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Column Mapping</label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(selectedSource.mapping).map(([field, column]) => (
                      <div key={field} className="flex justify-between items-center p-2 bg-muted rounded-md">
                        <span className="font-medium">{field}</span>
                        <span className="text-muted-foreground">{column}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Sample Data Preview</label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Ace Metals</TableCell>
                          <TableCell>Copper Pipe 15mm</TableCell>
                          <TableCell>$485.00</TableCell>
                          <TableCell>per 5m</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ace Metals</TableCell>
                          <TableCell>PVC Conduit 20mm</TableCell>
                          <TableCell>$125.00</TableCell>
                          <TableCell>per 5m</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
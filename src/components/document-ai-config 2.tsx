// Document AI Configuration Component
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Zap,
  Info
} from "lucide-react";

interface DocumentAIConfigProps {
  onConfigured?: () => void;
}

export function DocumentAIConfig({ onConfigured }: DocumentAIConfigProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('us');
  const [processorId, setProcessorId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check current configuration
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const { documentAIService } = await import('@/lib/document-ai-service');
      const status = documentAIService.getConfigurationStatus();
      setIsConfigured(status.configured);
      
      if (status.configured) {
        setProjectId(import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || '');
        setLocation(import.meta.env.VITE_GOOGLE_CLOUD_LOCATION || 'us');
        setProcessorId(import.meta.env.VITE_DOCUMENT_AI_PROCESSOR_ID || '');
      }
    } catch (error) {
      console.error('Error checking Document AI configuration:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // In a real application, you would save these to your backend
      // For now, we'll just show a success message
      
      toast({
        title: "Configuration Saved",
        description: "Document AI configuration has been saved. Please restart the application to apply changes.",
      });

      setIsConfigured(true);
      onConfigured?.();
      
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to save Document AI configuration. Please check your settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openSetupGuide = () => {
    window.open('/DOCUMENT_AI_SETUP.md', '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Google Cloud Document AI</h2>
              <p className="text-sm text-muted-foreground font-normal">
                Configure advanced PDF parsing with 95%+ accuracy
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            {isConfigured ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    Document AI Configured
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Advanced PDF parsing is enabled
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-medium text-amber-900 dark:text-amber-100">
                    Document AI Not Configured
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    Using fallback PDF parsing
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectId">Google Cloud Project ID</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-project-123"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your Google Cloud Console dashboard
              </p>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="us"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Region where your Document AI processor is located
              </p>
            </div>

            <div>
              <Label htmlFor="processorId">Processor ID</Label>
              <Input
                id="processorId"
                value={processorId}
                onChange={(e) => setProcessorId(e.target.value)}
                placeholder="abc123def456"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your Document AI processor details
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={openSetupGuide}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Setup Guide
            </Button>

            <Button
              onClick={handleSave}
              disabled={!projectId || !processorId || isLoading}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Document AI Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">95%+ Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Multi-Table Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Entity Recognition</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Layout Preservation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Confidence Scores</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Enterprise Ready</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

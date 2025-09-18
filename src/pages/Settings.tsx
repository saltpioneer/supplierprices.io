import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  DollarSign, 
  Layout, 
  Mail, 
  Database,
  AlertTriangle
} from "lucide-react";
import { getSettings, setSettings, resetDemoData } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettingsState] = useState<Settings>(() => getSettings());
  const { theme, setTheme } = useTheme();

  const handleSettingChange = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettingsState(newSettings);
    setSettings(newSettings);
    
    toast({
      title: "Settings updated",
      description: "Your preferences have been saved",
    });
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to reset all demo data? This cannot be undone.")) {
      resetDemoData();
      toast({
        title: "Demo data reset",
        description: "All data has been cleared. The page will reload.",
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your price aggregator preferences and defaults
        </p>
      </div>

      {/* Normalization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Price Normalization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="baseCurrency">Base Currency</Label>
            <Select
              value={settings.baseCurrency}
              onValueChange={(value: "AUD" | "USD" | "EUR" | "GBP") => 
                handleSettingChange("baseCurrency", value)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="GBP">British Pound (GBP)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              All prices will be normalized to this currency
            </p>
          </div>
          <div>
            <Label htmlFor="roundingPrecision">Rounding Precision</Label>
            <Select
              value={settings.roundingPrecision.toString()}
              onValueChange={(value) => handleSettingChange("roundingPrecision", parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 decimal places</SelectItem>
                <SelectItem value="1">1 decimal place</SelectItem>
                <SelectItem value="2">2 decimal places</SelectItem>
                <SelectItem value="3">3 decimal places</SelectItem>
                <SelectItem value="4">4 decimal places</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Number of decimal places for normalized prices
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Display Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="appearance">Appearance</Label>
            <Select
              value={theme}
              onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Choose light or dark theme
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Integration (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Email Ingestion Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Automatically parse price lists from supplier emails. 
                Configure email forwarding and parsing rules.
              </p>
            </div>
            <Button disabled variant="outline">
              Configure Email Ingestion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Demo Data</h3>
              <p className="text-sm text-muted-foreground">
                Reset all demo data including suppliers, products, offers, and sources
              </p>
            </div>
            
            <div className="flex items-center gap-2 p-3 border border-warning/20 bg-warning/5 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm text-warning-foreground">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleResetData}
              className="w-full"
            >
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
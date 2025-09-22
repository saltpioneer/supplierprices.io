import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Upload, 
  LayoutDashboard, 
  Database, 
  Users, 
  Settings,
  Package,
  Building2
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProducts, getSuppliers } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState(() => getProducts());
  const [suppliers, setSuppliers] = useState(() => getSuppliers());
  const [sources, setSources] = useState<any[]>([]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  // Close on escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  // Load latest from Supabase for global search results
  useEffect(() => {
    const load = async () => {
      const [p, s, so] = await Promise.all([
        supabase.from("products").select("id,name,category,unit"),
        supabase.from("suppliers").select("id,name"),
        supabase.from("sources").select("id,name,type,uploaded_at"),
      ]);
      if (!p.error && p.data) setProducts(p.data.map((x: any) => ({
        id: String(x.id),
        name: String(x.name ?? ""),
        category: String(x.category ?? ""),
        unit: String(x.unit ?? "pcs"),
      })));
      if (!s.error && s.data) setSuppliers(s.data);
      if (!so.error && so.data) setSources(so.data);
    };
    load();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search products, suppliers, or navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/app/dashboard"))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/app/upload"))}
          >
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/app/library"))}
          >
            <Database className="mr-2 h-4 w-4" />
            <span>Library</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/app/suppliers"))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Suppliers</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/app/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        {products.length > 0 && (
          <CommandGroup heading="Products">
            {products.slice(0, 50).map((product) => (
              <CommandItem
                key={product.id}
                onSelect={() => runCommand(() => navigate(`/app/products/${product.id}`))}
              >
                <Package className="mr-2 h-4 w-4" />
                <span>{product.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {product.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {suppliers.length > 0 && (
          <CommandGroup heading="Suppliers">
            {suppliers.slice(0, 50).map((supplier) => (
              <CommandItem
                key={supplier.id}
                onSelect={() => runCommand(() => navigate("/app/suppliers"))}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>{supplier.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {sources.length > 0 && (
          <CommandGroup heading="Data Sources">
            {sources.slice(0, 50).map((src) => (
              <CommandItem
                key={src.id}
                onSelect={() => runCommand(() => navigate("/app/library"))}
              >
                <Database className="mr-2 h-4 w-4" />
                <span>{src.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">source · {new Date(src.uploaded_at).toLocaleDateString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
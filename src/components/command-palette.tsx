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

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [products] = useState(() => getProducts());
  const [suppliers] = useState(() => getSuppliers());

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
            {products.slice(0, 5).map((product) => (
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
            {suppliers.slice(0, 5).map((supplier) => (
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
      </CommandList>
    </CommandDialog>
  );
}
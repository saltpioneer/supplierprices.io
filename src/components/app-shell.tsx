import { useState, useEffect } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { 
  Search, 
  Upload, 
  LayoutDashboard, 
  Database, 
  Users, 
  Settings, 
  Menu,
  X,
  Command
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
    shortcut: "g d",
  },
  {
    title: "Upload",
    href: "/app/upload", 
    icon: Upload,
    shortcut: "g u",
  },
  {
    title: "Library",
    href: "/app/library",
    icon: Database,
    shortcut: "g l",
  },
  {
    title: "Suppliers",
    href: "/app/suppliers",
    icon: Users,
    shortcut: "g s",
  },
  {
    title: "Settings",
    href: "/app/settings",
    icon: Settings,
    shortcut: "g t",
  },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          Price Aggregator
        </h2>
      </div>
      
      <div className="flex-1 overflow-auto py-2">
        <nav className="sidebar-nav px-2">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onItemClick}
                className={cn(
                  "sidebar-nav-item",
                  isActive && "active"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // Only handle other shortcuts if not typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // "/" for search
      if (e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // "u" for upload
      if (e.key === "u") {
        e.preventDefault();
        window.location.href = "/app/upload";
        return;
      }

      // Navigation shortcuts (g + letter)
      if (e.key === "g") {
        const nextKey = new Promise<string>((resolve) => {
          const handler = (nextE: KeyboardEvent) => {
            document.removeEventListener("keydown", handler);
            resolve(nextE.key);
          };
          document.addEventListener("keydown", handler);
        });

        nextKey.then((key) => {
          switch (key) {
            case "d":
              window.location.href = "/app/dashboard";
              break;
            case "u":
              window.location.href = "/app/upload";
              break;
            case "l":
              window.location.href = "/app/library";
              break;
            case "s":
              window.location.href = "/app/suppliers";
              break;
            case "t":
              window.location.href = "/app/settings";
              break;
          }
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 border-r border-sidebar-border bg-sidebar">
          <SidebarContent />
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <SidebarContent onItemClick={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4">
          {/* Mobile menu button */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
            </Sheet>
          )}

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline-flex">Search products, suppliers...</span>
              <span className="lg:hidden">Search...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 lg:inline-flex ml-auto">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <NavLink to="/app/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </NavLink>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
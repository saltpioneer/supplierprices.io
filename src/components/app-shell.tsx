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
  Command,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettings, setSettings } from "@/lib/storage";
import { CommandPalette } from "@/components/command-palette";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

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
];

function SidebarContent({ onItemClick, collapsed, setProfileOpen, avatarUrl, companyName, setCollapsed }: { 
  onItemClick?: () => void; 
  collapsed?: boolean;
  setProfileOpen: (open: boolean) => void;
  avatarUrl: string;
  companyName: string;
  setCollapsed?: (collapsed: boolean) => void;
}) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 justify-between">
        <h2 className={cn("text-lg font-semibold text-sidebar-foreground", collapsed && "sr-only")}>SupplierPrices.io</h2>
        {!collapsed && setCollapsed && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(true)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
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
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="mt-auto border-t border-sidebar-border p-2 space-y-1">
        <NavLink to="/app/settings" onClick={onItemClick} className="sidebar-nav-item">
          <SettingsIcon className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noreferrer" className="sidebar-nav-item">
          <HelpCircle className="h-4 w-4" />
          {!collapsed && <span>Get Help</span>}
        </a>
      </div>

      {/* Company profile footer */}
      <div className="border-t border-sidebar-border p-3">
        <button className="flex items-center gap-2 w-full text-left" onClick={() => setProfileOpen(true)}>
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt="Company" />
            <AvatarFallback>{(companyName || "CO").split(" ").map(w => w?.[0]).filter(Boolean).slice(0,2).join("")}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1">
              <div className="text-sm font-medium">{companyName}</div>
              <div className="text-xs text-muted-foreground">View profile</div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>("Your Company");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const isMobile = useIsMobile();
  const location = useLocation();
  const [baseCurrency, setBaseCurrency] = useState<string>(() => getSettings().baseCurrency);

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

  // Load company profile (global single row)
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_name, avatar_url, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (!error && data && data[0]) {
        setCompanyName(data[0].company_name || "Your Company");
        setAvatarUrl(data[0].avatar_url || "");
      }
    };
    load();
  }, []);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={cn(collapsed ? "w-16" : "w-64", "border-r border-sidebar-border bg-sidebar")}>          
          <div className="h-full flex flex-col relative">
            {collapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-7 w-7 z-10" 
                onClick={() => setCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <SidebarContent collapsed={collapsed} setProfileOpen={setProfileOpen} avatarUrl={avatarUrl} companyName={companyName} setCollapsed={setCollapsed} />
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <SidebarContent onItemClick={() => setSidebarOpen(false)} setProfileOpen={setProfileOpen} avatarUrl={avatarUrl} companyName={companyName} />
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

          {/* Left cluster: global search + Upload */}
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1 max-w-sm">
              <Button
                variant="outline"
                className="w-full h-9 justify-start text-muted-foreground"
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
            <Button asChild size="sm">
              <NavLink to="/app/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </NavLink>
            </Button>
          </div>

          {/* Right: Base currency */}
          <div className="ml-auto">
            <Select
              value={baseCurrency}
              onValueChange={(v) => {
                setBaseCurrency(v);
                const s = getSettings();
                setSettings({ ...s, baseCurrency: v as any });
              }}
            >
              <SelectTrigger className="w-28 h-9 justify-start text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Profile Customizer */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input placeholder="Your Company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Avatar URL</label>
              <Input placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={async () => {
                const { data } = await supabase.from("profiles").select("id").limit(1);
                if (data && data[0]?.id) {
                  await supabase
                    .from("profiles")
                    .update({ company_name: companyName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
                    .eq("id", data[0].id);
                } else {
                  await supabase
                    .from("profiles")
                    .insert([{ company_name: companyName, avatar_url: avatarUrl }]);
                }
                setProfileOpen(false);
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
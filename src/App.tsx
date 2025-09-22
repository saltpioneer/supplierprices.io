import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Import pages
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Library from "@/pages/Library";
import Suppliers from "@/pages/Suppliers";
import Settings from "@/pages/Settings";
import ProductDetail from "@/pages/ProductDetail";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="price-aggregator-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="upload" element={<Upload />} />
                <Route path="library" element={<Library />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="products/:id" element={<ProductDetail />} />
              </Route>
              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

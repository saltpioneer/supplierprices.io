import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDemoData } from "@/lib/seed";

// Ensure demo data exists to prevent blank dashboards on first load
try { initializeDemoData(); } catch {}

createRoot(document.getElementById("root")!).render(<App />);

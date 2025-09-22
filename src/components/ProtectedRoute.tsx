import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AUTH_REQUIRED = String(import.meta.env.VITE_AUTH_REQUIRED || "false").toLowerCase() === "true";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(!AUTH_REQUIRED);

  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    const check = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const hasMock = !!localStorage.getItem("mock_auth_user");
        if (!data?.user && !hasMock) {
          navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
        } else {
          setChecked(true);
        }
      } catch {
        const hasMock = !!localStorage.getItem("mock_auth_user");
        if (hasMock) setChecked(true); else navigate("/login");
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }
  return <>{children}</>;
}



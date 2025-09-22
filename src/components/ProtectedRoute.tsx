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
    let unsub: any;
    const init = async () => {
      try {
        // First check existing session
        const { data: sessionData } = await (supabase as any).auth.getSession?.();
        const hasUser = !!sessionData?.session?.user;
        const hasMock = !!localStorage.getItem("mock_auth_user");
        if (hasUser || hasMock) {
          setChecked(true);
        } else {
          // subscribe to auth state changes (handles async OAuth restore)
          const sub = (supabase as any).auth.onAuthStateChange?.((_event: any, s: any) => {
            if (s?.user) setChecked(true);
          });
          unsub = sub?.data?.subscription;
          // soft delay before redirect to allow restoration
          setTimeout(async () => {
            const { data } = await supabase.auth.getUser();
            if (!data?.user && !localStorage.getItem("mock_auth_user")) {
              navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
            }
          }, 250);
        }
      } catch {
        if (localStorage.getItem("mock_auth_user")) setChecked(true); else navigate("/login");
      }
    };
    init();
    return () => {
      try { unsub?.unsubscribe?.(); } catch {}
    };
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



import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/app/dashboard";

  useEffect(() => {
    // If already signed in (or mock), redirect
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user || localStorage.getItem("mock_auth_user")) {
        navigate(next, { replace: true });
      }
    });
  }, [navigate, next]);

  const loginGoogle = async () => {
    try {
      const { data, error } = await (supabase as any).auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/#/app/dashboard" } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      // Fallback to mock
      localStorage.setItem("mock_auth_user", JSON.stringify({ provider: "google", id: "mock-user" }));
      navigate(next, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={loginGoogle}>Continue with Google</Button>
          <div className="text-xs text-muted-foreground text-center">
            Auth is optional. Set VITE_AUTH_REQUIRED=true to enforce.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



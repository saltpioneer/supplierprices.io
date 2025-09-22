import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/app/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  const loginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await (supabase as any).auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(next, { replace: true });
    } catch (err) {
      console.error(err);
      alert("Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="space-y-2" onSubmit={loginPassword}>
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
          <div className="relative text-center text-xs text-muted-foreground"><span className="px-2 bg-background">OR</span></div>
          <Button variant="outline" className="w-full" onClick={loginGoogle}>Sign in with Google</Button>
          <div className="text-xs text-muted-foreground text-center">
            Auth is optional. Set VITE_AUTH_REQUIRED=true to enforce.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



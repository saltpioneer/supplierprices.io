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
  const REAL_AUTH = Boolean(
    String(import.meta.env.VITE_SUPABASE_URL || "").match(/^https?:\/\//i) &&
    String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").length > 20
  );
  const DEV_OVERRIDE = String(import.meta.env.VITE_AUTH_DEV_MODE || import.meta.env.VITE_AUTH_IGNORE_ERRORS || "false").toLowerCase() === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(() => (params.get('mode') === 'signup' ? 'signup' : 'signin'));

  useEffect(() => {
    // If already signed in (or mock), redirect
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user || localStorage.getItem("mock_auth_user")) {
        navigate(next, { replace: true });
      }
    });
    // Also listen for OAuth session restoration and navigate when available
    const sub = (supabase as any).auth.onAuthStateChange?.((_event: any, session: any) => {
      if (session?.user) {
        navigate("/app/dashboard", { replace: true });
      }
    });
    return () => {
      try { sub?.data?.subscription?.unsubscribe?.(); } catch {}
    };
  }, [navigate, next]);

  const loginOAuth = async (provider: 'google' | 'github' | 'azure') => {
    try {
      const mapped = provider === 'azure' ? 'azure' : provider; // supabase uses 'azure' for Microsoft
      const { data, error } = await (supabase as any).auth.signInWithOAuth({ provider: mapped, options: { redirectTo: window.location.origin + "/#/app/dashboard" } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      if (!REAL_AUTH || DEV_OVERRIDE) {
        // Fallback to mock only when real env is not configured or dev override enabled
        localStorage.setItem("mock_auth_user", JSON.stringify({ provider, id: "mock-user" }));
        navigate(next, { replace: true });
      } else {
        alert("OAuth sign-in failed. Check Supabase provider settings.");
      }
    }
  };

  const loginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = mode === 'signup'
        ? await (supabase as any).auth.signUp({ email, password })
        : await (supabase as any).auth.signInWithPassword({ email, password });
      const { data, error } = result as any;
      if (error) throw error;
      // In dev or with mock, there may be no user object yet. Create a local session so we can proceed.
      if (!data?.user && (!REAL_AUTH || DEV_OVERRIDE)) {
        const isMaster = String(import.meta.env.VITE_MASTER_EMAIL || "").toLowerCase() === email.toLowerCase();
        localStorage.setItem("mock_auth_user", JSON.stringify({ id: "mock-user", email, is_master: isMaster }));
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (!REAL_AUTH || DEV_OVERRIDE) {
        // Dev fallback: create a local mock session so work can continue
        try {
          const isMaster = String(import.meta.env.VITE_MASTER_EMAIL || "").toLowerCase() === email.toLowerCase();
          localStorage.setItem("mock_auth_user", JSON.stringify({ id: "mock-user", email, is_master: isMaster }));
          navigate(next, { replace: true });
          return;
        } catch {}
      }
      alert((mode === 'signup' ? "Sign up failed: " : "Login failed: ") + (err?.message || ""));
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
            <Button className="w-full" type="submit" disabled={loading}>{loading ? (mode === 'signup' ? 'Creating...' : 'Signing in...') : (mode === 'signup' ? 'Create account' : 'Sign in')}</Button>
          </form>
          <div className="text-xs text-center">
            {mode === 'signup' ? (
              <button className="underline" onClick={() => setMode('signin')}>Have an account? Sign in</button>
            ) : (
              <button className="underline" onClick={() => setMode('signup')}>Create account</button>
            )}
          </div>
          <div className="relative text-center text-xs text-muted-foreground"><span className="px-2 bg-background">OR</span></div>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="w-full" onClick={() => loginOAuth('google')}>Sign in with Google</Button>
            <Button variant="outline" className="w-full" onClick={() => loginOAuth('github')}>Sign in with GitHub</Button>
            <Button variant="outline" className="w-full" onClick={() => loginOAuth('azure')}>Sign in with Microsoft</Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Auth is optional. Set VITE_AUTH_REQUIRED=true to enforce.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



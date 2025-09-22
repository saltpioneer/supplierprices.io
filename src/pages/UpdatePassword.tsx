import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await (supabase as any).auth.updateUser({ password });
      if (error) throw error;
      alert("Password updated. Please sign in again.");
      navigate("/login");
    } catch (err: any) {
      alert("Failed to update password: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-2" onSubmit={update}>
            <Input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



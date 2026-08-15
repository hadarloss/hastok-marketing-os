"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const INPUT_CLASS =
  "rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "שגיאה בהתחברות");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      // Full navigation (not router.push) so the proxy re-checks with the fresh cookie.
      window.location.href = next;
    } catch {
      setError("שגיאת רשת — נסו שוב.");
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border p-6"
      >
        <div className="text-center">
          <div className="mb-1 text-2xl" aria-hidden>
            🔒
          </div>
          <h1 className="text-lg font-semibold text-foreground">כניסה לצוות ה-AI שלי</h1>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-sm text-muted-foreground">
            שם משתמש
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={INPUT_CLASS}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-muted-foreground">
            סיסמה
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !username || !password}>
          {loading ? "מתחבר/ת..." : "כניסה"}
        </Button>
      </form>
    </div>
  );
}

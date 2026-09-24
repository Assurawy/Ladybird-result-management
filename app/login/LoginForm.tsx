"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DemoAccount = { username: string; name: string; role: string };
type SchoolBranding = { name: string; motto: string; logoUrl: string | null };

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [school, setSchool] = useState<SchoolBranding | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo-accounts")
      .then((r) => r.json())
      .then((data) => setDemoAccounts(data.accounts ?? []))
      .catch(() => {});
    fetch("/api/school/public")
      .then((r) => r.json())
      .then((data) => setSchool(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed.");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  function fillDemo(account: DemoAccount) {
    setUsername(account.username);
    setPassword("demo123");
    setError(null);
  }

  return (
    <div className="login-screen">
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-brand">
          {school?.logoUrl ? <img src={school.logoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 10px", objectFit: "cover" }} /> : <div className="login-logo-fallback">{(school?.name || "L")[0]}</div>}
          <h1>{school?.name || "Ladybird Whole-School System"}</h1>
          {school?.motto && <p style={{ fontStyle: "italic" }}>{school.motto}</p>}
        </div>

        <label className="field-label" htmlFor="username">
          Username
        </label>
        <input id="username" className="field-input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />

        <label className="field-label" style={{ marginTop: 14 }} htmlFor="password">
          Password
        </label>
        <div className="password-field-wrap">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="field-input"
            style={{ paddingRight: 56 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {demoAccounts.length > 0 && (
          <>
            <p className="login-demo-hint">Tap an account to autofill (password: demo123)</p>
            {demoAccounts.map((a) => (
              <button type="button" key={a.username} className="login-demo-row" onClick={() => fillDemo(a)}>
                <span className="login-demo-username">{a.username}</span>
                <span className="login-demo-role">{a.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
              </button>
            ))}
          </>
        )}
      </form>
    </div>
  );
}

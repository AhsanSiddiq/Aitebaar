"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const DEMO_USERS = [
  { email: "rm@demolender.pk", role: "Relationship Manager", name: "Sana Malik" },
  { email: "analyst@demolender.pk", role: "Credit Analyst", name: "Bilal Qureshi" },
  { email: "cro@demolender.pk", role: "Chief Risk Officer", name: "Ayesha Rahman" },
  { email: "admin@demolender.pk", role: "Admin", name: "Hamza Siddiqui" },
];
// Demo-only credential, also documented in README. Real tenants never use a shared password.
const DEMO_PASSWORD = "aitebaar-demo";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_USERS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.ok) {
      router.push("/");
      router.refresh();
    } else setError("Email or password is incorrect.");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <fieldset>
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-50">Demo role</legend>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_USERS.map((u) => (
            <button
              type="button"
              key={u.email}
              onClick={() => {
                setEmail(u.email);
                setPassword(DEMO_PASSWORD);
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                email === u.email ? "border-emerald bg-emerald-50 text-emerald-deep" : "border-line bg-surface hover:bg-paper"
              }`}
            >
              <span className="block font-medium">{u.role}</span>
              <span className="block text-xs text-ink-50">{u.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
          required
        />
      </label>
      {error && <p className="text-sm text-risk-alert">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

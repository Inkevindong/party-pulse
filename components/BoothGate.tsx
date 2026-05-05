"use client";

import { HostPanel } from "@/components/HostPanel";
import { type FormEvent, useEffect, useState } from "react";

/**
 * Guards the DJ panel behind a password.
 * - If HOST_SECRET is not set on the server, auto-passes immediately.
 * - If authenticated, renders HostPanel and stores the verified password
 *   in sessionStorage (cleared when the tab closes).
 */
export function BoothGate({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<"checking" | "gate" | "authed">("checking");
  const [password, setPassword] = useState("");
  const [verifiedSecret, setVerifiedSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: check sessionStorage first, then probe if HOST_SECRET is configured.
  useEffect(() => {
    const stored = sessionStorage.getItem("pp_booth_pw");
    if (stored !== null) {
      setVerifiedSecret(stored);
      setStatus("authed");
      return;
    }
    // Probe with empty password — if server has no HOST_SECRET it returns ok:true.
    fetch("/api/host/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "" }),
    })
      .then((r) => {
        if (r.ok) {
          sessionStorage.setItem("pp_booth_pw", "");
          setVerifiedSecret("");
          setStatus("authed");
        } else {
          setStatus("gate");
        }
      })
      .catch(() => setStatus("gate"));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/host/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setError("Wrong password.");
        setPassword("");
        return;
      }
      sessionStorage.setItem("pp_booth_pw", password);
      setVerifiedSecret(password);
      setStatus("authed");
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authed") {
    return <HostPanel eventId={eventId} hostSecret={verifiedSecret} />;
  }

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm uppercase tracking-widest text-zinc-700">Checking access…</p>
      </div>
    );
  }

  // Password gate
  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="glass p-8">
        <p className="font-display text-3xl tracking-widest text-white">BOOTH ACCESS</p>
        <p className="mt-1 text-sm text-zinc-600">DJ &amp; host only. Enter the booth password.</p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Booth password"
            autoFocus
            autoComplete="current-password"
            className="w-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-white/30 focus:outline-none"
          />
          {error && (
            <p className="text-xs text-accent">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-white py-3 text-sm font-semibold uppercase tracking-widest text-[#080808] transition active:scale-95 disabled:opacity-40"
          >
            {loading ? "Checking…" : "Enter Booth"}
          </button>
        </form>
      </div>
    </div>
  );
}

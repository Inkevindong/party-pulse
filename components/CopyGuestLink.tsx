"use client";

import { useState } from "react";

export function CopyGuestLink({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const path = `/party/${encodeURIComponent(eventId)}`;
    const full = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white"
    >
      {copied ? "Copied link" : "Copy guest link"}
    </button>
  );
}

"use client";

import { getOrCreateClientId } from "@/lib/client-id";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type PartyState = {
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    startedAt: number;
    durationMs?: number;
    imageUrl?: string | null;
    likes: number;
    dislikes: number;
  } | null;
  history: Array<{
    id: string;
    title: string;
    artist: string;
    startedAt: number;
    durationMs?: number;
    imageUrl?: string | null;
    likes: number;
    dislikes: number;
  }>;
  likes: number;
  dislikes: number;
  myVote: "like" | "dislike" | null;
};

function encodeEventSegment(eventId: string) {
  return encodeURIComponent(eventId);
}

function PulseCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass border-white/[0.07] p-5 shadow-card ${className ?? ""}`}>
      {children}
    </div>
  );
}

/** Flame overlay — rendered inside the Fire button when selected */
function FireEffect() {
  const sparks = [
    { left: "14%", delay: "0ms",   dur: "750ms"  },
    { left: "30%", delay: "180ms", dur: "870ms"  },
    { left: "50%", delay: "90ms",  dur: "680ms"  },
    { left: "68%", delay: "310ms", dur: "920ms"  },
    { left: "84%", delay: "50ms",  dur: "800ms"  },
    { left: "22%", delay: "440ms", dur: "730ms"  },
    { left: "58%", delay: "250ms", dur: "810ms"  },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Flickering flame gradient from bottom */}
      <span
        className="fire-flicker absolute inset-x-0 bottom-0 h-3/4"
        style={{
          background: "linear-gradient(to top, rgba(220,38,38,0.55) 0%, rgba(234,88,12,0.30) 50%, transparent 100%)",
        }}
      />
      {/* Rising sparks */}
      {sparks.map((s, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="fire-spark absolute bottom-3 h-1 w-1 rounded-full bg-orange-400"
          style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
    </span>
  );
}

/** Snow overlay — rendered inside the Ice button when selected */
function IceEffect() {
  const flakes = [
    { left: "10%", delay: "0ms",   dur: "2000ms" },
    { left: "28%", delay: "500ms", dur: "1700ms" },
    { left: "46%", delay: "200ms", dur: "2200ms" },
    { left: "64%", delay: "700ms", dur: "1900ms" },
    { left: "82%", delay: "350ms", dur: "2100ms" },
    { left: "20%", delay: "900ms", dur: "1800ms" },
    { left: "55%", delay: "150ms", dur: "2300ms" },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Shimmer ice tint */}
      <span
        className="ice-shimmer absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(96,165,250,0.18) 0%, rgba(34,211,238,0.08) 60%, transparent 100%)" }}
      />
      {/* Falling snowflakes */}
      {flakes.map((f, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="snow-fall absolute top-0 text-[9px] text-blue-200/70"
          style={{ left: f.left, animationDelay: f.delay, animationDuration: f.dur }}
        >
          ❄
        </span>
      ))}
    </span>
  );
}

export function PartyRoom({ eventId }: { eventId: string }) {
  const [clientId, setClientId]       = useState("");
  const [state, setState]             = useState<PartyState | null>(null);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [pending, setPending]         = useState(false);
  const [now, setNow]                 = useState(() => Date.now());
  const hasLoadedRef                  = useRef(false);

  /* ── ALL hooks first — no conditionals above this line ───────── */

  useEffect(() => { setClientId(getOrCreateClientId()); }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    hasLoadedRef.current = false;
    setState(null);
    setFetchError(null);
    setError(null);
  }, [eventId]);

  const fetchState = useCallback(async (signal?: AbortSignal) => {
    if (!clientId) return;
    try {
      const r = await fetch(
        `/api/event/${encodeEventSegment(eventId)}?clientId=${encodeURIComponent(clientId)}`,
        { cache: "no-store", signal },
      );
      if (signal?.aborted) return;
      if (!r.ok) {
        if (!hasLoadedRef.current) setFetchError("Could not load this party. Check your link.");
        return;
      }
      const data = (await r.json()) as PartyState;
      hasLoadedRef.current = true;
      setFetchError(null);
      setState(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!hasLoadedRef.current) setFetchError("Network error. Retrying…");
    }
  }, [eventId, clientId]);

  useEffect(() => {
    if (!clientId) return;
    const controller = new AbortController();
    void fetchState(controller.signal);
    const t = setInterval(() => void fetchState(controller.signal), 3000);
    return () => { clearInterval(t); controller.abort(); };
  }, [clientId, fetchState]);

  // Derived state — computed from `state` (may be null) before any early return
  const currentTrack = state?.currentTrack ?? null;
  const likes        = state?.likes        ?? 0;
  const dislikes     = state?.dislikes     ?? 0;
  const myVote       = state?.myVote       ?? null;
  const history      = useMemo(() => state?.history ?? [], [state?.history]);

  const total    = likes + dislikes;
  const roomTemp = total === 0 ? 50 : Math.round((likes / total) * 100);

  const progressPct = useMemo(() => {
    if (!currentTrack?.durationMs || currentTrack.durationMs <= 0) return null;
    const elapsed = Math.max(0, Math.min(currentTrack.durationMs, now - currentTrack.startedAt));
    return Math.round((elapsed / currentTrack.durationMs) * 100);
  }, [now, currentTrack?.durationMs, currentTrack?.startedAt]);

  const leaderboard = useMemo(
    () =>
      [...history]
        .sort((a, b) => {
          const an = a.likes - a.dislikes;
          const bn = b.likes - b.dislikes;
          if (bn !== an) return bn - an;
          if (b.likes !== a.likes) return b.likes - a.likes;
          return b.startedAt - a.startedAt;
        })
        .slice(0, 5),
    [history],
  );

  const compactHistory = history.length > 8;

  const energyColor =
    roomTemp >= 70
      ? "from-accent via-red-400 to-red-300"
      : roomTemp >= 40
        ? "from-zinc-500 via-zinc-300 to-white"
        : "from-zinc-700 via-zinc-600 to-zinc-500";

  /* ── vote handler ────────────────────────────────────────────── */
  const vote = async (choice: "like" | "dislike") => {
    if (!currentTrack || !clientId || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await fetch(`/api/event/${encodeEventSegment(eventId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, trackId: currentTrack.id, vote: choice }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error === "track_mismatch" ? "Track just changed — tap again." : "Could not save vote.");
        await fetchState();
        return;
      }
      setState(await r.json() as PartyState);
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  };

  /* ── Early returns (after all hooks) ────────────────────────── */
  if (!state) {
    if (fetchError) {
      return (
        <div className="mx-auto max-w-md text-center">
          <PulseCard>
            <p className="text-sm text-zinc-300">{fetchError}</p>
            <button
              type="button"
              className="mt-5 w-full bg-white py-3 text-sm font-semibold uppercase tracking-widest text-[#080808] transition active:scale-95"
              onClick={() => { setFetchError(null); void fetchState(); }}
            >
              Retry
            </button>
          </PulseCard>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-3">
          <div className="mx-auto h-3 w-24 bg-white/10" />
          <div className="mx-auto h-10 max-w-sm bg-white/10" />
          <div className="mx-auto h-5 w-40 bg-white/5" />
        </div>
        <PulseCard>
          <div className="space-y-4">
            <div className="h-3 bg-white/10" />
            <div className="h-3 w-4/5 bg-white/5" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-20 bg-white/5" />
              <div className="h-20 bg-white/5" />
            </div>
          </div>
        </PulseCard>
        <p className="text-center text-sm uppercase tracking-widest text-zinc-600">Connecting…</p>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <PulseCard>
        <div className="py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-white/10 bg-white/5 text-3xl">♪</div>
          <p className="mt-5 font-display text-2xl tracking-wider text-white">WAITING FOR THE DJ</p>
          <p className="mt-2 text-sm text-zinc-500">When the host hits play, votes go live here.</p>
        </div>
      </PulseCard>
    );
  }

  /* ── Main view ──────────────────────────────────────────────── */
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-start">

      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-6">

        {/* Now Playing */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Now playing</p>
          <div className="mt-3 flex items-center gap-4">
            {currentTrack.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentTrack.imageUrl} alt="" className="h-20 w-20 flex-none border border-white/10 object-cover sm:h-24 sm:w-24" />
            ) : (
              <div className="h-20 w-20 flex-none border border-white/10 bg-white/5 sm:h-24 sm:w-24" />
            )}
            <div className="min-w-0">
              <h1 className="font-display text-4xl leading-none tracking-wider text-white sm:text-5xl">{currentTrack.title}</h1>
              <p className="mt-1 truncate text-base text-zinc-400">{currentTrack.artist}</p>
              {progressPct !== null && (
                <div className="mt-3 h-[3px] w-full overflow-hidden bg-white/10">
                  <div className="h-full bg-white/70 transition-none" style={{ width: `${progressPct}%` }} role="presentation" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Room Energy */}
        <PulseCard className={roomTemp >= 80 ? "burn-card" : ""}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Room energy</p>
              <p className="mt-1 font-display text-5xl leading-none tabular-nums text-white">
                {roomTemp}<span className="text-xl text-zinc-600">°</span>
              </p>
            </div>
            <p className="font-mono text-xs tabular-nums text-zinc-600">{total} votes</p>
          </div>
          <div className="mt-4 h-[5px] overflow-hidden bg-white/[0.06]">
            <div className={`h-full bg-gradient-to-r transition-all duration-700 ${energyColor}`} style={{ width: `${roomTemp}%` }} role="presentation" />
          </div>
        </PulseCard>

        {/* Like ratio */}
        <PulseCard>
          <div className="flex justify-between text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            <span>{likes} 🔥</span>
            <span>{dislikes} 🧊</span>
          </div>
          <div className="mt-3 h-[5px] overflow-hidden bg-white/[0.06]">
            <div className="h-full bg-white/60 transition-all duration-500" style={{ width: `${roomTemp}%` }} role="presentation" />
          </div>
          {error && <p className="mt-4 text-center text-xs text-accent/80">{error}</p>}
        </PulseCard>

        {/* Vote buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* FIRE */}
          <button
            type="button"
            disabled={pending}
            onClick={() => void vote("like")}
            className={[
              "relative flex min-h-[5.5rem] flex-col items-center justify-center overflow-hidden border",
              "text-base font-semibold uppercase tracking-widest",
              "transition-all duration-100 active:scale-90 disabled:opacity-40",
              myVote === "like"
                ? "border-orange-500/60 bg-red-950/40 text-orange-300 shadow-glow-accent"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/25 hover:text-white",
            ].join(" ")}
          >
            {myVote === "like" && <FireEffect />}
            <span className="relative z-10 text-3xl" aria-hidden>🔥</span>
            <span className="relative z-10 mt-1 text-xs">Fire</span>
          </button>

          {/* ICE */}
          <button
            type="button"
            disabled={pending}
            onClick={() => void vote("dislike")}
            className={[
              "relative flex min-h-[5.5rem] flex-col items-center justify-center overflow-hidden border",
              "text-base font-semibold uppercase tracking-widest",
              "transition-all duration-100 active:scale-90 disabled:opacity-40",
              myVote === "dislike"
                ? "border-blue-400/50 bg-blue-950/40 text-blue-200 shadow-[0_0_40px_-10px_rgba(96,165,250,0.5)]"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-accent/30 hover:text-white",
            ].join(" ")}
          >
            {myVote === "dislike" && <IceEffect />}
            <span className="relative z-10 text-3xl" aria-hidden>🧊</span>
            <span className="relative z-10 mt-1 text-xs">Meh</span>
          </button>
        </div>

        <p className="text-center text-[11px] uppercase tracking-widest text-zinc-700">
          One vote per track · change anytime
        </p>
      </div>

      {/* RIGHT COLUMN */}
      <PulseCard>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Played tonight</p>
          <span className="font-mono text-xs text-zinc-700">{history.length}</span>
        </div>

        {leaderboard.length > 0 && (
          <div className="mt-4 border border-white/[0.06] bg-black/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">🏆 Tonight&apos;s hottest</p>
            <ol className="mt-3 space-y-2">
              {leaderboard.map((t, idx) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-[11px] tabular-nums text-zinc-700">{idx + 1}</span>
                    <p className="truncate text-xs font-semibold text-white">{t.title}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/60">+{t.likes - t.dislikes}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {history.length > 0 ? (
          <div className={`mt-4 space-y-2 overflow-auto pr-1 ${compactHistory ? "max-h-[20rem]" : "max-h-[28rem]"}`}>
            {history.map((t) => (
              <div key={t.id} className="slide-in flex items-center gap-3">
                {t.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt="" className={`border border-white/10 object-cover ${compactHistory ? "h-8 w-8" : "h-10 w-10"}`} />
                ) : (
                  <div className={`border border-white/10 bg-white/5 ${compactHistory ? "h-8 w-8" : "h-10 w-10"}`} />
                )}
                <div className="min-w-0">
                  <p className={`truncate font-semibold text-white ${compactHistory ? "text-xs" : "text-sm"}`}>{t.title}</p>
                  <p className={`truncate text-zinc-600 ${compactHistory ? "text-[10px]" : "text-xs"}`}>{t.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-zinc-600">No tracks yet.</p>
        )}
      </PulseCard>
    </div>
  );
}

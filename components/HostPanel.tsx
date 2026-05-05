"use client";

import type { PartyState } from "@/components/PartyRoom";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SpotifyNowPlayingResponse =
  | { connected: false; reason?: "not_connected" | "expired" }
  | {
      connected: true;
      now: {
        isPlaying: boolean;
        progressMs: number;
        durationMs: number;
        track: {
          id: string;
          name: string;
          artists: string[];
          imageUrl: string | null;
        } | null;
      };
      refreshed?: boolean;
    };

function PanelCard({ children }: { children: ReactNode }) {
  return (
    <div className="glass border-white/[0.07] p-5 shadow-card">
      {children}
    </div>
  );
}

/**
 * hostSecret: the password verified by BoothGate, forwarded as x-host-secret on
 * every mutating API call. Matches HOST_SECRET on the server.
 */
export function HostPanel({ eventId, hostSecret }: { eventId: string; hostSecret: string }) {
  const [state, setState]                             = useState<PartyState | null>(null);
  const [fetchError, setFetchError]                   = useState<string | null>(null);
  const [message, setMessage]                         = useState<string | null>(null);
  const [error, setError]                             = useState<string | null>(null);
  const [loading, setLoading]                         = useState(false);
  const [spotify, setSpotify]                         = useState<SpotifyNowPlayingResponse | null>(null);
  const [spotifyError, setSpotifyError]               = useState<string | null>(null);
  const [spotifyLoading, setSpotifyLoading]           = useState(false);
  const [spotifyLastUpdatedAt, setSpotifyLastUpdatedAt] = useState<number | null>(null);
  const [spotifyBoostUntil, setSpotifyBoostUntil]     = useState<number | null>(null);
  const [hostname, setHostname]                       = useState("");
  const [autoBroadcast, setAutoBroadcast]             = useState(true);

  const prevConnectedRef        = useRef(false);
  const lastBroadcastedTrackRef = useRef("");
  const autoInFlightRef         = useRef(false);
  const spotifyInflightRef      = useRef(false);
  const stateInflightRef        = useRef(false);
  const spotifyHasTrackRef      = useRef(false);

  const spotifyTrack = useMemo(() => {
    if (!spotify?.connected) return null;
    return spotify.now.track;
  }, [spotify]);

  const spotifyProgress = useMemo(() => {
    if (!spotify?.connected) return null;
    const duration = spotify.now.durationMs || 0;
    const progress = spotify.now.progressMs || 0;
    if (!duration) return { pct: 0, label: "" };
    const pct = Math.max(0, Math.min(100, (progress / duration) * 100));
    const fmt = (ms: number) => {
      const s = Math.floor(ms / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };
    return { pct, label: `${fmt(progress)} / ${fmt(duration)}` };
  }, [spotify]);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    setState(null);
    setFetchError(null);
    setMessage(null);
    setError(null);
    setSpotify(null);
    setSpotifyError(null);
  }, [eventId]);

  const fetchState = useCallback(async () => {
    if (stateInflightRef.current) return;
    stateInflightRef.current = true;
    try {
      const r = await fetch(`/api/event/${encodeURIComponent(eventId)}`, { cache: "no-store" });
      if (!r.ok) { setFetchError("Could not load event state."); return; }
      setFetchError(null);
      setState((await r.json()) as PartyState);
    } catch {
      // transient network error — retry on next tick
    } finally {
      stateInflightRef.current = false;
    }
  }, [eventId]);

  const fetchSpotify = useCallback(async () => {
    if (spotifyInflightRef.current) return;
    spotifyInflightRef.current = true;
    setSpotifyLoading(true);
    setSpotifyError(null);
    try {
      const r = await fetch("/api/spotify/current", { cache: "no-store" });
      if (r.status === 401) {
        const j = (await r.json().catch(() => ({}))) as { reason?: "not_connected" | "expired" };
        setSpotify({ connected: false, reason: j.reason });
        setSpotifyLastUpdatedAt(Date.now());
        return;
      }
      if (!r.ok) {
        setSpotifyError("Spotify temporarily unavailable. Retrying…");
        return;
      }
      const data = (await r.json()) as SpotifyNowPlayingResponse;
      setSpotify(data);
      setSpotifyLastUpdatedAt(Date.now());
      if (data.connected && data.now.track) spotifyHasTrackRef.current = true;
    } catch {
      setSpotifyError("Could not reach Spotify. Check connection.");
    } finally {
      spotifyInflightRef.current = false;
      setSpotifyLoading(false);
    }
  }, []);

  // Regular polling
  useEffect(() => {
    void fetchState();
    const t = setInterval(() => void fetchState(), 3000);
    return () => clearInterval(t);
  }, [fetchState]);

  useEffect(() => {
    void fetchSpotify();
    const t = setInterval(() => void fetchSpotify(), 5000);
    return () => clearInterval(t);
  }, [fetchSpotify]);

  // BFCache / tab-focus refresh — handles returning from Spotify OAuth
  useEffect(() => {
    const refresh = () => { void fetchSpotify(); void fetchState(); };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchSpotify, fetchState]);

  // After OAuth redirect: aggressively poll until a track appears (max 10 s)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") !== "connected") return;
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < 10 && !cancelled; i++) {
        await fetchSpotify();
        if (spotifyHasTrackRef.current) break;
        await new Promise<void>((res) => setTimeout(res, 1000));
      }
      if (!cancelled) {
        const next = new URL(window.location.href);
        next.searchParams.delete("spotify");
        window.history.replaceState({}, "", next.toString());
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [fetchSpotify]);

  // After first connect: boost polling until a track appears (up to 60 s)
  useEffect(() => {
    const connected = Boolean(spotify?.connected);
    const justConnected = connected && !prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (justConnected) setSpotifyBoostUntil(Date.now() + 60_000);

    if (!connected || spotifyTrack || !spotifyLastUpdatedAt) return;
    if (!spotifyBoostUntil || Date.now() >= spotifyBoostUntil) return;

    let cancelled = false;
    spotifyHasTrackRef.current = false;
    const tick = async () => {
      while (!cancelled && !spotifyHasTrackRef.current && Date.now() < (spotifyBoostUntil ?? 0)) {
        await fetchSpotify();
        await new Promise<void>((res) => setTimeout(res, 1200));
      }
    };
    void tick();
    return () => { cancelled = true; };
  }, [spotify, spotifyTrack, spotifyLastUpdatedAt, spotifyBoostUntil, fetchSpotify]);

  const broadcastSpotify = useCallback(async () => {
    if (!spotifyTrack || !spotify?.connected) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hostSecret) headers["x-host-secret"] = hostSecret;
      const r = await fetch(`/api/event/${encodeURIComponent(eventId)}/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: spotifyTrack.name,
          artist: spotifyTrack.artists.join(", "),
          id: `spotify:${spotifyTrack.id}`,
          imageUrl: spotifyTrack.imageUrl,
          durationMs: spotify.now.durationMs,
          startedAt: Date.now() - (spotify.now.progressMs || 0),
        }),
      });
      if (r.status === 401) { setError("Host secret required or incorrect."); return; }
      if (!r.ok)            { setError("Could not broadcast Spotify track."); return; }
      setMessage("Pushed — crowd votes reset.");
      lastBroadcastedTrackRef.current = `spotify:${spotifyTrack.id}`;
      await fetchState();
    } catch {
      setError("Network error — could not push track.");
    } finally {
      setLoading(false);
    }
  }, [spotifyTrack, spotify, hostSecret, eventId, fetchState]);

  // Auto-broadcast when Spotify track changes
  useEffect(() => {
    if (!autoBroadcast || !spotify?.connected || !spotify.now.isPlaying || !spotifyTrack) return;
    const id = `spotify:${spotifyTrack.id}`;
    if (lastBroadcastedTrackRef.current === id || autoInFlightRef.current) return;
    autoInFlightRef.current = true;
    void broadcastSpotify().finally(() => { autoInFlightRef.current = false; });
  }, [autoBroadcast, spotify, spotifyTrack, broadcastSpotify]);

  const connectSpotify = () => {
    window.location.href = `/api/spotify/login?eventId=${encodeURIComponent(eventId)}`;
  };

  const disconnectSpotify = async () => {
    setSpotifyLoading(true);
    setSpotifyError(null);
    try {
      await fetch("/api/spotify/logout", { method: "POST" });
      setSpotify({ connected: false });
      lastBroadcastedTrackRef.current = "";
      spotifyHasTrackRef.current = false;
    } catch {
      setSpotifyError("Could not disconnect Spotify.");
    } finally {
      setSpotifyLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl tracking-widest text-white">CONTROL DECK</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Push what&apos;s on the speakers — guests see it live on the floor.
        </p>
      </div>

      {fetchError && (
        <p className="border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          {fetchError}
        </p>
      )}
      {message && (
        <p className="border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
          {message}
        </p>
      )}
      {error && (
        <p className="border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {state?.currentTrack ? (
        <PanelCard>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Live</p>
          <p className="mt-2 font-display text-2xl tracking-wider text-white">
            {state.currentTrack.title}
          </p>
          <p className="text-zinc-400">{state.currentTrack.artist}</p>
          <div className="mt-4 flex gap-6 border-t border-white/5 pt-4 text-sm text-zinc-500">
            <span><span className="font-medium text-white">{state.likes}</span> 🔥</span>
            <span><span className="font-medium text-accent">{state.dislikes}</span> 🧊</span>
          </div>
        </PanelCard>
      ) : (
        <PanelCard>
          <p className="text-center text-sm text-zinc-500">
            No track broadcast yet. Connect Spotify and hit play.
          </p>
        </PanelCard>
      )}

      <PanelCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg tracking-wider text-white">SPOTIFY</h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Connect your Spotify to auto-detect what&apos;s playing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (spotify?.connected && !spotifyTrack) {
                  setSpotifyBoostUntil(Date.now() + 60_000);
                  spotifyHasTrackRef.current = false;
                }
                void fetchSpotify();
              }}
              disabled={spotifyLoading}
              className="border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              Refresh
            </button>
            {spotify?.connected ? (
              <button
                type="button"
                onClick={() => void disconnectSpotify()}
                disabled={spotifyLoading}
                className="border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 transition hover:border-accent/40 hover:text-white disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={connectSpotify}
                disabled={spotifyLoading}
                className="border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-white/15 disabled:opacity-50"
              >
                Connect Spotify
              </button>
            )}
          </div>
        </div>

        {spotifyError && (
          <p className="mt-4 text-sm text-accent/90">{spotifyError}</p>
        )}
        {hostname === "localhost" && spotify?.connected === false && (
          <p className="mt-4 text-sm text-zinc-400">
            You&apos;re on <span className="font-medium">localhost</span>. Spotify cookies are
            set on <span className="font-medium">127.0.0.1</span> — open{" "}
            <span className="font-medium">
              http://127.0.0.1:3000/host/{encodeURIComponent(eventId)}
            </span>
            {" "}and try again.
          </p>
        )}

        <div className="mt-5 border border-white/[0.06] bg-black/30 p-4">
          {spotify?.connected ? (
            spotifyTrack ? (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    Now playing on Spotify
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    {spotifyTrack.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spotifyTrack.imageUrl}
                        alt=""
                        className="h-14 w-14 flex-none border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 flex-none border border-white/10 bg-white/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl tracking-wider text-white">
                        {spotifyTrack.name}
                      </p>
                      <p className="truncate text-sm text-zinc-400">
                        {spotifyTrack.artists.join(", ")}
                      </p>
                      {spotifyProgress?.label && (
                        <div className="mt-2">
                          <div className="h-[3px] overflow-hidden bg-white/10">
                            <div
                              className="h-full bg-white/70 transition-all duration-500"
                              style={{ width: `${spotifyProgress.pct}%` }}
                              role="presentation"
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">{spotifyProgress.label}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    {spotify.now.isPlaying ? "▶ Playing" : "⏸ Paused"}
                    {spotifyLastUpdatedAt
                      ? ` · updated ${Math.round((Date.now() - spotifyLastUpdatedAt) / 1000)}s ago`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={autoBroadcast}
                      onChange={(e) => setAutoBroadcast(e.target.checked)}
                      className="h-4 w-4 accent-white"
                    />
                    Auto-push on track change
                  </label>
                  {!autoBroadcast && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void broadcastSpotify()}
                      className="mt-2 w-full border border-white/20 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-white/15 disabled:opacity-50"
                    >
                      Push now
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">No active Spotify playback detected yet.</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-600">
                  <li>Start playing a track on the same Spotify account.</li>
                  <li>Turn off Spotify Private Session — it hides playback from the API.</li>
                  <li>Wait ~5–10 s or tap Refresh.</li>
                </ul>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">
                Not connected. Tap &ldquo;Connect Spotify&rdquo; to link your account.
              </p>
              {spotify?.reason && (
                <p className="text-xs text-zinc-600">
                  Reason:{" "}
                  <span className="text-zinc-500">
                    {spotify.reason === "expired" ? "token expired" : "no Spotify session yet"}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </PanelCard>
    </div>
  );
}

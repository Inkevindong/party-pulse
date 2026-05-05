import { randomUUID } from "crypto";

export type Track = {
  id: string;
  title: string;
  artist: string;
  startedAt: number;
  durationMs?: number;
  imageUrl?: string | null;
};

export type HistoryTrack = Track & {
  likes: number;
  dislikes: number;
};

type EventState = {
  currentTrack: Track | null;
  history: HistoryTrack[];
  /** clientId -> current vote for the active track */
  currentVotes: Map<string, "like" | "dislike">;
};

const MAX_EVENTS = 200;
const events = new Map<string, EventState>();

function getOrCreate(eventId: string): EventState {
  let s = events.get(eventId);
  if (!s) {
    // Evict the oldest entry when at capacity to prevent unbounded memory growth.
    if (events.size >= MAX_EVENTS) {
      const oldest = events.keys().next().value;
      if (oldest !== undefined) events.delete(oldest);
    }
    s = { currentTrack: null, history: [], currentVotes: new Map() };
    events.set(eventId, s);
  }
  return s;
}

function getPublicState(eventId: string) {
  const s = getOrCreate(eventId);
  const track = s.currentTrack;
  if (!track) {
    return {
      currentTrack: null as Track | null,
      history: s.history,
      likes: 0,
      dislikes: 0,
    };
  }
  let likes = 0;
  let dislikes = 0;
  for (const v of s.currentVotes.values()) {
    if (v === "like") likes++;
    else dislikes++;
  }
  return {
    currentTrack: { ...track, likes, dislikes },
    history: s.history,
    likes,
    dislikes,
  };
}

export function getEventStateForClient(
  eventId: string,
  clientId: string | undefined,
) {
  const base = getPublicState(eventId);
  const s = getOrCreate(eventId);
  if (!clientId || !s.currentTrack) {
    return { ...base, myVote: null as "like" | "dislike" | null };
  }
  const myVote = s.currentVotes.get(clientId) ?? null;
  return { ...base, myVote };
}

export function setCurrentTrack(
  eventId: string,
  input: {
    title: string;
    artist: string;
    id?: string;
    startedAt?: number;
    durationMs?: number;
    imageUrl?: string | null;
  },
): Track {
  const s = getOrCreate(eventId);
  const id = input.id?.trim() || randomUUID();
  const next: Track = {
    id,
    title: input.title.trim(),
    artist: input.artist.trim(),
    startedAt: input.startedAt ?? Date.now(),
    durationMs: input.durationMs,
    imageUrl: input.imageUrl,
  };

  // If it's the same track, don't reset votes or duplicate history.
  if (s.currentTrack?.id === next.id) {
    s.currentTrack = { ...s.currentTrack, ...next };
    return s.currentTrack;
  }

  // Snapshot the previous track into history with final vote totals.
  if (s.currentTrack) {
    let likes = 0;
    let dislikes = 0;
    for (const v of s.currentVotes.values()) {
      if (v === "like") likes++;
      else dislikes++;
    }
    const prev: HistoryTrack = {
      ...s.currentTrack,
      likes,
      dislikes,
    };
    const withoutDup = s.history.filter((h) => h.id !== prev.id);
    s.history = [prev, ...withoutDup].slice(0, 50);
  }

  s.currentTrack = next;
  s.currentVotes = new Map();
  return s.currentTrack;
}

export function archiveCurrentTrack(eventId: string): boolean {
  const s = getOrCreate(eventId);
  if (!s.currentTrack) return false;

  let likes = 0;
  let dislikes = 0;
  for (const v of s.currentVotes.values()) {
    if (v === "like") likes++;
    else dislikes++;
  }
  const prev: HistoryTrack = { ...s.currentTrack, likes, dislikes };
  const withoutDup = s.history.filter((h) => h.id !== prev.id);
  s.history = [prev, ...withoutDup].slice(0, 50);
  s.currentTrack = null;
  s.currentVotes = new Map();
  return true;
}

export function submitVote(
  eventId: string,
  clientId: string,
  trackId: string,
  vote: "like" | "dislike",
) {
  const s = getOrCreate(eventId);
  if (!s.currentTrack || s.currentTrack.id !== trackId) {
    return { ok: false as const, error: "track_mismatch" as const };
  }
  if (!clientId) {
    return { ok: false as const, error: "missing_client" as const };
  }
  s.currentVotes.set(clientId, vote);
  return { ok: true as const };
}

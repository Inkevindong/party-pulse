import { getEventStateForClient, submitVote } from "@/lib/party-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VoteBody = {
  clientId: string;
  trackId: string;
  vote: "like" | "dislike";
};

// Simple per-process in-memory rate limit: max 1 vote per clientId per second.
const lastVoteAt = new Map<string, number>();
const RATE_LIMIT_MS = 1000;

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  const { eventId } = params;
  let body: VoteBody;
  try {
    body = (await request.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { clientId, trackId, vote } = body;
  if (!clientId || !trackId || (vote !== "like" && vote !== "dislike")) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Rate limit: reject if the same client voted in the last second.
  const now = Date.now();
  const key = `${eventId}:${clientId}`;
  const last = lastVoteAt.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  lastVoteAt.set(key, now);

  const result = submitVote(eventId, clientId, trackId, vote);
  if (!result.ok) {
    const status = result.error === "track_mismatch" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const state = getEventStateForClient(eventId, clientId);
  return NextResponse.json(state);
}

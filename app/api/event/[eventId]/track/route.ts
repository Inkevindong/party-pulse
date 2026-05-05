import { isHostAuthorized } from "@/lib/host-auth";
import {
  archiveCurrentTrack,
  getEventStateForClient,
  setCurrentTrack,
} from "@/lib/party-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TrackBody = {
  title: string;
  artist: string;
  id?: string;
  startedAt?: number;
  durationMs?: number;
  imageUrl?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  if (!isHostAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { eventId } = params;
  let body: TrackBody;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.title !== "string" ||
    typeof body.artist !== "string" ||
    !body.title.trim() ||
    !body.artist.trim()
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const track = setCurrentTrack(eventId, {
    title: body.title,
    artist: body.artist,
    id: body.id,
    startedAt:
      typeof body.startedAt === "number" && Number.isFinite(body.startedAt)
        ? body.startedAt
        : undefined,
    durationMs:
      typeof body.durationMs === "number" && Number.isFinite(body.durationMs)
        ? body.durationMs
        : undefined,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
  });

  const state = getEventStateForClient(eventId, undefined);
  return NextResponse.json({ track, state });
}

/** Archive the current track into history (even with 0 votes), then clear it. */
export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  if (!isHostAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { eventId } = params;
  const archived = archiveCurrentTrack(eventId);
  if (!archived) {
    return NextResponse.json({ error: "no_current_track" }, { status: 404 });
  }

  const state = getEventStateForClient(eventId, undefined);
  return NextResponse.json({ state });
}

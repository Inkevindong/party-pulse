import { getEventStateForClient } from "@/lib/party-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  const { eventId } = params;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const state = getEventStateForClient(eventId, clientId);
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

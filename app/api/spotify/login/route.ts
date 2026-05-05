import { createPkcePair, createSpotifyAuthorizeUrl } from "@/lib/spotify";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") ?? undefined;

  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = crypto.randomBytes(16).toString("hex");

  const jar = await cookies();
  jar.set("pp_spotify_state", state, { ...cookieOptions(), maxAge: 10 * 60 });
  jar.set("pp_spotify_verifier", codeVerifier, {
    ...cookieOptions(),
    maxAge: 10 * 60,
  });
  if (eventId) {
    jar.set("pp_spotify_event", eventId, { ...cookieOptions(), maxAge: 10 * 60 });
  } else {
    jar.delete("pp_spotify_event");
  }

  const url = createSpotifyAuthorizeUrl({ state, codeChallenge, eventId });
  return NextResponse.redirect(url);
}


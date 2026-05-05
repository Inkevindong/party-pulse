import { exchangeCodeForTokens } from "@/lib/spotify";
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
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const eventIdFromQuery = url.searchParams.get("eventId") ?? undefined;

  const jar = await cookies();
  const expectedState = jar.get("pp_spotify_state")?.value;
  const verifier = jar.get("pp_spotify_verifier")?.value;
  const eventIdCookie = jar.get("pp_spotify_event")?.value;

  jar.delete("pp_spotify_state");
  jar.delete("pp_spotify_verifier");
  jar.delete("pp_spotify_event");

  const bad =
    !code ||
    !state ||
    !expectedState ||
    state !== expectedState ||
    !verifier;
  if (bad) {
    const reason =
      !code || !state
        ? "missing_query"
        : !expectedState || !verifier
          ? "missing_cookie"
          : "state_mismatch";
    const failEventId = eventIdFromQuery || eventIdCookie;
    const failDest = failEventId
      ? `/host/${encodeURIComponent(failEventId)}?spotify=error&reason=${encodeURIComponent(reason)}`
      : `/?spotify=error&reason=${encodeURIComponent(reason)}`;
    return NextResponse.redirect(new URL(failDest, url.origin));
  }

  const tokens = await exchangeCodeForTokens({ code, codeVerifier: verifier });
  const expiresAt = Date.now() + tokens.expires_in * 1000;

  jar.set("pp_spotify_access", tokens.access_token, {
    ...cookieOptions(),
    maxAge: tokens.expires_in,
  });
  if (tokens.refresh_token) {
    jar.set("pp_spotify_refresh", tokens.refresh_token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  jar.set("pp_spotify_expires", String(expiresAt), {
    ...cookieOptions(),
    maxAge: 60 * 60 * 24 * 30,
  });

  const eventId = eventIdFromQuery || eventIdCookie;
  const successDest = eventId
    ? `/host/${encodeURIComponent(eventId)}?spotify=connected`
    : "/?spotify=connected";
  return NextResponse.redirect(new URL(successDest, url.origin));
}


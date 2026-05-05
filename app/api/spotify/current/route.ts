import { getCurrentlyPlaying, refreshAccessToken } from "@/lib/spotify";
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

async function ensureAccessToken(jar: Awaited<ReturnType<typeof cookies>>) {
  const access = jar.get("pp_spotify_access")?.value ?? "";
  const refresh = jar.get("pp_spotify_refresh")?.value ?? "";
  const expiresAt = Number(jar.get("pp_spotify_expires")?.value ?? "0");

  const stillValid = access && expiresAt && Date.now() < expiresAt - 15_000;
  if (stillValid) {
    return {
      accessToken: access,
      refreshToken: refresh,
      refreshed: false as const,
    };
  }

  if (!refresh) {
    return {
      accessToken: "",
      refreshToken: "",
      refreshed: false as const,
    };
  }

  const tokens = await refreshAccessToken({ refreshToken: refresh });
  const newExpiresAt = Date.now() + tokens.expires_in * 1000;

  jar.set("pp_spotify_access", tokens.access_token, {
    ...cookieOptions(),
    maxAge: tokens.expires_in,
  });
  jar.set("pp_spotify_expires", String(newExpiresAt), {
    ...cookieOptions(),
    maxAge: 60 * 60 * 24 * 30,
  });
  if (tokens.refresh_token) {
    jar.set("pp_spotify_refresh", tokens.refresh_token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refresh,
    refreshed: true as const,
  };
}

export async function GET() {
  const jar = await cookies();
  const { accessToken, refreshToken } = await ensureAccessToken(jar);
  if (!accessToken) {
    return NextResponse.json(
      { connected: false, reason: refreshToken ? "expired" : "not_connected" },
      { status: 401 },
    );
  }

  const now = await getCurrentlyPlaying({ accessToken });
  // If Spotify says the access token is unauthorized, refresh once and retry.
  if ((now as any)?.unauthorized && refreshToken) {
    const tokens = await refreshAccessToken({ refreshToken });
    const newExpiresAt = Date.now() + tokens.expires_in * 1000;
    jar.set("pp_spotify_access", tokens.access_token, {
      ...cookieOptions(),
      maxAge: tokens.expires_in,
    });
    jar.set("pp_spotify_expires", String(newExpiresAt), {
      ...cookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });
    if (tokens.refresh_token) {
      jar.set("pp_spotify_refresh", tokens.refresh_token, {
        ...cookieOptions(),
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    const retry = await getCurrentlyPlaying({ accessToken: tokens.access_token });
    return NextResponse.json({ connected: true, now: retry, refreshed: true });
  }

  return NextResponse.json({ connected: true, now, refreshed: false });
}


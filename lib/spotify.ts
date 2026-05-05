import crypto from "crypto";

export type SpotifyNowPlaying = {
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

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function base64Url(input: Buffer) {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function createPkcePair() {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );
  return { codeVerifier, codeChallenge: challenge };
}

export function createSpotifyAuthorizeUrl(args: {
  state: string;
  codeChallenge: string;
  eventId?: string;
}) {
  const clientId = mustEnv("SPOTIFY_CLIENT_ID");
  const redirectUri = mustEnv("SPOTIFY_REDIRECT_URI");
  const scope = ["user-read-currently-playing", "user-read-playback-state"].join(
    " ",
  );

  const u = new URL("https://accounts.spotify.com/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", scope);
  u.searchParams.set("state", args.state);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("code_challenge", args.codeChallenge);
  if (args.eventId) u.searchParams.set("eventId", args.eventId);
  return u.toString();
}

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const clientId = mustEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = mustEnv("SPOTIFY_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64",
  );

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Spotify token error: ${r.status} ${text}`);
  }
  return (await r.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
}) {
  const redirectUri = mustEnv("SPOTIFY_REDIRECT_URI");
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", args.code);
  body.set("redirect_uri", redirectUri);
  body.set("code_verifier", args.codeVerifier);
  return tokenRequest(body);
}

export async function refreshAccessToken(args: { refreshToken: string }) {
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", args.refreshToken);
  return tokenRequest(body);
}

export async function getCurrentlyPlaying(args: { accessToken: string }) {
  const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
    cache: "no-store",
  });

  if (r.status === 204) {
    return {
      isPlaying: false,
      track: null,
      progressMs: 0,
      durationMs: 0,
    } satisfies SpotifyNowPlaying;
  }

  if (r.status === 401) {
    return {
      isPlaying: false,
      track: null,
      progressMs: 0,
      durationMs: 0,
      unauthorized: true,
    } as const;
  }

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Spotify currently-playing error: ${r.status} ${text}`);
  }

  const j = (await r.json()) as any;
  const item = j?.item;
  if (!item || item.type !== "track") {
    return {
      isPlaying: Boolean(j?.is_playing),
      track: null,
      progressMs: Number(j?.progress_ms ?? 0) || 0,
      durationMs: 0,
    } satisfies SpotifyNowPlaying;
  }

  const images = item?.album?.images;
  const imageUrl =
    Array.isArray(images) && images.length
      ? String(images[0]?.url ?? "") || null
      : null;

  return {
    isPlaying: Boolean(j?.is_playing),
    progressMs: Number(j?.progress_ms ?? 0) || 0,
    durationMs: Number(item?.duration_ms ?? 0) || 0,
    track: {
      id: String(item.id),
      name: String(item.name),
      artists: Array.isArray(item.artists)
        ? item.artists.map((a: any) => String(a?.name)).filter(Boolean)
        : [],
      imageUrl,
    },
  } satisfies SpotifyNowPlaying;
}


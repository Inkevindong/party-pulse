import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete("pp_spotify_access");
  jar.delete("pp_spotify_refresh");
  jar.delete("pp_spotify_expires");
  return NextResponse.json({ ok: true });
}


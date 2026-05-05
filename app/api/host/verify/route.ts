import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST { password: string }
 * Returns { ok: true } if:
 *   - HOST_SECRET is not configured (open dev mode), OR
 *   - the submitted password matches HOST_SECRET.
 * Returns 401 otherwise.
 */
export async function POST(request: Request) {
  const secret = process.env.HOST_SECRET;

  // No password configured — open access (dev / no-auth mode).
  if (!secret) {
    return NextResponse.json({ ok: true, open: true });
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password !== secret) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

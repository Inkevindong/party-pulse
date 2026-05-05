import { CurrentTime } from "@/components/CurrentTime";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

function Bars() {
  const heights = [28, 68, 42, 90, 35, 100, 58, 80, 45, 88, 52, 72, 38, 95];
  const delays  = [  0, 90, 40,160, 70, 20,130, 55,180, 10, 95, 65,150, 30];
  return (
    <div className="mx-auto flex h-10 max-w-[200px] items-end justify-center gap-[3px]">
      {heights.map((h, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="pp-bar w-[4px] bg-gradient-to-t from-red-900/40 via-red-400/60 to-white/90"
          style={{ height: `${h}%`, animationDelay: `${delays[i]}ms` }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-[100svh] flex-col">

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-4">
        <span className="font-display text-xl tracking-wider text-white">
          PARTY<span className="text-accent">PULSE</span>
        </span>
        <CurrentTime className="text-right" />
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <main className="relative flex flex-1 flex-col px-5 pb-8">

        {/* ── HEADLINE BLOCK ──────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">

          {/* Live badge */}
          <p className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live · Loud · Now
          </p>

          {/* Headline */}
          <h1
            className="mt-6 font-display leading-[0.9] tracking-wide text-white"
            style={{ fontSize: "clamp(60px, 17vw, 108px)" }}
          >
            <span className="block">IF THE</span>
            <span className="block text-accent">BASS IS</span>
            <span className="block">RUDE —</span>
          </h1>

          <p
            className="mt-3 font-display tracking-[0.22em] text-zinc-500"
            style={{ fontSize: "clamp(16px, 4.5vw, 26px)" }}
          >
            LET THE ROOM CHOOSE
          </p>

          <div className="mt-8">
            <Bars />
          </div>

          <p className="mt-6 max-w-[260px] text-sm leading-relaxed text-zinc-600">
            One QR code. Everyone votes. The crowd writes the setlist in real time.
          </p>
        </div>

        {/* ── CTA BLOCK ───────────────────────────────────────── */}
        <div className="mt-auto space-y-3 pt-10">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-700">
              jump in
            </span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* Floor = primary CTA */}
          <Link
            href="/party/live"
            className="flex w-full items-center justify-center gap-3 bg-white py-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#080808] transition-all duration-100 active:scale-[0.97] active:brightness-90"
          >
            Join the Floor
          </Link>

          {/* Booth = secondary (ghost) */}
          <Link
            href="/host/live"
            className="flex w-full items-center justify-center gap-3 border border-white/[0.14] bg-transparent py-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 transition-all duration-100 hover:border-white/25 hover:text-zinc-300 active:scale-[0.97]"
          >
            Run the Booth
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

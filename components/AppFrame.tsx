import Link from "next/link";
import type { ReactNode } from "react";
import { CurrentTime } from "@/components/CurrentTime";
import { SiteFooter } from "@/components/SiteFooter";

type AppFrameProps = {
  children: ReactNode;
  label: string;
  eventId: string;
  right?: ReactNode;
};

export function AppFrame({ children, label, eventId, right }: AppFrameProps) {
  return (
    <div className="flex min-h-[100svh] flex-col">
      {/* Header — dark glass strip, no big rounded corners */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          {/* Left: brand + context */}
          <div className="min-w-0">
            <Link
              href="/"
              className="font-display text-base tracking-wider text-white"
            >
              PARTY<span className="text-accent">PULSE</span>
            </Link>
            <p className="flex items-center gap-1 truncate text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              {label}
              <span className="text-zinc-800" aria-hidden>·</span>
              <span className="font-mono text-[10px] text-zinc-500">{eventId}</span>
            </p>
          </div>

          {/* Right: time + actions */}
          <div className="flex shrink-0 items-center gap-2">
            <CurrentTime className="text-right" />
            <div className="flex items-center gap-1.5">
              {right}
              <Link
                href="/"
                className="border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 transition hover:border-white/30 hover:text-white"
              >
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-6">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

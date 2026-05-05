"use client";

import { useEffect, useState } from "react";

type CurrentTimeProps = {
  className?: string;
};

export function CurrentTime({ className }: CurrentTimeProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(now);

  return (
    <div className={className}>
      <p className="font-mono text-xs font-semibold tabular-nums text-zinc-100">
        {time}
      </p>
      <p className="text-[11px] text-zinc-500">{date}</p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(true);
    setWidth(30);
    const t1 = setTimeout(() => setWidth(70), 120);
    const t2 = setTimeout(() => setWidth(90), 350);
    timerRef.current = setTimeout(() => {
      setWidth(100);
      setTimeout(() => setVisible(false), 200);
    }, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-0.5"
      style={{
        width: `${width}%`,
        background: "linear-gradient(90deg, var(--primary), var(--accent))",
        transition: "width 200ms ease-out, opacity 200ms ease-out",
        opacity: width === 100 ? 0 : 1,
      }}
    />
  );
}

"use client";

import { useEffect, useState } from "react";

interface StickyHeaderProps {
  children: React.ReactNode;
}

/**
 * Thin client wrapper around the sticky header row. Its only job is to track
 * scroll position and expose a `data-scrolled` attribute so descendants can
 * react via Tailwind `group-data-[scrolled=true]:*` variants (logo shrinks,
 * paddings tighten, shadow deepens). Auth logic stays in the server `Header`.
 */
export function StickyHeader({ children }: StickyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      data-scrolled={scrolled}
      className="group sticky top-0 z-40 border-b border-stone-200/70 bg-white shadow-sm transition-shadow duration-300 data-[scrolled=true]:shadow-md"
    >
      {children}
    </div>
  );
}

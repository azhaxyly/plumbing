import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  light?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  href,
  hrefLabel = "Смотреть все",
  light = false,
}: SectionHeaderProps) {
  const textColor = light ? "text-white" : "text-stone-900";
  const subtitleColor = light ? "text-stone-300" : "text-stone-500";
  const linkColor = light
    ? "bg-white text-[#D8410F] hover:bg-white/90"
    : "text-stone-700 hover:text-stone-900";
  const borderStyle = light
    ? "rounded-lg px-3 py-1.5"
    : "rounded-lg border border-stone-300 px-3 py-1.5";

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className={`text-2xl font-bold sm:text-3xl ${textColor}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`text-sm ${subtitleColor}`}>{subtitle}</p>
        )}
      </div>

      {href && (
        <Link
          href={href as Route}
          className={`group flex items-center text-sm font-semibold transition-colors ${linkColor} ${borderStyle}`}
        >
          {hrefLabel}
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

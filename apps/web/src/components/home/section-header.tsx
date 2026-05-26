import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";

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
    ? "text-emerald-400 hover:text-emerald-300"
    : "text-emerald-600 hover:text-emerald-700";

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
          className={`group flex items-center text-sm font-semibold transition-colors ${linkColor}`}
        >
          {hrefLabel}
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

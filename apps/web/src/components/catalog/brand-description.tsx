"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface BrandDescriptionProps {
  description: string;
}

/**
 * Brand "О бренде" block. On mobile the text is clamped to a few lines with a
 * "Показать полностью" toggle so a long description doesn't stretch the page.
 * On desktop (md+) the full text is always shown.
 */
export function BrandDescription({ description }: BrandDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-w-0 flex-1">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">О бренде</h2>
      <p
        className={`whitespace-pre-line text-sm leading-7 text-gray-600 md:text-base md:leading-8 ${
          expanded ? "" : "line-clamp-5 md:line-clamp-none"
        }`}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#2B7BC8] transition-colors hover:text-[#2568a8] md:hidden"
        aria-expanded={expanded}
      >
        {expanded ? "Свернуть" : "Показать полностью"}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useFilterTransition } from "@/contexts/filter-transition-context";

const SORT_OPTIONS = [
  { value: "newest", label: "Новинки" },
  { value: "price_asc", label: "Цена: дешевле" },
  { value: "price_desc", label: "Цена: дороже" },
  { value: "name_asc", label: "По названию" },
] as const;

interface SortSelectorProps {
  currentSort: string;
  basePath: string;
}

export function SortSelector({ currentSort, basePath }: SortSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startFilterTransition } = useFilterTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    if (e.target.value === "newest") {
      next.delete("sort");
    } else {
      next.set("sort", e.target.value);
    }
    next.delete("page");
    const qs = next.toString();
    startFilterTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-sm text-gray-500">Сортировка:</label>
      <select
        value={currentSort}
        onChange={handleChange}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

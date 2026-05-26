"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 max-w-xl items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 focus-within:border-stone-400 focus-within:bg-white transition-colors"
    >
      <input
        ref={inputRef}
        type="search"
        placeholder="Поиск по сайту"
        className="flex-1 bg-transparent px-4 py-2 text-sm text-stone-700 outline-none placeholder:text-stone-400"
        aria-label="Поиск по сайту"
      />
      <button
        type="submit"
        className="flex items-center gap-1.5 bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 h-full"
        aria-label="Найти"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Найти</span>
      </button>
    </form>
  );
}

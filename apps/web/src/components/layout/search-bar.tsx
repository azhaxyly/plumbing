"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface SuggestionHit {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  priceCents: number;
  primaryImageUrl: string | null;
}

function formatPrice(cents: number): string {
  return Math.round(cents / 100).toLocaleString("ru-KZ") + " ₸";
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(q)}`,
      );
      const data = (await res.json()) as { hits: SuggestionHit[] };
      setSuggestions(data.hits);
      setOpen(data.hits.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 focus-within:border-stone-400 focus-within:bg-white transition-colors"
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder="Поиск по сайту"
          className="flex-1 bg-transparent px-4 py-2.5 text-sm text-stone-700 outline-none placeholder:text-stone-400"
          aria-label="Поиск по сайту"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 text-stone-400 hover:text-stone-600"
            aria-label="Очистить"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="flex items-center gap-1.5 bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 h-full"
          aria-label="Найти"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Найти</span>
        </button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {loading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-stone-500">Поиск...</div>
          ) : (
            <>
              <ul>
                {suggestions.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      href={`/product/${hit.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 transition-colors"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-stone-100 bg-stone-50">
                        {hit.primaryImageUrl ? (
                          <Image
                            src={hit.primaryImageUrl}
                            alt={hit.name}
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Search className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800">
                          {hit.name}
                        </p>
                        {hit.brandName && (
                          <p className="text-xs text-stone-500">
                            {hit.brandName}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-primary">
                        {formatPrice(hit.priceCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {query.trim() && (
                <div className="border-t border-stone-100">
                  <Link
                    href={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-stone-50 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    Все результаты по &laquo;{query.trim()}&raquo;
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

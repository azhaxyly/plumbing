"use client";

import { ChevronRight, ImageIcon, LayoutGrid, Search, SearchX, Tag, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

interface ProductHit {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  priceCents: number;
  primaryImageUrl: string | null;
}

interface BrandHit {
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface CategoryHit {
  slug: string;
  name: string;
  imageUrl: string | null;
  brandSlug: string | null;
  brandName: string | null;
}

interface SuggestResults {
  products: ProductHit[];
  brands: BrandHit[];
  categories: CategoryHit[];
}

const EMPTY_RESULTS: SuggestResults = { products: [], brands: [], categories: [] };

/** Builds the listing URL for a category suggestion, scoped by brand when present. */
function categoryHref(cat: CategoryHit): Route {
  const base = `/category/${cat.slug}`;
  return (cat.brandSlug ? `${base}?brand=${encodeURIComponent(cat.brandSlug)}` : base) as Route;
}

function formatPrice(cents: number): string {
  return Math.round(cents / 100).toLocaleString("ru-KZ") + " ₸";
}

/** Splits `text` around case-insensitive matches of `query`, wrapping hits in <mark>. */
function highlight(text: string, query: string) {
  const q = query.trim();
  if (q.length < 2) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-accent/15 text-accent rounded px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestResults>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as Partial<SuggestResults>;
      setResults({
        products: data.products ?? [],
        brands: data.brands ?? [],
        categories: data.categories ?? [],
      });
    } catch {
      setResults(EMPTY_RESULTS);
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    setResults(EMPTY_RESULTS);
    setOpen(false);
    inputRef.current?.focus();
  };

  const { products, brands, categories } = results;
  const totalCount = products.length + brands.length + categories.length;

  return (
    <div ref={containerRef} className="relative max-w-2xl flex-1">
      <form
        onSubmit={handleSubmit}
        className="focus-within:border-accent focus-within:ring-accent/20 flex items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 transition-[border-color,box-shadow,background-color] focus-within:bg-white focus-within:ring-2"
      >
        <Search className="ml-3.5 h-4 w-4 shrink-0 text-stone-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          placeholder="Поиск по сайту"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-stone-700 outline-none placeholder:text-stone-400"
          aria-label="Поиск по сайту"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 text-stone-400 transition-colors hover:text-stone-600"
            aria-label="Очистить"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="from-primary to-accent flex h-full items-center gap-1.5 bg-gradient-to-r px-4 py-2.5 text-sm font-medium text-white transition-[filter] hover:brightness-110"
          aria-label="Найти"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Найти</span>
        </button>
      </form>

      {open && (
        <div className="animate-dropdown-in absolute left-0 right-0 top-full z-50 mt-2 origin-top overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl ring-1 ring-black/5">
          {loading && totalCount === 0 ? (
            /* Loading skeleton */
            <div className="p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-stone-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-stone-100" />
                  </div>
                  <div className="h-3 w-14 shrink-0 animate-pulse rounded bg-stone-100" />
                </div>
              ))}
            </div>
          ) : totalCount === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 text-stone-300">
                <SearchX className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-stone-700">Ничего не найдено</p>
              <p className="text-xs text-stone-400">Попробуйте изменить запрос</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {/* ── Разделы ── */}
              {categories.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Разделы
                  </p>
                  <ul className="px-2 pb-1.5">
                    {categories.map((cat) => (
                      <li key={`${cat.slug}-${cat.brandSlug ?? ""}`}>
                        <Link
                          href={categoryHref(cat)}
                          onClick={() => setOpen(false)}
                          className="hover:bg-accent/5 group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                        >
                          <span className="text-accent relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                            {cat.imageUrl ? (
                              <Image
                                src={cat.imageUrl}
                                alt={cat.name}
                                fill
                                sizes="40px"
                                className="object-contain mix-blend-multiply"
                                unoptimized
                              />
                            ) : (
                              <LayoutGrid className="h-5 w-5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                            {cat.name}
                            {cat.brandName && (
                              <span className="text-accent font-semibold"> {cat.brandName}</span>
                            )}
                          </span>
                          <ChevronRight className="text-accent h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Бренды ── */}
              {brands.length > 0 && (
                <section className="border-t border-stone-100">
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Бренды
                  </p>
                  <ul className="px-2 pb-1.5">
                    {brands.map((brand) => (
                      <li key={brand.slug}>
                        <Link
                          href={`/brand/${brand.slug}`}
                          onClick={() => setOpen(false)}
                          className="hover:bg-accent/5 group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                        >
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-100 bg-white text-stone-400">
                            {brand.logoUrl ? (
                              <Image
                                src={brand.logoUrl}
                                alt={brand.name}
                                fill
                                sizes="40px"
                                className="object-contain p-1 grayscale transition-[filter] duration-200 group-hover:grayscale-0"
                                unoptimized
                              />
                            ) : (
                              <Tag className="h-5 w-5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                            {highlight(brand.name, query)}
                          </span>
                          <ChevronRight className="text-accent h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Товары ── */}
              {products.length > 0 && (
                <section className="border-t border-stone-100">
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Товары
                  </p>
                  <ul className="px-2 pb-2">
                    {products.map((hit) => (
                      <li key={hit.id}>
                        <Link
                          href={`/product/${hit.slug}`}
                          onClick={() => setOpen(false)}
                          className="hover:bg-accent/5 group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                            {hit.primaryImageUrl ? (
                              <Image
                                src={hit.primaryImageUrl}
                                alt={hit.name}
                                fill
                                sizes="48px"
                                className="object-contain transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-stone-300">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-stone-800">
                              {highlight(hit.name, query)}
                            </p>
                            {hit.brandName && (
                              <p className="line-clamp-1 text-xs text-stone-400">{hit.brandName}</p>
                            )}
                          </div>
                          <span className="text-primary shrink-0 text-sm font-bold">
                            {formatPrice(hit.priceCents)}
                          </span>
                          <ChevronRight className="text-accent h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Footer */}
              {query.trim() && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="from-primary to-accent flex items-center justify-center gap-2 bg-gradient-to-r px-4 py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
                >
                  <Search className="h-4 w-4" />
                  Смотреть все результаты по «{query.trim()}»
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

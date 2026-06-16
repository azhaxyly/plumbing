"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "wh_favorites";

interface FavoritesContextValue {
  productIds: string[];
  toggle: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  productIds: [],
  toggle: () => {},
  isFavorite: () => false,
  count: 0,
});

interface FavoritesProviderProps {
  children: React.ReactNode;
  /** Pre-fetched IDs from the DB for authenticated users (empty for guests). */
  initialProductIds: string[];
  isAuthenticated: boolean;
}

export function FavoritesProvider({
  children,
  initialProductIds,
  isAuthenticated,
}: FavoritesProviderProps) {
  const [productIds, setProductIds] = useState<string[]>(initialProductIds);

  // For guests: hydrate from localStorage after mount
  useEffect(() => {
    if (isAuthenticated) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProductIds(JSON.parse(stored) as string[]);
      }
    } catch {
      // ignore parse errors
    }
  }, [isAuthenticated]);

  // After login: merge any localStorage favorites into the DB, then clear storage
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const guestIds = JSON.parse(stored) as string[];
      if (guestIds.length === 0) return;

      localStorage.removeItem(STORAGE_KEY);

      fetch("/api/trpc/favorites.mergeGuest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { productIds: guestIds } }),
      })
        .then(() => {
          // Add merged IDs to state (skip duplicates)
          setProductIds((prev) => {
            const merged = [...new Set([...prev, ...guestIds])];
            return merged;
          });
        })
        .catch(() => {
          // Non-critical — silently ignore
        });
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const toggle = useCallback(
    async (productId: string) => {
      if (isAuthenticated) {
        // Optimistic update
        setProductIds((prev) => {
          const exists = prev.includes(productId);
          return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        });

        try {
          const res = await fetch("/api/trpc/favorites.toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ json: { productId } }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              result?: { data?: { json?: { isFavorite: boolean } } };
            };
            const isFav = data?.result?.data?.json?.isFavorite;
            if (isFav !== undefined) {
              setProductIds((prev) =>
                isFav
                  ? [...new Set([...prev, productId])]
                  : prev.filter((id) => id !== productId),
              );
            }
          }
        } catch {
          // Revert optimistic update on error
          setProductIds((prev) => {
            const wasAdded = !prev.includes(productId);
            return wasAdded
              ? prev.filter((id) => id !== productId)
              : [...prev, productId];
          });
        }
      } else {
        // Guest: read/write localStorage
        setProductIds((prev) => {
          const exists = prev.includes(productId);
          const next = exists
            ? prev.filter((id) => id !== productId)
            : [...prev, productId];
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore quota errors
          }
          return next;
        });
      }
    },
    [isAuthenticated],
  );

  const isFavorite = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds],
  );

  return (
    <FavoritesContext.Provider
      value={{ productIds, toggle: (id) => { void toggle(id); }, isFavorite, count: productIds.length }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

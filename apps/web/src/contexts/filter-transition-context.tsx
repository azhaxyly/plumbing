"use client";

import { createContext, useCallback, useContext, useTransition } from "react";

interface FilterTransitionContextValue {
  isPending: boolean;
  startFilterTransition: (fn: () => void) => void;
}

const FilterTransitionContext = createContext<FilterTransitionContextValue>({
  isPending: false,
  startFilterTransition: (fn) => fn(),
});

export function FilterTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();

  const startFilterTransition = useCallback(
    (fn: () => void) => startTransition(fn),
    [startTransition],
  );

  return (
    <FilterTransitionContext.Provider value={{ isPending, startFilterTransition }}>
      {children}
    </FilterTransitionContext.Provider>
  );
}

export function useFilterTransition() {
  return useContext(FilterTransitionContext);
}

export function ProductsTransitionArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useFilterTransition();

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 pointer-events-none">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      <div className={`transition-opacity duration-300 ${isPending ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
        {children}
      </div>
    </div>
  );
}

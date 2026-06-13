"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@timsan/ui";

import { FacetPanel } from "./facet-panel";
import type {
  BrandFacetItem,
  AttributeFacetItem,
  PriceRange,
} from "./facet-panel";
import type { FacetFilters } from "@/lib/facet-utils";

interface MobileFilterDrawerProps {
  brands: BrandFacetItem[];
  attributes: AttributeFacetItem[];
  priceRange: PriceRange;
  currentFilters: FacetFilters;
  basePath: string;
  activeFilterCount: number;
}

export function MobileFilterDrawer({
  activeFilterCount,
  ...facetProps
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Фильтры
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Фильтры</SheetTitle>
          </SheetHeader>
          <div className="py-2">
            <FacetPanel {...facetProps} onApply={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /**
   * `default` — standalone light-gray strip (used on most pages).
   * `overlay` — transparent, light text for placing on top of a banner image.
   */
  variant?: "default" | "overlay";
}

export function Breadcrumbs({ items, variant = "default" }: BreadcrumbsProps) {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };

  const isOverlay = variant === "overlay";

  // Overlay: each crumb is an outlined chip (no slash separators) so it stays
  // legible on top of a photo.
  const overlayList = (
    <ol className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const chip =
          "rounded-full px-2.5 py-1 leading-none ring-1 backdrop-blur-sm transition-colors";
        return (
          <li key={item.href}>
            {isLast ? (
              <span
                className={`${chip} bg-accent/80 font-semibold text-white ring-white/40`}
                aria-current="page"
              >
                {item.name}
              </span>
            ) : (
              <a
                href={item.href}
                className={`${chip} bg-black/35 text-white ring-white/30 hover:bg-black/50`}
              >
                {item.name}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );

  const defaultList = (
    <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden="true" className="text-gray-300">
                /
              </span>
            )}
            {isLast ? (
              <span className="font-medium text-gray-800" aria-current="page">
                {item.name}
              </span>
            ) : (
              <a href={item.href} className="transition-colors hover:text-amber-600">
                {item.name}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );

  const list = isOverlay ? overlayList : defaultList;

  return (
    <>
      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {isOverlay ? (
        // Caller positions/wraps this (e.g. absolute over a banner).
        <nav aria-label="Хлебные крошки">{list}</nav>
      ) : (
        <nav aria-label="Хлебные крошки" className="border-b bg-gray-50">
          <div className="container mx-auto px-4 py-3 md:px-6">{list}</div>
        </nav>
      )}
    </>
  );
}

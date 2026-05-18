interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
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

  return (
    <>
      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumbs nav */}
      <nav aria-label="Хлебные крошки" className="border-b bg-gray-50">
        <div className="container mx-auto px-4 py-3 md:px-6">
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
                    <span
                      className="font-medium text-gray-800"
                      aria-current="page"
                    >
                      {item.name}
                    </span>
                  ) : (
                    <a
                      href={item.href}
                      className="transition-colors hover:text-amber-600"
                    >
                      {item.name}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </>
  );
}

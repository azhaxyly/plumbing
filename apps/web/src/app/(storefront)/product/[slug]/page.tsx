import { getProductBySlug } from "@timsan/db";
import type { ProductFull } from "@timsan/db";
import type { Metadata , Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { WishlistButton } from "@/components/catalog/wishlist-button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BRAND_COUNTRY } from "@/lib/brand-country";


export const revalidate = 300; // ISR: revalidate every 5 minutes

const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

/** Turns a possibly-relative path into an absolute URL (schema.org requires absolute). */
function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats price in tiyins to KZT string */
function formatPrice(tiyins: number): string {
  const kzt = tiyins / 100;
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(kzt);
}

/** Returns the primary image or the first image */
function getPrimaryImage(
  images: ProductFull["images"]
): ProductFull["images"][number] | null {
  return images.find((img) => img.isPrimary) ?? images[0] ?? null;
}

/** Computes total available stock across all variants */
function getTotalAvailable(variants: ProductFull["variants"]): number {
  return variants.reduce((sum, v) => sum + (v.quantity - v.reserved), 0);
}

/** Returns true if the product has variants with differing attributes */
function hasVariantAttributes(variants: ProductFull["variants"]): boolean {
  if (variants.length <= 1) return false;
  return variants.some(
    (v) => v.attributes && Object.keys(v.attributes).length > 0
  );
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Товар не найден" };
  }

  const primaryImage = getPrimaryImage(product.images);
  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ?? product.shortDescription ?? undefined;
  const canonicalUrl = `/product/${product.slug}`;

  return {
    title,
    description,
    keywords: product.seoKeywords ?? undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: primaryImage
        ? [
            {
              url: primaryImage.url,
              alt: primaryImage.alt || product.name,
            },
          ]
        : undefined,
    },
  };
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") {
    notFound();
  }

  const totalAvailable = getTotalAvailable(product.variants);
  const inStock = totalAvailable > 0;
  const defaultVariant = product.variants[0] ?? null;

  const hasDiscount =
    product.compareAtPriceCents !== null &&
    product.compareAtPriceCents > product.priceCents;

  const discountPercent =
    hasDiscount && product.compareAtPriceCents
      ? Math.round(
          (1 - product.priceCents / product.compareAtPriceCents) * 100
        )
      : 0;

  const showVariants = hasVariantAttributes(product.variants);

  // Build breadcrumb items
  // Use the first category's path for breadcrumbs
  const firstCategory = product.categories[0]?.category ?? null;
  const breadcrumbItems: { name: string; href: string }[] = [
    { name: "Главная", href: "/" },
  ];
  if (firstCategory) {
    breadcrumbItems.push({
      name: firstCategory.name,
      href: `/category/${firstCategory.slug}`,
    });
  }
  breadcrumbItems.push({
    name: product.name,
    href: `/product/${product.slug}`,
  });

  // Schema.org Product + Offer JSON-LD
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    sku: product.sku,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand.name,
        }
      : undefined,
    image: product.images.map((img) => absoluteUrl(img.url)),
    offers: {
      "@type": "Offer",
      priceCurrency: "KZT",
      price: (product.priceCents / 100).toFixed(0),
      // ISR (revalidate=300) keeps this rolling ~30 days ahead; satisfies Google's
      // requirement for a priceValidUntil on offers.
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/product/${product.slug}`),
    },
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <Breadcrumbs items={breadcrumbItems} />

      {/* Main product layout */}
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ── Gallery ── */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* ── Product info ── */}
          <div className="flex flex-col gap-5">
            {/* Brand */}
            {product.brand && (
              <Link
                href={`/brand/${product.brand.slug}` as Route}
                className="group w-fit transition-opacity hover:opacity-80"
                aria-label={product.brand.name}
              >
                {product.brand.logoUrl ? (
                  <Image
                    src={product.brand.logoUrl}
                    alt={product.brand.name}
                    width={120}
                    height={40}
                    className="h-10 w-auto max-w-[220px] object-contain object-left"
                  />
                ) : (
                  <span className="text-sm font-medium uppercase tracking-wide text-gray-400 transition-colors group-hover:text-amber-600">
                    {product.brand.name}
                  </span>
                )}
              </Link>
            )}

            {/* Name */}
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="text-xs text-gray-400">Артикул: {product.sku}</p>

            {/* Price */}
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(product.priceCents)}
              </span>
              {hasDiscount && product.compareAtPriceCents && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.compareAtPriceCents)}
                  </span>
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-sm font-bold text-white">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Stock availability */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  inStock ? "bg-green-500" : "bg-red-400"
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-medium ${
                  inStock ? "text-green-600" : "text-red-500"
                }`}
              >
                {inStock ? "В наличии" : "Нет в наличии"}
              </span>
            </div>

            {/* Variants selector */}
            {showVariants && (
              <VariantsSelector variants={product.variants} />
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <AddToCartButton
                variantId={defaultVariant?.id ?? product.id}
                productId={product.id}
                unitPrice={defaultVariant?.priceCents ?? product.priceCents}
                productName={product.name}
                productSku={defaultVariant?.sku ?? product.sku}
                productImageUrl={getPrimaryImage(product.images)?.url ?? ""}
                disabled={!inStock}
                size="lg"
                className="flex-1"
              />

              <WishlistButton productId={product.id} variant="page" />
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {/* Variant attributes as key-value pairs */}
            {product.variants.length > 0 &&
              !showVariants &&
              defaultVariant &&
              Object.keys(defaultVariant.attributes).length > 0 && (
                <AttributesTable
                  attributes={defaultVariant.attributes as Record<string, string>}
                />
              )}
          </div>
        </div>

        {/* Full description */}
        {product.description && (
          <section className="mt-12" aria-label="Описание товара">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Описание
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600">
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          </section>
        )}

        {/* Characteristics */}
        {(product.productAttributes.length > 0 || (product.brand && BRAND_COUNTRY[product.brand.slug])) && (
          <section className="mt-8" aria-label="Характеристики товара">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Характеристики
            </h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {product.brand && (() => {
                const bc = BRAND_COUNTRY[product.brand.slug];
                if (!bc) return null;
                return (
                  <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-800">Страна производителя</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`fi fi-${bc.countryCode}`} style={{ width: 20, height: 15, display: "inline-block", borderRadius: 2 }} />
                      <span className="text-sm font-semibold text-gray-800">{bc.country}</span>
                    </div>
                  </div>
                );
              })()}
              <dl>
                {product.productAttributes.filter(({ attribute }) =>
                  !["страна производитель", "страна производителя", "страна-производитель"].includes(attribute.name.toLowerCase())
                ).map(({ attribute, attributeValue }, index) => (
                  <div
                    key={attribute.name}
                    className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0 ${
                      index % 2 === 0 ? "bg-[#f5f5f5]" : "bg-white"
                    }`}
                  >
                    <dt className="text-sm font-semibold text-gray-800">{attribute.name}</dt>
                    <dd className="text-sm text-gray-500 text-right ml-4">{attributeValue.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface VariantsSelectorProps {
  variants: ProductFull["variants"];
}

function VariantsSelector({ variants }: VariantsSelectorProps) {
  // Collect all unique attribute keys across variants
  const allKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.attributes)))
  );

  if (allKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {allKeys.map((key) => {
        const values = Array.from(
          new Set(
            variants
              .map((v) => {
                const val = (v.attributes as Record<string, unknown>)[key];
                return typeof val === "string" ? val : null;
              })
              .filter((v): v is string => v !== null)
          )
        );

        return (
          <div key={key}>
            <p className="mb-2 text-sm font-medium text-gray-700 capitalize">
              {key}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={key}>
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AttributesTableProps {
  attributes: Record<string, string>;
  title?: string | null;
}

function AttributesTable({ attributes, title = "Характеристики" }: AttributesTableProps) {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {title && (
        <h3 className="px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">{title}</h3>
      )}
      <dl>
        {entries.map(([key, value], index) => (
          <div
            key={key}
            className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0 ${
              index % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"
            }`}
          >
            <dt className="text-sm font-semibold text-gray-800">{key}</dt>
            <dd className="text-sm text-gray-500 text-right ml-4">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

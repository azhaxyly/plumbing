import { getProductBySlug } from "@timsan/db";
import type { ProductFull } from "@timsan/db";
import { ShoppingCart } from "lucide-react";
import type { Metadata , Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { WishlistButton } from "@/components/catalog/wishlist-button";


export const revalidate = 300; // ISR: revalidate every 5 minutes

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
    image: product.images.map((img) => img.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "KZT",
      price: (product.priceCents / 100).toFixed(0),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `/product/${product.slug}`,
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
                className="text-sm font-medium uppercase tracking-wide text-gray-400 hover:text-amber-600 transition-colors w-fit"
              >
                {product.brand.name}
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
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProductGalleryProps {
  images: ProductFull["images"];
  productName: string;
}

function ProductGallery({ images, productName }: ProductGalleryProps) {
  const primaryImage = getPrimaryImage(images);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
        <ShoppingCart className="h-24 w-24" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50">
        {primaryImage && (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
            priority
          />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="list"
          aria-label="Фотографии товара"
        >
          {images.map((img) => (
            <div
              key={img.id}
              role="listitem"
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 transition-colors ${
                img.isPrimary
                  ? "border-amber-400"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || productName}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
}

function AttributesTable({ attributes }: AttributesTableProps) {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        Характеристики
      </h3>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <dt className="text-xs text-gray-400 capitalize">{key}</dt>
            <dd className="text-sm font-medium text-gray-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

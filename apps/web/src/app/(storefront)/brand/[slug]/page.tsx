import { getBrandBySlug } from "@timsan/db";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { CategoryListing } from "@/components/catalog/category-listing";
import type { ProductCardData } from "@/components/catalog/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return { title: "Бренд не найден" };
  }

  const title = brand.name;
  const description =
    brand.description ?? `Товары бренда ${brand.name}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/brand/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/brand/${slug}`,
      type: "website",
      ...(brand.logoUrl ? { images: [{ url: brand.logoUrl }] } : {}),
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  // Map BrandProductItem to ProductCardData (same shape)
  const products: ProductCardData[] = brand.products;

  // Breadcrumb items: Home > Бренды > [Brand Name]
  const breadcrumbItems = [
    { name: "Главная", href: "/" },
    { name: "Бренды", href: "/brand" },
    { name: brand.name, href: `/brand/${brand.slug}` },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      {/* Brand header with logo */}
      {brand.logoUrl && (
        <div className="border-b bg-white">
          <div className="container mx-auto flex items-center gap-6 px-4 py-6 md:px-6">
            <div className="relative h-16 w-32 shrink-0">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            {brand.description && (
              <p className="text-sm text-gray-500">{brand.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Product listing — reuse CategoryListing component */}
      <CategoryListing
        categoryName={brand.name}
        categoryDescription={brand.logoUrl ? null : brand.description}
        subCategories={[]}
        products={products}
        slugPath={[]}
      />
    </>
  );
}

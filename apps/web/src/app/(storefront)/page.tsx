import type { Metadata } from "next";

import { BestsellerSection } from "@/components/home/bestseller-section";
import { BrandsSection } from "@/components/home/brands-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { NewArrivalsSection } from "@/components/home/new-arrivals-section";
import { PromoBannerSection } from "@/components/home/promo-banner-section";
import { ReviewsSection } from "@/components/home/reviews-section";
import { SaleSection } from "@/components/home/sale-section";
import { StoreInfoSection } from "@/components/home/store-info-section";
import { HeroBanner } from "@/components/layout/hero-banner";
import {
  getActiveBanners,
  getActivePromoSlides,
  getRootCategories,
  getBestsellers,
  getNewArrivals,
  getSaleProducts,
  getBrandsWithLogo,
  getActiveReviews,
} from "@/lib/homepage-data";
import { buildMetadata } from "@/lib/metadata";

const SITE_URL = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
const SITE_NAME = process.env["NEXT_PUBLIC_SITE_NAME"] ?? "Timsan";

// Revalidate homepage data (banners, categories, products) every 5 minutes —
// without this the DB-driven content is baked at build time forever.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Интернет-магазин сантехники в Алматы",
  description:
    "Интернет-магазин сантехники и мебели для ванной в Алматы. Широкий выбор брендов, доставка по Казахстану.",
  canonical: "/",
});

export default async function HomePage() {
  const [
    bannersResult,
    categoriesResult,
    promoSlidesResult,
    bestsellersResult,
    newArrivalsResult,
    saleProductsResult,
    brandsResult,
    reviewsResult,
  ] = await Promise.allSettled([
    getActiveBanners(),
    getRootCategories(12),
    getActivePromoSlides(),
    getBestsellers(20),
    getNewArrivals(20),
    getSaleProducts(20),
    getBrandsWithLogo(),
    getActiveReviews(20),
  ]);

  const banners = bannersResult.status === "fulfilled" ? bannersResult.value : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const promoSlides = promoSlidesResult.status === "fulfilled" ? promoSlidesResult.value : [];
  const bestsellers = bestsellersResult.status === "fulfilled" ? bestsellersResult.value : [];
  const newArrivals = newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value : [];
  const saleProducts = saleProductsResult.status === "fulfilled" ? saleProductsResult.value : [];
  const brands = brandsResult.status === "fulfilled" ? brandsResult.value : [];
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <h1 className="sr-only">
        Интернет-магазин сантехники и мебели для ванной Timsan — доставка по Казахстану
      </h1>

      <HeroBanner banners={banners} />
      <CategoryGrid categories={categories} />
      <PromoBannerSection slides={promoSlides} />
      <BestsellerSection products={bestsellers} />
      <NewArrivalsSection products={newArrivals} />
      <SaleSection products={saleProducts} />
      <BrandsSection brands={brands} />
      <ReviewsSection reviews={reviews} />
      <StoreInfoSection categories={categories} />
    </>
  );
}

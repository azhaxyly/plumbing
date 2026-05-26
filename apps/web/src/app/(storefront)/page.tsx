import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata";
import { HeroBanner } from "@/components/layout/hero-banner";
import { CategoryGrid } from "@/components/home/category-grid";
import { BestsellerSection } from "@/components/home/bestseller-section";
import { NewArrivalsSection } from "@/components/home/new-arrivals-section";
import { SaleSection } from "@/components/home/sale-section";
import { BrandsSection } from "@/components/home/brands-section";
import { FeaturesStrip } from "@/components/home/features-strip";

const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
const SITE_NAME =
  process.env["NEXT_PUBLIC_SITE_NAME"] ?? "Timsan";

export const metadata: Metadata = buildMetadata({
  title: "Timsan — Сантехника и мебель для ванной",
  description:
    "Интернет-магазин сантехники и мебели для ванной комнаты. Широкий выбор брендов, доставка по Алматы.",
  canonical: "/",
});

export default function HomePage() {
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

      <HeroBanner />
      <CategoryGrid />
      <BestsellerSection />
      <NewArrivalsSection />
      <SaleSection />
      <BrandsSection />
      <FeaturesStrip />
    </>
  );
}

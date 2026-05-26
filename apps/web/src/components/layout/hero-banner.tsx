import type { BannerWithProducts } from "@/lib/homepage-data";
import { HeroBannerClient } from "../home/hero-banner-client";

interface HeroBannerProps {
  banners: BannerWithProducts[];
}

export function HeroBanner({ banners }: HeroBannerProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  return <HeroBannerClient banners={banners} />;
}

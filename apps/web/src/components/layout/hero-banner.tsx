import { getActiveBanners } from "@/lib/homepage-data";
import { HeroBannerClient } from "../home/hero-banner-client";

export async function HeroBanner() {
  const banners = await getActiveBanners();

  if (!banners || banners.length === 0) {
    return null;
  }

  return <HeroBannerClient banners={banners} />;
}

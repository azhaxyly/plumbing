import type { Metadata } from "next";

interface BuildMetadataOptions {
  title: string;
  description?: string;
  canonical: string;
  ogImage?: { url: string; alt?: string };
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description,
  canonical,
  ogImage,
  noIndex,
}: BuildMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage.url, alt: ogImage.alt }] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

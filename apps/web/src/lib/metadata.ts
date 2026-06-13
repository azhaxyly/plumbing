import type { Metadata } from "next";

interface BuildMetadataOptions {
  title: string;
  description?: string;
  canonical: string;
  ogImage?: { url: string; alt?: string };
  noIndex?: boolean;
}

/** Site-wide fallback OG image (resolved against metadataBase in root layout). */
const DEFAULT_OG_IMAGE = { url: "/og-default.png", alt: "Timsan" };

export function buildMetadata({
  title,
  description,
  canonical,
  ogImage,
  noIndex,
}: BuildMetadataOptions): Metadata {
  const image = ogImage ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [{ url: image.url, alt: image.alt }],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Produces a plain-text meta-description excerpt from a Markdown string:
 * strips the most common Markdown syntax, collapses whitespace and trims to
 * `maxLength` characters at a word boundary.
 */
export function excerpt(markdown: string, maxLength = 160): string {
  const text = markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, " ") // code spans/blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~>#-]/g, " ") // emphasis/list/quote markers
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}…`;
}

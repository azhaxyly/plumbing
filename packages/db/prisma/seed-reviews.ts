/**
 * Reviews seed — imports 5-star customer reviews from the Kaspi store page.
 *
 * Parses the saved Kaspi HTML, keeps only 5-star (_50) reviews, picks the
 * 15 longest/most complete ones, and inserts them as active Review rows
 * for the homepage slider.
 *
 * Idempotent: skips a review if one with the same author + text already exists.
 *
 * Run with:
 *   pnpm --filter @timsan/db exec tsx prisma/seed-reviews.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// Repo root is two levels up from packages/db
const REPO_ROOT = join(__dirname, "..", "..", "..");
const HTML_PATH = join(
  REPO_ROOT,
  "TIMSAN – товары в кредит – Kaspi Магазин_files",
  "TIMSAN – товары в кредит – Kaspi Магазин.html",
);

const TARGET_COUNT = 15;

interface ParsedReview {
  authorName: string;
  rating: number;
  text: string;
}

function parseReviews(html: string): ParsedReview[] {
  const blocks = html.match(/<div class="reviews__review">[\s\S]*?<\/div><\/div>/g) ?? [];
  const reviews: ParsedReview[] = [];
  for (const block of blocks) {
    const rating = block.match(/rating _seller _(\d+)/);
    const author = block.match(/reviews__author">(.*?)<\/div>/);
    const text = block.match(/<b>Комментарий:\s*<\/b>\s*([\s\S]*?)<\/p>/);
    if (!rating || !author || !text) continue;
    reviews.push({
      rating: Math.floor(parseInt(rating[1]!, 10) / 10),
      authorName: author[1]!.trim(),
      text: text[1]!.replace(/\s+/g, " ").trim(),
    });
  }
  return reviews;
}

async function main() {
  const html = readFileSync(HTML_PATH, "utf-8");
  const all = parseReviews(html);
  const fiveStar = all
    .filter((r) => r.rating === 5 && r.text.length > 0)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, TARGET_COUNT);

  console.log(`Parsed ${all.length} reviews, ${fiveStar.length} selected (5-star, longest).`);

  let created = 0;
  let skipped = 0;
  let position = 0;

  for (const r of fiveStar) {
    const existing = await prisma.review.findFirst({
      where: { authorName: r.authorName, text: r.text },
    });
    if (existing) {
      skipped++;
      position++;
      continue;
    }
    await prisma.review.create({
      data: {
        authorName: r.authorName,
        rating: 5,
        text: r.text,
        isActive: true,
        position,
      },
    });
    created++;
    position++;
    console.log(`+ [${r.authorName}] ${r.text.slice(0, 60)}...`);
  }

  console.log(`Done. Created ${created}, skipped ${skipped} (already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

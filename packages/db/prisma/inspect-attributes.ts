/**
 * Diagnostic: dump all attributes with their values and product-link counts.
 * Run: pnpm --filter @timsan/db exec tsx prisma/inspect-attributes.ts
 */
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

async function main() {
  const attrs = await prisma.attribute.findMany({
    orderBy: { name: "asc" },
    include: {
      values: {
        include: { _count: { select: { products: true } } },
        orderBy: { value: "asc" },
      },
      _count: { select: { products: true } },
    },
  });

  console.log(`\nTotal attributes: ${attrs.length}\n`);
  console.log("=".repeat(80));

  for (const attr of attrs) {
    const totalLinks = attr._count.products;
    const flag = totalLinks === 0 ? " ← NO PRODUCTS (orphan)" : "";
    console.log(`\n[${attr.slug}]  "${attr.name}"  (${totalLinks} product links)${flag}`);
    for (const v of attr.values) {
      const links = v._count.products;
      const longFlag = v.value.length > 100 ? " ← LONG" : "";
      const zeroFlag = links === 0 ? " ← ORPHAN VALUE" : "";
      console.log(`  ${String(links).padStart(4)}  "${v.value}"  (slug: ${v.slug})${longFlag}${zeroFlag}`);
    }
  }

  // Summary: orphan attributes
  const orphanAttrs = attrs.filter((a) => a._count.products === 0);
  if (orphanAttrs.length) {
    console.log("\n" + "=".repeat(80));
    console.log(`\nOrphan attributes (0 product links): ${orphanAttrs.length}`);
    for (const a of orphanAttrs) console.log(`  - ${a.slug} "${a.name}"`);
  }

  // Summary: attributes with orphan values
  const attrsWithOrphanValues = attrs.filter((a) =>
    a.values.some((v) => v._count.products === 0)
  );
  if (attrsWithOrphanValues.length) {
    console.log("\n" + "=".repeat(80));
    console.log(`\nAttributes with orphan values (0 product links):`);
    for (const a of attrsWithOrphanValues) {
      const orphans = a.values.filter((v) => v._count.products === 0);
      console.log(`  [${a.slug}]: ${orphans.map((v) => `"${v.value}"`).join(", ")}`);
    }
  }

  // Summary: attributes with LONG values (>100 chars)
  const attrsWithLong = attrs.filter((a) =>
    a.values.some((v) => v.value.length > 100)
  );
  if (attrsWithLong.length) {
    console.log("\n" + "=".repeat(80));
    console.log(`\nAttributes with long values (>100 chars):`);
    for (const a of attrsWithLong) {
      const longs = a.values.filter((v) => v.value.length > 100);
      for (const v of longs) {
        console.log(`  [${a.slug}] (${v.value.length} chars): "${v.value.slice(0, 120)}..."`);
      }
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

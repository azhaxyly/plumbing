/**
 * One-time script: delete "Страна производитель" attribute and all its values/links.
 * Run: npx tsx packages/db/prisma/delete-country-attr.ts
 */
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

const SLUGS_TO_DELETE = [
  "страна-производитель",
  "страна-производителя",
];

async function main() {
  for (const slug of SLUGS_TO_DELETE) {
    const attr = await prisma.attribute.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!attr) {
      console.log(`NOT FOUND: "${slug}" — skipping`);
      continue;
    }
    const links = await prisma.productAttribute.deleteMany({ where: { attributeId: attr.id } });
    await prisma.attributeValue.deleteMany({ where: { attributeId: attr.id } });
    await prisma.attribute.delete({ where: { id: attr.id } });
    console.log(`DELETED: "${attr.name}" (${links.count} product links removed)`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

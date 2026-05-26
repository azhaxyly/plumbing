﻿/**
 * One-time script: seed the 18 main Timsan categories.
 * Run: pnpm --filter @timsan/db exec tsx prisma/add-categories.ts
 */

import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Смесители",                    slug: "smesiteli" },
  { name: "Душевые системы",              slug: "dushevye-sistemy" },
  { name: "Душевые трапы",                slug: "dushevye-trapy" },
  { name: "Полотенцесушители",            slug: "polotencesushiteli" },
  { name: "Унитазы",                      slug: "unitazy" },
  { name: "Инсталляции",                  slug: "installyatsii" },
  { name: "Раковины",                     slug: "rakoviny" },
  { name: "Ванны",                        slug: "vanny" },
  { name: "Душевые кабины/ограждения",    slug: "dushevye-kabiny" },
  { name: "Мойки кухонные",              slug: "mojki-kukhonnye" },
  { name: "Сифоны",                       slug: "sifony" },
  { name: "Водонагреватели",              slug: "vodonagrevateli" },
  { name: "Аксессуары для ванной",        slug: "aksessuary" },
  { name: "Зеркала",                      slug: "zerkala" },
  { name: "Гигиенические души",           slug: "gigienicheskie-dushi" },
  { name: "Комплектующие и запчасти",     slug: "komplektuyushchie" },
  { name: "Арматура",                     slug: "armatura" },
  { name: "Тумбы для ванной",             slug: "tumby" },
];

async function main() {
  console.log("Adding categories...");

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]!;
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, position: i },
      create: { slug: cat.slug, name: cat.name, position: i },
    });
    console.log(`  ✓ ${result.name} (${result.slug})`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

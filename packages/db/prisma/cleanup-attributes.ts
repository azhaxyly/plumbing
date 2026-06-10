import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яёa-z\-\.]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function deleteAttr(tx: typeof prisma, slug: string) {
  const a = await tx.attribute.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!a) { console.log("NOT FOUND: " + slug); return; }
  const d = await tx.productAttribute.deleteMany({ where: { attributeId: a.id } });
  await tx.attributeValue.deleteMany({ where: { attributeId: a.id } });
  await tx.attribute.delete({ where: { id: a.id } });
  console.log(`DEL attr: ${a.name} (${d.count} links)`);
}

async function upsertValue(
  tx: typeof prisma,
  attrId: string,
  oldSlug: string,
  newValue: string,
) {
  const newSlug = slugify(newValue);
  const old = await tx.attributeValue.findFirst({
    where: { attributeId: attrId, slug: oldSlug },
  });
  if (!old) return;
  if (newSlug === oldSlug) {
    await tx.attributeValue.update({ where: { id: old.id }, data: { value: newValue } });
    return;
  }
  const existing = await tx.attributeValue.findFirst({
    where: { attributeId: attrId, slug: newSlug },
  });
  if (existing) {
    // Merge: redirect product links to existing value, delete old
    await tx.productAttribute.updateMany({
      where: { attributeValueId: old.id },
      data: { attributeValueId: existing.id },
    });
    await tx.attributeValue.delete({ where: { id: old.id } });
  } else {
    await tx.attributeValue.update({
      where: { id: old.id },
      data: { value: newValue, slug: newSlug },
    });
  }
}

function normalizeShowerHead(raw: string): string | null {
  let s = raw.trim();
  s = s.replace(/[*xXхХ×]/g, "×").replace(/\s*×\s*/g, "×");
  s = s.replace(/\s*mm\b/gi, " мм").replace(/\s*мм\b/gi, " мм");
  // 3-dim: drop third dimension (depth)
  const m3 = s.match(/^(\d+(?:[.,]\d+)?)×(\d+(?:[.,]\d+)?)×\d+(?:[.,]\d+)?\s*мм?$/);
  if (m3) return `${m3[1]}×${m3[2]} мм`;
  // 2-dim
  const m2 = s.match(/^(\d+(?:[.,]\d+)?)×(\d+(?:[.,]\d+)?)\s*мм?$/);
  if (m2) return `${m2[1]}×${m2[2]} мм`;
  // 1-dim with мм
  const m1 = s.match(/^(\d+(?:[.,]\d+)?)\s*мм$/);
  if (m1) return `${m1[1]} мм`;
  // bare number → add мм
  const mNum = s.match(/^(\d+(?:[.,]\d+)?)$/);
  if (mNum) return `${mNum[1]} мм`;
  return null; // garbage
}

async function main() {
  await (prisma as any).$transaction(
    async (tx: typeof prisma) => {
      // ─── 1. Delete attributes completely ────────────────────────────────────
      for (const slug of [
        "код-товара",
        "количество",
        "количество-в-упаковке",
        "конструктивные-особенности",
        "цветоттенок",
        "ширина-см",
        "название-оттенка",
      ]) {
        await deleteAttr(tx, slug);
      }

      // ─── 2. Clean garbage colors from 'цвет' ────────────────────────────────
      const KEEP_COLORS = new Set([
        "белый", "хром", "сатин", "бронзовый", "золотой", "графит", "стальной", "черный",
      ]);
      const цветAttr = await tx.attribute.findUnique({
        where: { slug: "цвет" },
        select: { id: true, values: { select: { id: true, slug: true } } },
      });
      if (цветAttr) {
        const toDelColor = цветAttr.values
          .filter((v) => !KEEP_COLORS.has(v.slug))
          .map((v) => v.id);
        if (toDelColor.length) {
          await tx.productAttribute.deleteMany({ where: { attributeValueId: { in: toDelColor } } });
          await tx.attributeValue.deleteMany({ where: { id: { in: toDelColor } } });
          console.log(`DEL colors: ${toDelColor.length} non-standard values`);
        }
      }

      // ─── 3. Rename режимы-лейки-удалить ────────────────────────────────────
      const rl = await tx.attribute.findUnique({ where: { slug: "режимы-лейки-удалить" } });
      if (rl) {
        await tx.attribute.update({
          where: { id: rl.id },
          data: { name: "Режимы лейки", slug: "режимы-лейки" },
        });
        console.log("RENAMED: Режимы лейки (Удалить) → Режимы лейки");
      }

      // ─── 4. Комплектация: delete garbage values ──────────────────────────────
      const kompl = await tx.attribute.findUnique({
        where: { slug: "комплектация" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (kompl) {
        const KOMPL_DEL_SLUGS = new Set(["1шт", "штучная", "lcaplast-sa2000-12-chrom", "sa2000s-12-chrom"]);
        const toDelKompl = kompl.values
          .filter((v) => KOMPL_DEL_SLUGS.has(v.slug) || v.value.length > 200)
          .map((v) => v.id);
        if (toDelKompl.length) {
          await tx.productAttribute.deleteMany({ where: { attributeValueId: { in: toDelKompl } } });
          await tx.attributeValue.deleteMany({ where: { id: { in: toDelKompl } } });
          console.log(`DEL комплектация garbage: ${toDelKompl.length} values`);
        }
      }

      // ─── 5. Диаметр подключения: delete multi-values, standardize ───────────
      const dp = await tx.attribute.findUnique({
        where: { slug: "диаметр-подключения" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (dp) {
        const toDelDp = dp.values
          .filter((v) => v.value.includes(","))
          .map((v) => v.id);
        if (toDelDp.length) {
          await tx.productAttribute.deleteMany({ where: { attributeValueId: { in: toDelDp } } });
          await tx.attributeValue.deleteMany({ where: { id: { in: toDelDp } } });
          console.log(`DEL диаметр multi-values: ${toDelDp.length}`);
        }
        await upsertValue(tx, dp.id, "100", "100 мм");
      }

      // ─── 6. Длина: fix '1500 см' error ──────────────────────────────────────
      const dlAttr = await tx.attribute.findUnique({
        where: { slug: "длина" },
        select: { id: true },
      });
      if (dlAttr) {
        await upsertValue(tx, dlAttr.id, "1500-см", "1500 мм");
      }

      // ─── 7. Размеры верхнего душа: standardize ──────────────────────────────
      const rvd = await tx.attribute.findUnique({
        where: { slug: "размеры-верхнего-душа" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (rvd) {
        const toDelRvd: string[] = [];
        for (const v of rvd.values) {
          const norm = normalizeShowerHead(v.value);
          if (norm === null) {
            toDelRvd.push(v.id);
          } else if (norm !== v.value) {
            await upsertValue(tx, rvd.id, v.slug, norm);
          }
        }
        if (toDelRvd.length) {
          await tx.productAttribute.deleteMany({ where: { attributeValueId: { in: toDelRvd } } });
          await tx.attributeValue.deleteMany({ where: { id: { in: toDelRvd } } });
          console.log(`DEL размеры верхнего душа garbage: ${toDelRvd.length}`);
        }
        console.log("UPDATED размеры верхнего душа");
      }

      // ─── 8. Характеристики трапа: reformat ──────────────────────────────────
      const trap = await tx.attribute.findUnique({
        where: { slug: "характеристики-трапа" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (trap) {
        for (const v of trap.values) {
          const m = v.value.match(
            /Ширина,?\s*см\s*([\d.]+)Длина,?\s*см\s*([\d.]+)(?:Высота,?\s*см\s*([\d.]+))?/,
          );
          if (m) {
            const [, w, l, h] = m;
            const norm = h ? `${w}×${l}×${h} см` : `${w}×${l} см`;
            if (norm !== v.value) await upsertValue(tx, trap.id, v.slug, norm);
          }
        }
        console.log("UPDATED характеристики трапа");
      }

      // ─── 9. Размеры: standardize separators, delete descriptive garbage ──────
      const razm = await tx.attribute.findUnique({
        where: { slug: "размеры" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (razm) {
        const GARBAGE_SLUGS = new Set(["5-4", "57", "80", "100"]);
        const toDelRazm: string[] = [];
        for (const v of razm.values) {
          const isDescriptive =
            /^(длина|диаметр|резьбовое|решетка|размер\s)/i.test(v.value) ||
            v.value.includes("5/4") ||
            v.value.startsWith("длина") ||
            GARBAGE_SLUGS.has(v.slug);
          if (isDescriptive) {
            toDelRazm.push(v.id);
            continue;
          }
          const norm = v.value
            .replace(/[*xXхХ]/g, "×")
            .replace(/\s*×\s*/g, "×")
            .replace(/\s*\/\s*/g, "×")
            .replace(/(\d)\s*мм/g, "$1 мм")
            .replace(/(\d)\s*см(?=\s|$)/g, "$1 см")
            .trim()
            .replace(/\.$/, "");
          if (norm !== v.value) await upsertValue(tx, razm.id, v.slug, norm);
        }
        if (toDelRazm.length) {
          await tx.productAttribute.deleteMany({ where: { attributeValueId: { in: toDelRazm } } });
          await tx.attributeValue.deleteMany({ where: { id: { in: toDelRazm } } });
          console.log(`DEL размеры garbage: ${toDelRazm.length}`);
        }
        console.log("UPDATED размеры");
      }

      // ─── 10. Ширина: normalize spacing ──────────────────────────────────────
      const shir = await tx.attribute.findUnique({
        where: { slug: "ширина" },
        select: { id: true, values: { select: { id: true, slug: true, value: true } } },
      });
      if (shir) {
        for (const v of shir.values) {
          const norm = v.value.replace(/(\d)(мм|см)/g, "$1 $2").trim();
          if (norm !== v.value) await upsertValue(tx, shir.id, v.slug, norm);
        }
        console.log("UPDATED ширина");
      }
    },
    { timeout: 60000 },
  );

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

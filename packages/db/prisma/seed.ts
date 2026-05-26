/**
 * Seed script for @timsan/db
 *
 * Creates:
 *  - 1 admin user (admin@example.com / admin123)
 *  - 3 root categories + 2 sub-categories under "Ванны"
 *  - 2 brands: Roca, Grohe
 *  - 2 demo products with variants and images
 *
 * Idempotent: uses upsert throughout — safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @timsan/db seed
 */

import { PrismaClient } from "../generated/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Admin user ────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash("admin123", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Root categories ───────────────────────────────────────────────────────
  const catBathtubs = await prisma.category.upsert({
    where: { slug: "bathtubs" },
    update: {},
    create: {
      slug: "bathtubs",
      name: "Ванны",
      description: "Акриловые, чугунные и стальные ванны",
      position: 1,
      seoTitle: "Ванны — купить в Казахстане",
      seoDescription: "Широкий выбор ванн: акриловые, чугунные, стальные. Доставка по Казахстану.",
      seoKeywords: "ванны, купить ванну, акриловые ванны, чугунные ванны",
    },
  });

  const catShowerCabins = await prisma.category.upsert({
    where: { slug: "shower-cabins" },
    update: {},
    create: {
      slug: "shower-cabins",
      name: "Душевые кабины",
      description: "Душевые кабины и поддоны",
      position: 2,
      seoTitle: "Душевые кабины — купить в Казахстане",
      seoDescription: "Душевые кабины и поддоны. Доставка по Казахстану.",
      seoKeywords: "душевые кабины, душевой поддон, купить душевую кабину",
    },
  });

  const catBathroomFurniture = await prisma.category.upsert({
    where: { slug: "bathroom-furniture" },
    update: {},
    create: {
      slug: "bathroom-furniture",
      name: "Мебель для ванной",
      description: "Тумбы, зеркала, шкафы для ванной комнаты",
      position: 3,
      seoTitle: "Мебель для ванной — купить в Казахстане",
      seoDescription: "Мебель для ванной комнаты: тумбы, зеркала, шкафы. Доставка по Казахстану.",
      seoKeywords: "мебель для ванной, тумба под раковину, зеркало в ванную",
    },
  });

  console.log(`✅ Root categories: ${catBathtubs.name}, ${catShowerCabins.name}, ${catBathroomFurniture.name}`);

  // ─── Sub-categories under "Ванны" ──────────────────────────────────────────
  const catAcrylicBathtubs = await prisma.category.upsert({
    where: { slug: "acrylic-bathtubs" },
    update: {},
    create: {
      slug: "acrylic-bathtubs",
      name: "Акриловые ванны",
      description: "Лёгкие и тёплые акриловые ванны",
      parentId: catBathtubs.id,
      position: 1,
      seoTitle: "Акриловые ванны — купить в Казахстане",
      seoDescription: "Акриловые ванны различных форм и размеров. Доставка по Казахстану.",
      seoKeywords: "акриловые ванны, купить акриловую ванну",
    },
  });

  const catCastIronBathtubs = await prisma.category.upsert({
    where: { slug: "cast-iron-bathtubs" },
    update: {},
    create: {
      slug: "cast-iron-bathtubs",
      name: "Чугунные ванны",
      description: "Классические чугунные ванны с долгим сроком службы",
      parentId: catBathtubs.id,
      position: 2,
      seoTitle: "Чугунные ванны — купить в Казахстане",
      seoDescription: "Чугунные ванны — надёжность и долговечность. Доставка по Казахстану.",
      seoKeywords: "чугунные ванны, купить чугунную ванну",
    },
  });

  console.log(`✅ Sub-categories: ${catAcrylicBathtubs.name}, ${catCastIronBathtubs.name}`);

  // ─── Brands ────────────────────────────────────────────────────────────────
  const brandRoca = await prisma.brand.upsert({
    where: { slug: "roca" },
    update: {},
    create: {
      slug: "roca",
      name: "Roca",
      description: "Испанский производитель сантехники с более чем 100-летней историей.",
    },
  });

  const brandGrohe = await prisma.brand.upsert({
    where: { slug: "grohe" },
    update: {},
    create: {
      slug: "grohe",
      name: "Grohe",
      description: "Немецкий бренд премиальной сантехники и смесителей.",
    },
  });

  console.log(`✅ Brands: ${brandRoca.name}, ${brandGrohe.name}`);

  // ─── Demo product 1: Roca acrylic bathtub ─────────────────────────────────
  const product1 = await prisma.product.upsert({
    where: { sku: "ROCA-HALL-170" },
    update: {},
    create: {
      slug: "roca-hall-170",
      name: "Ванна акриловая Roca Hall 170×75",
      sku: "ROCA-HALL-170",
      brandId: brandRoca.id,
      shortDescription: "Прямоугольная акриловая ванна Roca Hall, 170×75 см",
      description:
        "Акриловая ванна Roca Hall — классическая прямоугольная форма, усиленное дно, " +
        "антискользящее покрытие. Изготовлена из высококачественного акрила толщиной 5 мм. " +
        "Идеально подходит для стандартных ванных комнат.",
      // 89 900 KZT × 100 = 8 990 000 тийинов
      priceCents: 8_990_000,
      // 99 900 KZT × 100
      compareAtPriceCents: 9_990_000,
      status: "active",
      seoTitle: "Ванна акриловая Roca Hall 170×75 — купить в Казахстане",
      seoDescription:
        "Купить акриловую ванну Roca Hall 170×75 в Казахстане. Доставка по всей стране.",
      seoKeywords: "roca hall, акриловая ванна 170, купить ванну roca",
    },
  });

  // Variant for product 1
  const variant1 = await prisma.productVariant.upsert({
    where: { sku: "ROCA-HALL-170-WHT" },
    update: {},
    create: {
      productId: product1.id,
      sku: "ROCA-HALL-170-WHT",
      priceCents: 8_990_000,
      attributes: { color: "Белый", size: "170×75" },
      quantity: 5,
      reserved: 0,
    },
  });

  // Update defaultVariantId
  await prisma.product.update({
    where: { id: product1.id },
    data: { defaultVariantId: variant1.id },
  });

  // Image for product 1
  await prisma.productImage.upsert({
    where: { id: `img-${product1.id}-1` },
    update: {},
    create: {
      id: `img-${product1.id}-1`,
      productId: product1.id,
      url: "https://placehold.co/800x600/e2e8f0/64748b?text=Roca+Hall+170",
      alt: "Ванна акриловая Roca Hall 170×75",
      position: 0,
      isPrimary: true,
    },
  });

  // Link product 1 to categories
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product1.id, categoryId: catBathtubs.id } },
    update: {},
    create: { productId: product1.id, categoryId: catBathtubs.id },
  });
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product1.id, categoryId: catAcrylicBathtubs.id } },
    update: {},
    create: { productId: product1.id, categoryId: catAcrylicBathtubs.id },
  });

  console.log(`✅ Product 1: ${product1.name}`);

  // ─── Demo product 2: Grohe shower system ──────────────────────────────────
  const product2 = await prisma.product.upsert({
    where: { sku: "GROHE-RAINSHOWER-310" },
    update: {},
    create: {
      slug: "grohe-rainshower-system-310",
      name: "Душевая система Grohe Rainshower System 310",
      sku: "GROHE-RAINSHOWER-310",
      brandId: brandGrohe.id,
      shortDescription: "Верхний душ Grohe Rainshower System 310, хром",
      description:
        "Душевая система Grohe Rainshower System 310 — верхний душ диаметром 310 мм, " +
        "три режима струи (дождь, каскад, массаж), термостатический смеситель. " +
        "Хромированное покрытие StarLight® устойчиво к царапинам и загрязнениям.",
      // 145 000 KZT × 100
      priceCents: 14_500_000,
      status: "active",
      seoTitle: "Душевая система Grohe Rainshower System 310 — купить в Казахстане",
      seoDescription:
        "Купить душевую систему Grohe Rainshower System 310 в Казахстане. Доставка по всей стране.",
      seoKeywords: "grohe rainshower, душевая система, верхний душ grohe",
    },
  });

  // Variant for product 2
  const variant2 = await prisma.productVariant.upsert({
    where: { sku: "GROHE-RAINSHOWER-310-CHR" },
    update: {},
    create: {
      productId: product2.id,
      sku: "GROHE-RAINSHOWER-310-CHR",
      priceCents: 14_500_000,
      attributes: { color: "Хром", finish: "StarLight" },
      quantity: 3,
      reserved: 0,
    },
  });

  // Update defaultVariantId
  await prisma.product.update({
    where: { id: product2.id },
    data: { defaultVariantId: variant2.id },
  });

  // Images for product 2
  await prisma.productImage.upsert({
    where: { id: `img-${product2.id}-1` },
    update: {},
    create: {
      id: `img-${product2.id}-1`,
      productId: product2.id,
      url: "https://placehold.co/800x600/e2e8f0/64748b?text=Grohe+Rainshower+310",
      alt: "Душевая система Grohe Rainshower System 310",
      position: 0,
      isPrimary: true,
    },
  });

  // Link product 2 to shower-cabins category
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product2.id, categoryId: catShowerCabins.id } },
    update: {},
    create: { productId: product2.id, categoryId: catShowerCabins.id },
  });

  console.log(`✅ Product 2: ${product2.name}`);

  // ─── Default settings ──────────────────────────────────────────────────────
  const defaultSettings = [
    { key: "shop_name", value: "Timsan" },
    { key: "shop_phone", value: "+7 776 201 64 66" },
    { key: "shop_email", value: "info@example.com" },
    { key: "shop_legal_name", value: "ТОО «Timsan»" },
    { key: "cod_enabled", value: "false" },
    { key: "search_fallback_enabled", value: "false" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        updatedByUserId: admin.id,
      },
    });
  }

  console.log(`✅ Default settings seeded`);

  // ─── CMS Legal Pages ───────────────────────────────────────────────────────
  const cmsPages = [
    {
      slug: "about-us",
      title: "О нас",
      content: `# О нас

Timsan — интернет-магазин сантехники и мебели для ванной комнаты в Алматы.

## Наша миссия

Мы помогаем казахстанцам создавать комфортные ванные комнаты, предлагая широкий выбор качественной продукции от ведущих мировых производителей.

## Преимущества

* Широкий ассортимент сантехники и мебели
* Только оригинальная продукция
* Доставка по Алматы
* Профессиональная консультация

Свяжитесь с нами по телефону или email — мы всегда рады помочь.`,
      isPublished: true,
    },
    {
      slug: "delivery-info",
      title: "Доставка",
      content: `# Доставка

Мы осуществляем доставку по Алматы.

## Условия доставки

* **Зона доставки:** г. Алматы и ближайшие пригороды
* **Стоимость доставки:** бесплатно
* **Сроки:** согласовываются индивидуально после подтверждения заказа

## Как оформить заказ

1. Выберите товары и добавьте их в корзину
2. Оформите заявку, указав адрес доставки
3. Наш менеджер свяжется с вами для подтверждения заказа и согласования времени доставки
4. Курьер доставит товар по указанному адресу

## Контакты для уточнений

По вопросам доставки обращайтесь по телефону или email, указанным в разделе «Контакты».`,
      isPublished: true,
    },
    {
      slug: "contacts",
      title: "Контакты",
      content: `# Контакты

Мы всегда готовы ответить на ваши вопросы.

## Реквизиты

**Компания:** ТОО «Timsan»

## Режим работы

Пн–Пт: 09:00–18:00
Сб: 10:00–16:00
Вс: выходной

## Связаться с нами

Воспользуйтесь контактными данными, указанными в шапке и подвале сайта, или оставьте заявку через форму заказа.`,
      isPublished: true,
    },
    {
      slug: "privacy-policy",
      title: "Политика конфиденциальности",
      content: `# Политика конфиденциальности

*Редакция 1.0, вступает в силу с момента публикации*

Настоящая Политика конфиденциальности (далее — «Политика») разработана в соответствии с **Законом Республики Казахстан «О персональных данных и их защите»** № 94-V от 21 мая 2013 года.

## 1. Оператор персональных данных

Оператором персональных данных является ТОО «Timsan» (далее — «Компания», «Оператор»).

## 2. Какие данные мы собираем

* Имя, фамилия
* Контактный телефон
* Адрес электронной почты
* Адрес доставки (г. Алматы)
* Данные о заказах и истории покупок

## 3. Цели обработки данных

Персональные данные обрабатываются исключительно в целях:

* Выполнения заказов и доставки товаров
* Связи с покупателем по вопросам заказа
* Улучшения качества обслуживания

## 4. Основание для обработки

Обработка персональных данных осуществляется на основании **добровольного согласия субъекта персональных данных**, выраженного при регистрации на сайте или оформлении заказа.

## 5. Передача третьим лицам

Персональные данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством РК.

## 6. Хранение данных

Данные хранятся в защищённых базах данных в течение срока, необходимого для достижения целей обработки, но не более 5 лет.

## 7. Права субъекта данных

Вы вправе:

* Получить информацию об обработке ваших данных
* Требовать исправления или удаления данных
* Отозвать согласие на обработку данных

Для реализации прав обратитесь к нам по контактным данным, указанным в разделе «Контакты».

## 8. Защита данных

Оператор принимает организационные и технические меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.

## 9. Изменения политики

Оператор вправе вносить изменения в настоящую Политику. Актуальная версия всегда доступна на данной странице.`,
      isPublished: true,
    },
    {
      slug: "public-offer",
      title: "Публичная оферта",
      content: `# Договор публичной оферты

*Настоящий документ является публичной офертой в соответствии со статьёй 395 Гражданского кодекса Республики Казахстан.*

## 1. Общие положения

ТОО «Timsan» (далее — «Продавец») предлагает физическим лицам (далее — «Покупатель») приобрести товары, представленные на сайте, на условиях настоящего договора.

## 2. Акцепт оферты

Акцептом настоящей оферты является оформление Покупателем заказа на сайте.

## 3. Предмет договора

Продавец обязуется передать Покупателю товары, выбранные и оплаченные в соответствии с условиями настоящего договора.

## 4. Цены и оплата

* Цены на товары указаны в тенге (KZT) на сайте
* Оплата производится наличными при получении товара

## 5. Доставка

Доставка осуществляется по г. Алматы. Условия и сроки согласовываются с менеджером.

## 6. Возврат товара

Возврат товара надлежащего качества осуществляется в течение **14 календарных дней** с момента получения при соблюдении условий, предусмотренных Законом РК «О защите прав потребителей».

## 7. Ответственность сторон

Стороны несут ответственность в соответствии с действующим законодательством Республики Казахстан.

## 8. Разрешение споров

Споры разрешаются путём переговоров, при недостижении согласия — в судебном порядке по месту нахождения Продавца.

## 9. Контакты продавца

Реквизиты и контактные данные Продавца указаны в разделе «Контакты» на сайте.`,
      isPublished: true,
    },
    {
      slug: "payment-info",
      title: "Оплата",
      content: `# Оплата

## Способ оплаты

В настоящее время доступен один способ оплаты:

**Оплата наличными при получении (Наложенный платёж)**

Вы оплачиваете товар непосредственно курьеру в момент доставки.

## Как это работает

1. Оформите заявку на сайте
2. Дождитесь подтверждения заказа от менеджера
3. Получите товар и оплатите курьеру наличными

## Безопасность

Оплата производится только после того, как вы осмотрите товар и убедитесь в его соответствии заказу.

## Вопросы по оплате

По вопросам оплаты обращайтесь к нам по контактным данным, указанным в разделе «Контакты».`,
      isPublished: true,
    },
    {
      slug: "returns",
      title: "Возврат",
      content: `# Условия возврата

## Возврат товара надлежащего качества

В соответствии с **Законом Республики Казахстан «О защите прав потребителей»** вы вправе вернуть товар надлежащего качества в течение **14 календарных дней** с момента получения, если:

* Товар не был в употреблении
* Сохранены товарный вид, потребительские свойства, пломбы и фабричные ярлыки
* Сохранён товарный чек или иной документ, подтверждающий оплату

## Как оформить возврат

1. Свяжитесь с нами по контактным данным в разделе «Контакты»
2. Сообщите номер заказа и причину возврата
3. Согласуйте с менеджером дату и способ возврата товара

## Возврат товара ненадлежащего качества

При обнаружении существенных недостатков товара вы вправе потребовать:

* Бесплатного устранения недостатков
* Замены товара на аналогичный
* Возврата уплаченной суммы

## Сроки рассмотрения

Заявки на возврат рассматриваются в течение 10 рабочих дней.`,
      isPublished: true,
    },
  ];

  for (const page of cmsPages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, content: page.content, isPublished: page.isPublished },
      create: page,
    });
  }

  console.log(`✅ CMS legal pages seeded (${cmsPages.length} pages)`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

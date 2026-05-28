/**
 * Seed script for @timsan/db
 *
 * Creates:
 *  - 1 admin user (admin@example.com / admin123)
 *  - 22 brands
 *  - Default settings & CMS pages
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

  // ─── Brands ────────────────────────────────────────────────────────────────
  const brandGrohe = await prisma.brand.upsert({
    where: { slug: "grohe" },
    update: {},
    create: {
      slug: "grohe",
      name: "Grohe",
      description: "Немецкий бренд премиальной сантехники и смесителей.",
    },
  });

  const brandLemark = await prisma.brand.upsert({
    where: { slug: "lemark" },
    update: {},
    create: {
      slug: "lemark",
      name: "Lemark",
      description: "Российский бренд смесителей и сантехнического оборудования.",
    },
  });

  const brandHaiba = await prisma.brand.upsert({
    where: { slug: "haiba" },
    update: {},
    create: {
      slug: "haiba",
      name: "Haiba",
      description: "Производитель смесителей и аксессуаров для ванной комнаты.",
    },
  });

  const brandTriton = await prisma.brand.upsert({
    where: { slug: "triton" },
    update: {},
    create: {
      slug: "triton",
      name: "Тритон",
      description: "Российский производитель акриловых ванн и душевых кабин.",
    },
  });

  const brandAlcaplast = await prisma.brand.upsert({
    where: { slug: "alcaplast" },
    update: {},
    create: {
      slug: "alcaplast",
      name: "Alcaplast",
      description: "Чешский производитель инсталляций, сифонов и сантехнической фурнитуры.",
    },
  });

  const brandAniPlast = await prisma.brand.upsert({
    where: { slug: "ani-plast" },
    update: {},
    create: {
      slug: "ani-plast",
      name: "Ани-Пласт",
      description: "Российский бренд сифонов, гибкой подводки и сантехнических аксессуаров.",
    },
  });

  const brandBelz = await prisma.brand.upsert({
    where: { slug: "belz" },
    update: {},
    create: {
      slug: "belz",
      name: "Belz",
      description: "Производитель сантехники и аксессуаров для ванных комнат.",
    },
  });

  const brandDvin = await prisma.brand.upsert({
    where: { slug: "dvin" },
    update: {},
    create: {
      slug: "dvin",
      name: "Двин",
      description: "Российский бренд полотенцесушителей и радиаторов отопления.",
    },
  });

  const brandBeste = await prisma.brand.upsert({
    where: { slug: "beste" },
    update: {},
    create: {
      slug: "beste",
      name: "Beste",
      description: "Производитель сантехники и оборудования для ванных комнат.",
    },
  });

  const brandPoint = await prisma.brand.upsert({
    where: { slug: "point" },
    update: {},
    create: {
      slug: "point",
      name: "Point",
      description: "Бренд полотенцесушителей и водяных нагревательных приборов.",
    },
  });

  const brandTerminus = await prisma.brand.upsert({
    where: { slug: "terminus" },
    update: {},
    create: {
      slug: "terminus",
      name: "Terminus",
      description: "Украинский производитель полотенцесушителей и радиаторов.",
    },
  });

  const brandSantek = await prisma.brand.upsert({
    where: { slug: "santek" },
    update: {},
    create: {
      slug: "santek",
      name: "Santek",
      description: "Российский производитель акриловых ванн и душевых поддонов.",
    },
  });

  const brandSanteri = await prisma.brand.upsert({
    where: { slug: "santeri" },
    update: {},
    create: {
      slug: "santeri",
      name: "Santeri",
      description: "Российский бренд полотенцесушителей и сантехнического оборудования.",
    },
  });

  const brandSanita = await prisma.brand.upsert({
    where: { slug: "sanita" },
    update: {},
    create: {
      slug: "sanita",
      name: "Sanita",
      description: "Российский производитель керамической сантехники — унитазов, раковин, биде.",
    },
  });

  const brandAppolo = await prisma.brand.upsert({
    where: { slug: "appolo" },
    update: {},
    create: {
      slug: "appolo",
      name: "Appolo",
      description: "Производитель смесителей и сантехнических изделий.",
    },
  });

  const brandOrbita = await prisma.brand.upsert({
    where: { slug: "orbita" },
    update: {},
    create: {
      slug: "orbita",
      name: "Orbita",
      description: "Производитель смесителей и аксессуаров для ванной.",
    },
  });

  const brandBravat = await prisma.brand.upsert({
    where: { slug: "bravat" },
    update: {},
    create: {
      slug: "bravat",
      name: "Bravat",
      description: "Датский бренд премиальных смесителей и сантехники.",
    },
  });

  const brandCersanit = await prisma.brand.upsert({
    where: { slug: "cersanit" },
    update: {},
    create: {
      slug: "cersanit",
      name: "Cersanit",
      description: "Польский производитель керамической плитки и сантехники.",
    },
  });

  const brandOlimp = await prisma.brand.upsert({
    where: { slug: "olimp" },
    update: {},
    create: {
      slug: "olimp",
      name: "Олимп",
      description: "Российский производитель полотенцесушителей и радиаторов.",
    },
  });

  const brandDecoroomBrand = await prisma.brand.upsert({
    where: { slug: "decoroom" },
    update: {},
    create: {
      slug: "decoroom",
      name: "Decoroom",
      description: "Производитель мебели и аксессуаров для ванных комнат.",
    },
  });

  const brandSaniteco = await prisma.brand.upsert({
    where: { slug: "saniteco" },
    update: {},
    create: {
      slug: "saniteco",
      name: "Saniteco",
      description: "Производитель сантехники и оборудования для ванных комнат.",
    },
  });

  const brandGrossman = await prisma.brand.upsert({
    where: { slug: "grossman" },
    update: {},
    create: {
      slug: "grossman",
      name: "Grossman",
      description: "Российский производитель смесителей и сантехнических аксессуаров.",
    },
  });

  const allBrands = [
    brandGrohe, brandLemark, brandHaiba, brandTriton, brandAlcaplast,
    brandAniPlast, brandBelz, brandDvin, brandBeste, brandPoint, brandTerminus,
    brandSantek, brandSanteri, brandSanita, brandAppolo, brandOrbita, brandBravat,
    brandCersanit, brandOlimp, brandDecoroomBrand, brandSaniteco, brandGrossman,
  ];
  console.log(`✅ Brands (${allBrands.length}): ${allBrands.map((b) => b.name).join(", ")}`);

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

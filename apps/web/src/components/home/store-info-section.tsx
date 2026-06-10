import { Phone, CheckCircle2, ShieldCheck, CreditCard, Truck } from "lucide-react";

export function StoreInfoSection() {
  return (
    <section className="mt-10 container mx-auto px-4 space-y-8 text-base text-gray-700">
      {/* Intro */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Интернет-магазин сантехники Timsan
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Timsan — популярный интернет-магазин сантехники, плитки и мебели для
          ванной в Алматы с широким ассортиментом товаров ведущих мировых и
          отечественных брендов.
        </p>
      </div>

      {/* Why us + What to buy — two columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Почему клиенты выбирают Timsan?
          </h3>
          <ul className="space-y-2">
            {[
              "Оригинальная сантехника и мебель от популярных мировых брендов",
              "Широкий выбор товаров для ванной комнаты, санузла и кухни",
              "Доставка по всему Казахстану",
              "Подбор товаров под разные задачи и бюджет",
              "Гарантия качества и проверка продукции перед отправкой",
              "Профессиональные консультации по выбору товаров",
              "Выгодные цены, акции, скидки и специальные предложения",
            ].map((item) => (
              <li key={item} className="flex gap-2 items-start">
                <CheckCircle2 className="h-4 w-4 text-[#2B7BC8] mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Что можно купить в Timsan?
          </h3>
          <ul className="space-y-2">
            {[
              "Смесители и душевые системы",
              "Ванны и раковины",
              "Душевые кабины",
              "Унитазы, биде и инсталляции",
              "Мебель для ванных комнат",
              "Мойки, кухонные смесители и фильтры",
              "Аксессуары и комплектующие",
            ].map((item) => (
              <li key={item} className="flex gap-2 items-start">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#2B7BC8] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* How to buy */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Как проходит покупка?</h3>
        <p className="text-gray-600 mb-3 leading-relaxed">
          Процесс заказа в Timsan построен так, чтобы покупателю было легко пройти
          путь от выбора товара до его получения.
        </p>
        <ol className="space-y-2 list-decimal list-inside marker:text-[#2B7BC8] marker:font-semibold">
          <li>Выберите подходящий товар в каталоге.</li>
          <li>Оформите заказ онлайн или по телефону.</li>
          <li>Получите товар удобным способом.</li>
        </ol>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#DCDCDC] p-6 flex gap-4">
          <ShieldCheck className="h-6 w-6 text-[#2B7BC8] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Гарантийное обслуживание</h4>
            <p className="text-gray-600 leading-relaxed text-sm">
              Мы предоставляем гарантию на все товары. Если с покупкой что-то
              случится в течение гарантийного срока, обратитесь за ремонтом в
              авторизованный сервисный центр — контакты указаны в гарантийном талоне.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#DCDCDC] p-6 flex gap-4">
          <CreditCard className="h-6 w-6 text-[#2B7BC8] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Сантехника в рассрочку</h4>
            <p className="text-gray-600 leading-relaxed text-sm">
              Любой товар можно приобрести в рассрочку. При оформлении заказа
              выберите подходящий способ оплаты и заполните онлайн-заявку.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#DCDCDC] p-6 flex gap-4">
          <Truck className="h-6 w-6 text-[#2B7BC8] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Доставка по Казахстану</h4>
            <p className="text-gray-600 leading-relaxed text-sm">
              Доставляем заказы по всему Казахстану. Менеджер свяжется с вами для уточнения деталей доставки.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#DCDCDC] p-6 flex gap-4">
          <Phone className="h-6 w-6 text-[#2B7BC8] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Консультация специалиста</h4>
            <p className="text-gray-600 leading-relaxed text-sm">
              Если не хватает информации по конкретной модели — обратитесь к
              менеджерам. Колл-центр работает каждый день с 09:00 до 22:00.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl bg-[#2B7BC8] text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-base">
            Возникли вопросы или необходима консультация?
          </p>
          <p className="text-blue-100 text-xs mt-1">
            Ответим на вопросы и примем заказ по телефону
          </p>
        </div>
        <a
          href="tel:+77273000000"
          className="whitespace-nowrap font-bold text-lg bg-white text-[#2B7BC8] rounded-lg px-5 py-2.5 hover:bg-blue-50 transition-colors"
        >
          +7 (776) 201-64-66
        </a>
      </div>
    </section>
  );
}

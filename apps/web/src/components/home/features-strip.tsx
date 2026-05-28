import { Truck, PackageCheck, PhoneCall, CreditCard } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Доставка по Алматы",
    description: "Быстрая и бережная доставка ваших заказов в удобное время.",
  },
  {
    icon: PackageCheck,
    title: "Тысячи товаров",
    description: "Огромный выбор сантехники от ведущих мировых производителей.",
  },
  {
    icon: PhoneCall,
    title: "Консультации специалистов",
    description: "Поможем с выбором и ответим на все технические вопросы.",
  },
  {
    icon: CreditCard,
    title: "Оплата через Kaspi",
    description: "Удобная оплата, рассрочка и Kaspi Red прямо на сайте.",
  },
];

export function FeaturesStrip() {
  return (
    <section className="py-10 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="rounded-xl bg-accent/10 p-3">
                  <Icon className="h-10 w-10 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-stone-800">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

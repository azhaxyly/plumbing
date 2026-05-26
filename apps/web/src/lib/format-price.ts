/** Formats price in tiyins to KZT string */
export function formatPrice(tiyins: number): string {
  const kzt = tiyins / 100;
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(kzt);
}

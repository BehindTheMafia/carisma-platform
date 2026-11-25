export type Moneda = "NIO" | "USD";

const FORMATTERS: Record<Moneda, Intl.NumberFormat> = {
  NIO: new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
};

export function formatCurrency(amount: number | null | undefined, moneda: Moneda = "NIO"): string {
  const value = amount ?? 0;
  return FORMATTERS[moneda].format(value);
}

export function convertCurrency(amount: number, from: Moneda, to: Moneda, tipoCambio: number): number {
  if (from === to) return amount;
  if (from === "NIO" && to === "USD") return amount / tipoCambio;
  return amount * tipoCambio;
}

export function formatCurrencyDual(amount: number, moneda: Moneda, tipoCambio: number): string {
  const primary = formatCurrency(amount, moneda);
  const otherMoneda: Moneda = moneda === "NIO" ? "USD" : "NIO";
  const converted = convertCurrency(amount, moneda, otherMoneda, tipoCambio);
  return `${primary} | ${formatCurrency(converted, otherMoneda)}`;
}

// Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by new Date(),
// which in UTC-6 rolls back to the previous day. We detect them and treat
// the stored value as a UTC calendar date, formatting with UTC methods so
// the displayed day matches what was saved regardless of local timezone.
function parseDateForDisplay(date: string | Date): { d: Date; utcOnly: boolean } {
  if (typeof date === "string") {
    // Pure date string "YYYY-MM-DD" or ISO UTC "...T00:00:00.000Z"
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const isUTCMidnight = /T00:00:00(\.\d+)?(Z|[+-]00:00)$/.test(date);
    return { d: new Date(date), utcOnly: isDateOnly || isUTCMidnight };
  }
  return { d: date, utcOnly: false };
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const { d, utcOnly } = parseDateForDisplay(date);
  if (utcOnly) {
    return new Intl.DateTimeFormat("es-NI", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
    }).format(d);
  }
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const { d, utcOnly } = parseDateForDisplay(date);
  if (utcOnly) {
    return new Intl.DateTimeFormat("es-NI", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    }).format(d);
  }
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
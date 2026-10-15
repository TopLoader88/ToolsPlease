export const currencies = [
  { code: 'USD', name: 'US dollar', digits: 2 },
  { code: 'EUR', name: 'Euro', digits: 2 },
  { code: 'GBP', name: 'British pound', digits: 2 },
  { code: 'JPY', name: 'Japanese yen', digits: 0 },
  { code: 'CAD', name: 'Canadian dollar', digits: 2 },
  { code: 'AUD', name: 'Australian dollar', digits: 2 },
  { code: 'CHF', name: 'Swiss franc', digits: 2 },
  { code: 'CNY', name: 'Chinese yuan', digits: 2 },
  { code: 'INR', name: 'Indian rupee', digits: 2 },
  { code: 'MXN', name: 'Mexican peso', digits: 2 },
  { code: 'KRW', name: 'South Korean won', digits: 0 },
  { code: 'NZD', name: 'New Zealand dollar', digits: 2 },
  { code: 'SGD', name: 'Singapore dollar', digits: 2 },
  { code: 'HKD', name: 'Hong Kong dollar', digits: 2 },
] as const;

export type Currency = typeof currencies[number];

function normalizeRate(text: string) {
  return text.trim().replace(',', '.');
}

export function parseExchangeRate(text: string): number | null {
  const normalized = normalizeRate(text);
  if (!/^(?:\d{1,7}(?:\.\d{0,12})?|\.\d{1,12})$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  if (Number(whole || '0') === 1000000 && /[1-9]/.test(fraction)) return null;
  const rate = Number(normalized);
  return rate > 0 && rate <= 1000000 ? rate : null;
}

export function convertCurrency(amount: number, fromDigits: number, toDigits: number, rateText: string): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || ![0, 2].includes(fromDigits) || ![0, 2].includes(toDigits)) {
    throw new Error('Invalid currency amount.');
  }
  if (parseExchangeRate(rateText) === null) throw new Error('Enter a valid positive exchange rate.');
  const [whole, fraction = ''] = normalizeRate(rateText).split('.');
  const numerator = BigInt(`${whole || '0'}${fraction}`);
  const denominator = BigInt(10) ** BigInt(fraction.length + fromDigits);
  const scaled = BigInt(amount) * numerator * BigInt(10) ** BigInt(toDigits);
  // Round once in the destination's minor units, without floating-point drift.
  const converted = (scaled * BigInt(2) + denominator) / (denominator * BigInt(2));
  if (converted > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Converted amount is too large.');
  return Number(converted);
}

export async function getExchangeRate(base: string, quote: string, signal: AbortSignal, request: typeof fetch = fetch) {
  if (!currencies.some(currency => currency.code === base) || !currencies.some(currency => currency.code === quote) || base === quote) {
    throw new Error('Choose two different supported currencies.');
  }
  const response = await request(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`, { signal });
  if (!response.ok) throw new Error(`Rate service returned HTTP ${response.status}. Try again or enter a manual rate.`);
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('base' in data) || data.base !== base
    || !('quote' in data) || data.quote !== quote || !('date' in data) || typeof data.date !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date))
    || new Date(data.date).toISOString().slice(0, 10) !== data.date
    || !('rate' in data) || typeof data.rate !== 'number' || !Number.isFinite(data.rate)) {
    throw new Error('Rate service returned invalid data. Try again or enter a manual rate.');
  }
  const text = data.rate.toFixed(12).replace(/\.?0+$/, '');
  if (parseExchangeRate(text) === null) throw new Error('Rate is outside the supported range. Enter a manual rate.');
  return { text, date: data.date };
}

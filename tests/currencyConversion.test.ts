import assert from 'node:assert/strict';
import { test } from 'node:test';
import { convertCurrency, getExchangeRate, parseExchangeRate } from '../src/currencyConversion';

test('exchange rates require explicit positive decimal values', () => {
  assert.equal(parseExchangeRate('0.89222'), 0.89222);
  assert.equal(parseExchangeRate(' 1,25 '), 1.25);
  assert.equal(parseExchangeRate('.5'), 0.5);
  assert.equal(parseExchangeRate('1000000'), 1000000);
  assert.equal(parseExchangeRate('0.000000000001'), 0.000000000001);
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1e3', '1.2.3', '1000001', '1000000.000000000001', '0.0000000000001']) {
    assert.equal(parseExchangeRate(value), null, value);
  }
});

test('conversion uses exact destination minor units and rounds half up once', () => {
  assert.equal(convertCurrency(10000, 2, 2, '0.89222'), 8922);
  assert.equal(convertCurrency(1, 2, 2, '1.5'), 2);
  assert.equal(convertCurrency(1, 2, 2, '1.499999999999'), 1);
  assert.equal(convertCurrency(10000, 2, 0, '150.5'), 15050);
  assert.equal(convertCurrency(100, 0, 2, '0.0067'), 67);
  assert.equal(convertCurrency(1, 0, 0, '.5'), 1);
  assert.equal(convertCurrency(12345, 2, 2, '1'), 12345);
  assert.equal(convertCurrency(0, 2, 2, '1.5'), 0);
  assert.equal(convertCurrency(99999999, 2, 2, '1000000'), 99999999000000);
  assert.throws(() => convertCurrency(Number.MAX_SAFE_INTEGER, 0, 2, '1000000'), /too large/);
  for (const amount of [-1, NaN, 1.5]) assert.throws(() => convertCurrency(amount, 2, 2, '1'));
  assert.throws(() => convertCurrency(100, 2, 2, '0'));
  assert.throws(() => convertCurrency(100, 3, 2, '1'));
});

test('online rate validates the pair, rate and reference date', async () => {
  const signal = new AbortController().signal;
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://api.frankfurter.dev/v2/rate/USD/EUR');
    assert.equal(options?.signal, signal);
    return Response.json({ base: 'USD', quote: 'EUR', rate: 0.89222, date: '2026-10-15' });
  };
  assert.deepEqual(await getExchangeRate('USD', 'EUR', signal, request), { text: '0.89222', date: '2026-10-15' });
  const integerRate: typeof fetch = async () => Response.json({ base: 'USD', quote: 'JPY', rate: 1500, date: '2026-10-15' });
  assert.equal((await getExchangeRate('USD', 'JPY', signal, integerRate)).text, '1500');
});

test('failed, malformed and mismatched responses never become usable exchange rates', async () => {
  const signal = new AbortController().signal;
  const valid = { base: 'USD', quote: 'EUR', rate: 0.9, date: '2026-10-15' };
  const bodies = [
    null, {}, [], { ...valid, base: 'GBP' }, { ...valid, quote: 'JPY' },
    { ...valid, rate: '0.9' }, { ...valid, rate: 0 }, { ...valid, rate: -1 },
    { ...valid, rate: 1000001 }, { ...valid, date: 'not-a-date' }, { ...valid, date: '2026-02-30' },
  ];
  for (const body of bodies) {
    await assert.rejects(getExchangeRate('USD', 'EUR', signal, async () => Response.json(body)));
  }
  await assert.rejects(getExchangeRate('USD', 'EUR', signal, async () => new Response('', { status: 503 })), /HTTP 503/);
  await assert.rejects(getExchangeRate('USD', 'EUR', signal, async () => new Response('not JSON')));
  await assert.rejects(getExchangeRate('USD', 'EUR', signal, async () => { throw new Error('Offline'); }), /Offline/);
  await assert.rejects(getExchangeRate('BAD', 'EUR', signal), /supported currencies/);
  await assert.rejects(getExchangeRate('USD', 'USD', signal), /different/);
});

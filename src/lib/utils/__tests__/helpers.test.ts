import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  daysDiff,
  formatDate,
  formatYearMonth,
  formatISO,
  fromUnixTimestamp,
  toUnixTimestamp,
  truncate,
  camelToSnake,
  snakeToCamel,
  extractNumbers,
  formatPhoneNumber,
  formatNumber,
  formatCurrency,
  percentage,
  round,
  clamp,
  chunk,
  unique,
  groupBy,
  deepClone,
  merge,
  omitNullish,
  pick,
  retry,
  withTimeout,
  randomInt,
  randomString,
  generateUUID,
  simpleHash,
} from '../helpers';

describe('helper utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('formats and converts dates', () => {
    const date = new Date('2024-05-10T00:00:00Z');
    expect(formatDate(date)).toBe('2024-05-10');
    expect(formatYearMonth(date)).toBe('202405');
    expect(formatISO(date)).toBe(date.toISOString());

    const unix = toUnixTimestamp(date);
    expect(fromUnixTimestamp(unix).toISOString()).toBe(date.toISOString());
  });

  it('calculates day differences', () => {
    const start = new Date('2024-05-01T00:00:00Z');
    const end = new Date('2024-05-05T00:00:00Z');
    expect(daysDiff(start, end)).toBe(4);
  });

  it('handles string helpers', () => {
    expect(truncate('hello-world', 5)).toBe('he...');
    expect(camelToSnake('helloWorld')).toBe('hello_world');
    expect(snakeToCamel('hello_world')).toBe('helloWorld');
    expect(extractNumbers('tel: 010-1234-5678')).toBe('01012345678');
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
  });

  it('formats numbers and percentages', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatCurrency(5000)).toBe('5,000원');
    expect(percentage(50, 0)).toBe(0);
    expect(round(3.14159, 3)).toBe(3.142);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('manipulates arrays and objects', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(unique([1, 1, 2, 3])).toEqual([1, 2, 3]);
    expect(groupBy([{ type: 'a', id: 1 }, { type: 'b', id: 2 }, { type: 'a', id: 3 }], 'type')).toEqual({
      a: [{ type: 'a', id: 1 }, { type: 'a', id: 3 }],
      b: [{ type: 'b', id: 2 }],
    });

    const original = { nested: { value: 1 } };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);

    expect(merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(omitNullish({ a: 1, b: null, c: undefined, d: 0 })).toEqual({ a: 1, d: 0 });
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('retries failed promises with backoff', async () => {
    vi.useFakeTimers();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValue('ok');

    const promise = retry(fn, { maxRetries: 3, delay: 100, backoff: true });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('times out long-running promises', async () => {
    vi.useFakeTimers();
    const slow = new Promise(resolve => setTimeout(() => resolve('late'), 2000));
    const wrapped = withTimeout(slow as Promise<string>, 500);

    await expect(async () => {
      await vi.runAllTimersAsync();
      return wrapped;
    }).rejects.toThrow('Timeout');
  });

  it('produces deterministic random helpers when Math.random is mocked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(randomInt(0, 10)).toBe(5);
    expect(randomString(4)).toBe('ffff');
  });

  it('generates uuid-like ids and stable hashes', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const hash1 = simpleHash('hello');
    const hash2 = simpleHash('hello');
    const hash3 = simpleHash('world');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});

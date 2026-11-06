import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }));

beforeEach(() => {
  vi.resetModules();
  mock.invoke.mockReset();
  mock.invoke.mockImplementation(async (_name: string, { body }: { body: { params: { symbol: string } } }) => ({
    data: Object.fromEntries(body.params.symbol.split(',').map(symbol => [symbol, { symbol, close: '100' }])),
    error: null,
  }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('combines overlapping ticker, sidebar, and portfolio batches into one call', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  const [ticker, sidebar, portfolio] = await Promise.all([
    getCryptoQuotes(['BTC/USD', 'ETH/USD']),
    getCryptoQuotes(['ETH/USD', 'SOL/USD']),
    getCryptoQuotes(['BTC/USD']),
  ]);
  expect(mock.invoke).toHaveBeenCalledTimes(1);
  expect(mock.invoke.mock.calls[0][1].body.params.symbol).toBe('BTC/USD,ETH/USD,SOL/USD');
  expect(Object.keys(ticker)).toEqual(['BTC/USD', 'ETH/USD']);
  expect(Object.keys(sidebar)).toEqual(['ETH/USD', 'SOL/USD']);
  expect(portfolio['BTC/USD'].close).toBe('100');
  await getCryptoQuotes(['SOL/USD', 'BTC/USD']);
  expect(mock.invoke).toHaveBeenCalledTimes(1);
});

it('deduplicates a symbol while its batch is still in flight', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  let finish: (result: unknown) => void;
  mock.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = getCryptoQuotes(['BTC/USD']);
  await vi.waitFor(() => expect(mock.invoke).toHaveBeenCalledTimes(1));
  const second = getCryptoQuotes(['BTC/USD']);
  finish({ data: { symbol: 'BTC/USD', close: '100' }, error: null });
  expect(await first).toEqual(await second);
  expect(mock.invoke).toHaveBeenCalledTimes(1);
});

it('splits large batches so the edge function never drops symbols past its limit', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  const symbols = Array.from({ length: 35 }, (_, index) => `SYMBOL${index}/USD`);
  const result = await getCryptoQuotes(symbols);
  expect(Object.keys(result)).toHaveLength(35);
  expect(mock.invoke).toHaveBeenCalledTimes(3);
  mock.invoke.mock.calls.forEach(([, options]) => expect(options.body.params.symbol.split(',').length).toBeLessThanOrEqual(16));
});

it('normalizes symbols and skips empty requests', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  expect(await getCryptoQuotes([])).toEqual({});
  await getCryptoQuotes([' btc-usd ', 'BTC/USD', '']);
  expect(mock.invoke).toHaveBeenCalledTimes(1);
  expect(mock.invoke.mock.calls[0][1].body.params.symbol).toBe('BTC/USD');
});

it('refreshes quotes after the existing ten-minute freshness window', async () => {
  vi.useFakeTimers();
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  const first = getCryptoQuotes(['BTC/USD']);
  await vi.runAllTimersAsync();
  await first;
  vi.setSystemTime(Date.now() + 600_001);
  const second = getCryptoQuotes(['BTC/USD']);
  await vi.runAllTimersAsync();
  await second;
  expect(mock.invoke).toHaveBeenCalledTimes(2);
});

it('does not turn rate-limit metadata into quotes or cache it as a success', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  mock.invoke.mockResolvedValueOnce({ data: { status: 'rate_limited', message: 'Try later' }, error: null });
  expect(await getCryptoQuotes(['BTC/USD'])).toEqual({});
  expect((await getCryptoQuotes(['BTC/USD']))['BTC/USD'].close).toBe('100');
  expect(mock.invoke).toHaveBeenCalledTimes(2);
});

it('releases pending symbols after a failed request so a later request can recover', async () => {
  const { getCryptoQuotes } = await import('@/services/marketDataApi');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mock.invoke.mockResolvedValueOnce({ data: null, error: new Error('Invalid request') });
  expect(await getCryptoQuotes(['BTC/USD'])).toEqual({});
  expect((await getCryptoQuotes(['BTC/USD']))['BTC/USD'].close).toBe('100');
});

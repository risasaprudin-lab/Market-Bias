import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

// ── In-Memory Caches ──
let cached1d: any = null;
let lastFetch1d = 0;
let cached2d: any = null;
let lastFetch2d = 0;

// Flow Monitor internal state buffer
interface CategoryState {
  latest: any;
  history: any[];
}

const fmStates: Record<'inst' | 'metals' | 'crypto', CategoryState> = {
  inst: { latest: null, history: [] },
  metals: { latest: null, history: [] },
  crypto: { latest: null, history: [] },
};

const GROUPS = {
  inst: ['US500', 'NAS100', 'US30', 'US2000', 'GER40'],
  metals: ['GOLD', 'SILVER', 'COPPER', 'USOIL', 'UKOIL'],
  crypto: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'],
};

const ALIASES: Record<string, string> = {
  XAUUSD: 'GOLD', GOLD: 'GOLD', XAGUSD: 'SILVER', SILVER: 'SILVER',
  SPX500USD: 'US500', SPX: 'US500', US500: 'US500',
  NAS100USD: 'NAS100', NDX: 'NAS100', US100: 'NAS100', NAS100: 'NAS100',
  US30USD: 'US30', DJI: 'US30', US30: 'US30',
  US2000USD: 'US2000', RUT: 'US2000', US2000: 'US2000',
  DE30EUR: 'GER40', DE40EUR: 'GER40', DAX: 'GER40', GER40: 'GER40',
  XCUUSD: 'COPPER', COPPER: 'COPPER',
  WTI: 'USOIL', WTICOUSD: 'USOIL', USOIL: 'USOIL',
  BRENT: 'UKOIL', BCOUSD: 'UKOIL', UKOIL: 'UKOIL',
};

const CAT_MAP: Record<string, 'inst' | 'metals' | 'crypto'> = {
  macro: 'inst', indices: 'inst', inst: 'inst', benchmarks: 'inst',
  metals: 'metals', commodities: 'metals',
  crypto: 'crypto', coins: 'crypto',
};

function canonicalPairName(raw: string, cat: 'inst' | 'metals' | 'crypto'): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase().split(':').pop()!.replace(/[/_]/g, '');
  if (ALIASES[s]) return ALIASES[s];
  const coin = s.replace(/USDT$|USD$/, '');
  if (GROUPS.crypto.includes(coin)) return coin;
  if (GROUPS[cat].includes(s)) return s;
  return s;
}

function normalizeItem(item: any, cat: 'inst' | 'metals' | 'crypto') {
  if (!item || typeof item !== 'object') return null;
  const raw = item.pair ?? item.p ?? item.symbol ?? item.name;
  const pair = canonicalPairName(raw, cat);
  if (!pair || !GROUPS[cat].includes(pair)) return null;

  const price = typeof item.price === 'number' && Number.isFinite(item.price)
    ? item.price
    : typeof item.c === 'number' && Number.isFinite(item.c)
    ? item.c
    : null;

  if (price === null || price <= 0) return null;

  const pctRaw = typeof item.pct === 'number' && Number.isFinite(item.pct)
    ? item.pct
    : typeof item.chg === 'number' && Number.isFinite(item.chg)
    ? item.chg
    : typeof item.r === 'number' && Number.isFinite(item.r)
    ? item.r
    : 0;

  const pct = Number(pctRaw.toFixed(2));
  const dir = item.dir || (pct > 0 ? 'LONG' : pct < 0 ? 'SHORT' : 'NEUTRAL');
  const p = pair === 'GOLD' ? 'XAUUSD' : pair === 'SILVER' ? 'XAGUSD' : pair === 'NAS100' ? 'US100' : pair;

  return {
    pair,
    p,
    pct,
    price,
    dir,
    c: price,
    o: typeof item.o === 'number' ? item.o : typeof item.open === 'number' ? item.open : null,
    h: typeof item.h === 'number' ? item.h : typeof item.high === 'number' ? item.high : null,
    l: typeof item.l === 'number' ? item.l : typeof item.low === 'number' ? item.low : null,
    v: typeof item.v === 'number' ? item.v : typeof item.volume === 'number' ? item.volume : null,
    ema20: typeof item.ema20 === 'number' ? item.ema20 : null,
    src: typeof item.src === 'string' ? item.src : null,
  };
}

function formatSnapshot(states: Record<'inst' | 'metals' | 'crypto', CategoryState>) {
  const events = Object.values(states).map((s) => s.latest).filter(Boolean);
  const last = events.reduce((a, b) => (!a || b.receivedAt > a.receivedAt ? b : a), null);

  const byCategory: any = {};
  for (const cat of ['inst', 'metals', 'crypto'] as const) {
    const e = states[cat]?.latest;
    byCategory[cat] = e
      ? {
          barTimestamp: e.t,
          receivedAt: e.receivedAt,
          tf: e.tf,
          count: e.data.length,
          expected: GROUPS[cat].length,
          missing: GROUPS[cat].filter((p) => !e.data.some((i: any) => i.pair === p)),
        }
      : null;
  }

  const timeStr = last
    ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(last.t)) + ' WIB'
    : null;

  return {
    status: last ? 'ok' : 'waiting_data',
    time: timeStr,
    mode: last ? (last.tf && /^\d+$/.test(last.tf) ? `${last.tf}m` : last.tf) : null,
    timestamp: last?.receivedAt ?? Date.now(),
    barTimestamp: last?.t ?? null,
    source: 'tradingview_pine_webhook',
    crypto: states.crypto?.latest?.data ?? [],
    metals: states.metals?.latest?.data ?? [],
    inst: states.inst?.latest?.data ?? [],
    forex: [],
    context: {},
    byCategory,
    complete: (['inst', 'metals', 'crypto'] as const).every(
      (c) => states[c]?.latest?.data?.length === GROUPS[c].length
    ),
    synchronized: events.length === 3 && events.every((e) => e.t === events[0].t && e.tf === events[0].tf),
  };
}

// ── GET /api/currency-strength-live ──
app.get('/api/currency-strength-live', async (req, res) => {
  const is2d = req.query.range === '2d';
  const now = Date.now();

  if (is2d && cached2d && now - lastFetch2d < 15000) {
    return res.json({ source: 'cache', data: cached2d });
  }
  if (!is2d && cached1d && now - lastFetch1d < 15000) {
    return res.json({ source: 'cache', data: cached1d });
  }

  const endpoint = is2d ? 'chart2d.json' : 'chart1d.json';
  try {
    const targetUrl = `https://currency-strength.com/php/${endpoint}?id=${now}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://currency-strength.com/en/',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (is2d) {
      cached2d = data;
      lastFetch2d = now;
    } else {
      cached1d = data;
      lastFetch1d = now;
    }
    return res.json({ source: 'live', data });
  } catch (err: any) {
    const fallback = is2d ? cached2d : cached1d;
    if (fallback) {
      return res.json({ source: 'fallback_cache', data: fallback });
    }
    return res.status(502).json({ error: 'Failed to fetch currency strength data', message: err.message });
  }
});

// ── GET /api/flow-monitor/latest ──
app.get('/api/flow-monitor/latest', async (req, res) => {
  const workerUrl = (req.query.workerUrl as string)?.trim().replace(/\/+$/, '') || 'https://arahmarket.risasaprudin.workers.dev';

  // 1. If user provided a Cloudflare Worker URL, proxy to it
  if (workerUrl) {
    try {
      const target = workerUrl.endsWith('/latest') ? workerUrl : `${workerUrl}/latest`;
      const response = await fetch(target, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({ source: 'cloudflare_worker', data });
      }
    } catch (err: any) {
      console.warn('Worker proxy error:', err.message);
    }
  }

  // 2. Check if we have received Pine Script webhooks directly
  const localSnap = formatSnapshot(fmStates);
  if (localSnap.status === 'ok') {
    return res.json({ source: 'direct_webhook', data: localSnap });
  }

  // 3. Fallback: Provide direct live crypto prices via Binance public API so UI is not completely empty
  try {
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      signal: AbortSignal.timeout(4000),
    });
    if (binanceRes.ok) {
      const tickers: any[] = await binanceRes.json();
      const cryptoMap: Record<string, string> = {
        BTC: 'BTCUSDT',
        ETH: 'ETHUSDT',
        SOL: 'SOLUSDT',
        BNB: 'BNBUSDT',
        XRP: 'XRPUSDT',
      };

      const cryptoItems = Object.entries(cryptoMap).map(([coin, symbol]) => {
        const item = tickers.find((t) => t.symbol === symbol);
        const price = item ? parseFloat(item.lastPrice) : 0;
        const pct = item ? parseFloat(parseFloat(item.priceChangePercent).toFixed(2)) : 0;
        return {
          pair: coin,
          p: coin,
          pct,
          price,
          dir: pct >= 0 ? 'LONG' : 'SHORT',
          c: price,
          o: item ? parseFloat(item.openPrice) : null,
          h: item ? parseFloat(item.highPrice) : null,
          l: item ? parseFloat(item.lowPrice) : null,
          v: item ? parseFloat(item.volume) : null,
          ema20: null,
          src: `BINANCE:${symbol}`,
        };
      });

      return res.json({
        source: 'public_live_preview',
        data: {
          status: 'preview_live',
          time: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
          mode: '24h Public',
          timestamp: Date.now(),
          barTimestamp: Date.now(),
          crypto: cryptoItems,
          metals: [],
          inst: [],
          forex: [],
          context: {},
          complete: false,
          synchronized: false,
          notice: 'Menampilkan data live crypto preview. Hubungkan Cloudflare Worker atau Webhook TradingView untuk data indeks & komoditas real-time.',
        },
      });
    }
  } catch (fallbackErr: any) {
    // ignore
  }

  return res.json({
    source: 'waiting_webhook',
    data: localSnap,
    message: 'Belum ada data dari Webhook TradingView / Cloudflare Worker.',
  });
});

// ── GET /api/flow-monitor/history ──
app.get('/api/flow-monitor/history', async (req, res) => {
  const workerUrl = (req.query.workerUrl as string)?.trim().replace(/\/+$/, '') || 'https://arahmarket.risasaprudin.workers.dev';
  if (workerUrl) {
    try {
      const target = workerUrl.endsWith('/history') ? workerUrl : `${workerUrl}/history`;
      const response = await fetch(target, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({ source: 'cloudflare_worker', data });
      }
    } catch (err: any) {
      console.warn('Worker history error:', err.message);
    }
  }

  // Generate history from local states
  const events = Object.values(fmStates)
    .flatMap((s) => s.history)
    .sort((a, b) => a.t - b.t || a.receivedAt - b.receivedAt);

  const current: any = {};
  const out: any[] = [];
  for (let i = 0; i < events.length; ) {
    const t = events[i].t;
    const tf = events[i].tf;
    do {
      const e = events[i++];
      current[e.cat] = { latest: e };
    } while (i < events.length && events[i].t === t && events[i].tf === tf);
    out.push(formatSnapshot(current));
  }

  return res.json({ source: 'local_history', data: out.slice(-60) });
});

// ── GET /api/flow-monitor/streaks ──
app.get('/api/flow-monitor/streaks', async (req, res) => {
  const workerUrl = (req.query.workerUrl as string)?.trim().replace(/\/+$/, '') || 'https://arahmarket.risasaprudin.workers.dev';
  if (workerUrl) {
    try {
      const target = workerUrl.endsWith('/streaks') ? workerUrl : `${workerUrl}/streaks`;
      const response = await fetch(target, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err: any) {
      console.warn('Worker streaks error:', err.message);
    }
  }

  // Calculate streaks locally
  const result: Record<string, any> = {};
  for (const [cat, state] of Object.entries(fmStates) as [('inst' | 'metals' | 'crypto'), CategoryState][]) {
    if (!state.latest) continue;
    for (const item of state.latest.data) {
      let count = 0;
      if (item.dir === 'LONG' || item.dir === 'SHORT') {
        for (const e of [...state.history].reverse()) {
          const v = e.data.find((x: any) => x.pair === item.pair);
          if (!v || v.dir !== item.dir) break;
          count++;
        }
      }
      result[item.pair] = {
        dir: item.dir,
        count,
        tf: state.latest.tf,
        barTimestamp: state.latest.t,
        category: cat,
      };
    }
  }

  return res.json({ streaks: result, window: 60 });
});

// ── POST /api/flow-monitor/webhook & /fm ──
app.post(['/api/flow-monitor/webhook', '/fm'], (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'Expected JSON payload' });
    }

    const now = Date.now();
    const tf = String(body.tf ?? '15').trim();
    const t = typeof body.t === 'number' && Number.isFinite(body.t) ? body.t : now;

    const updatedCategories: string[] = [];

    // Format A: { t, tf, cat: 'macro' | 'metals' | 'crypto', data: [...] }
    if (body.cat && Array.isArray(body.data)) {
      const catKey = CAT_MAP[String(body.cat).toLowerCase()];
      if (catKey) {
        const validItems = body.data
          .map((raw: any) => normalizeItem(raw, catKey))
          .filter(Boolean);

        const newEntry = { cat: catKey, t, tf, receivedAt: now, data: validItems };
        const prev = fmStates[catKey];
        const history = (prev?.history ?? []).filter((old) => old.t !== t);
        history.push(newEntry);
        history.sort((a, b) => a.t - b.t);

        fmStates[catKey] = {
          latest: newEntry,
          history: history.slice(-60),
        };
        updatedCategories.push(catKey);
      }
    }

    // Format B: Unified object { inst: [...], metals: [...], crypto: [...] }
    for (const [key, catKey] of Object.entries(CAT_MAP)) {
      if (Array.isArray(body[key]) && !updatedCategories.includes(catKey)) {
        const validItems = body[key]
          .map((raw: any) => normalizeItem(raw, catKey))
          .filter(Boolean);

        const newEntry = { cat: catKey, t, tf, receivedAt: now, data: validItems };
        const prev = fmStates[catKey];
        const history = (prev?.history ?? []).filter((old) => old.t !== t);
        history.push(newEntry);
        history.sort((a, b) => a.t - b.t);

        fmStates[catKey] = {
          latest: newEntry,
          history: history.slice(-60),
        };
        updatedCategories.push(catKey);
      }
    }

    if (updatedCategories.length > 0) {
      const snap = formatSnapshot(fmStates);
      return res.json({
        ok: true,
        saved: true,
        updated: updatedCategories,
        counts: {
          crypto: snap.crypto.length,
          metals: snap.metals.length,
          indeks: snap.inst.length,
        },
        time: snap.time,
      });
    }

    return res.status(400).json({
      ok: false,
      error: 'Unrecognized format. Expected { t, tf, cat, data } or { inst, metals, crypto }',
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/flow-monitor/test-connection ──
app.post('/api/flow-monitor/test-connection', async (req, res) => {
  const { workerUrl } = req.body || {};
  if (!workerUrl || typeof workerUrl !== 'string') {
    return res.status(400).json({ ok: false, error: 'Worker URL required' });
  }

  const cleanUrl = workerUrl.trim().replace(/\/+$/, '');
  const startTime = Date.now();

  try {
    // Test 1: GET /health
    let testRes = await fetch(`${cleanUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (testRes.ok) {
      const healthData = await testRes.json();
      const latencyMs = Date.now() - startTime;
      return res.json({
        ok: true,
        endpointUsed: `${cleanUrl}/health`,
        latencyMs,
        details: healthData,
      });
    }

    // Test 2: GET /latest
    testRes = await fetch(`${cleanUrl}/latest`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (testRes.ok) {
      const snapData = await testRes.json();
      const latencyMs = Date.now() - startTime;
      return res.json({
        ok: true,
        endpointUsed: `${cleanUrl}/latest`,
        latencyMs,
        details: {
          status: snapData.status,
          cryptoCount: snapData.crypto?.length ?? 0,
          metalsCount: snapData.metals?.length ?? 0,
          instCount: snapData.inst?.length ?? 0,
          complete: snapData.complete,
        },
      });
    }

    return res.status(400).json({
      ok: false,
      error: `Worker merespons dengan HTTP status ${testRes.status}`,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: `Gagal menghubungi worker: ${err.message}`,
    });
  }
});

// ── Mount Vite in dev / serve static in prod ──
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GogoCurrency & Flow Monitor running on port ${PORT}`);
  });
}

startServer();

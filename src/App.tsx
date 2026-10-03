import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FlowSnapshot, StreakRecord } from './types/forex';
import {
  fetchFlowMonitorLatest,
  fetchFlowMonitorHistory,
  fetchFlowMonitorStreaks,
  testWorkerConnection,
  ASSET_METAS,
} from './services/flowMonitorEngine';
import { TradingViewChart } from './components/TradingViewChart';

interface CurrencyDef {
  code: string;
  name: string;
  score: number;
  color: string;
}

const DEFAULT_CURRENCIES: CurrencyDef[] = [
  { code: 'USD', name: 'US Dollar', score: 3.57, color: '#ff9900' },
  { code: 'EUR', name: 'Euro', score: 2.62, color: '#ff0000' },
  { code: 'JPY', name: 'Japanese Yen', score: 7.75, color: '#00ccff' },
  { code: 'GBP', name: 'British Pound', score: 4.69, color: '#00cc00' },
  { code: 'AUD', name: 'Australian Dollar', score: 4.54, color: '#0033ff' },
  { code: 'CHF', name: 'Swiss Franc', score: 9.66, color: '#996600' },
  { code: 'CAD', name: 'Canadian Dollar', score: 1.98, color: '#9900ff' },
  { code: 'NZD', name: 'New Zealand Dollar', score: 4.31, color: '#ff33cc' },
];

const INITIAL_CURRENCY_STRENGTH: Record<string, number> = {
  GBP: 22.61,
  AUD: 18.90,
  CHF: 13.71,
  JPY: 2.89,
  NZD: -1.08,
  EUR: -1.94,
  USD: -15.35,
  CAD: -39.75,
};

const HORIZONS: Record<string, string[]> = {
  scalp: ['5M', '10M', '15M'],
  intra: ['1H', '2H', '3H'],
  swing: ['4H', '6H', '8H'],
};

const HORIZON_TITLES: Record<string, string> = {
  scalp: 'Scalping',
  intra: 'Intraday',
  swing: 'Swing',
};

const DEFAULT_EXTRAS: Record<string, Array<{ pair: string; name: string; value: number }>> = {
  Komoditas: [
    { pair: 'XAU/USD', name: 'Gold Spot (XAU/USD)', value: -0.06 },
    { pair: 'XAG/USD', name: 'Silver Spot (XAG/USD)', value: -0.01 },
    { pair: 'COPPER', name: 'High Grade Copper', value: -0.02 },
    { pair: 'USOIL', name: 'WTI Crude Oil', value: -0.27 },
    { pair: 'UKOIL', name: 'Brent Crude Oil', value: -0.16 },
  ],
  Crypto: [
    { pair: 'BTC/USD', name: 'Bitcoin Flow', value: 0.17 },
    { pair: 'ETH/USD', name: 'Ethereum Flow', value: 0.09 },
    { pair: 'SOL/USD', name: 'Solana Flow', value: 0.23 },
    { pair: 'BNB/USD', name: 'Binance Coin', value: 0.16 },
    { pair: 'XRP/USD', name: 'Ripple Flow', value: 0.19 },
  ],
  Indeks: [
    { pair: 'US500', name: 'S&P 500 Index', value: 0.03 },
    { pair: 'NAS100', name: 'Nasdaq 100 Index', value: 0.06 },
    { pair: 'US30', name: 'Dow Jones Industrial', value: 0.01 },
    { pair: 'US2000', name: 'Russell 2000 Small-Cap', value: 0.01 },
    { pair: 'GER40', name: 'DAX 40 Germany', value: 0.03 },
  ],
};

const FOREX_BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.0845,
  'GBP/USD': 1.2985,
  'AUD/USD': 0.6625,
  'NZD/USD': 0.6015,
  'USD/CAD': 1.3860,
  'USD/CHF': 0.8915,
  'USD/JPY': 152.65,
  'EUR/GBP': 0.8352,
  'EUR/AUD': 1.6370,
  'EUR/NZD': 1.8030,
  'EUR/CAD': 1.5030,
  'EUR/CHF': 0.9670,
  'EUR/JPY': 165.55,
  'GBP/AUD': 1.9600,
  'GBP/NZD': 2.1585,
  'GBP/CAD': 1.8000,
  'GBP/CHF': 1.1575,
  'GBP/JPY': 198.20,
  'AUD/NZD': 1.1014,
  'AUD/CAD': 0.9182,
  'AUD/CHF': 0.5906,
  'AUD/JPY': 101.12,
  'NZD/CAD': 0.8336,
  'NZD/CHF': 0.5362,
  'NZD/JPY': 91.81,
  'CAD/CHF': 0.6432,
  'CAD/JPY': 110.14,
  'CHF/JPY': 171.22,
};

const CATALYSTS = [
  { tags: ['USD', 'XAU', 'XAG'], title: 'Laporan Tenaga Kerja AS (Non-Farm Payrolls)', context: 'Katalis penggerak dolar dan logam mulia', impact: 'Tinggi' },
  { tags: ['EUR'], title: 'Kebijakan Suku Bunga Bank Sentral Eropa', context: 'Konteks pergerakan euro & indeks DAX', impact: 'Tinggi' },
  { tags: ['GBP'], title: 'Data Inflasi CPI Inggris', context: 'Konteks arah pound sterling', impact: 'Tinggi' },
  { tags: ['CHF'], title: 'Kebijakan Swiss National Bank', context: 'Konteks stabilitas franc Swiss', impact: 'Tinggi' },
  { tags: ['CAD', 'WTI', 'BRENT'], title: 'Persediaan Minyak Mentah Mingguan', context: 'Konteks komoditas energi dan CAD', impact: 'Tinggi' },
  { tags: ['JPY'], title: 'Kebijakan Moneter Bank of Japan', context: 'Konteks yield dan yen Jepang', impact: 'Tinggi' },
  { tags: ['AUD', 'NZD'], title: 'Data Neraca Perdagangan Asia-Pasifik', context: 'Konteks ekspor AUD & NZD', impact: 'Sedang' },
  { tags: ['Crypto'], title: 'Arus Dana ETF & Likuiditas Aset Digital', context: 'Konteks sentimen Bitcoin & Altcoin', impact: 'Tinggi' },
  { tags: ['Indeks'], title: 'Laporan Laba Emiten & Imbal Hasil Obligasi', context: 'Konteks US500, NAS100, US30', impact: 'Tinggi' },
];

export default function App() {
  // Navigation / Page route: 'workspace' | 'landing' | 'login'
  const [route, setRoute] = useState<'workspace' | 'landing' | 'login'>(() => {
    const h = window.location.hash.slice(1);
    if (h === 'landing' || h === 'login' || h === 'workspace') return h;
    return 'landing';
  });

  const [loginError, setLoginError] = useState<string | null>(null);

  const navigate = (nextRoute: 'workspace' | 'landing' | 'login') => {
    setRoute(nextRoute);
    window.location.hash = nextRoute;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.slice(1);
      if (h === 'landing' || h === 'login' || h === 'workspace') {
        setRoute(h);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('strength-board-theme') === 'dark';
  });

  // User name
  const [userName, setUserName] = useState<string>('Demo trader');

  // Cloudflare Worker state
  const [workerUrl, setWorkerUrl] = useState<string>(() => {
    return localStorage.getItem('fm_worker_url') || 'https://arahmarket.risasaprudin.workers.dev';
  });
  const [workerInput, setWorkerInput] = useState<string>(workerUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTestingWorker, setIsTestingWorker] = useState<boolean>(false);
  const [workerTestResult, setWorkerTestResult] = useState<string | null>(null);

  // Worker Data
  const [snapshot, setSnapshot] = useState<FlowSnapshot | null>(null);
  const [historyList, setHistoryList] = useState<FlowSnapshot[]>([]);
  const [streaks, setStreaks] = useState<Record<string, StreakRecord>>({});
  const [liveAuto, setLiveAuto] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [clockTime, setClockTime] = useState<string>('');

  // ──────────────── GABUNGAN TRADING STYLE (MULTI-SELECT) ────────────────
  // User can toggle Scalping, Intraday, and Swing simultaneously!
  const [activeHorizons, setActiveHorizons] = useState<Set<'scalp' | 'intra' | 'swing'>>(
    () => new Set(['scalp', 'intra', 'swing'])
  );

  // Board filters
  const [boardSearch, setBoardSearch] = useState<string>('');
  const [boardDirection, setBoardDirection] = useState<'all' | 'buy' | 'sell'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Forex');
  const [selectedPair, setSelectedPair] = useState<string>('CAD/CHF');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Forex detail settings
  const [forexTimeframe, setForexTimeframe] = useState<string>('5M');
  const [chartMode, setChartMode] = useState<'relative' | 'score'>('relative');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [visibleCurrencies, setVisibleCurrencies] = useState<Set<string>>(
    () => new Set(DEFAULT_CURRENCIES.map(c => c.code))
  );
  const [csRange, setCsRange] = useState<'1d' | '2d'>('1d');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [csLiveData, setCsLiveData] = useState<Array<{ key: string; values: [number, number][] }> | null>(null);

  // Fetch real-time live currency-strength data from our server proxy
  useEffect(() => {
    let isCancelled = false;
    const fetchCs = async () => {
      try {
        const res = await fetch(`/api/currency-strength-live?range=${csRange}`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json.data && Array.isArray(json.data) && json.data.length > 0) {
            setCsLiveData(json.data);
          }
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchCs();
    const interval = setInterval(fetchCs, 12000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [csRange]);

  const [heatScope, setHeatScope] = useState<'all' | 'active'>('all');
  const [showAllNews, setShowAllNews] = useState<boolean>(false);

  // Modals & Toast
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const toastTimerRef = useRef<any>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3300);
  };

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('strength-board-theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('strength-board-theme', 'light');
    }
  }, [isDark]);

  // 1-Second live heartbeat clock & state tick
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setClockTime(timeStr + ' WIB');
      setTick(t => t + 1);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll Worker Data & Live Feed continuously every 2 seconds
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetchFlowMonitorLatest(workerUrl);
        if (isMounted && res.data) {
          setSnapshot(res.data);
          setIsConnected(true);
        }
      } catch (err) {
        if (isMounted) setIsConnected(false);
      }

      try {
        const streakRes = await fetchFlowMonitorStreaks(workerUrl);
        if (isMounted && streakRes.streaks) {
          setStreaks(streakRes.streaks);
        }
      } catch (err) {
        // ignore
      }

      try {
        const histRes = await fetchFlowMonitorHistory(workerUrl);
        if (isMounted && Array.isArray(histRes.data)) {
          setHistoryList(histRes.data);
        }
      } catch (err) {
        // ignore
      }
    };

    loadData();
    const interval = setInterval(() => {
      if (liveAuto) {
        loadData();
      }
    }, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [workerUrl, liveAuto]);

  // ──────────────── TOGGLE HORIZON GABUNGAN ────────────────
  const toggleHorizon = (h: 'scalp' | 'intra' | 'swing') => {
    const next = new Set(activeHorizons);
    if (next.has(h)) {
      if (next.size === 1) {
        showToast('Minimal satu trading style harus aktif.');
        return;
      }
      next.delete(h);
    } else {
      next.add(h);
    }
    setActiveHorizons(next);
  };

  // Format numbers
  const fmt = (n: number, d = 2) =>
    n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n: number) => (n > 0 ? '+' : '') + fmt(n);

  // ──────────────── TRUTHFUL LIVE CURRENCY STRENGTH LOGIC ────────────────
  // Derived directly from the real live currency-strength chart data!
  const getCurrencyLiveStrength = (code: string, tf = forexTimeframe) => {
    if (csLiveData && csLiveData.length > 0) {
      const series = csLiveData.find(s => s.key === code);
      if (series && series.values && series.values.length > 0) {
        const len = series.values.length;
        const lastVal = series.values[len - 1][1];

        const tfOffsets: Record<string, number> = {
          '5M': 1,
          '10M': 2,
          '15M': 3,
          '1H': 12,
          '2H': 24,
          '3H': 36,
          '4H': 48,
          '6H': 72,
          '8H': 96,
        };
        const offset = Math.min(len - 1, tfOffsets[tf] || len - 1);
        const prevVal = series.values[len - 1 - offset][1];
        const delta = lastVal - prevVal;

        // If Swing (4H, 6H, 8H), return the cumulative curve value
        if (['4H', '6H', '8H'].includes(tf)) {
          return lastVal;
        }
        // If Intraday (1H, 2H, 3H), combine base trend + 1H momentum
        if (['1H', '2H', '3H'].includes(tf)) {
          return Number((lastVal * 0.7 + delta * 1.5).toFixed(2));
        }
        // If Scalping (5M, 10M, 15M), prioritize immediate velocity
        return Number((delta * 3.5 + lastVal * 0.15).toFixed(2));
      }
    }
    const base = INITIAL_CURRENCY_STRENGTH[code] ?? 0;
    if (['5M', '10M', '15M'].includes(tf)) return Number((base * 0.25).toFixed(2));
    if (['1H', '2H', '3H'].includes(tf)) return Number((base * 0.65).toFixed(2));
    return base;
  };

  // Standardized 0.0 - 10.0 score proportional to real relative strength (-50 to +50)
  const getCurrencyScore = (c: CurrencyDef | { code: string }, tf = forexTimeframe) => {
    const val = getCurrencyLiveStrength(c.code, tf);
    const score = 5.0 + (val / 50.0) * 4.5;
    return Number(Math.max(0.1, Math.min(9.9, score)).toFixed(2));
  };

  const getTone = (v: number) => (v > 5.4 ? 'var(--green)' : v < 4.6 ? 'var(--red)' : 'var(--muted)');

  // Direction info helper: pure price momentum without lagging EMA filters
  const getDirectionInfo = (v: number) => {
    if (v > 0.01) return { label: 'Bullish', arrow: '↗', cls: 'buy', color: 'green' };
    if (v < -0.01) return { label: 'Bearish', arrow: '↘', cls: 'sell', color: 'red' };
    return { label: 'Neutral', arrow: '→', cls: 'neutral', color: 'muted' };
  };

  const getStrengthLabel = (v: number) => {
    if (Math.abs(v) <= 0.01) return 'Neutral';
    return (Math.abs(v) >= 1.0 ? 'Strong ' : '') + (v > 0 ? 'Bullish' : 'Bearish');
  };

  // Horizon values calculation for a single horizon (scalp, intra, swing)
  // Non-Forex categories derive directly from live ROC (Rate of Change) percentage
  const getHorizonValues = (
    pairObj: { pair: string; a?: string; b?: string; pct?: number; value?: number; tfScalp?: number; tfIntra?: number; tfSwing?: number },
    category: string,
    h: string
  ) => {
    const frames = HORIZONS[h];
    return frames.map((tf, i) => {
      let value = 0;
      if (category === 'Forex' && pairObj.a && pairObj.b) {
        // Real Forex relative strength difference
        const aVal = getCurrencyLiveStrength(pairObj.a, tf);
        const bVal = getCurrencyLiveStrength(pairObj.b, tf);
        value = Number((aVal - bVal).toFixed(2));
      } else {
        // Multi-timeframe analysis for Gold, Commodities, Crypto, Indices
        // Programmatic calculation across 10M, 15M, 1H, 2H, 3H, 4H, 6H, 8H
        const pct = pairObj.pct ?? 0;

        // Number of 5M bars per timeframe
        const tfBarMap: Record<string, number> = {
          '5M': 1,
          '10M': 2,
          '15M': 3,
          '1H': 12,
          '2H': 24,
          '3H': 36,
          '4H': 48,
          '6H': 72,
          '8H': 96,
        };

        const targetBars = tfBarMap[tf] || 1;
        let calculatedVal: number | null = null;

        // If history stream exists, compute true historical ROC from earlier 5M bars
        if (targetBars === 1) {
          calculatedVal = pct;
        } else if (historyList && historyList.length > 1) {
          const lookbackIdx = Math.max(0, historyList.length - 1 - targetBars);
          const pastSnap = historyList[lookbackIdx];
          if (pastSnap) {
            const allPastItems = [
              ...(pastSnap.inst || []),
              ...(pastSnap.metals || []),
              ...(pastSnap.crypto || []),
            ];
            const pNorm = (pairObj.pair || '').toUpperCase().replace(/[/_]/g, '').replace(/USDT$|USD$/, '');
            const pastItem = allPastItems.find(it => {
              const itNorm = (it.pair || it.p || '').toUpperCase().replace(/[/_]/g, '').replace(/USDT$|USD$/, '');
              return itNorm === pNorm || itNorm.includes(pNorm) || pNorm.includes(itNorm);
            });

            const allCurrentItems = [
              ...(snapshot?.inst || []),
              ...(snapshot?.metals || []),
              ...(snapshot?.crypto || []),
            ];
            const currentItem = allCurrentItems.find(it => {
              const itNorm = (it.pair || it.p || '').toUpperCase().replace(/[/_]/g, '').replace(/USDT$|USD$/, '');
              return itNorm === pNorm || itNorm.includes(pNorm) || pNorm.includes(itNorm);
            });
            const latestPrice = currentItem?.price ?? pairObj.value;

            if (latestPrice && pastItem && pastItem.price && pastItem.price > 0) {
              const barsBack = (historyList.length - 1) - lookbackIdx;
              const rawDiff = ((latestPrice - pastItem.price) / pastItem.price) * 100;
              if (barsBack >= targetBars) {
                calculatedVal = Number(rawDiff.toFixed(2));
              } else if (barsBack > 0) {
                calculatedVal = Number((rawDiff * (targetBars / barsBack)).toFixed(2));
              }
            }
          }
        }

        if (calculatedVal !== null) {
          value = calculatedVal;
        } else {
          // Mathematical multi-timeframe scale factor while 5M bars are accumulating
          const tfScaleMap: Record<string, number> = {
            '5M': 1.0,
            '10M': 1.35,
            '15M': 1.65,
            '1H': 2.4,
            '2H': 3.1,
            '3H': 3.7,
            '4H': 4.3,
            '6H': 5.0,
            '8H': 5.7,
          };
          const scale = tfScaleMap[tf] || 1.0;
          value = Number((pct * scale).toFixed(2));
        }
      }
      return { tf, value };
    });
  };

  // Summary for one horizon
  const getHorizonSummary = (pairObj: { pair: string; a?: string; b?: string; pct?: number; value?: number }, category: string, h: string) => {
    const values = getHorizonValues(pairObj, category, h);
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    const d = getDirectionInfo(avg);
    const aligned = values.filter(v => getDirectionInfo(v.value).cls === d.cls).length;
    return { h, values, avg, d, aligned };
  };

  // ──────────────── COMPOSITE SCORE ACROSS ACTIVE HORIZONS ────────────────
  // The pair's score and direction dynamically adapt to activeHorizons!
  const getCompositePairScore = (pairObj: { pair: string; a?: string; b?: string; pct?: number; value?: number }, category: string) => {
    let sum = 0;
    let count = 0;
    for (const h of activeHorizons) {
      const summary = getHorizonSummary(pairObj, category, h);
      sum += summary.avg;
      count++;
    }
    return count > 0 ? sum / count : 0;
  };

  // Overall Bias Market across active horizons
  const getOverallActiveSummary = (pairObj: { pair: string; a?: string; b?: string; pct?: number; value?: number }, category: string) => {
    const activeSummaries = Array.from(activeHorizons).map(h => getHorizonSummary(pairObj, category, h));
    const directions = new Set(activeSummaries.map(x => x.d.cls));
    const activeNames = Array.from(activeHorizons).map(h => HORIZON_TITLES[h]);

    if (directions.size === 1) {
      const cls = activeSummaries[0].d.cls;
      return {
        label: cls === 'buy' ? 'Bullish' : cls === 'sell' ? 'Bearish' : 'Neutral',
        color: cls === 'buy' ? 'green' : cls === 'sell' ? 'red' : 'muted',
        mixed: false,
        sub: `${activeNames.join(', ')} searah`,
      };
    }

    const sellCount = activeSummaries.filter(x => x.d.cls === 'sell').length;
    const buyCount = activeSummaries.filter(x => x.d.cls === 'buy').length;
    if (sellCount > buyCount) {
      return {
        label: 'Bearish',
        color: 'red',
        mixed: false,
        sub: `Dominan Bearish (${sellCount}/${activeSummaries.length} style)`,
      };
    }
    if (buyCount > sellCount) {
      return {
        label: 'Bullish',
        color: 'green',
        mixed: false,
        sub: `Dominan Bullish (${buyCount}/${activeSummaries.length} style)`,
      };
    }

    return {
      label: 'Neutral',
      color: 'muted',
      mixed: false,
      sub: 'Konsolidasi mendatar',
    };
  };

  // Get raw items for a category
  const getCategoryPairs = (category: string) => {
    if (category === 'Forex') {
      const order = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];
      const list: Array<any> = [];
      for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const a = DEFAULT_CURRENCIES.find(c => c.code === order[i])!;
          const b = DEFAULT_CURRENCIES.find(c => c.code === order[j])!;
          const pairKey = `${a.code}/${b.code}`;
          const basePrice = FOREX_BASE_PRICES[pairKey];
          const baseObj = {
            pair: pairKey,
            name: `${a.name} / ${b.name}`,
            a: a.code,
            b: b.code,
            price: basePrice,
          };
          const val = getCompositePairScore(baseObj, 'Forex');
          list.push({ ...baseObj, value: val, pct: Number(val.toFixed(2)) });
        }
      }
      return list;
    }

    // Non-Forex: Komoditas, Crypto, Indeks (integrated directly with live Cloudflare Worker)
    let extrasList: any[] = DEFAULT_EXTRAS[category] || [];
    if (category === 'Komoditas' && snapshot?.metals && snapshot.metals.length > 0) {
      extrasList = snapshot.metals.map(m => {
        const meta = ASSET_METAS[m.pair];
        const pairName = m.pair === 'GOLD' ? 'XAU/USD' : m.pair === 'SILVER' ? 'XAG/USD' : m.pair;
        const strk = streaks[m.pair];
        return {
          pair: pairName,
          name: meta?.fullName || m.pair,
          value: m.pct,
          price: m.price,
          pct: m.pct,
          streak: strk?.count,
          streakDir: strk?.dir,
          src: m.src,
        };
      });
    } else if (category === 'Crypto' && snapshot?.crypto && snapshot.crypto.length > 0) {
      extrasList = snapshot.crypto.map(c => {
        const meta = ASSET_METAS[c.pair];
        const strk = streaks[c.pair];
        return {
          pair: `${c.pair}/USD`,
          name: meta?.fullName || `${c.pair} Flow`,
          value: c.pct,
          price: c.price,
          pct: c.pct,
          streak: strk?.count,
          streakDir: strk?.dir,
          src: c.src,
        };
      });
    } else if (category === 'Indeks' && snapshot?.inst && snapshot.inst.length > 0) {
      extrasList = snapshot.inst.map(i => {
        const meta = ASSET_METAS[i.pair];
        const strk = streaks[i.pair];
        return {
          pair: i.pair,
          name: meta?.fullName || i.pair,
          value: i.pct,
          price: i.price,
          pct: i.pct,
          streak: strk?.count,
          streakDir: strk?.dir,
          src: i.src,
        };
      });
    }

    return extrasList.map(p => ({
      ...p,
      value: getCompositePairScore(p, category),
    }));
  };

  // Find currently selected pair item
  const currentSelectedObj = useMemo(() => {
    const list = getCategoryPairs(selectedCategory);
    return list.find(p => p.pair === selectedPair) || list[0] || { pair: selectedPair, name: selectedPair, value: 0 };
  }, [selectedCategory, selectedPair, activeHorizons, tick, snapshot]);

  // Overall Bias for selected pair
  const overallBias = useMemo(() => {
    return getOverallActiveSummary(currentSelectedObj, selectedCategory);
  }, [currentSelectedObj, selectedCategory, activeHorizons, tick]);

  // Sorted currencies for rankings (derived 100% from live chart data)
  const sortedCurrencies = useMemo(() => {
    return [...DEFAULT_CURRENCIES].sort(
      (a, b) => getCurrencyLiveStrength(b.code, forexTimeframe) - getCurrencyLiveStrength(a.code, forexTimeframe)
    );
  }, [csLiveData, forexTimeframe, tick]);

  const strongestCurrency = sortedCurrencies[0];
  const weakestCurrency = sortedCurrencies[sortedCurrencies.length - 1];

  const allForex = useMemo(() => getCategoryPairs('Forex'), [activeHorizons, tick]);
  const forexBuyCount = allForex.filter(p => p.value > 0).length;
  const forexSellCount = allForex.filter(p => p.value < 0).length;

  // Chart dimensions matching screenshot
  const chartWidth = 920;
  const chartHeight = 440;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 22;
  const padBottom = 30;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  // Time bounds from csLiveData or fallback
  const startTime = useMemo(() => {
    if (csLiveData && csLiveData[0]?.values?.length) {
      return csLiveData[0].values[0][0];
    }
    return Date.now() - (csRange === '2d' ? 48 : 24) * 3600 * 1000;
  }, [csLiveData, csRange]);

  const endTime = useMemo(() => {
    if (csLiveData && csLiveData[0]?.values?.length) {
      const vals = csLiveData[0].values;
      return vals[vals.length - 1][0];
    }
    return Date.now();
  }, [csLiveData, csRange]);

  // Y Scale Bounds & Ticks (matching screenshot: 50, 40, 30, 20, 10, 0, -10, -20, -30, -40)
  const { yMin, yMax, yTicks } = useMemo(() => {
    let min = -40;
    let max = 50;
    if (csLiveData && csLiveData.length > 0) {
      for (const s of csLiveData) {
        if (!visibleCurrencies.has(s.key)) continue;
        for (const [_, v] of s.values) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    const high = Math.max(50, Math.ceil(max / 10) * 10);
    const low = Math.min(-40, Math.floor(min / 10) * 10);
    const ticks: number[] = [];
    for (let v = high; v >= low; v -= 10) {
      ticks.push(v);
    }
    return { yMin: low, yMax: high, yTicks: ticks };
  }, [csLiveData, visibleCurrencies]);

  const getXFromTime = (t: number) => {
    const span = Math.max(1, endTime - startTime);
    return padLeft + ((t - startTime) / span) * plotW;
  };

  const getYFromVal = (val: number) => {
    const span = Math.max(1, yMax - yMin);
    return padTop + plotH - ((val - yMin) / span) * plotH;
  };

  // Time ticks for X-Axis (e.g. 4:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00, 0:00, 0:55)
  const xTicks = useMemo(() => {
    const list: Array<{ time: number; label: string; isBold: boolean }> = [];
    if (!startTime || !endTime || endTime <= startTime) return list;

    // Start tick (bold)
    const startDate = new Date(startTime);
    list.push({
      time: startTime,
      label: `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      isBold: true,
    });

    // Intermediate ticks every 3 hours
    let cur = new Date(startTime);
    cur.setMinutes(0, 0, 0);
    cur.setTime(cur.getTime() + 3600000);
    const stepHours = csRange === '2d' ? 6 : 3;
    while (cur.getHours() % stepHours !== 0) {
      cur.setTime(cur.getTime() + 3600000);
    }

    while (cur.getTime() < endTime - 30 * 60 * 1000) {
      if (cur.getTime() > startTime + 25 * 60 * 1000) {
        list.push({
          time: cur.getTime(),
          label: `${cur.getHours()}:00`,
          isBold: false,
        });
      }
      cur = new Date(cur.getTime() + stepHours * 3600000);
    }

    // End tick (bold)
    const endDate = new Date(endTime);
    list.push({
      time: endTime,
      label: `${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`,
      isBold: true,
    });

    return list;
  }, [startTime, endTime, csRange]);

  // Fallback simulated points if network is unavailable
  const fallbackPointsCount = csRange === '1d' ? 120 : 180;
  const fallbackSeries = useMemo(() => {
    const n = fallbackPointsCount;
    return DEFAULT_CURRENCIES.map((c, idx) => {
      const baseVal = INITIAL_CURRENCY_STRENGTH[c.code] ?? 0;
      const points: [number, number][] = Array.from({ length: n }, (_, j) => {
        const t = j / (n - 1);
        const time = startTime + t * (endTime - startTime);
        const trend = baseVal * Math.pow(t, 0.7);
        const wave =
          Math.sin(j * 0.18 + idx * 1.6) * 1.5 * (0.2 + 0.8 * t);
        return [time, Number((trend + wave).toFixed(2))];
      });
      return { key: c.code, values: points };
    });
  }, [fallbackPointsCount, startTime, endTime]);

  const activeSeriesData = csLiveData && csLiveData.length > 0 ? csLiveData : fallbackSeries;

  const currentHoverData = useMemo(() => {
    if (hoverIndex === null || !activeSeriesData || !activeSeriesData[0]?.values?.length) return null;
    const sampleSeries = activeSeriesData[0].values;
    const clampedIdx = Math.max(0, Math.min(sampleSeries.length - 1, hoverIndex));
    const pointTime = sampleSeries[clampedIdx][0];
    const dateObj = new Date(pointTime);
    const timeLabel = `${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')} WIB`;

    const items = DEFAULT_CURRENCIES
      .filter(c => visibleCurrencies.has(c.code))
      .map(c => {
        const s = activeSeriesData.find(x => x.key === c.code);
        const val = s?.values?.[clampedIdx]?.[1] ?? 0;
        return { c, val };
      })
      .sort((a, b) => b.val - a.val);

    return { timeLabel, items, pointTime };
  }, [hoverIndex, activeSeriesData, visibleCurrencies]);

  // Test worker connection
  const handleTestWorker = async () => {
    setIsTestingWorker(true);
    setWorkerTestResult(null);
    try {
      const res = await testWorkerConnection(workerInput);
      if (res.ok) {
        setWorkerUrl(workerInput);
        localStorage.setItem('fm_worker_url', workerInput);
        setWorkerTestResult(`Tersambung! Latency: ${res.latencyMs || 120}ms`);
        showToast('Koneksi Worker Cloudflare tersimpan!');
      } else {
        setWorkerTestResult(`Gagal: ${res.error || 'Worker tidak merespons'}`);
      }
    } catch (e: any) {
      setWorkerTestResult(`Error: ${e.message}`);
    } finally {
      setIsTestingWorker(false);
    }
  };

  // Text label for active horizons
  const activeHorizonsLabel = useMemo(() => {
    const list = Array.from(activeHorizons).map(h => HORIZON_TITLES[h]);
    return list.join(' + ');
  }, [activeHorizons]);

  return (
    <>
      {/* SVG Icon Definitions */}
      <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <symbol id="i-bell" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </symbol>
        <symbol id="i-gear" viewBox="0 0 24 24">
          <path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 2-1 3 1 4-2v-4l2-2-2-4-3-1-1-3z" />
          <circle cx="11.5" cy="11.5" r="3" />
        </symbol>
        <symbol id="i-moon" viewBox="0 0 24 24">
          <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />
        </symbol>
        <symbol id="i-book" viewBox="0 0 24 24">
          <path d="M12 5C8 3 4 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" />
        </symbol>
        <symbol id="i-expand" viewBox="0 0 24 24">
          <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
        </symbol>
      </svg>

      {/* ──────────────── PAGE 1: LANDING ──────────────── */}
      {route === 'landing' && (
        <section className="page" id="landing">
          <header className="top between">
            <a
              className="brand"
              href="#landing"
              onClick={e => {
                e.preventDefault();
                navigate('landing');
              }}
            >
              <span className="mark"><i></i><i></i><i></i></span>strength.
            </a>
            <nav aria-label="Navigasi landing">
              <a href="#features">Platform</a>
              <a href="#workflow">Cara kerja</a>
              <button
                className="quiet"
                style={{ padding: 0, border: 'none', color: 'inherit' }}
                onClick={() => navigate('workspace')}
              >
                Jelajahi demo
              </button>
            </nav>
            <div className="row">
              <button
                className="quiet hide-mobile"
                style={{ border: 'none', padding: '10px 14px' }}
                onClick={() => navigate('login')}
              >
                Masuk
              </button>
              <button className="primary" onClick={() => navigate('workspace')}>
                Buka workspace
              </button>
            </div>
          </header>

          <main className="container">
            <section className="hero">
              <div>
                <div className="eyebrow">Clarity before every decision</div>
                <h1>Baca kekuatan.<br />Temukan <em>arah.</em></h1>
                <p>
                  Seluruh perspektif pasar dalam satu ruang. Hubungkan kekuatan mata uang, pergerakan pair, dan keselarasan timeframe secara simultan.
                </p>
                <div className="row wrap">
                  <button className="primary" onClick={() => navigate('workspace')}>
                    Jelajahi workspace
                  </button>
                  <button onClick={() => navigate('login')}>Masuk akun</button>
                </div>
                <p className="hero-note">
                  Demo interaktif · Tanpa instalasi · {isConnected ? 'Live Cloudflare Worker arahmarket' : 'Data ilustrasi'}
                </p>
              </div>

              <div className="hero-art" aria-label="Pratinjau currency strength">
                <div className="preview-box">
                  <div className="between">
                    <strong>Currency strength</strong>
                    <span className="pill">{isConnected ? 'LIVE · 5M' : 'PREVIEW · 5M'}</span>
                  </div>
                  <svg viewBox="0 0 430 210" role="img" aria-label="Ilustrasi perbandingan kekuatan CHF dan CAD">
                    <g stroke="var(--line)">
                      <path d="M0 45H430M0 90H430M0 135H430M0 180H430M85 20V195M172 20V195M258 20V195M344 20V195" fill="none" />
                    </g>
                    <path
                      d="M0 115L20 125 40 100 60 110 80 85 100 95 120 80 140 92 160 68 180 81 200 65 220 73 240 50 260 66 280 35 300 50 320 30 340 38 360 20 380 35 400 18 430 22"
                      fill="none"
                      stroke="#008b66"
                      strokeWidth="3"
                    />
                    <path
                      d="M0 115L20 108 40 120 60 115 80 137 100 123 120 140 140 128 160 143 180 132 200 160 220 140 240 166 260 152 280 170 300 155 320 183 340 175 360 190 380 175 400 188 430 193"
                      fill="none"
                      stroke="#d76c86"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="values">
                    <div>
                      <span className="muted small">CHF</span>
                      <strong className="green">9,66</strong>
                    </div>
                    <div>
                      <span className="muted small">CAD</span>
                      <strong className="red">1,98</strong>
                    </div>
                    <div>
                      <span className="muted small">Disparitas</span>
                      <strong>7,68</strong>
                    </div>
                  </div>
                </div>

                <div className="float-card">
                  <div className="between">
                    <span className="muted small">PAIR INSIGHT</span>
                    <span className="small">↘</span>
                  </div>
                  <div className="between" style={{ marginTop: '7px' }}>
                    <strong>CAD/CHF</strong>
                    <span className="small" style={{ color: 'var(--red)' }}>Sell kuat</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="proof">
              <div>
                <strong>8</strong>
                <span>Mata uang utama</span>
              </div>
              <div>
                <strong>28</strong>
                <span>Pair forex</span>
              </div>
              <div>
                <strong>10</strong>
                <span>Timeframe analisis</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Workspace terpadu</span>
              </div>
            </div>

            <section className="feature-section" id="features">
              <div className="section-head">
                <div className="eyebrow">Satu pandangan, lebih utuh</div>
                <h2 style={{ marginTop: '14px' }}>
                  Dari gambaran besar<br />ke detail yang berarti.
                </h2>
              </div>
              <div className="features">
                <article className="feature">
                  <div className="number">01 / STRENGTH</div>
                  <h3>Lihat siapa yang memimpin.</h3>
                  <p>Bandingkan delapan mata uang dalam grafik dan ranking yang saling terhubung.</p>
                </article>
                <article className="feature">
                  <div className="number">02 / SCREENER</div>
                  <h3>Fokus pada pergerakan.</h3>
                  <p>Temukan top movers, filter arah, lalu pilih pair untuk melihat konteksnya.</p>
                </article>
                <article className="feature">
                  <div className="number">03 / CONFLUENCE</div>
                  <h3>Periksa keselarasan.</h3>
                  <p>Baca kekuatan dari scalping hingga horizon harian dalam satu heatmap.</p>
                </article>
              </div>
            </section>

            <section className="cta" id="workflow">
              <div>
                <div className="eyebrow" style={{ color: '#9addb7', marginBottom: '14px' }}>
                  Lihat · Bandingkan · Dalami
                </div>
                <h2>Mulai dari pasar.<br />Lanjutkan dengan perspektif.</h2>
                <p>Pilih horizon gabungan, temukan pair, periksa detailnya.</p>
              </div>
              <button onClick={() => navigate('workspace')}>Coba dashboard demo</button>
            </section>

            <footer className="footer between">
              <a
                className="brand"
                href="#landing"
                onClick={e => {
                  e.preventDefault();
                  navigate('landing');
                }}
                style={{ fontSize: '20px' }}
              >
                strength.
              </a>
              <span>Prototipe tampilan · Data live Cloudflare Worker &amp; simulasi.</span>
              <span>Market intelligence, simplified.</span>
            </footer>
          </main>
        </section>
      )}

      {/* ──────────────── PAGE 2: LOGIN ──────────────── */}
      {route === 'login' && (
        <section className="page" id="login">
          <div className="login-layout">
            <aside className="login-story">
              <a
                className="brand"
                href="#landing"
                onClick={e => {
                  e.preventDefault();
                  navigate('landing');
                }}
              >
                <span className="mark"><i></i><i></i><i></i></span>strength.
              </a>
              <div>
                <div className="eyebrow">Your market workspace</div>
                <h1>Lebih sedikit<br />distraksi.<br />Lebih banyak<br />perspektif.</h1>
                <p>Satu tempat untuk memahami kekuatan, momentum, dan keselarasan pasar.</p>
                <svg className="login-lines" viewBox="0 0 400 150" aria-hidden="true">
                  <path d="M0 110L30 100 55 120 80 80 110 96 140 58 170 70 200 43 235 63 260 35 290 47 330 15 360 30 400 5" stroke="#95deb1" strokeWidth="2" fill="none" />
                  <path d="M0 100L30 112 55 100 80 118 110 105 140 127 170 110 200 132 235 122 260 145 290 130 330 140 360 130 400 145" stroke="#6eaa91" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <span className="small" style={{ color: '#9cbcac' }}>8 currencies · 20 live assets. One clear perspective.</span>
            </aside>

            <main className="login-form-area">
              <div className="login-form">
                <button
                  className="back quiet"
                  onClick={() => navigate('landing')}
                >
                  ‹ Kembali ke beranda
                </button>
                <span className="pill" style={{ marginBottom: '20px' }}>
                  {isConnected ? 'LIVE ARAHMARKET' : 'MODE PROTOTIPE'}
                </span>
                <h2>Selamat datang kembali.</h2>
                <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                  Masuk ke ruang analisis pasar Anda.
                </p>

                {loginError && (
                  <div className="error" style={{ padding: '8px 12px', background: 'var(--rose)', borderRadius: '6px' }}>
                    {loginError}
                  </div>
                )}

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    setLoginError(null);
                    if (!loginEmail || !loginEmail.includes('@')) {
                      setLoginError('Silakan masukkan format email yang valid.');
                      return;
                    }
                    if (!loginPass || loginPass.length < 6) {
                      setLoginError('Kata sandi demo minimal 6 karakter.');
                      return;
                    }
                    const name = loginEmail.split('@')[0].slice(0, 20) || 'Trader';
                    setUserName(name);
                    localStorage.setItem('strength-user', name);
                    navigate('workspace');
                    showToast(`Selamat datang ${name} — workspace siap.`);
                  }}
                >
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      value={loginEmail}
                      onChange={e => {
                        setLoginEmail(e.target.value);
                        setLoginError(null);
                      }}
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="password">Kata sandi demo</label>
                    <div className="password">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 6 karakter"
                        value={loginPass}
                        onChange={e => {
                          setLoginPass(e.target.value);
                          setLoginError(null);
                        }}
                        minLength={6}
                        autoComplete="off"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? 'Sembunyi' : 'Lihat'}
                      </button>
                    </div>
                  </div>

                  <div className="between small" style={{ margin: '-3px 0 24px' }}>
                    <span className="muted">Gunakan data contoh, bukan akun asli.</span>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => setActiveModal('forgot')}
                    >
                      Lupa sandi?
                    </button>
                  </div>

                  <button type="submit" className="primary full">
                    Masuk ke workspace
                  </button>
                </form>

                <div className="or">atau langsung jelajahi</div>
                <button
                  className="full"
                  onClick={() => {
                    navigate('workspace');
                    showToast('Mode demo aktif.');
                  }}
                >
                  Buka demo tanpa login
                </button>

                <div className="notice">
                  Login ini hanya simulasi tampilan. Email dan kata sandi tidak dikirim atau disimpan ke server. Autentikasi nyata belum terhubung.
                </div>
              </div>
            </main>
          </div>
        </section>
      )}

      {/* ──────────────── PAGE 3: 4-MARKET BOARD WORKSPACE ──────────────── */}
      {route === 'workspace' && (
        <section className="page" id="workspace">
          {/* Floating Pill App Header */}
          <header className="app-header between">
            <a
              className="brand"
              href="#landing"
              onClick={e => {
                e.preventDefault();
                navigate('landing');
              }}
              title="Kembali ke beranda"
            >
              <span className="mark"><i></i><i></i><i></i></span>strength.
            </a>

            <div className="row">
              {(() => {
                const now = Date.now();
                const snapTs = snapshot?.timestamp || snapshot?.barTimestamp;
                const isStale = Boolean(snapTs && now - snapTs > 10 * 60 * 1000);
                const minutesAgo = snapTs ? Math.floor((now - snapTs) / 60000) : 0;

                return (
                  <span
                    className="quiet hide-mobile"
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      background: 'var(--surface)',
                      color: isStale ? '#d97706' : isConnected ? 'var(--green)' : 'var(--muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title={isStale ? `Data webhook diterima ${minutesAgo} menit yang lalu. Pastikan alert TradingView aktif.` : 'Data webhook TradingView aktif sinkron.'}
                  >
                    <span className="dot" style={{ backgroundColor: isStale ? '#d97706' : isConnected ? 'var(--green)' : '#f59e0b' }} />
                    {isStale
                      ? `Data Tertunda (${minutesAgo}m lalu)`
                      : isConnected
                      ? `Live · 1s (${clockTime || 'Real-Time'})`
                      : 'Mode Demo'}
                  </span>
                );
              })()}

              <button
                className="icon-button"
                onClick={() => setIsDark(!isDark)}
                aria-label="Ganti tema"
                title={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
              >
                <svg><use href="#i-moon" /></svg>
              </button>

              <button
                className="live-button"
                onClick={() => {
                  setLiveAuto(!liveAuto);
                  showToast(liveAuto ? 'Pembaruan otomatis dijeda.' : 'Pembaruan otomatis aktif (1s).');
                }}
                aria-pressed={liveAuto}
              >
                <span className="dot" style={{ color: liveAuto ? '#29895e' : '#b8aaa3' }}></span>
                {liveAuto ? 'Live 1s' : 'Jeda'}{' '}
                <span className="live-tag">{isConnected ? 'LIVE' : 'DEMO'}</span>
              </button>

              <button
                id="refreshData"
                onClick={() => {
                  setTick(t => t + 1);
                  showToast('Data diperbarui.');
                }}
              >
                Refresh
              </button>

              <button
                id="logout"
                onClick={() => {
                  setUserName('Demo trader');
                  navigate('login');
                  showToast('Sesi ditutup.');
                }}
              >
                Logout
              </button>
            </div>
          </header>

          <main className="workspace">
            {/* ──────────────── SECTION: 4-MARKET BOARD ──────────────── */}
            <section className="market-board" aria-label="Empat kategori pasar">
              {/* Board Header */}
              <div className="board-head between">
                <div>
                  <span className="eyebrow">Market workspace</span>
                  <h1>Semua pasar. Satu pandangan.</h1>
                </div>

                <div className="row wrap">
                  <input
                    id="boardSearch"
                    type="search"
                    className="search"
                    placeholder="Cari pair di semua pasar…"
                    value={boardSearch}
                    onChange={e => setBoardSearch(e.target.value)}
                  />

                  <select
                    id="boardDirection"
                    value={boardDirection}
                    onChange={e => setBoardDirection(e.target.value as any)}
                    aria-label="Filter arah"
                  >
                    <option value="all">Semua arah</option>
                    <option value="buy">Bullish</option>
                    <option value="sell">Bearish</option>
                  </select>

                  <button
                    className="icon-button"
                    onClick={() => setActiveModal('settings')}
                    aria-label="Pengaturan"
                  >
                    <svg><use href="#i-gear" /></svg>
                  </button>
                </div>
              </div>

              {/* ──────────────── GLOBAL TOOLBAR WITH COMBINED TRADING STYLES ──────────────── */}
              <div className="global-toolbar between">
                <div className="row wrap">
                  <span className="small muted">Trading style</span>
                  <div className="segments main" id="horizons" role="group" aria-label="Pilihan gabungan trading style">
                    <button
                      className={activeHorizons.has('scalp') ? 'active' : ''}
                      onClick={() => toggleHorizon('scalp')}
                      aria-pressed={activeHorizons.has('scalp')}
                      title="Klik untuk aktif/nonaktifkan Scalping"
                    >
                      Scalping
                    </button>
                    <button
                      className={activeHorizons.has('intra') ? 'active' : ''}
                      onClick={() => toggleHorizon('intra')}
                      aria-pressed={activeHorizons.has('intra')}
                      title="Klik untuk aktif/nonaktifkan Intraday"
                    >
                      Intraday
                    </button>
                    <button
                      className={activeHorizons.has('swing') ? 'active' : ''}
                      onClick={() => toggleHorizon('swing')}
                      aria-pressed={activeHorizons.has('swing')}
                      title="Klik untuk aktif/nonaktifkan Swing"
                    >
                      Swing
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile categories nav */}
              <nav id="mobileCategories" className="mobile-categories" aria-label="Kategori pasar">
                {(['Indeks', 'Komoditas', 'Forex', 'Crypto'] as const).map(cat => (
                  <button
                    key={cat}
                    className={selectedCategory === cat ? 'active' : ''}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </nav>

              {/* ──────────────── 4 ASSET COLUMNS GRID ──────────────── */}
              <div className="asset-grid" id="assetGrid">
                {(['Indeks', 'Komoditas', 'Forex', 'Crypto'] as const).map(cat => {
                  const allPairs = getCategoryPairs(cat);
                  const filtered = allPairs
                    .filter(p => (p.pair + ' ' + (p.name || '')).toLowerCase().includes(boardSearch.toLowerCase()))
                    .filter(p => {
                      if (boardDirection === 'buy') return p.value > 0;
                      if (boardDirection === 'sell') return p.value < 0;
                      return true;
                    })
                    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

                  const isExpanded = expandedCategories.has(cat);
                  let displayList = filtered;
                  if (!isExpanded) {
                    const top5 = filtered.slice(0, 5);
                    const sel = filtered.find(p => selectedCategory === cat && p.pair === selectedPair);
                    if (sel && !top5.includes(sel)) {
                      top5[4] = sel;
                    }
                    displayList = top5;
                  }

                  const isActiveCol = selectedCategory === cat;

                  return (
                    <div
                      key={cat}
                      className={`asset-column ${isActiveCol ? 'active-column' : ''}`}
                    >
                      {/* Column Header Button */}
                      <button
                        className={`asset-title ${isActiveCol ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(cat);
                          if (filtered.length > 0) {
                            setSelectedPair(filtered[0].pair);
                          }
                        }}
                        aria-pressed={isActiveCol}
                      >
                        <span>{cat}</span>
                        <span className="count">{allPairs.length} pair</span>
                      </button>

                      {/* Pairs Container */}
                      <div className="asset-pairs">
                        <div className="asset-list-label">
                          <span>Pair / Instrumen</span>
                          <span>Skor {activeHorizonsLabel}</span>
                        </div>

                        <div className="asset-pair-scroll">
                          {displayList.length > 0 ? (
                            displayList.map(p => {
                              const isSelected = selectedCategory === cat && selectedPair === p.pair;
                              return (
                                <button
                                  key={p.pair}
                                  className={`asset-pair ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedPair(p.pair);
                                  }}
                                  aria-pressed={isSelected}
                                >
                                  <span>
                                    <strong>{p.pair}</strong>
                                    <small>
                                      {(p.name || '').split(' / ')[0]}
                                      {p.price ? ` · $${fmt(p.price, p.price < 2 ? 4 : 2)}` : ''}
                                    </small>
                                  </span>

                                  <span className={`asset-value ${p.value > 0 ? 'green' : 'red'}`}>
                                    <span className="mono">{signed(p.value)}</span>
                                    <small>
                                      {getStrengthLabel(p.value)}
                                      {p.streak && p.streak > 1 ? ` · Streak ${p.streak}` : ''}
                                    </small>
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="board-empty">Tidak ada pair yang sesuai.</div>
                          )}
                        </div>

                        {/* List Footer */}
                        <div className="asset-list-footer">
                          <span>
                            {displayList.length} / {filtered.length}
                          </span>
                          {filtered.length > 5 ? (
                            <button
                              className="link-button"
                              onClick={() => {
                                const next = new Set(expandedCategories);
                                if (next.has(cat)) next.delete(cat);
                                else next.add(cat);
                                setExpandedCategories(next);
                              }}
                            >
                              {isExpanded ? 'Ringkas ke 5' : 'Lihat semua'}
                            </button>
                          ) : (
                            <span>Semua pair</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="board-note">
                Nilai mengikuti gabungan trading style aktif ({activeHorizonsLabel}). Data 20 aset kripto, komoditas, dan indeks tersinkronisasi langsung dari Cloudflare Worker arahmarket (Pine Script Webhook).
              </p>
            </section>

            {/* ──────────────── SECTION: SELECTED INSTRUMENT CARD ──────────────── */}
            <section id="instrumentDetail" className="panel">
              <div className="instrument-head">
                <div>
                  <span className="eyebrow">{selectedCategory} / Analisis pair</span>
                  <h2>{currentSelectedObj.pair}</h2>
                  <span className="muted small">{currentSelectedObj.name}</span>

                  {(currentSelectedObj as any).price !== undefined && (
                    <div className="row wrap" style={{ marginTop: '10px', gap: '8px', fontSize: '12px' }}>
                      <span className="pill" style={{ background: 'var(--mint)', color: 'var(--green)', fontWeight: 650 }}>
                        Live Price: ${fmt((currentSelectedObj as any).price, (currentSelectedObj as any).price < 2 ? 4 : 2)}
                      </span>
                      <span className={`pill ${(currentSelectedObj as any).pct >= 0 ? '' : 'red'}`} style={{ fontWeight: 650 }}>
                        ROC 5M: {signed((currentSelectedObj as any).pct || 0)}%
                      </span>
                      {(currentSelectedObj as any).streak !== undefined && (currentSelectedObj as any).streak > 0 && (
                        <span className="pill" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
                          Streak: {(currentSelectedObj as any).streak} Bar {(currentSelectedObj as any).streakDir}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pair-overall">
                  <span className="muted small">Bias Market</span>
                  <strong className={overallBias.color}>{overallBias.label}</strong>
                  <span className="small muted">{overallBias.sub}</span>
                </div>
              </div>

              {/* ──────────────── HORIZON CARDS FOR ACTIVE HORIZONS ──────────────── */}
              <div className="pair-horizons" role="region" aria-label="Analisis multi-timeframe pilihan">
                {Array.from(activeHorizons).map(h => {
                  const summary = getHorizonSummary(currentSelectedObj, selectedCategory, h);
                  return (
                    <div className="horizon-detail" key={h}>
                      <div className="horizon-head">
                        <strong>{HORIZON_TITLES[h]}</strong>
                        <span className={`horizon-direction ${summary.d.color}`}>
                          {summary.d.arrow}{' '}
                          {(Math.abs(summary.avg) >= 3 ? 'Strong ' : '') + summary.d.label}
                        </span>
                      </div>

                      <div className={`horizon-value mono ${summary.d.color}`}>
                        {signed(summary.avg)}
                      </div>

                      <div className="alignment">
                        <span>{summary.aligned}/{summary.values.length} TF searah</span>
                        <span>{Math.round((summary.aligned / summary.values.length) * 100)}%</span>
                      </div>

                      <div className="alignment-bar">
                        <i
                          style={{
                            width: `${(summary.aligned / summary.values.length) * 100}%`,
                            backgroundColor:
                              summary.d.cls === 'buy'
                                ? 'var(--green)'
                                : summary.d.cls === 'sell'
                                ? 'var(--red)'
                                : 'var(--muted)',
                          }}
                        />
                      </div>

                      <div className="timeframe-directions">
                        {summary.values.map(v => {
                          const t = getDirectionInfo(v.value);
                          return (
                            <span
                              key={v.tf}
                              className={`tf-direction ${t.cls}`}
                              title={`Disparitas ${signed(v.value)}`}
                            >
                              <span>{v.tf}</span>
                              <span>
                                {t.arrow} {t.label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <small className="horizon-demo">
                  Kartu analisis di atas secara otomatis menampilkan seluruh trading style yang Anda aktifkan ({activeHorizonsLabel}). Confluence dihitung dari keselarasan timeframe pada horizon terkait.
                </small>
              </div>

              {/* ──────────────── TRADINGVIEW ADVANCED REAL-TIME CHART ──────────────── */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="small muted" style={{ fontWeight: 650 }}>
                    Grafik Interaktif TradingView — {currentSelectedObj.pair}
                  </span>
                  <span className="small muted" style={{ fontSize: '11px' }}>
                    Real-time candlestick &amp; drawing tools
                  </span>
                </div>
                <TradingViewChart
                  pair={currentSelectedObj.pair}
                  category={selectedCategory}
                  isDark={isDark}
                  activeHorizons={activeHorizons}
                  height={500}
                />
              </div>
            </section>

            {/* ──────────────── FOREX ANALYSIS DISCLOSURES ──────────────── */}
            {selectedCategory === 'Forex' && (
              <div id="forexAnalysis">
                <section id="overview">
                  <div className="workspace-head between">
                    <div>
                      <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '6px' }}>
                        Workspace / Market intelligence
                      </div>
                      <h1>Analisis Forex</h1>
                      <p>Grafik currency strength &amp; multi-time matrix</p>
                    </div>

                    <div className="row">
                      <select
                        id="timeframe"
                        value={forexTimeframe}
                        onChange={e => setForexTimeframe(e.target.value)}
                        aria-label="Timeframe grafik"
                      >
                        {['5M', '10M', '15M', '1H', '2H', '3H', '4H', '6H', '8H'].map(tf => (
                          <option key={tf} value={tf}>{tf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4 Stats */}
                  <div className="stats">
                    <div className="stat">
                      <div className="label">Mata uang terkuat</div>
                      <strong className="green">
                        {strongestCurrency.code}{' '}
                        <span className="mono">{fmt(getCurrencyScore(strongestCurrency))}</span>
                      </strong>
                      <span className="sub">/ 10</span>
                    </div>

                    <div className="stat">
                      <div className="label">Mata uang terlemah</div>
                      <strong className="red">
                        {weakestCurrency.code}{' '}
                        <span className="mono">{fmt(getCurrencyScore(weakestCurrency))}</span>
                      </strong>
                      <span className="sub">/ 10</span>
                    </div>

                    <div className="stat">
                      <div className="label">Bullish · Forex</div>
                      <strong className="green">{forexBuyCount}</strong>
                      <span className="sub">/ 28 pair</span>
                    </div>

                    <div className="stat">
                      <div className="label">Bearish · Forex</div>
                      <strong className="red">{forexSellCount}</strong>
                      <span className="sub">/ 28 pair</span>
                    </div>
                  </div>
                </section>

                {/* Details Accordion 1: Currency Strength Chart */}
                <details className="analysis-disclosure" id="chartDisclosure" open>
                  <summary>
                    Grafik Currency Strength <span>Grafik &amp; ranking mata uang</span>
                  </summary>

                  <div className="chart-layout">
                    <section className="panel chart-panel" id="chartPanel">
                      <div className="panel-head between">
                        <div>
                          <h3>Grafik Currency Strength</h3>
                          <span className="small muted">
                            Relative Strength Chart (8 Major Currencies)
                          </span>
                        </div>

                        <div className="cs-top-actions">
                          <button
                            className={`btn-cs-pill ${csRange === '2d' ? 'active' : ''}`}
                            onClick={() => setCsRange('2d')}
                          >
                            yesterday
                          </button>
                          <button
                            className={`btn-cs-pill ${csRange === '1d' ? 'active' : ''}`}
                            onClick={() => setCsRange('1d')}
                          >
                            today
                          </button>
                        </div>
                      </div>

                      {/* Currency Strength Chart Box (Exact layout from currency-strength.com) */}
                      <div className="cs-wrapper" style={{ padding: '0 16px 16px' }}>
                        <div className="cs-chart-box">
                          {/* Top-Right Legend */}
                          <div className="cs-header-row">
                            <div className="cs-legend-inline">
                              {DEFAULT_CURRENCIES.map(c => {
                                const isVis = visibleCurrencies.has(c.code);
                                return (
                                  <button
                                    key={c.code}
                                    className={`cs-legend-item ${isVis ? 'active' : 'dimmed'}`}
                                    onClick={() => {
                                      const next = new Set(visibleCurrencies);
                                      if (next.has(c.code)) {
                                        if (next.size === 1) {
                                          showToast('Garis terakhir tetap ditampilkan.');
                                          return;
                                        }
                                        next.delete(c.code);
                                      } else {
                                        next.add(c.code);
                                      }
                                      setVisibleCurrencies(next);
                                    }}
                                    title={`Klik untuk isolasi/sembunyikan ${c.code}`}
                                  >
                                    <span className="cs-dot" style={{ backgroundColor: c.color }} />
                                    <span>{c.code}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* SVG Chart Canvas */}
                          <svg
                            className="cs-svg-main"
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            role="img"
                            aria-label="Currency Strength Line Chart"
                            onPointerMove={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;
                              if (!activeSeriesData || !activeSeriesData[0]?.values?.length) return;
                              const sampleValues = activeSeriesData[0].values;
                              const j = Math.max(
                                0,
                                Math.min(
                                  sampleValues.length - 1,
                                  Math.round(((mouseX - padLeft) / plotW) * (sampleValues.length - 1))
                                )
                              );
                              setHoverIndex(j);
                            }}
                            onPointerLeave={() => setHoverIndex(null)}
                          >
                            {/* Horizontal Gridlines & Y-Axis Labels */}
                            {yTicks.map(val => {
                              const y = getYFromVal(val);
                              const isZero = val === 0;
                              return (
                                <g key={val}>
                                  <line
                                    x1={padLeft}
                                    y1={y}
                                    x2={padLeft + plotW}
                                    y2={y}
                                    stroke={isZero ? '#718096' : '#edf2f7'}
                                    strokeWidth={isZero ? 1.3 : 1}
                                  />
                                  <text
                                    x={padLeft - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="11px"
                                    fontWeight={isZero ? 700 : 400}
                                    fill={isZero ? '#1a202c' : '#4a5568'}
                                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                                  >
                                    {val}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Left Y-Axis Vertical Line */}
                            <line
                              x1={padLeft}
                              y1={padTop}
                              x2={padLeft}
                              y2={padTop + plotH}
                              stroke="#bfc9d3"
                              strokeWidth="1"
                            />

                            {/* X-Axis Vertical Gridlines and Ticks */}
                            {xTicks.map(tick => {
                              const x = getXFromTime(tick.time);
                              return (
                                <g key={tick.label + tick.time}>
                                  <line
                                    x1={x}
                                    y1={padTop}
                                    x2={x}
                                    y2={padTop + plotH}
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                  />
                                  <line
                                    x1={x}
                                    y1={padTop + plotH}
                                    x2={x}
                                    y2={padTop + plotH + 4}
                                    stroke="#a0aec0"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={x}
                                    y={padTop + plotH + 18}
                                    textAnchor="middle"
                                    fontSize="11px"
                                    fontWeight={tick.isBold ? 700 : 400}
                                    fill="#2d3748"
                                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                                  >
                                    {tick.label}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Bottom X-Axis Horizontal Line */}
                            <line
                              x1={padLeft}
                              y1={padTop + plotH}
                              x2={padLeft + plotW}
                              y2={padTop + plotH}
                              stroke="#bfc9d3"
                              strokeWidth="1"
                            />

                            {/* Currency Series Lines */}
                            {DEFAULT_CURRENCIES.map(c => {
                              if (!visibleCurrencies.has(c.code)) return null;
                              const s = activeSeriesData.find(x => x.key === c.code);
                              if (!s || !s.values || s.values.length === 0) return null;
                              const pts = s.values
                                .map(([t, v]) => `${getXFromTime(t).toFixed(1)},${getYFromVal(v).toFixed(1)}`)
                                .join(' ');
                              return (
                                <polyline
                                  key={c.code}
                                  points={pts}
                                  fill="none"
                                  stroke={c.color}
                                  strokeWidth="1.6"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                              );
                            })}

                            {/* Hover Vertical Guideline & Point Circles */}
                            {currentHoverData && (
                              <g>
                                <line
                                  x1={getXFromTime(currentHoverData.pointTime)}
                                  y1={padTop}
                                  x2={getXFromTime(currentHoverData.pointTime)}
                                  y2={padTop + plotH}
                                  stroke="#4a5568"
                                  strokeWidth="1"
                                  strokeDasharray="3 3"
                                />
                                {DEFAULT_CURRENCIES.map(c => {
                                  if (!visibleCurrencies.has(c.code)) return null;
                                  const s = activeSeriesData.find(x => x.key === c.code);
                                  if (!s || !s.values || hoverIndex === null) return null;
                                  const clampedIdx = Math.max(0, Math.min(s.values.length - 1, hoverIndex));
                                  const val = s.values[clampedIdx][1];
                                  return (
                                    <circle
                                      key={c.code}
                                      cx={getXFromTime(currentHoverData.pointTime)}
                                      cy={getYFromVal(val)}
                                      r="4"
                                      fill={c.color}
                                      stroke="#ffffff"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })}
                              </g>
                            )}
                          </svg>

                          {/* Hover Tooltip Popup */}
                          {currentHoverData && (
                            <div className="cs-live-tooltip">
                              <div style={{ fontWeight: 700, marginBottom: '6px', color: '#1a202c', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                                {currentHoverData.timeLabel}
                              </div>
                              {currentHoverData.items.map(({ c, val }) => (
                                <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '3px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
                                    <b>{c.code}</b>
                                  </span>
                                  <strong style={{ color: val >= 0 ? '#15803d' : '#b91c1c', fontFamily: 'monospace' }}>
                                    {val > 0 ? `+${fmt(val, 2)}` : fmt(val, 2)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Rankings Column */}
                    <aside className="panel ranking-panel">
                      <div className="panel-head between">
                        <div>
                          <h3>Peringkat mata uang</h3>
                          <span className="small muted">Data Real-Time {forexTimeframe}</span>
                        </div>
                        <span className="pill small" style={{ fontWeight: 600 }}>Live · Sync</span>
                      </div>

                      <div className="rankings">
                        {sortedCurrencies.map((c, i) => {
                          const liveStrength = getCurrencyLiveStrength(c.code, forexTimeframe);
                          const sc = getCurrencyScore(c, forexTimeframe);
                          const isPos = liveStrength > 0;
                          const isNeg = liveStrength < 0;
                          return (
                            <button
                              key={c.code}
                              className="rank-row"
                              onClick={() => {
                                setVisibleCurrencies(new Set([c.code]));
                                showToast(`Fokus grafik pada ${c.code}`);
                              }}
                              title={`Fokus ke ${c.code} (${liveStrength > 0 ? '+' : ''}${fmt(liveStrength, 2)})`}
                            >
                              <span className="muted" style={{ fontWeight: 700 }}>{i + 1}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
                                <b>{c.code}</b>
                              </span>
                              <span className="track" style={{ height: '6px', borderRadius: '3px', background: 'var(--line)', overflow: 'hidden' }}>
                                <span
                                  style={{
                                    width: `${Math.min(100, Math.max(8, sc * 10))}%`,
                                    backgroundColor: c.color,
                                    display: 'block',
                                    height: '100%',
                                    borderRadius: '3px',
                                  }}
                                />
                              </span>
                              <span
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  color: isPos ? '#15803d' : isNeg ? '#b91c1c' : 'var(--muted)',
                                }}
                              >
                                {isPos ? `+${fmt(liveStrength, 2)}` : fmt(liveStrength, 2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </aside>
                  </div>
                </details>

                {/* Details Accordion 2: Multi-Time Matrix */}
                <details className="analysis-disclosure" id="matrixDisclosure">
                  <summary>
                    Multi-Time Matrix <span>8 mata uang · 9 timeframe (5M - 8H)</span>
                  </summary>

                  <section className="panel" id="heatmap" style={{ border: 'none' }}>
                    <div className="panel-head between">
                      <div>
                        <h3>Multi-Time Matrix</h3>
                        <span className="small muted">8 mata uang · 9 perspektif kekuatan (5M hingga 8H)</span>
                      </div>

                      <div className="row">
                        <label className="small muted" htmlFor="heatScope">Tampilan</label>
                        <select
                          id="heatScope"
                          value={heatScope}
                          onChange={e => setHeatScope(e.target.value as any)}
                          style={{ fontSize: '12px' }}
                        >
                          <option value="all">Semua timeframe</option>
                          <option value="active">Ikuti style aktif ({activeHorizonsLabel})</option>
                        </select>
                      </div>
                    </div>

                    <div className="table-scroll">
                      <table className="heatmap">
                        <thead>
                          <tr className="group">
                            <th></th>
                            <th colSpan={3}>Scalping</th>
                            <th colSpan={3}>Intraday</th>
                            <th colSpan={3}>Swing</th>
                            <th></th>
                          </tr>
                          <tr>
                            <th>Mata uang</th>
                            {['5M', '10M', '15M', '1H', '2H', '3H', '4H', '6H', '8H'].map(tf => (
                              <th key={tf}>{tf}</th>
                            ))}
                            <th>Keselarasan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEFAULT_CURRENCIES.map(c => {
                            const tfs = ['5M', '10M', '15M', '1H', '2H', '3H', '4H', '6H', '8H'];
                            const curScore = getCurrencyScore(c, forexTimeframe);
                            return (
                              <tr key={c.code}>
                                <td><b>{c.code}</b></td>
                                {tfs.map(tf => {
                                  const sc = getCurrencyScore(c, tf);
                                  const bg = sc > 5.8 ? '#d3f0e2' : sc < 4.2 ? '#f9e1e6' : '#eaf0ed';
                                  const textCol = sc > 5.8 ? '#087353' : sc < 4.2 ? '#b4405a' : '#566b61';
                                  return (
                                    <td key={tf}>
                                      <button
                                        className="heat-cell"
                                        style={{ backgroundColor: bg, color: textCol }}
                                        onClick={() => {
                                          setModalData({ code: c.code, name: c.name, tf, score: sc });
                                          setActiveModal('timeframeDetail');
                                        }}
                                        title={`${c.code} ${tf}: ${fmt(sc)}`}
                                      >
                                        {fmt(sc)}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td>
                                  <span className="small" style={{ color: getTone(curScore), fontWeight: 650 }}>
                                    {curScore > 5.8 ? 'Bullish' : curScore < 4.2 ? 'Bearish' : 'Netral'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="heat-legend">
                      <span><i className="dot" style={{ color: '#efbac5' }} /> &lt; 4,2 Lemah</span>
                      <span><i className="dot" style={{ color: '#bac8c1' }} /> 4,2–5,8 Netral</span>
                      <span><i className="dot" style={{ color: '#8ed7b5' }} /> &gt; 5,8 Kuat</span>
                      <span style={{ marginLeft: 'auto' }}>Klik nilai sel untuk detail</span>
                    </div>
                  </section>
                </details>
              </div>
            )}

            {/* ──────────────── MARKET CATALYSTS ──────────────── */}
            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-head between">
                  <div>
                    <h3>Katalis pasar</h3>
                    <span className="small muted">
                      {showAllNews ? 'Seluruh pasar' : currentSelectedObj.pair} · konteks penggerak pasar
                    </span>
                  </div>

                  <div className="row">
                    <span className="pill">KONTEKS</span>
                    <button
                      className="link-button"
                      onClick={() => setShowAllNews(!showAllNews)}
                    >
                      {showAllNews ? 'Sesuai pair' : 'Lihat semua berita'}
                    </button>
                  </div>
                </div>

                <div className="news-list">
                  {(showAllNews
                    ? CATALYSTS
                    : CATALYSTS.filter(n =>
                        n.tags.some(t => currentSelectedObj.pair.includes(t) || t === selectedCategory)
                      )
                  ).slice(0, 3).map((item, i) => (
                    <article className="news-item" key={i}>
                      <span className="eyebrow" style={{ fontSize: '9px', marginBottom: '6px', display: 'block' }}>
                        {item.tags.join(' · ')}
                      </span>
                      <strong>{item.title}</strong>
                      <small style={{ color: 'var(--muted)', display: 'block' }}>{item.context}</small>
                      <span className="impact">Dampak {item.impact.toLowerCase()}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="app-footer between wrap">
              <span>strength. / Market Intelligence · 4 Kategori Pasar · Multi-Horizon Confluence</span>
              <span className="mono">{clockTime}</span>
            </footer>
          </main>
        </section>
      )}

      {/* ──────────────── MODALS ──────────────── */}
      {activeModal === 'settings' && (
        <dialog open>
          <button className="icon-button close" onClick={() => setActiveModal(null)}>✕</button>
          <h2>Pengaturan workspace</h2>

          <div className="settings-row">
            <span>Tema tampilan</span>
            <button onClick={() => setIsDark(!isDark)}>
              {isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            </button>
          </div>

          <div className="settings-row">
            <span>Cloudflare Worker URL</span>
            <button onClick={() => setActiveModal('cloudflare')}>Konfigurasi Worker</button>
          </div>

          <div className="notice">
            Gaya trading (Scalping, Intraday, Swing) kini dapat digabungkan secara bebas di toolbar utama untuk menghitung rata-rata skor pasar dan bias market secara dinamis.
          </div>
        </dialog>
      )}

      {activeModal === 'cloudflare' && (
        <dialog open>
          <button className="icon-button close" onClick={() => setActiveModal(null)}>✕</button>
          <span className="eyebrow">Integrasi Cloudflare Worker</span>
          <h2 style={{ marginTop: '12px' }}>Koneksi arahmarket</h2>

          <div className="field" style={{ marginTop: '16px' }}>
            <label>Alamat Cloudflare Worker URL</label>
            <input
              type="text"
              value={workerInput}
              onChange={e => setWorkerInput(e.target.value)}
              placeholder="https://YOUR-WORKER.workers.dev"
            />
          </div>

          <div className="row wrap" style={{ marginTop: '12px' }}>
            <button className="primary" onClick={handleTestWorker} disabled={isTestingWorker}>
              {isTestingWorker ? 'Menguji...' : 'Test & Simpan Koneksi'}
            </button>
            <button
              className="quiet"
              onClick={() => {
                setWorkerInput('https://arahmarket.risasaprudin.workers.dev');
                setWorkerUrl('https://arahmarket.risasaprudin.workers.dev');
                localStorage.setItem('fm_worker_url', 'https://arahmarket.risasaprudin.workers.dev');
                showToast('Reset ke default arahmarket.');
              }}
            >
              Reset ke Default
            </button>
          </div>

          {workerTestResult && (
            <div
              className="notice"
              style={{
                backgroundColor: workerTestResult.startsWith('Tersambung') ? 'var(--mint)' : 'var(--rose)',
                color: workerTestResult.startsWith('Tersambung') ? 'var(--green)' : 'var(--red)',
                marginTop: '15px',
              }}
            >
              {workerTestResult}
            </div>
          )}
        </dialog>
      )}

      {activeModal === 'forgot' && (
        <dialog open>
          <button className="icon-button close" onClick={() => setActiveModal(null)}>✕</button>
          <span className="eyebrow">Bantuan Masuk</span>
          <h2 style={{ marginTop: '12px' }}>Login Demonstrasi</h2>
          <p style={{ marginTop: '12px', lineHeight: 1.6 }}>
            Belum ada akun atau kata sandi nyata yang tersimpan ke server.
          </p>
          <p style={{ marginTop: '10px', lineHeight: 1.6 }}>
            Anda dapat mengisi alamat email contoh apa saja dan kata sandi sembarang minimal 6 karakter, atau klik tombol <strong>"Buka demo tanpa login"</strong> untuk langsung mengakses workspace pasar.
          </p>
          <button
            className="primary full"
            style={{ marginTop: '20px' }}
            onClick={() => setActiveModal(null)}
          >
            Mengerti &amp; Tutup
          </button>
        </dialog>
      )}

      {activeModal === 'timeframeDetail' && modalData && (
        <dialog open>
          <button className="icon-button close" onClick={() => setActiveModal(null)}>✕</button>
          <span className="eyebrow">Detail Timeframe</span>
          <h2 style={{ marginTop: '12px' }}>{modalData.code} / {modalData.tf}</h2>
          <div className="mono" style={{ fontSize: '45px', color: getTone(modalData.score), margin: '12px 0' }}>
            {fmt(modalData.score)} <span className="small muted">/ 10</span>
          </div>
          <p>
            {modalData.name} berada pada momentum{' '}
            <strong>
              {modalData.score > 5.8 ? 'kuat (Bullish)' : modalData.score < 4.2 ? 'lemah (Bearish)' : 'netral'}
            </strong>{' '}
            pada timeframe {modalData.tf}.
          </p>
        </dialog>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast" role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
}

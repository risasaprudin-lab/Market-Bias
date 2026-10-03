import {
  CurrencyCode,
  CurrencyConfig,
  CurrencyStrengthScore,
  MarketSession,
  PairOpportunity,
  PairRate,
  StrengthSnapshot,
  TimeframeKey,
} from '../types/forex';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    country: 'United States',
    flag: '🇺🇸',
    color: '#f59e0b', // Amber
    symbol: '$',
    baseWeight: 1.0,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    country: 'Eurozone',
    flag: '🇪🇺',
    color: '#ef4444', // Red
    symbol: '€',
    baseWeight: 1.0,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    country: 'United Kingdom',
    flag: '🇬🇧',
    color: '#10b981', // Emerald
    symbol: '£',
    baseWeight: 0.95,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    country: 'Japan',
    flag: '🇯🇵',
    color: '#06b6d4', // Cyan
    symbol: '¥',
    baseWeight: 0.9,
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    country: 'Switzerland',
    flag: '🇨🇭',
    color: '#8b5cf6', // Purple
    symbol: 'Fr',
    baseWeight: 0.85,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    country: 'Australia',
    flag: '🇦🇺',
    color: '#3b82f6', // Blue
    symbol: 'A$',
    baseWeight: 0.85,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    country: 'Canada',
    flag: '🇨🇦',
    color: '#ec4899', // Pink
    symbol: 'C$',
    baseWeight: 0.85,
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    country: 'New Zealand',
    flag: '🇳🇿',
    color: '#14b8a6', // Teal
    symbol: 'NZ$',
    baseWeight: 0.8,
  },
};

export const MAJOR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
  'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD',
  'CADJPY', 'CADCHF', 'CHFJPY', 'NZDJPY', 'NZDCAD', 'NZDCHF',
];

export async function fetchLiveCurrencyStrength(is2d: boolean = false): Promise<{
  source: string;
  data: any;
}> {
  const url = `/api/currency-strength-live${is2d ? '?range=2d' : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch currency strength: HTTP ${res.status}`);
  }
  return await res.json();
}

export function parseCurrencyStrengthData(rawJson: any): {
  currentScores: Record<CurrencyCode, number>;
  history: StrengthSnapshot[];
} {
  const defaultScores: Record<CurrencyCode, number> = {
    USD: 5.0, EUR: 5.0, GBP: 5.0, JPY: 5.0,
    CHF: 5.0, AUD: 5.0, CAD: 5.0, NZD: 5.0,
  };

  if (!rawJson || !Array.isArray(rawJson)) {
    return { currentScores: defaultScores, history: [] };
  }

  const currentScores: Record<CurrencyCode, number> = { ...defaultScores };
  const dataList = rawJson as Array<{ key: CurrencyCode; values: [number, number][] }>;

  dataList.forEach((item) => {
    const code = item.key as CurrencyCode;
    if (item.values && item.values.length > 0) {
      const lastVal = item.values[item.values.length - 1][1];
      // Map relative divergence (-35..+35) to 0.50..9.80 scale with 5.0 as baseline
      const mappedScore = Math.max(0.5, Math.min(9.8, Number((5.0 + lastVal / 7.0).toFixed(2))));
      currentScores[code] = mappedScore;
    }
  });

  const firstSeries = dataList[0]?.values || [];
  const history: StrengthSnapshot[] = firstSeries.slice(-40).map(([ts], idx) => {
    const timeString = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const scores: Record<CurrencyCode, number> = { ...defaultScores };

    dataList.forEach((item) => {
      const code = item.key as CurrencyCode;
      const valuesSlice = item.values.slice(-40);
      const val = valuesSlice[idx] ? valuesSlice[idx][1] : 0;
      scores[code] = Math.max(0.5, Math.min(9.8, Number((5.0 + val / 7.0).toFixed(2))));
    });

    return {
      timestamp: ts,
      timeString,
      scores,
    };
  });

  return { currentScores, history };
}

export function calculateSortedScores(
  scores: Record<CurrencyCode, number>,
  prevScores?: Record<CurrencyCode, number>
): CurrencyStrengthScore[] {
  const list: CurrencyStrengthScore[] = (Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
    const score = Number((scores[code] ?? 5.0).toFixed(2));
    const previousScore = prevScores ? Number((prevScores[code] ?? score).toFixed(2)) : undefined;
    const delta = previousScore !== undefined ? Number((score - previousScore).toFixed(2)) : 0;
    return { currency: code, score, previousScore, delta };
  });

  list.sort((a, b) => b.score - a.score);
  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}

export function findPairOpportunities(
  scores: Record<CurrencyCode, number>
): PairOpportunity[] {
  const opps: PairOpportunity[] = [];

  MAJOR_PAIRS.forEach((pair) => {
    const base = pair.slice(0, 3) as CurrencyCode;
    const quote = pair.slice(3, 6) as CurrencyCode;

    const baseScore = scores[base] ?? 5.0;
    const quoteScore = scores[quote] ?? 5.0;
    const gap = baseScore - quoteScore;
    const absGap = Math.abs(gap);

    if (absGap >= 1.5) {
      const direction: 'LONG' | 'SHORT' = gap > 0 ? 'LONG' : 'SHORT';
      const signalStrength: 'STRONG' | 'MODERATE' | 'WEAK' =
        absGap >= 3.5 ? 'STRONG' : absGap >= 2.2 ? 'MODERATE' : 'WEAK';

      const strongCur = gap > 0 ? base : quote;
      const weakCur = gap > 0 ? quote : base;

      opps.push({
        pair,
        base,
        quote,
        direction,
        strengthGap: Number(absGap.toFixed(2)),
        baseScore,
        quoteScore,
        signalStrength,
        bias: `${strongCur} menguat dominan atas ${weakCur} (Selisih: ${absGap.toFixed(1)} poin)`,
      });
    }
  });

  return opps.sort((a, b) => b.strengthGap - a.strengthGap);
}

export function getMarketSessions(): MarketSession[] {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();

  const sessions: MarketSession[] = [
    {
      name: 'Sydney',
      city: 'Sydney (AEST)',
      timezone: 'UTC+10',
      openHourUTC: 21, // 21:00 UTC - 06:00 UTC
      closeHourUTC: 6,
      isActive: currentUTCHour >= 21 || currentUTCHour < 6,
      activePairs: ['AUDUSD', 'NZDUSD', 'AUDNZD', 'AUDJPY'],
    },
    {
      name: 'Tokyo',
      city: 'Tokyo (JST)',
      timezone: 'UTC+9',
      openHourUTC: 0, // 00:00 UTC - 09:00 UTC
      closeHourUTC: 9,
      isActive: currentUTCHour >= 0 && currentUTCHour < 9,
      activePairs: ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'],
    },
    {
      name: 'London',
      city: 'London (BST/GMT)',
      timezone: 'UTC+0',
      openHourUTC: 7, // 07:00 UTC - 16:00 UTC
      closeHourUTC: 16,
      isActive: currentUTCHour >= 7 && currentUTCHour < 16,
      activePairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'USDCHF'],
    },
    {
      name: 'New York',
      city: 'New York (EDT/EST)',
      timezone: 'UTC-5',
      openHourUTC: 12, // 12:00 UTC - 21:00 UTC
      closeHourUTC: 21,
      isActive: currentUTCHour >= 12 && currentUTCHour < 21,
      activePairs: ['EURUSD', 'USDCAD', 'USDJPY', 'US500', 'GOLD'],
    },
  ];

  return sessions;
}

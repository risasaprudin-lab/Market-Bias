export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'AUD' | 'CAD' | 'NZD';

export type TimeframeKey = '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '2d';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  country: string;
  flag: string;
  color: string;
  symbol: string;
  baseWeight: number;
}

export interface CurrencyStrengthScore {
  currency: CurrencyCode;
  score: number; // 0 to 10 scale (or -10 to +10 normalized)
  previousScore?: number;
  delta?: number;
  rank?: number;
}

export interface StrengthSnapshot {
  timestamp: number;
  timeString: string;
  scores: Record<CurrencyCode, number>;
}

export interface MarketSession {
  name: string;
  city: string;
  timezone: string;
  openHourUTC: number;
  closeHourUTC: number;
  isActive: boolean;
  activePairs: string[];
}

export interface PairRate {
  base: CurrencyCode;
  quote: CurrencyCode;
  pair: string;
  rate: number;
  change24h?: number;
}

export interface PairOpportunity {
  pair: string;
  base: CurrencyCode;
  quote: CurrencyCode;
  direction: 'LONG' | 'SHORT';
  strengthGap: number;
  baseScore: number;
  quoteScore: number;
  signalStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  bias: string;
}

export type FlowAssetCategory = 'crypto' | 'metals' | 'inst' | 'forex';

export interface FlowItem {
  pair: string;
  p: string;
  pct: number;
  price: number;
  dir: 'LONG' | 'SHORT' | 'NEUTRAL';
  c?: number | null;
  o?: number | null;
  h?: number | null;
  l?: number | null;
  v?: number | null;
  ema20?: number | null;
  src?: string | null;
}

export interface FlowSnapshot {
  status: string;
  time: string | null;
  mode: string | null;
  timestamp: number | null;
  barTimestamp: number | null;
  source: string;
  crypto: FlowItem[];
  metals: FlowItem[];
  inst: FlowItem[];
  forex: FlowItem[];
  context: Record<string, number | undefined>;
  byCategory?: Record<
    string,
    {
      barTimestamp: number;
      receivedAt: number;
      tf: string;
      count: number;
      expected: number;
      missing: string[];
    } | null
  >;
  complete?: boolean;
  synchronized?: boolean;
  notice?: string;
}

export interface StreakRecord {
  dir: 'LONG' | 'SHORT' | 'NEUTRAL';
  count: number;
  tf: string;
  barTimestamp: number;
  category: FlowAssetCategory;
}

export interface FlowValidationState {
  timeStatus: 'VALID' | 'INITIALIZING' | 'LATE_ENTRY';
  timeWindowValid: boolean;
  currentMinute: number;
  currentSeconds: number;
  secondsRemainingInWindow: number;
  confluenceValid: boolean;
  dominantDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  dominantCount: number;
  totalActiveCount: number;
  longCount: number;
  shortCount: number;
  thresholdValid: boolean;
  overallSignal: 'STRONG_VALID' | 'CONDITIONAL' | 'FILTERED_OUT';
  summaryReason: string;
}

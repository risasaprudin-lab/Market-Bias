import {
  FlowAssetCategory,
  FlowItem,
  FlowSnapshot,
  FlowValidationState,
  StreakRecord,
} from '../types/forex';

export interface AssetMeta {
  code: string;
  fullName: string;
  category: FlowAssetCategory;
  icon: string;
  unit: string;
  description: string;
}

export const ASSET_METAS: Record<string, AssetMeta> = {
  // Indeks (5)
  US500: {
    code: 'US500',
    fullName: 'S&P 500 Index',
    category: 'inst',
    icon: 'SPX',
    unit: 'pts',
    description: 'Acuan 500 korporasi terbesar pasar modal AS',
  },
  NAS100: {
    code: 'NAS100',
    fullName: 'Nasdaq 100 Index',
    category: 'inst',
    icon: 'NDX',
    unit: 'pts',
    description: 'Indeks teknologi terdepan AS (US100)',
  },
  US30: {
    code: 'US30',
    fullName: 'Dow Jones Industrial',
    category: 'inst',
    icon: 'DJI',
    unit: 'pts',
    description: '30 raksasa industri blue-chip Amerika',
  },
  US2000: {
    code: 'US2000',
    fullName: 'Russell 2000 Small-Cap',
    category: 'inst',
    icon: 'RUT',
    unit: 'pts',
    description: 'Barometer saham small-cap & likuiditas domestik AS',
  },
  GER40: {
    code: 'GER40',
    fullName: 'DAX 40 Germany',
    category: 'inst',
    icon: 'DAX',
    unit: 'pts',
    description: 'Lokomotif industri dan ekspor utama zona Eropa',
  },

  // Komoditas & Energi (5)
  GOLD: {
    code: 'GOLD',
    fullName: 'Gold Spot (XAU/USD)',
    category: 'metals',
    icon: 'XAU',
    unit: '$',
    description: 'Safe haven utama terhadap inflasi & ketidakpastian global',
  },
  SILVER: {
    code: 'SILVER',
    fullName: 'Silver Spot (XAG/USD)',
    category: 'metals',
    icon: 'XAG',
    unit: '$',
    description: 'Logam mulia safe-haven sekaligus komponen industri',
  },
  COPPER: {
    code: 'COPPER',
    fullName: 'High Grade Copper',
    category: 'metals',
    icon: 'HG',
    unit: '$',
    description: 'Dr. Copper - Barometer kesehatan ekonomi manufaktur dunia',
  },
  USOIL: {
    code: 'USOIL',
    fullName: 'WTI Crude Oil',
    category: 'metals',
    icon: 'WTI',
    unit: '$',
    description: 'Minyak mentah acuan Texas & korelasi energi global',
  },
  UKOIL: {
    code: 'UKOIL',
    fullName: 'Brent Crude Oil',
    category: 'metals',
    icon: 'BRENT',
    unit: '$',
    description: 'Minyak mentah acuan maritim Eropa & Asia',
  },

  // Crypto Tier 1 (10)
  BTC: {
    code: 'BTC',
    fullName: 'Bitcoin Flow',
    category: 'crypto',
    icon: 'BTC',
    unit: '$',
    description: 'Induk aset kripto & barometer likuiditas global',
  },
  ETH: {
    code: 'ETH',
    fullName: 'Ethereum Flow',
    category: 'crypto',
    icon: 'ETH',
    unit: '$',
    description: 'Barometer smart contract & DeFi risk appetite',
  },
  SOL: {
    code: 'SOL',
    fullName: 'Solana Flow',
    category: 'crypto',
    icon: 'SOL',
    unit: '$',
    description: 'High-beta momentum layer-1 ecosystem',
  },
  BNB: {
    code: 'BNB',
    fullName: 'Binance Coin',
    category: 'crypto',
    icon: 'BNB',
    unit: '$',
    description: 'Ekosistem bursa kripto & likuiditas retail',
  },
  XRP: {
    code: 'XRP',
    fullName: 'Ripple Flow',
    category: 'crypto',
    icon: 'XRP',
    unit: '$',
    description: 'Likuiditas pembayaran perbankan & cross-border',
  },
  DOGE: {
    code: 'DOGE',
    fullName: 'Dogecoin',
    category: 'crypto',
    icon: 'DOGE',
    unit: '$',
    description: 'Sentimen spekulatif retail & meme momentum',
  },
  ADA: {
    code: 'ADA',
    fullName: 'Cardano Flow',
    category: 'crypto',
    icon: 'ADA',
    unit: '$',
    description: 'Layer-1 Proof of Stake momentum',
  },
  AVAX: {
    code: 'AVAX',
    fullName: 'Avalanche Flow',
    category: 'crypto',
    icon: 'AVAX',
    unit: '$',
    description: 'Subnet enterprise & modular blockchain flow',
  },
  SUI: {
    code: 'SUI',
    fullName: 'Sui Network',
    category: 'crypto',
    icon: 'SUI',
    unit: '$',
    description: 'Next-gen Move language execution momentum',
  },
  LINK: {
    code: 'LINK',
    fullName: 'Chainlink Oracle',
    category: 'crypto',
    icon: 'LINK',
    unit: '$',
    description: 'Infrastruktur oracle & Real World Assets (RWA)',
  },
};

/**
 * Evaluates the 4 core rules from Flow Monitor:
 * 1. SIGNAL VALID: X:05 — X:30
 * 2. SKIP JIKA LEWAT X:30 (Late entry filter)
 * 3. MIN 4 PAIR / ASET SEARAH (Confluence filter)
 * 4. SEMUA >= 0.10% (Momentum threshold filter)
 */
export function evaluateFlowValidationRules(
  items: FlowItem[],
  customDate?: Date
): FlowValidationState {
  const d = customDate || new Date();
  const minute = d.getMinutes();
  const seconds = d.getSeconds();

  // Rule 1 & 2: Time Window Validation
  let timeStatus: 'VALID' | 'INITIALIZING' | 'LATE_ENTRY';
  let timeWindowValid = false;
  let secondsRemainingInWindow = 0;

  if (minute < 5) {
    timeStatus = 'INITIALIZING';
    timeWindowValid = false;
    secondsRemainingInWindow = (5 - minute) * 60 - seconds;
  } else if (minute <= 30) {
    timeStatus = 'VALID';
    timeWindowValid = true;
    secondsRemainingInWindow = (30 - minute) * 60 + (60 - seconds);
  } else {
    timeStatus = 'LATE_ENTRY';
    timeWindowValid = false;
    secondsRemainingInWindow = 0;
  }

  // Rule 3: Confluence Direction (LONG vs SHORT)
  const longItems = items.filter((it) => it.dir === 'LONG');
  const shortItems = items.filter((it) => it.dir === 'SHORT');
  const longCount = longItems.length;
  const shortCount = shortItems.length;

  let dominantDirection: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
  let dominantCount = 0;

  if (longCount > shortCount) {
    dominantDirection = 'LONG';
    dominantCount = longCount;
  } else if (shortCount > longCount) {
    dominantDirection = 'SHORT';
    dominantCount = shortCount;
  } else {
    dominantDirection = 'NEUTRAL';
    dominantCount = longCount;
  }

  // Required confluence:
  // For 10 items (crypto): at least 7 searah
  // For 5 items (metals / inst): at least 4 searah
  // Smaller: at least 70%
  const requiredConfluence =
    items.length >= 10 ? 7 : items.length >= 5 ? 4 : Math.ceil(items.length * 0.7);

  const confluenceValid = dominantCount >= requiredConfluence && dominantDirection !== 'NEUTRAL';

  // Rule 4: Momentum threshold >= 0.10%
  const sortedByAbsRoc = [...items].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const topCheck = sortedByAbsRoc.slice(0, Math.min(items.length, 3));
  const thresholdValid = topCheck.length > 0 && topCheck.every((it) => Math.abs(it.pct) >= 0.1);

  // Synthesize overall state
  let overallSignal: 'STRONG_VALID' | 'CONDITIONAL' | 'FILTERED_OUT' = 'FILTERED_OUT';
  let summaryReason = '';

  if (timeWindowValid && confluenceValid && thresholdValid) {
    overallSignal = 'STRONG_VALID';
    summaryReason = `Sinyal TERKONFIRMASI: Window valid (X:${String(minute).padStart(2, '0')}), ${dominantCount}/${items.length} aset searah ${dominantDirection}, momentum kuat ≥0.10%.`;
  } else if (timeWindowValid && (confluenceValid || thresholdValid)) {
    overallSignal = 'CONDITIONAL';
    summaryReason = `Sinyal BERSYARAT: Window waktu valid, namun ${
      !confluenceValid ? `arah masih bercampur (${dominantCount} ${dominantDirection})` : 'sebagian momentum masih di bawah 0.10%'
    }.`;
  } else if (!timeWindowValid) {
    overallSignal = 'FILTERED_OUT';
    summaryReason =
      timeStatus === 'LATE_ENTRY'
        ? `LATE ENTRY FILTER: Menit X:${String(minute).padStart(2, '0')} melewati batas X:30. Hindari mengejar harga.`
        : `INISIASI CANDLE: Menit X:${String(minute).padStart(2, '0')} masih dalam fase pembentukan volume awal.`;
  } else {
    overallSignal = 'FILTERED_OUT';
    summaryReason = 'FILTER AKTIF: Konfluensi arah dan momentum belum memenuhi syarat minimum.';
  }

  return {
    timeStatus,
    timeWindowValid,
    currentMinute: minute,
    currentSeconds: seconds,
    secondsRemainingInWindow,
    confluenceValid,
    dominantDirection,
    dominantCount,
    totalActiveCount: items.length,
    longCount,
    shortCount,
    thresholdValid,
    overallSignal,
    summaryReason,
  };
}

export async function fetchFlowMonitorLatest(workerUrl?: string): Promise<{
  source: string;
  data: FlowSnapshot;
}> {
  const query = workerUrl ? `?workerUrl=${encodeURIComponent(workerUrl)}` : '';
  const res = await fetch(`/api/flow-monitor/latest${query}`);
  if (!res.ok) {
    throw new Error(`Flow monitor request failed: ${res.status}`);
  }
  return await res.json();
}

export async function fetchFlowMonitorHistory(workerUrl?: string): Promise<{
  source: string;
  data: FlowSnapshot[];
}> {
  const query = workerUrl ? `?workerUrl=${encodeURIComponent(workerUrl)}` : '';
  const res = await fetch(`/api/flow-monitor/history${query}`);
  if (!res.ok) {
    throw new Error(`Flow monitor history request failed: ${res.status}`);
  }
  return await res.json();
}

export async function fetchFlowMonitorStreaks(workerUrl?: string): Promise<{
  streaks: Record<string, StreakRecord>;
  window?: number;
}> {
  const query = workerUrl ? `?workerUrl=${encodeURIComponent(workerUrl)}` : '';
  const res = await fetch(`/api/flow-monitor/streaks${query}`);
  if (!res.ok) {
    throw new Error(`Flow monitor streaks request failed: ${res.status}`);
  }
  return await res.json();
}

export async function testWorkerConnection(workerUrl: string): Promise<{
  ok: boolean;
  endpointUsed?: string;
  latencyMs?: number;
  details?: any;
  error?: string;
}> {
  const res = await fetch('/api/flow-monitor/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerUrl }),
  });
  return await res.json();
}

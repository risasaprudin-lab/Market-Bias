import React, { useMemo } from 'react';

interface TradingViewChartProps {
  pair: string;
  category?: string;
  isDark?: boolean;
  activeHorizons?: Set<string>;
  height?: number | string;
}

export function getTradingViewSymbol(pair: string, category?: string): string {
  const clean = pair.toUpperCase().replace(/\s+/g, '');

  const map: Record<string, string> = {
    // Crypto
    'BTC/USD': 'BINANCE:BTCUSDT',
    'BTC': 'BINANCE:BTCUSDT',
    'ETH/USD': 'BINANCE:ETHUSDT',
    'ETH': 'BINANCE:ETHUSDT',
    'SOL/USD': 'BINANCE:SOLUSDT',
    'SOL': 'BINANCE:SOLUSDT',
    'BNB/USD': 'BINANCE:BNBUSDT',
    'BNB': 'BINANCE:BNBUSDT',
    'XRP/USD': 'BINANCE:XRPUSDT',
    'XRP': 'BINANCE:XRPUSDT',
    'DOGE/USD': 'BINANCE:DOGEUSDT',
    'DOGE': 'BINANCE:DOGEUSDT',
    'ADA/USD': 'BINANCE:ADAUSDT',
    'ADA': 'BINANCE:ADAUSDT',
    'AVAX/USD': 'BINANCE:AVAXUSDT',
    'AVAX': 'BINANCE:AVAXUSDT',
    'SUI/USD': 'BINANCE:SUIUSDT',
    'SUI': 'BINANCE:SUIUSDT',
    'LINK/USD': 'BINANCE:LINKUSDT',
    'LINK': 'BINANCE:LINKUSDT',

    // Metals & Commodities
    'XAU/USD': 'OANDA:XAUUSD',
    'GOLD': 'OANDA:XAUUSD',
    'XAG/USD': 'OANDA:XAGUSD',
    'SILVER': 'OANDA:XAGUSD',
    'COPPER': 'CAPITALCOM:COPPER',
    'USOIL': 'TVC:USOIL',
    'UKOIL': 'TVC:UKOIL',

    // Indeks
    'US500': 'FOREXCOM:SPXUSD',
    'NAS100': 'FOREXCOM:NAS100',
    'US30': 'FOREXCOM:DJI',
    'US2000': 'FOREXCOM:US2000',
    'GER40': 'FOREXCOM:GER40',
  };

  if (map[clean]) return map[clean];

  // Forex standard: A/B -> FX:AB
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2 && parts[0].length === 3 && parts[1].length === 3) {
      return `FX:${parts[0]}${parts[1]}`;
    }
  }

  if (category === 'Crypto') {
    const token = clean.replace('/USD', '').replace('USDT', '');
    return `BINANCE:${token}USDT`;
  }

  return clean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  pair,
  category,
  isDark = false,
  activeHorizons,
  height = 480,
}) => {
  const symbol = useMemo(() => getTradingViewSymbol(pair, category), [pair, category]);

  // Determine interval according to active horizon
  const interval = useMemo(() => {
    if (!activeHorizons || activeHorizons.size === 0) return '60';
    if (activeHorizons.has('scalp') && !activeHorizons.has('intra') && !activeHorizons.has('swing')) {
      return '5';
    }
    if (activeHorizons.has('swing') && !activeHorizons.has('scalp') && !activeHorizons.has('intra')) {
      return '240';
    }
    if (activeHorizons.has('intra')) {
      return '60';
    }
    return '15';
  }, [activeHorizons]);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tv_chart_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`,
      symbol: symbol,
      interval: interval,
      hidesidetoolbar: '0',
      symboledit: '1',
      saveimage: '1',
      toolbarbg: isDark ? '1b2820' : 'f1f3f6',
      studies: JSON.stringify([]),
      theme: isDark ? 'dark' : 'light',
      style: '1',
      timezone: 'Asia/Jakarta',
      studies_overrides: JSON.stringify({}),
      overrides: JSON.stringify({}),
      enabled_features: JSON.stringify([]),
      disabled_features: JSON.stringify([]),
      locale: 'id',
      utm_source: 'localhost',
      utm_medium: 'widget',
      utm_campaign: 'chart',
      utm_term: symbol,
    });

    return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol, interval, isDark]);

  return (
    <div
      className="tv-chart-wrapper"
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: isDark ? '#141d18' : '#ffffff',
        position: 'relative',
      }}
    >
      <iframe
        key={`${symbol}-${interval}-${isDark ? 'dark' : 'light'}`}
        title={`TradingView Chart - ${pair}`}
        src={embedUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allowFullScreen
      />
    </div>
  );
};

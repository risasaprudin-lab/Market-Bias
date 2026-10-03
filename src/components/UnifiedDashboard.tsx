import React, { useState, useMemo } from 'react';
import { FlowSnapshot, StreakRecord } from '../types/forex';

interface UnifiedDashboardProps {
  snapshot?: FlowSnapshot | null;
  streaks?: Record<string, StreakRecord>;
  isConnected?: boolean;
  workerUrl?: string;
  onOpenSettings?: () => void;
}

const DEFAULT_CUR: [string, number][] = [
  ['AUD', 8.74],
  ['CHF', 8.24],
  ['USD', 7.30],
  ['CAD', 5.85],
  ['GBP', 3.61],
  ['EUR', 2.73],
  ['NZD', 1.83],
  ['JPY', 1.67],
];

const CUR_NAMES: Record<string, string> = {
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  USD: 'US Dollar',
  CAD: 'Canadian Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  NZD: 'New Zealand Dollar',
  JPY: 'Japanese Yen',
};

const STYLES: Record<string, [string, string[], number]> = {
  s: ['Scalping', ['5M', '10M', '15M'], 5],
  i: ['Intraday', ['1J', '2J', '3J'], 60],
  w: ['Swing', ['4J', '6J', '8J'], 240],
};

const ASSET_NAMES: Record<string, string> = {
  XAU: 'Gold / US Dollar',
  'XAU/USD': 'Gold / US Dollar',
  XAG: 'Silver / US Dollar',
  'XAG/USD': 'Silver / US Dollar',
  WTI: 'Crude Oil WTI',
  USOIL: 'Crude Oil WTI',
  UKOIL: 'Brent Oil',
  COPPER: 'Copper',
  BTC: 'Bitcoin',
  'BTC/USD': 'Bitcoin',
  ETH: 'Ethereum',
  'ETH/USD': 'Ethereum',
  SOL: 'Solana',
  'SOL/USD': 'Solana',
  XRP: 'XRP',
  'XRP/USD': 'XRP',
  DOGE: 'Dogecoin',
  'DOGE/USD': 'Dogecoin',
  ADA: 'Cardano',
  'ADA/USD': 'Cardano',
  BNB: 'BNB',
  'BNB/USD': 'BNB',
  AVAX: 'Avalanche',
  'AVAX/USD': 'Avalanche',
  SUI: 'Sui',
  'SUI/USD': 'Sui',
  LINK: 'Chainlink',
  'LINK/USD': 'Chainlink',
  US30: 'Dow Jones 30',
  NAS100: 'Nasdaq 100',
  US500: 'S&P 500',
  US2000: 'Russell 2000',
  GER40: 'DAX 40',
  DAX: 'DAX 40',
};

// Generate 28 Forex Pairs with multi-timeframe directional signals
function generateForexData(curScores: Record<string, number>) {
  const currencies = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];
  const list: Array<[string, number[], number[], number[], number]> = [];

  for (let i = 0; i < currencies.length; i++) {
    for (let j = i + 1; j < currencies.length; j++) {
      const a = currencies[i];
      const b = currencies[j];
      const n = `${a}/${b}`;
      const diff = curScores[a] - curScores[b];
      const d = Math.sign(diff);

      const makeTf = (thresholds: number[]) =>
        thresholds.map(t => (Math.abs(diff) >= t ? d : 0));

      const isFlip = (n === 'USD/JPY' || n === 'NZD/CHF') ? 1 : 0;

      list.push([
        n,
        makeTf([0.5, 1.5, 2.8]),
        makeTf([0.8, 2.0, 3.4]),
        makeTf([1.2, 2.5, 4.0]),
        isFlip,
      ]);
    }
  }
  return list;
}

export default function UnifiedDashboard({
  snapshot,
  streaks,
  isConnected,
  workerUrl,
  onOpenSettings,
}: UnifiedDashboardProps) {
  // Filters & State
  const [category, setCategory] = useState<'forex' | 'komoditas' | 'crypto' | 'indeks'>('forex');
  const [tradingStyle, setTradingStyle] = useState<'s' | 'i' | 'w'>('s');
  const [filterSignal, setFilterSignal] = useState<'all' | 'buy' | 'sell' | 'flip'>('all');
  const [scopeMode, setScopeMode] = useState<'all' | 'top'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'heat'>('table');
  const [sortBy, setSortBy] = useState<'disparity' | 'bias' | 'alignment' | 'name'>('disparity');
  const [query, setQuery] = useState<string>('');
  const [openRow, setOpenRow] = useState<string | null>(null);

  // Currency Scores
  const curScores = useMemo(() => {
    return Object.fromEntries(DEFAULT_CUR);
  }, []);

  // Sorted Currencies
  const sortedCurrencies = useMemo(() => {
    return [...DEFAULT_CUR].sort((a, b) => b[1] - a[1]);
  }, []);

  const strongestCur = sortedCurrencies[0];
  const weakestCur = sortedCurrencies[sortedCurrencies.length - 1];

  // Raw dataset based on category (Forex + Live Cloudflare Worker data)
  const rawData = useMemo(() => {
    if (category === 'forex') {
      return generateForexData(curScores);
    }

    if (category === 'komoditas') {
      if (snapshot?.metals && snapshot.metals.length > 0) {
        return snapshot.metals.map(m => {
          const pairName = m.pair === 'GOLD' ? 'XAU' : m.pair === 'SILVER' ? 'XAG' : m.pair;
          const dirVal = m.dir === 'LONG' ? 1 : m.dir === 'SHORT' ? -1 : 0;
          return [
            pairName,
            [dirVal, dirVal, m.pct > 0 ? 1 : m.pct < 0 ? -1 : 0],
            [dirVal, m.pct > 0 ? 1 : -1, dirVal],
            [dirVal, dirVal, dirVal],
            0,
          ] as [string, number[], number[], number[], number];
        });
      }
      return [
        ['XAU', [1, 1, 0], [1, 1, 1], [1, 1, 1], 0],
        ['XAG', [1, 0, 1], [1, 1, 0], [0, 1, 1], 0],
        ['WTI', [-1, -1, 0], [0, -1, -1], [-1, -1, -1], 1],
      ] as [string, number[], number[], number[], number][];
    }

    if (category === 'crypto') {
      if (snapshot?.crypto && snapshot.crypto.length > 0) {
        return snapshot.crypto.map(c => {
          const dirVal = c.dir === 'LONG' ? 1 : c.dir === 'SHORT' ? -1 : 0;
          return [
            c.pair,
            [dirVal, dirVal, c.pct > 0 ? 1 : c.pct < 0 ? -1 : 0],
            [dirVal, c.pct > 0 ? 1 : -1, dirVal],
            [dirVal, dirVal, dirVal],
            c.pct > 1.5 ? 1 : 0,
          ] as [string, number[], number[], number[], number];
        });
      }
      return [
        ['BTC', [1, 1, 1], [1, 0, 1], [1, 1, 1], 0],
        ['ETH', [1, 1, 1], [1, 1, 0], [0, 1, 1], 0],
        ['SOL', [-1, -1, -1], [-1, -1, -1], [-1, 0, 0], 0],
        ['BNB', [1, 0, 0], [0, 0, 0], [0, 1, 0], 0],
        ['XRP', [-1, -1, -1], [-1, -1, 0], [-1, -1, -1], 0],
        ['DOGE', [-1, -1, -1], [-1, 0, -1], [0, -1, -1], 0],
        ['ADA', [1, 1, 1], [0, 0, 1], [0, 0, 0], 1],
      ] as [string, number[], number[], number[], number][];
    }

    // Indeks
    if (snapshot?.inst && snapshot.inst.length > 0) {
      return snapshot.inst.map(i => {
        const dirVal = i.dir === 'LONG' ? 1 : i.dir === 'SHORT' ? -1 : 0;
        return [
          i.pair,
          [dirVal, dirVal, i.pct > 0 ? 1 : i.pct < 0 ? -1 : 0],
          [dirVal, i.pct > 0 ? 1 : -1, dirVal],
          [dirVal, dirVal, dirVal],
          0,
        ] as [string, number[], number[], number[], number];
      });
    }
    return [
      ['US30', [1, 1, 1], [1, 1, 1], [1, 1, 0], 0],
      ['NAS100', [1, 1, 0], [1, 0, 1], [0, 0, 0], 0],
      ['US500', [1, 1, 1], [1, 1, 0], [1, 1, 1], 0],
      ['DAX', [-1, -1, 0], [-1, 0, 0], [0, 0, 1], 1],
    ] as [string, number[], number[], number[], number][];
  }, [category, snapshot, curScores]);

  // Model calculation for each row
  const modeledRows = useMemo(() => {
    return rawData.map(row => {
      const tfIdx = tradingStyle === 's' ? 1 : tradingStyle === 'i' ? 2 : 3;
      const tf = row[tfIdx];
      const sum = tf.reduce((a, b) => a + b, 0);
      const parts = row[0].split('/');
      const disparity = parts.length === 2 ? curScores[parts[0]] - curScores[parts[1]] : null;
      const alignment = Math.round(
        (Math.max(tf.filter(v => v > 0).length, tf.filter(v => v < 0).length) / 3) * 100
      );

      return {
        symbol: row[0],
        tf,
        sum,
        flip: row[4],
        raw: row,
        disparity,
        alignment,
      };
    });
  }, [rawData, tradingStyle, curScores]);

  // Buy and Sell counts
  const buyCount = useMemo(() => modeledRows.filter(r => r.sum > 0).length, [modeledRows]);
  const sellCount = useMemo(() => modeledRows.filter(r => r.sum < 0).length, [modeledRows]);

  // Filtered & Sorted Rows
  const displayedRows = useMemo(() => {
    let list = modeledRows.filter(r => {
      const name = ASSET_NAMES[r.symbol] || '';
      const matchQ = (r.symbol + ' ' + name).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (filterSignal === 'buy') return r.sum > 0;
      if (filterSignal === 'sell') return r.sum < 0;
      if (filterSignal === 'flip') return r.flip === 1;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'disparity') {
        const dA = a.disparity !== null ? Math.abs(a.disparity) : Math.abs(a.sum);
        const dB = b.disparity !== null ? Math.abs(b.disparity) : Math.abs(b.sum);
        return dB - dA || a.symbol.localeCompare(b.symbol);
      }
      if (sortBy === 'alignment') return b.alignment - a.alignment || a.symbol.localeCompare(b.symbol);
      return Math.abs(b.sum) - Math.abs(a.sum) || a.symbol.localeCompare(b.symbol);
    });

    if (scopeMode === 'top') {
      return list.slice(0, 5);
    }
    return list;
  }, [modeledRows, query, filterSignal, sortBy, scopeMode]);

  // Helpers
  const formatNum = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',');

  const getSignalMeta = (n: number): [string, 'buy' | 'sell' | 'neu'] => {
    if (n === 3) return ['Buy kuat', 'buy'];
    if (n > 0) return ['Cenderung buy', 'buy'];
    if (n === -3) return ['Sell kuat', 'sell'];
    if (n < 0) return ['Cenderung sell', 'sell'];
    return ['Konsolidasi', 'neu'];
  };

  const arrow = (v: number) => (v > 0 ? '↗' : v < 0 ? '↘' : '−');
  const cls = (v: number) => (v > 0 ? 'buy' : v < 0 ? 'sell' : 'neu');

  const handleResetFilters = () => {
    setFilterSignal('all');
    setQuery('');
    setOpenRow(null);
    setScopeMode('all');
    setSortBy(category === 'forex' ? 'disparity' : 'bias');
  };

  return (
    <div className="unified-dashboard-container">
      {/* 4 Overview Metrics */}
      <section className="metrics">
        <div className="metric">
          <label>Mata uang terkuat</label>
          <div className="value up">
            {strongestCur[0]} <small>{strongestCur[1].toFixed(2).replace('.', ',')} / 10</small>
          </div>
          <p>{CUR_NAMES[strongestCur[0]]}</p>
        </div>

        <div className="metric">
          <label>Mata uang terlemah</label>
          <div className="value down">
            {weakestCur[0]} <small>{weakestCur[1].toFixed(2).replace('.', ',')} / 10</small>
          </div>
          <p>{CUR_NAMES[weakestCur[0]]}</p>
        </div>

        <div className="metric">
          <label>
            Sinyal buy · {category.charAt(0).toUpperCase() + category.slice(1)}
          </label>
          <div className="value up">
            {buyCount} <small>/ {modeledRows.length} instrumen</small>
          </div>
          <p>{STYLES[tradingStyle][0]} · sebelum filter hasil</p>
        </div>

        <div className="metric">
          <label>
            Sinyal sell · {category.charAt(0).toUpperCase() + category.slice(1)}
          </label>
          <div className="value down">
            {sellCount} <small>/ {modeledRows.length} instrumen</small>
          </div>
          <p>{STYLES[tradingStyle][0]} · sebelum filter hasil</p>
        </div>
      </section>

      {/* Main 2-Column Layout */}
      <div className="layout">
        {/* Left Column: Screener Panel */}
        <section className="panel">
          <div className="panelhead">
            <h2>
              Market screener <span className="count">{modeledRows.length} instrumen</span>
            </h2>
            <input
              className="search"
              type="search"
              placeholder="Cari instrumen…"
              aria-label="Cari instrumen"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setOpenRow(null);
              }}
            />
          </div>

          {/* Category Tabs */}
          <div className="cats" role="group" aria-label="Kategori aset">
            {(['forex', 'komoditas', 'crypto', 'indeks'] as const).map(cat => (
              <button
                key={cat}
                aria-pressed={category === cat}
                onClick={() => {
                  setCategory(cat);
                  setOpenRow(null);
                  setSortBy(cat === 'forex' ? 'disparity' : 'bias');
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                {cat !== 'forex' && isConnected && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      marginLeft: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--mint)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Toolbar: Trading Style & Signal Filters */}
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Gaya trading">
              {Object.entries(STYLES).map(([k, v]) => (
                <button
                  key={k}
                  aria-pressed={tradingStyle === k}
                  onClick={() => {
                    setTradingStyle(k as any);
                    setOpenRow(null);
                  }}
                >
                  {v[0]}
                </button>
              ))}
            </div>

            <div className="filters" role="group" aria-label="Filter sinyal">
              <button
                aria-pressed={filterSignal === 'all'}
                onClick={() => setFilterSignal('all')}
              >
                Semua
              </button>
              <button
                aria-pressed={filterSignal === 'buy'}
                onClick={() => setFilterSignal('buy')}
              >
                Buy
              </button>
              <button
                aria-pressed={filterSignal === 'sell'}
                onClick={() => setFilterSignal('sell')}
              >
                Sell
              </button>
              <button
                aria-pressed={filterSignal === 'flip'}
                onClick={() => setFilterSignal('flip')}
              >
                Baru balik
              </button>
            </div>
          </div>

          {/* Viewbar: Mode Scope, View Table/Heatmap, and Sort Dropdown */}
          <div className="viewbar">
            <div className="seg" role="group" aria-label="Cakupan hasil">
              <button
                aria-pressed={scopeMode === 'all'}
                onClick={() => setScopeMode('all')}
              >
                Semua instrumen
              </button>
              <button
                aria-pressed={scopeMode === 'top'}
                onClick={() => setScopeMode('top')}
              >
                Top movers · 5
              </button>
            </div>

            <div className="viewcontrols">
              <div className="seg" role="group" aria-label="Tampilan hasil">
                <button
                  aria-pressed={viewMode === 'table'}
                  onClick={() => setViewMode('table')}
                >
                  Tabel
                </button>
                <button
                  aria-pressed={viewMode === 'heat'}
                  onClick={() => setViewMode('heat')}
                >
                  Heatmap
                </button>
              </div>

              <label className="sortlabel">
                Urutkan{' '}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  aria-label="Urutkan hasil"
                >
                  {category === 'forex' ? (
                    <>
                      <option value="disparity">Disparitas terbesar</option>
                      <option value="bias">Bias terkuat</option>
                      <option value="alignment">Keselarasan</option>
                      <option value="name">Nama A–Z</option>
                    </>
                  ) : (
                    <>
                      <option value="bias">Bias terkuat</option>
                      <option value="alignment">Keselarasan</option>
                      <option value="name">Nama A–Z</option>
                    </>
                  )}
                </select>
              </label>
            </div>
          </div>

          {/* Scope Info Bar */}
          <div className="scope">
            <span>
              {category.charAt(0).toUpperCase() + category.slice(1)} / {STYLES[tradingStyle][0]} /{' '}
              {scopeMode === 'top' ? '5 teratas dari hasil filter' : 'Semua hasil'} ·{' '}
              {isConnected ? 'Live Cloudflare Worker arahmarket' : 'Data terverifikasi'}
            </span>
          </div>

          {/* Table Header (when in table view) */}
          {viewMode === 'table' && (
            <div className="tablehead">
              <span>Instrumen</span>
              <span>Sinyal</span>
              <span className="scorecol">{category === 'forex' ? 'Disparitas' : 'Bias'}</span>
              <span className="tfcol">{STYLES[tradingStyle][1].join(' / ')}</span>
              <span></span>
            </div>
          )}

          {/* Rows List (Table or Heatgrid) */}
          <div id="rows">
            {displayedRows.length === 0 ? (
              <div className="empty">
                Tidak ada instrumen yang cocok.
                <br />
                Ubah kata kunci pencarian atau gunakan Reset filter.
              </div>
            ) : viewMode === 'heat' ? (
              /* Heatmap Grid View */
              <div className="heatgrid">
                {displayedRows.map(r => {
                  const [sigText, sigCls] = getSignalMeta(r.sum);
                  const isOpen = openRow === r.symbol;

                  return (
                    <React.Fragment key={r.symbol}>
                      <button
                        className={`heatcard ${sigCls}`}
                        onClick={() => setOpenRow(isOpen ? null : r.symbol)}
                        aria-expanded={isOpen}
                      >
                        <strong>{r.symbol}</strong>
                        <small>
                          {sigText} · bias {r.sum > 0 ? '+' : ''}
                          {r.sum}
                        </small>
                        <small>
                          {r.disparity !== null
                            ? `Disparitas ${formatNum(r.disparity)}`
                            : `Keselarasan ${r.alignment}%`}
                        </small>
                        <span className="tf">
                          {r.tf.map((v, idx) => (
                            <span key={idx} className={cls(v)}>
                              {arrow(v)}
                            </span>
                          ))}
                        </span>
                      </button>

                      {/* Expanded Detail inside Heatmap Grid */}
                      {isOpen && (
                        <section className="heatdetail">
                          <h3>{r.symbol}</h3>
                          <div className="detail">
                            <p>
                              {Math.abs(r.sum) === 3
                                ? 'Ketiga timeframe aktif searah.'
                                : r.sum === 0
                                ? 'Bias gabungan netral.'
                                : 'Arah timeframe belum sepenuhnya selaras.'}
                              {r.flip ? ' Penanda Baru Balik aktif.' : ''}
                            </p>

                            <div className="detailgrid">
                              <div className="detailstat">
                                <label>Disparitas base − quote</label>
                                <strong>
                                  {r.disparity !== null ? formatNum(r.disparity) : 'Tidak berlaku'}
                                </strong>
                              </div>
                              <div className="detailstat">
                                <label>Bias {STYLES[tradingStyle][0]}</label>
                                <strong>
                                  {r.sum > 0 ? '+' : ''}
                                  {r.sum} / ±3
                                </strong>
                              </div>
                              <div className="detailstat">
                                <label>Keselarasan arah</label>
                                <strong>{r.alignment}%</strong>
                              </div>
                            </div>

                            <div className="alltime">
                              {Object.entries(STYLES).map(([k, v], i) => (
                                <div className="tfgroup" key={k}>
                                  <b>
                                    {v[0]}
                                    {tradingStyle === k ? ' · aktif' : ''}
                                  </b>
                                  <div className="tf">
                                    {Array.isArray(r.raw[i + 1]) && (r.raw[i + 1] as number[]).map((x: number, j: number) => (
                                      <span key={j} className={cls(x)}>
                                        {v[1][j]} {arrow(x)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              displayedRows.map(r => {
                const [sigText, sigCls] = getSignalMeta(r.sum);
                const isOpen = openRow === r.symbol;
                const parts = r.symbol.split('/');

                return (
                  <article className="row" key={r.symbol}>
                    <button
                      className="rowbutton"
                      onClick={() => setOpenRow(isOpen ? null : r.symbol)}
                      aria-expanded={isOpen}
                      aria-label={`Detail ${r.symbol}, ${sigText}`}
                    >
                      <span className="instrument">
                        <span className="asseticon">{r.symbol.slice(0, 2)}</span>
                        <span>
                          <span className="symbol">{r.symbol}</span>
                          <div className="assetname">
                            {ASSET_NAMES[r.symbol] || `Forex · ${r.alignment}% selaras`}
                          </div>
                          {r.flip === 1 && (
                            <div className="reversal">Baru balik · sinyal konfirmasi</div>
                          )}
                        </span>
                      </span>

                      <span>
                        <span className={`badge ${sigCls}`}>
                          {arrow(r.sum)} {sigText}
                        </span>
                      </span>

                      <span className="score scorecol">
                        {r.disparity !== null
                          ? formatNum(r.disparity)
                          : `${r.sum > 0 ? '+' : ''}${r.sum}`}
                      </span>

                      <span className="tf tfcol">
                        {r.tf.map((v, i) => (
                          <span
                            key={i}
                            className={cls(v)}
                            title={`${STYLES[tradingStyle][1][i]}: ${
                              v > 0 ? 'Naik' : v < 0 ? 'Turun' : 'Netral'
                            }`}
                          >
                            {arrow(v)}
                          </span>
                        ))}
                      </span>

                      <span className="chevron">{isOpen ? '−' : '+'}</span>
                    </button>

                    {/* Collapsible Row Detail Accordion */}
                    {isOpen && (
                      <div className="detail">
                        <p>
                          {Math.abs(r.sum) === 3
                            ? 'Ketiga timeframe aktif searah.'
                            : r.sum === 0
                            ? 'Bias gabungan netral.'
                            : 'Arah timeframe belum sepenuhnya selaras.'}
                          {r.flip === 1 ? ' Penanda Baru Balik aktif.' : ''}
                        </p>

                        <div className="detailgrid">
                          <div className="detailstat">
                            <label>Disparitas base − quote</label>
                            <strong>
                              {r.disparity !== null ? formatNum(r.disparity) : 'Tidak berlaku'}
                            </strong>
                          </div>
                          <div className="detailstat">
                            <label>Bias {STYLES[tradingStyle][0]}</label>
                            <strong>
                              {r.sum > 0 ? '+' : ''}
                              {r.sum} / ±3
                            </strong>
                          </div>
                          <div className="detailstat">
                            <label>Keselarasan arah</label>
                            <strong>{r.alignment}%</strong>
                          </div>
                        </div>

                        {/* All Horizons Matrix */}
                        <div className="alltime">
                          {Object.entries(STYLES).map(([k, v], i) => (
                            <div className="tfgroup" key={k}>
                              <b>
                                {v[0]}
                                {tradingStyle === k ? ' · aktif' : ''}
                              </b>
                              <div className="tf">
                                {Array.isArray(r.raw[i + 1]) && (r.raw[i + 1] as number[]).map((x: number, j: number) => (
                                  <span key={j} className={cls(x)}>
                                    {v[1][j]} {arrow(x)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Relative Strength Comparison if Forex */}
                        {r.disparity !== null && parts.length === 2 && (
                          <div className="compare">
                            Perbandingan strength
                            {parts.map(c => {
                              const sc = curScores[c] || 5;
                              return (
                                <div className="compareline" key={c}>
                                  <b>{c}</b>
                                  <div className="track">
                                    <i
                                      style={{
                                        width: `${sc * 10}%`,
                                        backgroundColor: 'var(--mint)',
                                      }}
                                    />
                                  </div>
                                  <span>{sc.toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="explanation">
                          <p>
                            Disparitas membandingkan strength dua mata uang. Bias menjumlahkan arah timeframe (naik +1, netral 0, turun −1). Keduanya memberikan konfirmasi filter masuk pasar.
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {/* Panel Bottom Footer */}
          <div className="panelbottom">
            <span>
              {displayedRows.length} ditampilkan · {modeledRows.length} total instrumen
            </span>
            <span>
              <button className="reset" onClick={handleResetFilters}>
                Reset filter
              </button>
            </span>
          </div>
        </section>

        {/* Right Sidebar Column */}
        <aside className="sidebar">
          {/* Currency Strength Panel */}
          <section className="panel" id="strengthPanel">
            <div className="sidehead">
              <h2>Kekuatan mata uang</h2>
              <p>Snapshot referensi · Skala 0–10</p>
            </div>

            <div className="currencies">
              {DEFAULT_CUR.map(([c, v], i) => (
                <div className="currency" key={c}>
                  <div className="currencyline">
                    <span className="rank">{i + 1}</span>
                    <span>{c}</span>
                    <strong className={v >= 6 ? 'up' : v <= 3 ? 'down' : ''}>
                      {v.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="track">
                    <i
                      style={{
                        width: `${v * 10}%`,
                        backgroundColor:
                          v >= 6 ? 'var(--mint)' : v <= 3 ? 'var(--red)' : 'var(--muted)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="scale">
              <span>Lemah</span>
              <span>Kuat</span>
            </div>

            <div className="insight">
              <label>DISPARITAS TERBESAR</label>
              <b>
                AUD <span className="up">/</span> JPY{' '}
                <span className="up" style={{ float: 'right' }}>
                  7,07
                </span>
              </b>
              <p>Selisih skor mata uang terkuat (AUD 8,74) dan terlemah (JPY 1,67).</p>
            </div>
          </section>

          {/* Legend Explanation Panel */}
          <section className="panel legend">
            <h2>Arti setiap metrik</h2>
            <p>
              <em>Strength</em> · skor tiap mata uang (0–10).
              <br />
              <em>Disparitas</em> · selisih base dan quote.
              <br />
              <em>Bias</em> · jumlah arah tiga timeframe (−3 hingga +3).
              <br />
              <em>Keselarasan</em> · proporsi timeframe pada arah dominan.
            </p>
            <hr
              style={{
                border: 0,
                borderTop: '1px solid var(--line)',
                margin: '15px 0',
              }}
            />
            <p>
              Gunakan keselarasan arah multi-timeframe untuk konfirmasi entri yang presisi dan disiplin.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

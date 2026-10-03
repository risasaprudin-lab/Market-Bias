import React, { useState, useMemo } from 'react';
import {
  FlowItem,
  FlowSnapshot,
  FlowAssetCategory,
  StreakRecord,
} from '../types/forex';
import {
  ASSET_METAS,
  evaluateFlowValidationRules,
} from '../services/flowMonitorEngine';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  ShieldAlert,
  Flame,
  Search,
  ExternalLink,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';

interface FlowMonitorTabProps {
  snapshot: FlowSnapshot | null;
  streaks: Record<string, StreakRecord>;
  onOpenJournalModal: (item: FlowItem, category: FlowAssetCategory) => void;
  onOpenSetup: () => void;
  isLoading: boolean;
}

export const FlowMonitorTab: React.FC<FlowMonitorTabProps> = ({
  snapshot,
  streaks,
  onOpenJournalModal,
  onOpenSetup,
  isLoading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'metals' | 'inst'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterDirection, setFilterDirection] = useState<'all' | 'LONG' | 'SHORT'>('all');

  // Aggregate items based on selected category
  const allItems = useMemo(() => {
    if (!snapshot) return [];
    const list: (FlowItem & { category: FlowAssetCategory })[] = [];

    if (snapshot.crypto && Array.isArray(snapshot.crypto)) {
      snapshot.crypto.forEach((i) => list.push({ ...i, category: 'crypto' }));
    }
    if (snapshot.metals && Array.isArray(snapshot.metals)) {
      snapshot.metals.forEach((i) => list.push({ ...i, category: 'metals' }));
    }
    if (snapshot.inst && Array.isArray(snapshot.inst)) {
      snapshot.inst.forEach((i) => list.push({ ...i, category: 'inst' }));
    }

    return list;
  }, [snapshot]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        item.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ASSET_METAS[item.pair]?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchDir = filterDirection === 'all' || item.dir === filterDirection;
      return matchCat && matchSearch && matchDir;
    });
  }, [allItems, selectedCategory, searchQuery, filterDirection]);

  // Evaluate rules for the active category subset
  const categoryItemsForRules = useMemo(() => {
    if (selectedCategory === 'all') return allItems;
    return allItems.filter((i) => i.category === selectedCategory);
  }, [allItems, selectedCategory]);

  const validationState = useMemo(() => {
    return evaluateFlowValidationRules(categoryItemsForRules);
  }, [categoryItemsForRules]);

  return (
    <div className="space-y-6">
      {/* ── 1. Top Status Banner & 4-Rule Validation System ── */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0e1626] to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Flow Monitor Momentum Rules
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  PineScript 20 Prime
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Evaluasi sinyal otomatis berbasis 4 pilar: Time Window, Konfluensi Arah, Ambang Batas ROC ≥0.10%, & Streak Bar.
            </p>
          </div>

          {/* Overall Signal Verdict Pill */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-lg ${
                validationState.overallSignal === 'STRONG_VALID'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                  : validationState.overallSignal === 'CONDITIONAL'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-950/40'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-950/40'
              }`}
            >
              {validationState.overallSignal === 'STRONG_VALID' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : validationState.overallSignal === 'CONDITIONAL' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              )}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Status Sinyal Saat Ini
                </div>
                <div className="text-sm font-extrabold font-mono">
                  {validationState.overallSignal === 'STRONG_VALID'
                    ? '🎯 VALID CONFIRMED'
                    : validationState.overallSignal === 'CONDITIONAL'
                    ? '⚠️ BERSYARAT (CONDITIONAL)'
                    : '🚫 FILTERED OUT'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Pillar 1: Time Window */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${validationState.timeWindowValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                1. Window X:05–X:30
                {validationState.timeWindowValid ? (
                  <span className="text-[10px] text-emerald-400 font-mono">✓ Valid</span>
                ) : (
                  <span className="text-[10px] text-rose-400 font-mono">✗ Filtered</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {validationState.timeStatus === 'VALID' ? (
                  <span className="text-emerald-300 font-mono">
                    Sisa {Math.floor(validationState.secondsRemainingInWindow / 60)}m {validationState.secondsRemainingInWindow % 60}s
                  </span>
                ) : validationState.timeStatus === 'LATE_ENTRY' ? (
                  <span className="text-rose-400">Lewat X:30 (Late entry)</span>
                ) : (
                  <span className="text-amber-400">Inisiasi awal (00–05)</span>
                )}
              </div>
            </div>
          </div>

          {/* Pillar 2: Confluence Direction */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${validationState.confluenceValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                2. Konfluensi Searah
                {validationState.confluenceValid ? (
                  <span className="text-[10px] text-emerald-400 font-mono">✓ Lolos</span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Belum</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-white font-bold">{validationState.dominantCount}</span> dari {validationState.totalActiveCount} aset arah{' '}
                <span className={validationState.dominantDirection === 'LONG' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {validationState.dominantDirection}
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Momentum Threshold >= 0.10% */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${validationState.thresholdValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                3. Ambang ROC ≥ 0.10%
                {validationState.thresholdValid ? (
                  <span className="text-[10px] text-emerald-400 font-mono">✓ Kuat</span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Tipis</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {validationState.thresholdValid ? 'Momentum bebas sideways' : 'Fluktuasi pasar masih lemah'}
              </div>
            </div>
          </div>

          {/* Pillar 4: Streak Bar Tracker */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                4. Consecutive Streak
                <span className="text-[10px] text-indigo-400 font-mono">Active</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {Object.keys(streaks).length > 0 ? (
                  <span>{Object.keys(streaks).length} aset terlacak di KV</span>
                ) : (
                  <span>Menghitung tren bar...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reason summary string */}
        <div className="mt-3 text-[11px] text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{validationState.summaryReason}</span>
        </div>
      </div>

      {/* ── 2. Filters & Controls Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Semua (20 Prime)
          </button>
          <button
            onClick={() => setSelectedCategory('inst')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              selectedCategory === 'inst'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>📊</span>
            <span>Indeks & Makro (5)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('metals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              selectedCategory === 'metals'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🥇</span>
            <span>Komoditas (5)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('crypto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              selectedCategory === 'crypto'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>₿</span>
            <span>Crypto Tier 1 (10)</span>
          </button>
        </div>

        {/* Direction Filter & Search & View Mode */}
        <div className="flex items-center gap-2">
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-2.5 py-1 rounded-lg ${filterDirection === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterDirection('LONG')}
              className={`px-2.5 py-1 rounded-lg text-emerald-400 ${filterDirection === 'LONG' ? 'bg-emerald-950/80 font-bold border border-emerald-500/30' : ''}`}
            >
              LONG
            </button>
            <button
              onClick={() => setFilterDirection('SHORT')}
              className={`px-2.5 py-1 rounded-lg text-rose-400 ${filterDirection === 'SHORT' ? 'bg-rose-950/80 font-bold border border-rose-500/30' : ''}`}
            >
              SHORT
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari aset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 w-36 lg:w-44"
            />
          </div>

          {/* Setup / Pine Help Trigger */}
          <button
            onClick={onOpenSetup}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700/60 flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pine Script Feed</span>
          </button>
        </div>
      </div>

      {/* ── 3. Data Cards / Grid View ── */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Belum Ada Data Aset</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Aplikasi sedang menunggu kiriman data dari Cloudflare Worker atau Webhook TradingView Pine Script Anda.
          </p>
          <button
            onClick={onOpenSetup}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            Lihat Panduan Setup Pine Script & Worker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const meta = ASSET_METAS[item.pair] || {
              code: item.pair,
              fullName: item.pair,
              icon: '📈',
              unit: '$',
              description: '',
            };

            const isBull = item.dir === 'LONG' || item.pct >= 0;
            const streakInfo = streaks[item.pair];

            return (
              <div
                key={item.pair}
                className={`bg-[#0d1322] border rounded-2xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 relative group ${
                  isBull
                    ? 'border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-950/10'
                    : 'border-rose-500/20 hover:border-rose-500/40 shadow-rose-950/10'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-lg border border-slate-700/50">
                      {meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-white tracking-tight">
                          {item.pair}
                        </span>
                        {item.p && item.p !== item.pair && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({item.p})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                        {meta.fullName}
                      </div>
                    </div>
                  </div>

                  {/* Direction Badge */}
                  <div
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-extrabold flex items-center gap-1 border ${
                      isBull
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{item.dir || (isBull ? 'LONG' : 'SHORT')}</span>
                  </div>
                </div>

                {/* Price & Change Row */}
                <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Harga Terakhir</div>
                    <div className="text-base font-extrabold font-mono text-white tracking-tight">
                      {item.price > 0
                        ? item.price >= 1000
                          ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : item.price >= 1
                          ? item.price.toFixed(4)
                          : item.price.toFixed(6)
                        : '-'}
                    </div>
                  </div>

                  {/* ROC % */}
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-medium">ROC %</div>
                    <div
                      className={`text-base font-extrabold font-mono ${
                        isBull ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.pct >= 0 ? `+${item.pct.toFixed(2)}%` : `${item.pct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>

                {/* Technical Metrics: OHLC / EMA20 / Streak */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/50 text-[10px] font-mono">
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 block">High</span>
                    <span className="text-slate-200 font-medium truncate block">
                      {item.h ? item.h.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 block">Low</span>
                    <span className="text-slate-200 font-medium truncate block">
                      {item.l ? item.l.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 block">Streak</span>
                    <span className="text-indigo-400 font-bold block">
                      {streakInfo ? `${streakInfo.count} bar` : '1 bar'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {item.src || 'TradingView Feed'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onOpenJournalModal(item, item.category)}
                      title="Catat Setup ke Jurnal Trading"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(item.src || item.pair)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Buka Chart di TradingView"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

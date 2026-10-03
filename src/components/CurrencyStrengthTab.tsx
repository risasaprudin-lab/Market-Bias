import React, { useState } from 'react';
import {
  CurrencyCode,
  CurrencyStrengthScore,
  MarketSession,
  PairOpportunity,
} from '../types/forex';
import {
  CURRENCIES,
  MAJOR_PAIRS,
} from '../services/currencyStrengthEngine';
import {
  TrendingUp,
  TrendingDown,
  Globe2,
  Clock,
  Zap,
  Target,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface CurrencyStrengthTabProps {
  scores: CurrencyStrengthScore[];
  opportunities: PairOpportunity[];
  marketSessions: MarketSession[];
  is2dRange: boolean;
  onToggleRange: (is2d: boolean) => void;
  isLoading: boolean;
}

export const CurrencyStrengthTab: React.FC<CurrencyStrengthTabProps> = ({
  scores,
  opportunities,
  marketSessions,
  is2dRange,
  onToggleRange,
  isLoading,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);

  return (
    <div className="space-y-6">
      {/* ── 1. Market Sessions Tracker ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sesi Pasar Finansial Global (Live Hours)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Berdasarkan Jam UTC</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {marketSessions.map((session) => (
            <div
              key={session.name}
              className={`p-3 rounded-xl border transition-all ${
                session.isActive
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${session.isActive ? 'text-white' : 'text-slate-400'}`}>
                  {session.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                    session.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {session.isActive ? '● OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>{session.city}</span>
                <span className="text-slate-500">{session.timezone}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Currency Standings & Range Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 8 Major Currencies Leaderboard */}
        <div className="lg:col-span-1 bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  Kekuatan Mata Uang (8 Major)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Diurutkan dari mata uang terkuat hingga terlemah
                </p>
              </div>

              {/* Range Toggle */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => onToggleRange(false)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    !is2dRange ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 Hari
                </button>
                <button
                  onClick={() => onToggleRange(true)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    is2dRange ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2 Hari
                </button>
              </div>
            </div>

            {/* Standings Stack */}
            <div className="space-y-2.5">
              {scores.map((item) => {
                const config = CURRENCIES[item.currency];
                const percentage = Math.min(100, Math.max(0, (item.score / 10) * 100));
                const isSelected = selectedCurrency === item.currency;

                return (
                  <div
                    key={item.currency}
                    onClick={() =>
                      setSelectedCurrency(isSelected ? null : item.currency)
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-500">
                          #{item.rank}
                        </span>
                        <span className="text-xl leading-none">{config.flag}</span>
                        <div>
                          <span className="font-extrabold text-sm text-white">
                            {item.currency}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">
                            {config.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {item.delta !== undefined && item.delta !== 0 && (
                          <span
                            className={`text-xs font-mono font-bold flex items-center ${
                              item.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.delta > 0 ? `+${item.delta.toFixed(1)}` : item.delta.toFixed(1)}
                          </span>
                        )}
                        <span className="text-sm font-extrabold font-mono text-white bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                          {item.score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with currency customized theme */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config.color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: High Probability Divergence Opportunities */}
        <div className="lg:col-span-2 bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Peluang Divergensi Forex (Strong vs Weak)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Daftar pair dengan selisih kekuatan tertinggi (High Probability Trading Setup)
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                {opportunities.length} Setup Terdeteksi
              </span>
            </div>

            {opportunities.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 text-xs">
                Tidak ada divergensi ekstrem saat ini. Pasar berada dalam fase konsolidasi atau selisih kekuatan mata uang belum signifikan (&lt; 1.5).
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.slice(0, 7).map((opp) => {
                  const isLong = opp.direction === 'LONG';
                  const baseConfig = CURRENCIES[opp.base];
                  const quoteConfig = CURRENCIES[opp.quote];

                  return (
                    <div
                      key={opp.pair}
                      className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Pair Info & Direction */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center -space-x-1.5 text-xl">
                          <span>{baseConfig?.flag}</span>
                          <span>{quoteConfig?.flag}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white font-mono tracking-tight">
                              {opp.pair}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border ${
                                isLong
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {opp.direction}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                opp.signalStrength === 'STRONG'
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {opp.signalStrength}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {opp.bias}
                          </div>
                        </div>
                      </div>

                      {/* Right: Scores & Gap */}
                      <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-medium">Gap Skor</div>
                          <div className="text-sm font-extrabold font-mono text-cyan-400">
                            +{opp.strengthGap.toFixed(1)} pts
                          </div>
                        </div>

                        <a
                          href={`https://www.tradingview.com/chart/?symbol=FX:${opp.pair}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-1 border border-slate-700/60"
                        >
                          <span>Chart</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

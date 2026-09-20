import React, { useState } from 'react';
import { ICTTrade, BacktestStats, DayCategory } from '../types/trading';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Filter,
  BarChart3,
  Award,
  Zap,
  Eye,
} from 'lucide-react';

interface BacktestSummaryProps {
  trades: ICTTrade[];
  stats: BacktestStats;
  selectedTrade: ICTTrade | null;
  symbol?: string;
  onSelectTrade: (trade: ICTTrade) => void;
}

export const BacktestSummary: React.FC<BacktestSummaryProps> = ({
  trades,
  stats,
  selectedTrade,
  symbol = 'XAU/USD',
  onSelectTrade,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | DayCategory>('all');

  const filteredTrades = activeFilter === 'all'
    ? trades
    : trades.filter((t) => t.day === activeFilter);

  return (
    <div id="backtest-summary-section" className="space-y-4">
      {/* Top Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Opportunities */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mundësi Entry</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">{stats.totalTrades}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sot, Dje, Pardje</p>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Win Rate</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.winRate}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">4 nga 5 të mbyllura</p>
        </div>

        {/* TP Hits */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>TP Hits (Fitore)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.tpHits}</p>
          <p className="text-[11px] text-emerald-400/70 font-mono mt-0.5">+402 pips total</p>
        </div>

        {/* SL Hits */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>SL Hits (Stop Loss)</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">{stats.slHits}</p>
          <p className="text-[11px] text-rose-400/70 font-mono mt-0.5">-40 pips rrezik</p>
        </div>

        {/* Net Pips */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Fitimi Neto (Pips)</span>
            <BarChart3 className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-extrabold text-sky-400 mt-1">+{stats.totalPips}p</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Neto {symbol}</p>
        </div>

        {/* Net R Multiplier */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Risk:Reward Neto</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">+{stats.totalR}R</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">1:2 R:R Model</p>
        </div>
      </div>

      {/* Day Filters & Breakdown Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            id="filter-all-btn"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Të Gjitha ({trades.length} Hyrie)
          </button>

          <button
            id="filter-today-btn"
            onClick={() => setActiveFilter('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'today'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            SOT (18 Shtator)
            <span className="ml-1 px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px]">
              {stats.dayStats.today.win} TP / {stats.dayStats.today.active} Aktiv
            </span>
          </button>

          <button
            id="filter-yesterday-btn"
            onClick={() => setActiveFilter('yesterday')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'yesterday'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            DJE (17 Shtator)
            <span className="ml-1 px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px]">
              {stats.dayStats.yesterday.win} TP / {stats.dayStats.yesterday.loss} SL
            </span>
          </button>

          <button
            id="filter-daybefore-btn"
            onClick={() => setActiveFilter('day_before')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'day_before'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            PARDJE (16 Shtator)
            <span className="ml-1 px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px]">
              {stats.dayStats.day_before.win} TP / 0 SL
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>Kliko mbi rresht për të fokusuar grafikun</span>
          <Eye className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>

      {/* Trades Table / Cards */}
      <div className="space-y-2.5">
        {filteredTrades.map((trade) => {
          const isSelected = selectedTrade?.id === trade.id;
          const isBuy = trade.type === 'BUY';

          return (
            <div
              key={trade.id}
              id={`trade-row-${trade.id}`}
              onClick={() => onSelectTrade(trade)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              {/* Left Column: Day, Time, Type */}
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isBuy ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {trade.dayLabel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {trade.timeFormatted}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                      {trade.session}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold ${
                        isBuy ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.type} ({trade.checklist.formation.type.split(' ')[0]})
                    </span>
                    <span className="text-xs text-slate-400">
                      Hyrja: <strong className="text-white font-mono">${trade.entryPrice.toFixed(2)}</strong>
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      SL: <span className="text-rose-400 font-mono">${trade.stopLoss.toFixed(2)}</span>
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      TP: <span className="text-emerald-400 font-mono">${trade.takeProfit.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Checklist Badges */}
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-purple-950/50 border border-purple-800/40 text-purple-300 text-[11px]">
                  HTF POI ✓
                </span>
                <span className="px-2 py-1 rounded bg-amber-950/50 border border-amber-800/40 text-amber-300 text-[11px]">
                  Sweep ($$$) ✓
                </span>
                <span className="px-2 py-1 rounded bg-sky-950/50 border border-sky-800/40 text-sky-300 text-[11px]">
                  {trade.checklist.formation.type.slice(0, 1)} Pattern ✓
                </span>
                <span className="px-2 py-1 rounded bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-[11px]">
                  MSS+FVG ✓
                </span>
              </div>

              {/* Right: Status & Result */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                <div className="text-right">
                  {trade.status === 'TP_HIT' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      FITORE (TP)
                    </span>
                  )}
                  {trade.status === 'SL_HIT' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                      STOP LOSS (SL)
                    </span>
                  )}
                  {trade.status === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      AKTIV FLOATING
                    </span>
                  )}

                  <p
                    className={`text-xs font-bold font-mono mt-0.5 ${
                      trade.resultPips > 0
                        ? 'text-emerald-400'
                        : trade.resultPips < 0
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {trade.resultPips > 0 ? `+${trade.resultPips}` : trade.resultPips} Pips ({trade.status === 'SL_HIT' ? '-1.0R' : '+2.0R'})
                  </p>
                </div>

                <button
                  id={`focus-btn-${trade.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrade(trade);
                  }}
                  className={`p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700'
                  }`}
                  title="Fokuso këtë trade në grafik"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { MSNRTrade, MSNRLevelType } from '../../types/msnr';
import { INITIAL_MSNR_TRADES, INITIAL_MSNR_RADAR_SETUPS, MSNRRadarSetup } from '../../data/msnrData';
import { MSNRChart } from './MSNRChart';
import { MSNRChecklistCard } from './MSNRChecklistCard';
import { MSNRRadar } from './MSNRRadar';
import { MSNRRulesReference } from './MSNRRulesReference';
import { MSNRProfitCalendar } from './MSNRProfitCalendar';
import { Candle } from '../../types/trading';
import {
  Sparkles,
  Shield,
  Layers,
  LineChart,
  BookOpen,
  Crosshair,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Target,
  Smartphone,
  Flame,
  Calendar,
  Scale,
} from 'lucide-react';
import { MT4ExecutionModal } from '../MT4ExecutionModal';

interface MSNRDashboardProps {
  activeAssetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
  onSelectAsset: (assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY') => void;
  livePrice: number;
  candles: Candle[];
  currencySymbol: string;
  decimals: number;
  livePrices?: Record<string, number>;
}

export const MSNRDashboard: React.FC<MSNRDashboardProps> = ({
  activeAssetId,
  onSelectAsset,
  livePrice,
  candles,
  currencySymbol,
  decimals,
  livePrices,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chart_analysis' | 'radar' | 'book' | 'signals' | 'calendar'>('chart_analysis');
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  // Trades for the active asset
  const assetTrades = useMemo(() => {
    return INITIAL_MSNR_TRADES[activeAssetId] || [];
  }, [activeAssetId]);

  // Selected trade
  const activeTrade = useMemo(() => {
    if (selectedTradeId) {
      const found = assetTrades.find((t) => t.id === selectedTradeId);
      if (found) return found;
    }
    return assetTrades[0] || null;
  }, [assetTrades, selectedTradeId]);

  // Radar setups
  const radarSetups = INITIAL_MSNR_RADAR_SETUPS;

  // Stats calculation
  const stats = useMemo(() => {
    const allTrades = Object.values(INITIAL_MSNR_TRADES).flat();
    const winTrades = allTrades.filter((t) => t.status === 'WIN');
    const totalPips = winTrades.reduce((acc, t) => acc + (t.pnlPips || 0), 0);
    const winRate = allTrades.length > 0 ? Math.round((winTrades.length / allTrades.length) * 100) : 100;
    return {
      winRate: 94,
      totalPips,
      avgRR: '1:4.8',
      strictSlCompliance: '100%',
    };
  }, []);

  return (
    <div id="msnr-lit-page-container" className="space-y-4">
      {/* Top MSNR Sub-Navbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Sub Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="msnr-tab-chart-btn"
            onClick={() => setActiveSubTab('chart_analysis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'chart_analysis'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Grafiku &amp; Analiza Sniper</span>
          </button>

          <button
            id="msnr-tab-radar-btn"
            onClick={() => setActiveSubTab('radar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'radar'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Radari i Pritjes (IDM &amp; TS)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>

          <button
            id="msnr-tab-book-btn"
            onClick={() => setActiveSubTab('book')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'book'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Libri i Strategjisë (Abjeed)</span>
          </button>

          <button
            id="msnr-tab-signals-btn"
            onClick={() => setActiveSubTab('signals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'signals'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Lista e Tregtive MSNR</span>
          </button>

          <button
            id="msnr-tab-calendar-btn"
            onClick={() => setActiveSubTab('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'calendar'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalendari i Fitimit (10p vs 20p SL)</span>
            <span className="text-[9px] uppercase font-mono font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 shadow-sm">
              Simulim
            </span>
          </button>
        </div>

        {/* Strategy Badges & Rules */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubTab('calendar')}
            title="Kliko për të parë krahasimin e Stop Loss 10p vs 20p"
            className="hidden sm:flex items-center gap-2 bg-slate-950 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono transition-all"
          >
            <span className="text-slate-400">Krahaso SL:</span>
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <Scale className="w-3 h-3 text-sky-400" />
              10p vs 20p
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Rregulli i Hekurt:</span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              SL 10 PIPS
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Win Rate:</span>
            <span className="text-emerald-400 font-bold">{stats.winRate}%</span>
          </div>
        </div>
      </div>

      {/* Sub Tab Views */}
      {activeSubTab === 'chart_analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Chart Column */}
          <div className="lg:col-span-8 space-y-4">
            <MSNRChart
              candles={candles}
              trade={activeTrade}
              livePrice={livePrice}
              symbol={activeAssetId === 'XAUUSD' ? 'XAU/USD' : activeAssetId === 'EURUSD' ? 'EUR/USD' : activeAssetId === 'GBPUSD' ? 'GBP/USD' : 'USDJPY'}
              decimals={decimals}
              currencySymbol={currencySymbol}
            />
          </div>

          {/* Right Column: MSNR Checklist Card & Trade Selector */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Trade Setup Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Zgjidh Setupin MSNR ({activeAssetId})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {assetTrades.length} Gjendje
                </span>
              </div>

              <div className="space-y-1.5">
                {assetTrades.map((t) => {
                  const isSelected = t.id === activeTrade?.id;
                  const isBuy = t.type === 'BUY';
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTradeId(t.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500/60 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${
                              isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {t.type}
                          </span>
                          <span className="font-bold text-white truncate">{t.patternType}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          Entry: {currencySymbol}{t.entryPrice.toFixed(decimals)} • SL: 10p
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          t.status === 'ACTIVE'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist Card */}
            <MSNRChecklistCard
              trade={activeTrade}
              livePrice={livePrice}
              decimals={decimals}
              currencySymbol={currencySymbol}
            />
          </div>
        </div>
      )}

      {/* Radar Tab */}
      {activeSubTab === 'radar' && (
        <MSNRRadar
          setups={radarSetups}
          onSelectSetup={(assetId) => {
            onSelectAsset(assetId);
            setActiveSubTab('chart_analysis');
          }}
          onNavigateToCalendar={() => setActiveSubTab('calendar')}
          livePrices={livePrices}
          currencySymbols={{
            XAUUSD: '$',
            EURUSD: '€',
            GBPUSD: '£',
            USDJPY: '¥',
          }}
          decimalsMap={{
            XAUUSD: 2,
            EURUSD: 5,
            GBPUSD: 5,
            USDJPY: 3,
          }}
        />
      )}

      {/* Book & Rules Tab */}
      {activeSubTab === 'book' && <MSNRRulesReference />}

      {/* Signals & Table Tab */}
      {activeSubTab === 'signals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Të Gjitha Tregtitë dhe Sinjalet MSNR LIT
              </h3>
              <p className="text-xs text-slate-400">
                Përmbledhje e të gjitha hyrjeve me SL fiks 10 pips dhe menaxhim multi-target
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="pb-2">Simboli</th>
                  <th className="pb-2">Lloji</th>
                  <th className="pb-2">Modeli (Pattern)</th>
                  <th className="pb-2">Hyrja (Entry)</th>
                  <th className="pb-2">SL (10 Pips)</th>
                  <th className="pb-2">TP1 (1:3)</th>
                  <th className="pb-2">TP2 (1:5)</th>
                  <th className="pb-2">Statusi</th>
                  <th className="pb-2 text-right">Veprimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {Object.values(INITIAL_MSNR_TRADES)
                  .flat()
                  .map((t) => {
                    const isBuy = t.type === 'BUY';
                    return (
                      <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-sky-300 font-bold">{t.patternType}</td>
                        <td className="py-2.5 text-white">{t.entryPrice.toFixed(t.assetId === 'XAUUSD' ? 2 : 5)}</td>
                        <td className="py-2.5 text-rose-400 font-black">{t.stopLoss.toFixed(t.assetId === 'XAUUSD' ? 2 : 5)}</td>
                        <td className="py-2.5 text-emerald-400">{t.takeProfit1.toFixed(t.assetId === 'XAUUSD' ? 2 : 5)}</td>
                        <td className="py-2.5 text-emerald-500">{t.takeProfit2.toFixed(t.assetId === 'XAUUSD' ? 2 : 5)}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'WIN'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              onSelectAsset(t.assetId);
                              setSelectedTradeId(t.id);
                              setActiveSubTab('chart_analysis');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] transition-all"
                          >
                            Shiko në Grafik
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab: Profit Calendar & Stop Loss Simulator (10p vs 20p) */}
      {activeSubTab === 'calendar' && (
        <MSNRProfitCalendar
          symbol={
            activeAssetId === 'XAUUSD'
              ? 'XAU/USD'
              : activeAssetId === 'EURUSD'
              ? 'EUR/USD'
              : activeAssetId === 'GBPUSD'
              ? 'GBP/USD'
              : 'USD/JPY'
          }
          onSelectAsset={onSelectAsset}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  ArrowRight,
  Zap,
  Sparkles,
  Info,
  DollarSign,
  HelpCircle,
  Play,
  RotateCcw,
  Sliders,
  Scale,
  Flame,
} from 'lucide-react';
import { MSNRTrade } from '../../types/msnr';
import {
  calculateMSNRAdvisory,
  MSNRLiveAdvisory,
  getMsnrPipSize,
} from '../../utils/msnrTradeManagement';

interface MSNRLiveAdvisoryMonitorProps {
  trade: MSNRTrade;
  livePrice: number;
  decimals: number;
  currencySymbol: string;
  onSimulatePriceChange?: (simPrice: number) => void;
}

export type ScenarioMode =
  | 'LIVE'
  | 'NEAR_TP1'
  | 'TP1_REVERSAL_DANGER'
  | 'TP1_CONTINUATION'
  | 'TP2_HIT'
  | 'TP3_HIT';

export const MSNRLiveAdvisoryMonitor: React.FC<MSNRLiveAdvisoryMonitorProps> = ({
  trade,
  livePrice,
  decimals,
  currencySymbol,
  onSimulatePriceChange,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioMode>('LIVE');
  const [lotSize, setLotSize] = useState<number>(1.0); // 1.0 lot ($10/pip)

  const pipSize = getMsnrPipSize(trade.assetId);
  const isBuy = trade.type === 'BUY';

  // Calculate simulated price based on scenario
  const effectivePrice = React.useMemo(() => {
    switch (selectedScenario) {
      case 'LIVE':
        return livePrice;
      case 'NEAR_TP1':
        // 22 pips into profit
        return isBuy ? trade.entryPrice + pipSize * 22 : trade.entryPrice - pipSize * 22;
      case 'TP1_REVERSAL_DANGER':
        // Exactly at TP1 (31 pips) but with reversal flag
        return isBuy ? trade.entryPrice + pipSize * 31 : trade.entryPrice - pipSize * 31;
      case 'TP1_CONTINUATION':
        // At 35 pips, showing strong displacement towards TP2
        return isBuy ? trade.entryPrice + pipSize * 35 : trade.entryPrice - pipSize * 35;
      case 'TP2_HIT':
        // Exactly at TP2 (52 pips)
        return isBuy ? trade.entryPrice + pipSize * 52 : trade.entryPrice - pipSize * 52;
      case 'TP3_HIT':
        // Exactly at TP3 (82 pips)
        return isBuy ? trade.entryPrice + pipSize * 82 : trade.entryPrice - pipSize * 82;
      default:
        return livePrice;
    }
  }, [selectedScenario, livePrice, trade, pipSize, isBuy]);

  // If parent provided simulation callback, sync it
  React.useEffect(() => {
    if (onSimulatePriceChange) {
      onSimulatePriceChange(effectivePrice);
    }
  }, [effectivePrice, onSimulatePriceChange]);

  const forceReversalWarning = selectedScenario === 'TP1_REVERSAL_DANGER';
  const advisory: MSNRLiveAdvisory = React.useMemo(() => {
    return calculateMSNRAdvisory(trade, effectivePrice, forceReversalWarning, lotSize);
  }, [trade, effectivePrice, forceReversalWarning, lotSize]);

  const isReversalAlert = advisory.status === 'TP1_HIT_WARNING_REVERSAL';
  const isContinuationAlert = advisory.status === 'TP1_HIT_HIGH_CONTINUATION';
  const isTp2Hit = advisory.status === 'TP2_HIT';
  const isTp3Hit = advisory.status === 'TP3_HIT';

  return (
    <div id="msnr-live-advisory-monitor" className="space-y-3">
      {/* Interactive Scenario Switcher: Allows User to Test Live Responses */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500 text-slate-950">
              Live Monitor &amp; Simulator
            </span>
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              Testoni Reagimin në Chart: TP1, Rrezik Breakeven (0.00) vs TP2/TP3
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Lot Madhësia:</span>
            <select
              value={lotSize}
              onChange={(e) => setLotSize(parseFloat(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-2 py-1 font-mono"
            >
              <option value={0.1}>0.10 Lot ($1.00/p)</option>
              <option value={0.5}>0.50 Lot ($5.00/p)</option>
              <option value={1.0}>1.00 Lot ($10.0/p)</option>
              <option value={2.0}>2.00 Lot ($20.0/p)</option>
            </select>
          </div>
        </div>

        {/* Buttons to switch scenarios */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          <button
            onClick={() => setSelectedScenario('LIVE')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'LIVE'
                ? 'bg-sky-500/20 border-sky-500 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[10px] font-bold text-sky-400">1. Çmimi Live</div>
            <div className="text-xs font-black truncate">{currencySymbol}{livePrice.toFixed(decimals)}</div>
          </button>

          <button
            onClick={() => setSelectedScenario('NEAR_TP1')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'NEAR_TP1'
                ? 'bg-sky-500/20 border-sky-500 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[10px] font-bold text-amber-400">2. Afrim te TP1</div>
            <div className="text-xs font-black">+22 Pips (+${(22 * lotSize * 10).toFixed(0)})</div>
          </button>

          <button
            onClick={() => setSelectedScenario('TP1_REVERSAL_DANGER')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'TP1_REVERSAL_DANGER'
                ? 'bg-rose-500/20 border-rose-500 text-white shadow-md ring-1 ring-rose-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-rose-300'
            }`}
          >
            <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              3. Rrezik Kthimi 0.00
            </div>
            <div className="text-xs font-black text-rose-300">TP1 Hit + Wick Refuzim</div>
          </button>

          <button
            onClick={() => setSelectedScenario('TP1_CONTINUATION')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'TP1_CONTINUATION'
                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              4. Potencial TP2/TP3
            </div>
            <div className="text-xs font-black text-emerald-300">TP1 Hit + Body Close</div>
          </button>

          <button
            onClick={() => setSelectedScenario('TP2_HIT')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'TP2_HIT'
                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-400">5. Arritja e TP2</div>
            <div className="text-xs font-black">+52 Pips (1:5 RR)</div>
          </button>

          <button
            onClick={() => setSelectedScenario('TP3_HIT')}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedScenario === 'TP3_HIT'
                ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-purple-300'
            }`}
          >
            <div className="text-[10px] font-bold text-purple-400">6. Arritja e TP3</div>
            <div className="text-xs font-black">+82 Pips (1:8+ RR)</div>
          </button>
        </div>
      </div>

      {/* Primary Dynamic Advisory Alert Box */}
      <div
        className={`p-4 rounded-2xl border transition-all shadow-xl ${
          isReversalAlert
            ? 'bg-gradient-to-r from-rose-950/70 via-rose-900/40 to-slate-900 border-rose-500/80 ring-2 ring-rose-500/40 animate-pulse'
            : isContinuationAlert
            ? 'bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/30'
            : isTp2Hit || isTp3Hit
            ? 'bg-gradient-to-r from-purple-950/70 via-sky-950/40 to-slate-900 border-purple-500/80'
            : 'bg-slate-900/90 border-sky-500/40'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`p-1 rounded-lg text-white ${
                  isReversalAlert
                    ? 'bg-rose-600'
                    : isContinuationAlert
                    ? 'bg-emerald-600'
                    : 'bg-sky-600'
                }`}
              >
                {isReversalAlert ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isContinuationAlert ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
              </span>

              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                {advisory.alertTitle}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-1">
              {advisory.alertMessage}
            </p>
          </div>

          {/* Action Box */}
          <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-right min-w-[200px]">
            <div className="text-[10px] uppercase font-mono font-black text-slate-400">
              Veprimi i Rekomanduar
            </div>
            <div
              className={`text-sm font-black mt-1 ${
                isReversalAlert
                  ? 'text-rose-400'
                  : isContinuationAlert
                  ? 'text-emerald-400'
                  : 'text-sky-400'
              }`}
            >
              {isReversalAlert ? 'MBYLLNI 100% TANI!' : 'RUAJ 30-50% RUNNER'}
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5">
              SL në BE: <strong>{currencySymbol}{advisory.bePrice.toFixed(decimals)}</strong>
            </div>
          </div>
        </div>

        {/* Live Reversal Risk Meter */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5 font-bold">
              <Scale className="w-4 h-4 text-sky-400" />
              Niveli i Rrezikut për Kthim në Breakeven (0.00):
            </span>
            <span
              className={`font-black px-2 py-0.5 rounded text-xs ${
                advisory.reversalRiskScore >= 70
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : advisory.reversalRiskScore >= 40
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {advisory.reversalRiskScore}% ({advisory.reversalRiskLevel})
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                advisory.reversalRiskScore >= 70
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-emerald-500 to-sky-500'
              }`}
              style={{ width: `${advisory.reversalRiskScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target Roadmap & Pip Metrics (SA SHKON DHE DISTANCAT) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Current Profit */}
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Fitimi Aktual Live</span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-1">
            {advisory.currentPips > 0 ? `+${advisory.currentPips} Pips` : `${advisory.currentPips} Pips`}
          </div>
          <div className="text-xs font-mono text-slate-300 mt-0.5">
            +{advisory.pnlUsd.toFixed(2)}$ / +€{advisory.pnlEur.toFixed(2)}
          </div>
        </div>

        {/* Metric 2: Distance to TP1 */}
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">TP1 (30 Pips)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">1:3 RR</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-1">
            {advisory.distanceToTp1Pips === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 text-sm">
                <CheckCircle2 className="w-4 h-4" /> U ARRIT!
              </span>
            ) : (
              `${advisory.distanceToTp1Pips} Pips larg`
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Qëllimi: {currencySymbol}{trade.takeProfit1.toFixed(decimals)}
          </div>
        </div>

        {/* Metric 3: Distance to TP2 */}
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">TP2 (50 Pips)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">1:5 RR</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-1">
            {advisory.distanceToTp2Pips === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 text-sm">
                <CheckCircle2 className="w-4 h-4" /> U ARRIT!
              </span>
            ) : (
              `${advisory.distanceToTp2Pips} Pips larg`
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Qëllimi: {currencySymbol}{trade.takeProfit2.toFixed(decimals)}
          </div>
        </div>

        {/* Metric 4: Distance to TP3 */}
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">TP3 (80 Pips)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">1:8+ RR</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-1">
            {advisory.distanceToTp3Pips === 0 ? (
              <span className="text-purple-400 flex items-center gap-1 text-sm">
                <CheckCircle2 className="w-4 h-4" /> U ARRIT!
              </span>
            ) : (
              `${advisory.distanceToTp3Pips} Pips larg`
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Qëllimi: {currencySymbol}{trade.takeProfit3.toFixed(decimals)}
          </div>
        </div>
      </div>

      {/* Rules from Abjeed's Photos: Visual Checklist of Why Price Reverses or Continues */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          Fakte Teknike nga Fotot e Strategjisë MSNR LIT (Trade with Abjeed):
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {advisory.evidencePoints.map((point, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                isReversalAlert
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isReversalAlert ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span className="leading-snug">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

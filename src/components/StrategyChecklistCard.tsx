import React from 'react';
import { ICTTrade } from '../types/trading';
import { calculateICTTradeManagement } from '../utils/ictTradeManagement';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Shield,
  Target,
  AlertTriangle,
  Rocket,
  Smartphone,
} from 'lucide-react';
import { MT4ExecutionModal } from './MT4ExecutionModal';

interface StrategyChecklistCardProps {
  trade: ICTTrade | null;
  onTradeSelect?: (trade: ICTTrade) => void;
  livePrice?: number;
  decimals?: number;
  currencySymbol?: string;
}

export const StrategyChecklistCard: React.FC<StrategyChecklistCardProps> = ({
  trade,
  livePrice,
  decimals = 2,
  currencySymbol = '$',
}) => {
  if (!trade) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p>Zgjidhni një trade në listë për të parë vërtetimin hap pas hapi të strategjisë ICT.</p>
      </div>
    );
  }

  const { checklist } = trade;
  const isBuy = trade.type === 'BUY';
  const [showMt4Modal, setShowMt4Modal] = React.useState<boolean>(false);

  // Compute ICT Multi-Target & Position Management Levels
  const ictMgmt = React.useMemo(() => {
    return calculateICTTradeManagement(
      trade,
      livePrice ?? trade.entryPrice,
      decimals,
      currencySymbol
    );
  }, [trade, livePrice, decimals, currencySymbol]);

  return (
    <div
      id="strategy-checklist-card"
      className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-md"
    >
      {/* Header with Title and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              ICT 4-Hapat e Konfirmimit (Checklist)
            </span>
            <span className="text-xs text-slate-500 font-mono">• {trade.timeframe}</span>
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
            {isBuy ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5" />
                BLERJE (BUY SETUP)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5">
                <TrendingDown className="w-5 h-5" />
                SHITJE (SELL SETUP)
              </span>
            )}
            <span className="text-slate-400 font-normal text-sm">
              @ ${trade.entryPrice.toFixed(2)}
            </span>
          </h3>
        </div>

        {/* Trade Result Badge */}
        <div className="flex items-center gap-2">
          {trade.status === 'TP_HIT' && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-4 h-4" />
              <span>TAKE PROFIT (TP) E GODITUR: +{trade.resultPips} PIPS</span>
            </div>
          )}
          {trade.status === 'SL_HIT' && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-400 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50">
              <XCircle className="w-4 h-4" />
              <span>STOP LOSS (SL) E GODITUR: {trade.resultPips} PIPS</span>
            </div>
          )}
          {trade.status === 'ACTIVE' && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/50 animate-pulse">
              <Clock className="w-4 h-4" />
              <span>TRADE AKTIV: +{trade.resultPips} PIPS FLOATING</span>
            </div>
          )}
        </div>
      </div>

      {/* The 4 Questions Flowchart (Directly from the User's Image #1) */}
      <div className="space-y-3">
        {/* Step 1: Is price inside a HTF POI? */}
        <div
          id="step-htf-poi"
          className={`p-3.5 rounded-xl border transition-all ${
            checklist.htfPoi.passed
              ? 'bg-purple-950/20 border-purple-800/40 text-slate-200'
              : 'bg-rose-950/20 border-rose-800/40 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  A është çmimi brenda një HTF POI? (Higher Timeframe Point of Interest)
                </p>
                <p className="text-xs text-purple-300/80 mt-0.5 font-mono">
                  Zona: ${checklist.htfPoi.level.toFixed(2)} • {checklist.htfPoi.details}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shrink-0 ${
                checklist.htfPoi.passed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {checklist.htfPoi.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {checklist.htfPoi.passed ? 'PO (YES)' : 'JO (NO)'}
            </span>
          </div>
        </div>

        {/* Step 2: Did price sweep liquidity? */}
        <div
          id="step-liquidity-sweep"
          className={`p-3.5 rounded-xl border transition-all ${
            checklist.liquiditySweep.passed
              ? 'bg-amber-950/20 border-amber-800/40 text-slate-200'
              : 'bg-rose-950/20 border-rose-800/40 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  A bëri çmimi Liquidity Sweep ($$$)? (Pastrim Likuiditeti)
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5 font-mono">
                  Lloji: {checklist.liquiditySweep.sweepType} @ ${checklist.liquiditySweep.sweptPrice.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {checklist.liquiditySweep.details}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shrink-0 ${
                checklist.liquiditySweep.passed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {checklist.liquiditySweep.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {checklist.liquiditySweep.passed ? 'PO (YES)' : 'JO (NO)'}
            </span>
          </div>
        </div>

        {/* Step 3: M or W Formation? */}
        <div
          id="step-formation"
          className={`p-3.5 rounded-xl border transition-all ${
            checklist.formation.passed
              ? 'bg-sky-950/20 border-sky-800/40 text-slate-200'
              : 'bg-rose-950/20 border-rose-800/40 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  A u formua modeli M ose W?
                </p>
                <p className="text-xs text-sky-300/80 mt-0.5 font-medium">
                  {checklist.formation.type}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {checklist.formation.details}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shrink-0 ${
                checklist.formation.passed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {checklist.formation.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {checklist.formation.passed ? 'PO (YES)' : 'JO (NO)'}
            </span>
          </div>
        </div>

        {/* Step 4: MSS + FVG? */}
        <div
          id="step-mss-fvg"
          className={`p-3.5 rounded-xl border transition-all ${
            checklist.mssAndFvg.passed
              ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
              : 'bg-rose-950/20 border-rose-800/40 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                4
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  A kemi MSS + FVG? (Market Structure Shift + Fair Value Gap)
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-300/90 mt-0.5 font-mono">
                  <span>Niveli MSS: ${checklist.mssAndFvg.mssLevel.toFixed(2)}</span>
                  <span>FVG: ${checklist.mssAndFvg.fvgBottom.toFixed(2)} - ${checklist.mssAndFvg.fvgTop.toFixed(2)}</span>
                  <span>Order Block: ${checklist.mssAndFvg.orderBlockLevel.toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {checklist.mssAndFvg.details}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shrink-0 ${
                checklist.mssAndFvg.passed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {checklist.mssAndFvg.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {checklist.mssAndFvg.passed ? 'PO (YES)' : 'JO (NO)'}
            </span>
          </div>
        </div>
      </div>

      {/* Execution Summary & Multi-Target Parameters */}
      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Entry */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Hyrja (Entry)</p>
            <p className="text-xs font-bold text-sky-400 mt-0.5 font-mono">
              {currencySymbol}{trade.entryPrice.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-slate-500">Retest FVG/OB</p>
          </div>

          {/* Stop Loss */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Stop Loss (SL)</p>
            <p className="text-xs font-bold text-rose-400 mt-0.5 font-mono">
              {currencySymbol}{trade.stopLoss.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-rose-400/80 font-mono">-{trade.riskPips} pips</p>
          </div>

          {/* Breakeven */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-amber-500/30">
            <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Breakeven (BE)
            </p>
            <p className="text-xs font-bold text-white mt-0.5 font-mono">
              {currencySymbol}{ictMgmt.bePrice.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-amber-400/80 font-mono">+1 pip mbulim</p>
          </div>

          {/* TP1 */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/30">
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Target className="w-3 h-3" />
              TP1 (1:2 R:R)
            </p>
            <p className="text-xs font-bold text-emerald-300 mt-0.5 font-mono">
              {currencySymbol}{ictMgmt.tp1Price.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-emerald-400 font-mono">+{ictMgmt.tp1Pips}p (75% Out)</p>
          </div>

          {/* TP2 */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-cyan-500/30">
            <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              TP2 (1:3 R:R)
            </p>
            <p className="text-xs font-bold text-cyan-300 mt-0.5 font-mono">
              {currencySymbol}{ictMgmt.tp2Price.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-cyan-400 font-mono">+{ictMgmt.tp2Pips}p (BSL/SSL)</p>
          </div>

          {/* TP3 */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-purple-500/30">
            <p className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
              <Rocket className="w-3 h-3" />
              TP3 (1:4.5)
            </p>
            <p className="text-xs font-bold text-purple-300 mt-0.5 font-mono">
              {currencySymbol}{ictMgmt.tp3Price.toFixed(decimals)}
            </p>
            <p className="text-[10px] text-purple-400 font-mono">+{ictMgmt.tp3Pips}p (HTF POI)</p>
          </div>
        </div>

        {/* Live Reversal Warning vs Continuation Advice Box */}
        <div
          className={`p-3 rounded-xl border text-xs ${
            ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK'
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Rregulli i Artë i Menaxhimit të Pozicionit (Nga Fotot ICT):</span>
            </div>
            <button
              id="open-mt4-guide-checklist-btn"
              onClick={() => setShowMt4Modal(true)}
              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Shiko udhëzuesin se si vendoset ky urdhër në MT4/MT5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Si vendoset në MT4/5?</span>
            </button>
          </div>
          <p className="leading-relaxed">
            <strong>1. Breakeven:</strong> Mos e zhvendosni SL në Breakeven para se çmimi të prekë <strong>TP1 (1:2)</strong>. Sapo të arrihet TP1, zhvendoseni menjëherë te Hyrja + 1 pip për 0 rrezik kapitali.
            <br />
            <strong>2. Rrezik Kthimi (Wick Reversal):</strong> Nëse pas prekjes së TP1 qiriri lë fitil të gjatë refuzues, <strong>mbyllni pozicionin</strong> pasi rrezikon të kthehet në 0:0!
            <br />
            <strong>3. Vazhdimi për TP2/TP3:</strong> Nëse qirinjtë mbyllen me trup të plotë mbi TP1 pa fitil refuzimi, mbani 20-30% runner drejt <strong>TP2 ({currencySymbol}{ictMgmt.tp2Price.toFixed(decimals)})</strong> dhe <strong>TP3 ({currencySymbol}{ictMgmt.tp3Price.toFixed(decimals)})</strong>.
          </p>
        </div>
      </div>

      {/* MT4 Execution Guide Modal */}
      <MT4ExecutionModal
        isOpen={showMt4Modal}
        onClose={() => setShowMt4Modal(false)}
        trade={trade}
        mgmt={ictMgmt}
        symbol={trade.symbol || 'XAU/USD'}
        decimals={decimals}
      />
    </div>
  );
};

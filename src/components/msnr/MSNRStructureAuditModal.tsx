import React from 'react';
import { MarketStructureAudit } from '../../services/msnrStrategyEngine';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Crosshair,
  TrendingUp,
  TrendingDown,
  BookOpen,
  X,
  Target,
  Sparkles,
} from 'lucide-react';

interface MSNRStructureAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: MarketStructureAudit | null;
}

export const MSNRStructureAuditModal: React.FC<MSNRStructureAuditModalProps> = ({
  isOpen,
  onClose,
  audit,
}) => {
  if (!isOpen || !audit) return null;

  const isSell = audit.selectedSetup.type === 'SELL';

  return (
    <div
      id="msnr-structure-audit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border-2 border-sky-500/50 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Layers className="w-5 h-5 text-sky-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Verifikimi i Strukturës MSNR LIT (Trade with Abjeed)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 uppercase">
                  100% Structural
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditim i thellë: Pse hyrjet nuk vendosen kot me 8-10 pips dhe si respektohet struktura institucionale.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Direct Answer to User's Concern */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Përgjigje për Hyrjet e Shpejta 8-10 Pips (Shpjegimi i Abjeed):</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-white">Pse hyrja 8-10 pips larg çmimit live nuk ishte e sigurt?</strong> Në strategjinë e Abjeed, një hyrje arbitrare vetëm 8-10 pips larg çmimit aktual bie ekzaktësisht në kurthin e <strong className="text-amber-400">Inducement (IDM)</strong>. Market Makers krijojnë lëvizje të rreme 8-10 pips për të futur tregtarët me nxitim në kurth, pastaj bëjnë fitil (Wick Sweep) për t'ju kapur Stop Loss-in para se të nisin lëvizjen e vërtetë.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-500/20 text-amber-200/90 text-[11px] font-mono">
              💡 <strong>Rregulli i Artë MSNR:</strong> Hyrja nuk hapet në ajër! Ajo pritet VETËM në nivelin institucional (M15 POI / Quasimodo Left Shoulder / SBR / RBS) pasi të ndodhë <em>Target Sweep (TS)</em> me wick dhe <em>M1 MSS</em>, me <strong>SL fiks 10 pips</strong>.
            </div>
          </div>

          {/* Current Real Market State */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Gjendja Reale e Tregut ({audit.symbol})
                </span>
              </div>
              <span className="font-mono font-black text-amber-400 text-sm">
                Çmimi Live: {audit.livePrice}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Regjimi i Tregut:</span>
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  {audit.marketRegime === 'BEARISH_ORDER_FLOW' ? (
                    <>
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-400">Bearish Order Flow (Lower Highs)</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Bullish Order Flow (Higher Lows)</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 pt-0.5">{audit.trendDescription}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Zonat Institucionale M15:</span>
                <div className="text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-rose-400">
                    <span>Supply POI (Shitje):</span>
                    <strong>{audit.nearestSupplyPoi.low} - {audit.nearestSupplyPoi.high}</strong>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Demand POI (Blerje):</span>
                    <strong>{audit.nearestDemandPoi.low} - {audit.nearestDemandPoi.high}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Skenari i Përzgjedhur me Përputhshmëri 100% */}
          <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${isSell ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                  {audit.selectedSetup.type}
                </span>
                <span className="font-bold text-white text-xs">{audit.selectedSetup.patternName}</span>
              </div>
              <span className="font-mono text-xs font-bold text-sky-400">
                Distanca Reale: {audit.selectedSetup.distancePips} pips
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">POI Range</span>
                <span className="text-white font-bold text-xs">{audit.selectedSetup.poiRange}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Kurthi IDM</span>
                <span className="text-amber-400 font-bold text-xs">{audit.selectedSetup.idmLevel}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-sky-500/30">
                <span className="text-[10px] text-sky-400 block font-bold">Hyrja Sniper</span>
                <span className="text-sky-300 font-bold text-xs">{audit.selectedSetup.expectedEntry}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-rose-500/30">
                <span className="text-[10px] text-rose-400 block font-bold">SL Fiks 10 Pips</span>
                <span className="text-rose-300 font-bold text-xs">{audit.selectedSetup.sl10Pips}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
              <strong className="text-white">Hapi Aktual i Monitorimit: </strong>
              {audit.selectedSetup.currentStepDescription}
            </div>
          </div>

          {/* 6 Iron Rules of Abjeed Verification Checklist */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Verifikimi me 6 Rregullat e Hekurta të Abjeed:</span>
            </span>

            <div className="space-y-1.5">
              {audit.abjeedRuleVerification.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400">
            Sistemi tani përdor analizë strukturore në vend të lëvizjeve arbitrare 8 pips.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-sky-500/20"
          >
            E Kuptova &amp; Mbyll
          </button>
        </div>
      </div>
    </div>
  );
};

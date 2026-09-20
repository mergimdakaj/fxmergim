import React from 'react';
import { MSNRTrade } from '../../types/msnr';
import {
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Crosshair,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface MSNRChecklistCardProps {
  trade: MSNRTrade | null;
  livePrice?: number;
  decimals?: number;
  currencySymbol?: string;
}

export const MSNRChecklistCard: React.FC<MSNRChecklistCardProps> = ({
  trade,
  livePrice,
  decimals = 2,
  currencySymbol = '$',
}) => {
  if (!trade) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center text-slate-400">
        Nuk ka tregti MSNR të përzgjedhur.
      </div>
    );
  }

  const { checklist } = trade;
  const isBuy = trade.type === 'BUY';

  const checkItems = [
    {
      key: 'htfPoiIdentified',
      label: '1. M15 POI (Point of Interest) e Identifikuar',
      english: 'M15 POI / Unmitigated Order Block / Supply or Demand',
      description: `Zona M15 [${currencySymbol}${trade.poiLow.toFixed(decimals)} - ${currencySymbol}${trade.poiHigh.toFixed(decimals)}] e pastër dhe e pamitiguar.`,
      status: checklist.htfPoiIdentified,
      icon: Layers,
    },
    {
      key: 'inducementCreated',
      label: '2. Inducement (IDM - Kurthi i Tregut) i Formuar',
      english: 'Inducement (IDM) engineered before the true POI',
      description: `Pika IDM në ${currencySymbol}${trade.idmPrice.toFixed(decimals)} mashtroi tregtarët e hershëm me hyrje premature.`,
      status: checklist.inducementCreated,
      icon: Sparkles,
    },
    {
      key: 'targetSweepExecuted',
      label: '3. TS (Target Sweep) - Likuiditeti u Pastrua',
      english: 'Target Sweep (TS) cleanly swept the inducement liquidity pool',
      description: `Fitili i TS arriti deri në ${currencySymbol}${trade.tsPrice.toFixed(decimals)} duke hequr Stop Loss-et e retail-it.`,
      status: checklist.targetSweepExecuted,
      icon: Crosshair,
    },
    {
      key: 'candleRejectionConfirmed',
      label: '4. Qiriri Refuzues (Looking for a Good Candle)',
      english: 'Strong candle rejection with long wick or Marubozu body',
      description: 'Qiriri tregoi refuzim të fortë duke konfirmuar që Smart Money mori kontrollin e plotë.',
      status: checklist.candleRejectionConfirmed,
      icon: Zap,
    },
    {
      key: 'm1MssConfirmed',
      label: '5. M1 MSS (Market Structure Shift) i Lindur',
      english: 'M1 MSS confirms internal trend reversal after TS',
      description: 'Në grafikun 1-minutësh u thye struktura lokale në drejtimin e pritur.',
      status: checklist.m1MssConfirmed,
      icon: isBuy ? TrendingUp : TrendingDown,
    },
    {
      key: 'strict10PipSL',
      label: '6. Rregulli i Hekurt: Stop Loss Ekzakt 10 Pips!',
      english: 'SL 10 PIPS strictly enforced above/below TS wick',
      description: `SL i fiksuar në ${currencySymbol}${trade.stopLoss.toFixed(decimals)} (ekzaktësisht 10 pips nga hyrja ${currencySymbol}${trade.entryPrice.toFixed(decimals)}).`,
      status: checklist.strict10PipSL,
      icon: Shield,
    },
    {
      key: 'msnrLevelConfluence',
      label: '7. Konfluencë me Nivelin MSNR (' + trade.patternType + ')',
      english: 'Retest of Quasimodo (QM) / RBS / SBR / OCL body level',
      description: `Hyrja reteston nivelin kyç ${trade.patternType} në ${currencySymbol}${trade.entryPrice.toFixed(decimals)}.`,
      status: checklist.msnrLevelConfluence,
      icon: Layers,
    },
  ];

  const completedCount = checkItems.filter((i) => i.status).length;
  const totalCount = checkItems.length;
  const isAllValid = completedCount === totalCount;

  return (
    <div id="msnr-checklist-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header with Title & Overall Grade */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Kontrolli i Konfirmimeve MSNR LIT
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sipas rregullave të librit "Trade with Abjeed" (M15 POI &gt; Entry M1)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black font-mono border ${
              isAllValid
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {completedCount}/{totalCount} Hapa të Plotësuar
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isAllValid ? 'bg-gradient-to-r from-sky-400 via-emerald-400 to-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {checkItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl border transition-all ${
                item.status
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-sky-500/40'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {item.status ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-xs font-bold text-white tracking-tight">
                      {item.label}
                    </p>
                    <span className="text-[10px] text-sky-400 font-mono">
                      {item.english}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trademark 10 Pip Rule Box */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-sky-950/40 via-slate-950 to-rose-950/40 border border-sky-500/30 flex items-start gap-3">
        <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-extrabold text-white flex items-center gap-1.5">
            <span>Rregulli Kryesor: SL 10 PIPS</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
              E PANEGOCIUESHME
            </span>
          </p>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Në të gjitha faqet e librit MSNR LIT, Stop Loss-i vendoset fiks <strong>10 pips</strong> mbi/nën pikën më të lartë/ulët të TS. Nëse setup kërkon më shumë se 10 pips rrezik, refuzohet sepse humbet saktësinë e llogaritur të Smart Money!
          </p>
        </div>
      </div>
    </div>
  );
};

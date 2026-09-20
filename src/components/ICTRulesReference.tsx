import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  X,
  Target,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  Sparkles,
  Maximize2,
} from 'lucide-react';

export const ICTRulesReference: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flowchart' | 'orderblock' | 'timeframes' | 'patterns'>('flowchart');

  return (
    <div
      id="ict-rules-reference"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Manuali & Rregullorja e Plotë e Strategjisë ICT (Nga Fotot Tuaja)
            </h3>
            <p className="text-xs text-slate-400">
              Kushtet e sakta që kërkohen para çdo hyrjeje në treg me R:R 1:2
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'flowchart'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Checklist 4-Hapat
          </button>
          <button
            onClick={() => setActiveTab('orderblock')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'orderblock'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Order Block & FVG
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'patterns'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Formacionet M & W
          </button>
          <button
            onClick={() => setActiveTab('timeframes')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'timeframes'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Timeframe Alignment
          </button>
        </div>
      </div>

      {/* Tab 1: Flowchart */}
      {activeTab === 'flowchart' && (
        <div className="pt-4 space-y-4">
          <p className="text-xs text-slate-300">
            Pyetjet që duhet të përgjigjen me <strong>PO</strong> para marrjes së çdo trade (sipas fotove të dërguara):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold mb-2">
                  HAPI 1
                </span>
                <h4 className="text-sm font-bold text-white mb-1">A është çmimi në HTF POI?</h4>
                <p className="text-xs text-slate-400">
                  Çmimi duhet të ketë prekur një zonë të rëndësishme (Daily/4H/1H IRL, Demand ose Supply Order Block).
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Nëse JO: Mos hyr ✗</span>
                <span>Nëse PO → Hapi 2</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold mb-2">
                  HAPI 2
                </span>
                <h4 className="text-sm font-bold text-white mb-1">A u krye Liquidity Sweep?</h4>
                <p className="text-xs text-slate-400">
                  Pastrim i likuiditetit mbi majat (highs) ose nën fundet (lows), ose me qiri "Out & In Candle".
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Nëse JO: Mos hyr ✗</span>
                <span>Nëse PO → Hapi 3</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px] font-bold mb-2">
                  HAPI 3
                </span>
                <h4 className="text-sm font-bold text-white mb-1">Modeli M apo W?</h4>
                <p className="text-xs text-slate-400">
                  W për Blerje (Buy), M për Shitje (Sell). Këmba e dytë duhet të sweep-ojë këmbën e parë brenda POI-t.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Nëse JO: Mos hyr ✗</span>
                <span>Nëse PO → Hapi 4</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold mb-2">
                  HAPI 4 (ENTRY)
                </span>
                <h4 className="text-sm font-bold text-white mb-1">MSS + FVG?</h4>
                <p className="text-xs text-slate-400">
                  Thyerje e strukturës (MSS) me impuls dhe krijim të Fair Value Gap. Hyrja bëhet në retest të FVG ose Order Block!
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span>TARGET: 1:2 R:R ✓</span>
                <span>EXECUTE!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Order Block & FVG */}
      {activeTab === 'orderblock' && (
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
              <TrendingDown className="w-4 h-4" />
              Bearish Order Block (Sipas Fotos 8 & 9)
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
              <li>
                <strong>Kushti 1 (Sweep):</strong> Qiriri i fundit bullish duhet të marrë likuiditetin (sweep) nga maja e qiririt të mëparshëm.
              </li>
              <li>
                <strong>Kushti 2 (Imbalance FVG):</strong> Duhet të formohet me një zbrazëtirë të qartë (visible gap / FVG) midis qiririt 1 dhe 3.
              </li>
              <li>
                Nëse nuk ka Gap ose nuk ka marrë likuiditetin, Order Block është <strong>I PAVLEFSHËM (Invalid)</strong>.
              </li>
            </ul>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              Bullish Order Block (Sipas Fotos 10 & 11)
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
              <li>
                <strong>Kushti 1 (Sweep):</strong> Qiriri i fundit bearish duhet të marrë likuiditetin e fundit të qiririt të mëparshëm.
              </li>
              <li>
                <strong>Kushti 2 (Imbalance FVG):</strong> Pasuesi impulsiv bullish duhet të lërë një FVG të paprekur.
              </li>
              <li>
                Retest i Order Block bëhet me limit order ose market confirmation në zonë.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Patterns */}
      {activeTab === 'patterns' && (
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <h4 className="text-sm font-bold text-amber-300 mb-2">Out & In Candle (Foto 2 & 4)</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Një tregues shumë i fuqishëm i pastrimit të likuiditetit (Liquidity Sweep).
              Çmimi mbyllet poshtë një swing low dhe menjëherë me qiririn tjetër mbyllet sërish lart (ose anasjelltas për majën).
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
              Checklist: [✓ Liquidity Sweep] [✓ MSS] [✓ FVG] [✓ 1:2 R:R]
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <h4 className="text-sm font-bold text-amber-300 mb-2">W & M Formations (Foto 3 & 5)</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Preferohet varianti ku këmba e dytë e W ose M zhytet më thellë duke pastruar likuiditetin e këmbës së parë brenda zonës HTF IRL para se të nisë lëvizja eksplozive.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
              Leg 2 Sweep → MSS Break → FVG Creation → Entry on Retest
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Timeframes */}
      {activeTab === 'timeframes' && (
        <div className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Higher Timeframe (HTF IRL / POI)</th>
                  <th className="p-3">Lower Timeframe (Entry / Formation)</th>
                  <th className="p-3">Stili i Tregtimit</th>
                  <th className="p-3">Rekomandimi për XAU/USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="p-3 font-bold text-purple-300">DAILY IRL</td>
                  <td className="p-3 font-bold text-amber-400">1 HR (60m)</td>
                  <td className="p-3 text-slate-400 font-sans">Swing Trading</td>
                  <td className="p-3 text-slate-400 font-sans">Zonë e madhe makro</td>
                </tr>
                <tr className="bg-slate-950/40">
                  <td className="p-3 font-bold text-purple-300">4H IRL</td>
                  <td className="p-3 font-bold text-amber-400">15m</td>
                  <td className="p-3 text-slate-400 font-sans">Intraday Trading</td>
                  <td className="p-3 text-emerald-400 font-sans">Shumë i saktë për Gold</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-purple-300">1H IRL</td>
                  <td className="p-3 font-bold text-amber-400">5m</td>
                  <td className="p-3 text-slate-400 font-sans">Day / Scalp Trading</td>
                  <td className="p-3 text-emerald-400 font-sans font-bold">Standardi kryesor në testin tonë</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

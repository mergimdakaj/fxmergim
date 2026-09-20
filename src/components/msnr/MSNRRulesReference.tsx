import React, { useState } from 'react';
import { MSNR_RULES_BOOK } from '../../data/msnrData';
import {
  BookOpen,
  Sparkles,
  Shield,
  Layers,
  Crosshair,
  TrendingDown,
  TrendingUp,
  LineChart,
  HelpCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Flame,
} from 'lucide-react';

export const MSNRRulesReference: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>('ohlc_foundation');

  const activeSection = MSNR_RULES_BOOK.find((s) => s.id === activeSectionId) || MSNR_RULES_BOOK[0];

  return (
    <div id="msnr-rules-reference" className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 p-4 rounded-2xl border border-sky-500/30 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                Trade with Abjeed — MSNR Alchemist &amp; LIT
              </h2>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                SL 10 PIPS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Analizë e plotë me shkrim anglisht dhe udhëzime operative për secilin kapitull të librit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-sky-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>M15 POI &gt; Entry M1 (Sniper)</span>
        </div>
      </div>

      {/* Main Grid: Left Navigation / Right Detailed Lesson */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Navigation Pills */}
        <div className="lg:col-span-4 space-y-2">
          {MSNR_RULES_BOOK.map((sec) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-md shadow-sky-500/5'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        isActive
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sec.badge}
                    </span>
                  </div>
                  <h3
                    className={`text-xs font-extrabold mt-1 truncate ${
                      isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {sec.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {sec.subTitle}
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-sky-400 translate-x-1' : 'text-slate-600'
                  }`}
                />
              </button>
            );
          })}

          {/* Quick Cheatsheet Summary Box */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2 mt-4 text-xs">
            <h4 className="font-extrabold text-white flex items-center gap-1.5 text-xs">
              <Shield className="w-4 h-4 text-rose-400" />
              Formula e Përmbledhur e Hyrjes
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>M15: Shëno POI dhe Inducement (IDM)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">2</span>
                <span>M1: Prit Target Sweep (TS) me fitil</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">3</span>
                <span>M1: Konfirmo MSS dhe qiriun refuzues</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">4</span>
                <span className="font-bold text-rose-300">SL 10 PIPS &amp; TP1 1:3 / TP2 1:5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Active Lesson Content */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                {activeSection.badge} • Libri Abjeed
              </span>
              <h2 className="text-lg font-black text-white mt-0.5">
                {activeSection.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {activeSection.subTitle}
              </p>
            </div>

            <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-black">
              SL 10 PIPS
            </span>
          </div>

          {/* Description */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
            {activeSection.description}
          </div>

          {/* Visual Schematic Diagram Box */}
          <div className="bg-slate-950 border border-sky-500/20 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-sky-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Diagrami Skematik i Mësimit
            </h4>

            {activeSection.id === 'ohlc_foundation' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold block mb-1">Bullish Candle (O &lt; C)</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    H (High) = Max push nga blerësit.<br />
                    C (Close) = Fituesi në mbyllje.<br />
                    O (Open) = Çmimi fillestar.<br />
                    L (Low) = Niveli ku formohet Support-i.
                  </p>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-rose-400 font-bold block mb-1">Bearish Candle (O &gt; C)</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    H (High) = Niveli ku formohet Rezistenca.<br />
                    O (Open) = Çmimi fillestar.<br />
                    C (Close) = Shitësit morën kontrollin.<br />
                    L (Low) = Pika më e ulët e shtyrjes.
                  </p>
                </div>
              </div>
            )}

            {activeSection.id === 'msnr_7_levels' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-sky-300 font-bold">RBS (Resistance Become Support):</span>
                  <span className="text-emerald-400 font-bold">Breakout lart &gt; Retest &gt; BUY</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-sky-300 font-bold">SBR (Support Become Resistance):</span>
                  <span className="text-rose-400 font-bold">Breakout poshtë &gt; Retest &gt; SELL</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-purple-300 font-bold">Quasimodo (QM) Pattern:</span>
                  <span className="text-yellow-400 font-bold">H -&gt; L -&gt; HH -&gt; LL (Retest Left Shoulder)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-amber-300 font-bold">OCL (Open/Close Level):</span>
                  <span className="text-slate-300">Përputhja e trupave realë të qirinjve</span>
                </div>
              </div>
            )}

            {activeSection.id === 'trendlines_snr' && (
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="leading-relaxed">
                  <strong>Përdorimi i Line Chart (Sipas librit):</strong> Duke kaluar grafikun në <em>Line Chart</em>, eliminohen të gjithë fitilat e rremë dhe shfaqen vetëm majat (Peaks) dhe gropat (Valleys) thelbësore.
                </p>
                <p className="text-sky-300 text-[11px]">
                  Kur një Trendline thyhet dhe përkon saktësisht me një nivel horizontal RBS ose SBR, kjo jep konfluencë të dyfishtë për hyrje të blinduar me 10 pips SL!
                </p>
              </div>
            )}

            {activeSection.id === 'lit_inducement' && (
              <div className="p-3 bg-slate-900/90 rounded-lg border border-yellow-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                  <Crosshair className="w-4 h-4" />
                  <span>Struktura e Kurthit (Inducement Trap ✨)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tregu formon me qëllim një majë/gropë të qartë pak para zonës së vërtetë POI. Retail traders futen këtu me nxitim. Smart Money pret që kjo turmë të futet, pastaj kryen Target Sweep (TS) për të thithur të gjitha Stop Loss-et e tyre para nisjes së vërtetë!
                </p>
              </div>
            )}

            {activeSection.id === 'ts_target_sweep' && (
              <div className="p-3 bg-slate-900/90 rounded-lg border border-sky-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Looking for a Good Candle (Kriteret e Refuzimit)</span>
                </div>
                <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1">
                  <li>Fitil i gjatë refuzues që del nga POI dhe kthehet menjëherë brenda.</li>
                  <li>Qiri pa fitil në krahun e kundërt (Marubozu impulsiv), që dëshmon mungesë të plotë rezistence.</li>
                  <li>Mbyllje e qartë e trupit në favor të drejtimit tonë të tregtisë.</li>
                </ul>
              </div>
            )}

            {activeSection.id === 'm15_m1_execution' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-sky-950/30 border border-sky-500/30">
                  <span className="font-extrabold text-sky-300 block mb-1">M15: Analiza e Hartës</span>
                  <p className="text-[11px] text-slate-300">
                    1. Identifiko Trendin dhe POI (Order Block / QM / RBS).<br />
                    2. Shëno Inducement (IDM).<br />
                    3. Mos u ngut, prit derisa çmimi të prekë zonën.
                  </p>
                </div>
                <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30">
                  <span className="font-extrabold text-emerald-300 block mb-1">M1: Ekzekutimi Sniper</span>
                  <p className="text-[11px] text-slate-300">
                    1. Vëzhgo TS që fshin IDM-në.<br />
                    2. Prit M1 MSS dhe qiriun refuzues.<br />
                    3. Vendos urdhrin me <strong>SL fiks 10 pips</strong>!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Original English Notes from the Book (As requested by user: "me shkrimi anglisht analizoni") */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Rregullat dhe Shënimet Tekstuale (English Analysis)</span>
            </h4>
            <div className="space-y-1.5">
              {activeSection.englishNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-[11px] leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Takeaway Box */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/30 to-slate-950 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-rose-400 font-mono font-bold uppercase block">Përfundimi Kyç</span>
              <p className="text-white font-bold text-xs mt-0.5">
                {activeSection.keyTakeaway}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-500 text-slate-950 font-mono font-black text-xs shrink-0 shadow">
              SL 10 PIPS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ICTTrade } from '../types/trading';
import { MultiTargetLevels } from '../utils/ictTradeManagement';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Shield,
  Target,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MT4ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: ICTTrade | null;
  mgmt: MultiTargetLevels | null;
  symbol: string;
  decimals?: number;
}

export const MT4ExecutionModal: React.FC<MT4ExecutionModalProps> = ({
  isOpen,
  onClose,
  trade,
  mgmt,
  symbol,
  decimals = 2,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'steps' | 'split_lots' | 'breakeven'>('steps');

  if (!isOpen || !trade) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isBuy = trade.type === 'BUY';
  const cleanSymbol = symbol.replace('/', '');
  const currencySymbol = symbol.includes('JPY') ? '¥' : (symbol.includes('EUR') ? '€' : (symbol.includes('GBP') ? '£' : '$'));

  const entryStr = trade.entryPrice.toFixed(decimals);
  const slStr = trade.stopLoss.toFixed(decimals);
  const beStr = mgmt ? mgmt.bePrice.toFixed(decimals) : entryStr;
  const tp1Str = mgmt ? mgmt.tp1Price.toFixed(decimals) : trade.takeProfit.toFixed(decimals);
  const tp2Str = mgmt ? mgmt.tp2Price.toFixed(decimals) : '';
  const tp3Str = mgmt ? mgmt.tp3Price.toFixed(decimals) : '';

  return (
    <div
      id="mt4-execution-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="mt4-execution-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Si të Vendoset në MetaTrader 4 / 5
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {trade.type}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Udhëzuesi hap pas hapi për telefon (Android/iOS) dhe kompjuter
              </p>
            </div>
          </div>

          <button
            id="close-mt4-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Mbyll"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Copy Parameters Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Nivelet e Sakta për Plotësim në MT4 / MT5:
              </span>
              <button
                id="copy-all-mt4-summary-btn"
                onClick={() => {
                  copyToClipboard(
                    `${cleanSymbol} ${trade.type} | Entry: ${entryStr} | SL: ${slStr} | BE: ${beStr} | TP1: ${tp1Str} | TP2: ${tp2Str}`,
                    'all'
                  );
                }}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'all' ? 'U Kopjuan Të Gjitha!' : 'Kopjo krejt mesazhin'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Symbol */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Simboli</p>
                  <p className="text-xs font-black text-white font-mono">{cleanSymbol}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(cleanSymbol, 'symbol')}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Kopjo simbolin"
                >
                  {copiedField === 'symbol' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Order Type */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Lloji i Urdhrit</p>
                  <p className={`text-xs font-black font-mono ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBuy ? 'BUY LIMIT / MKT' : 'SELL LIMIT / MKT'}
                  </p>
                </div>
              </div>

              {/* Entry */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-sky-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-sky-400 font-medium">Price (Hyrja)</p>
                  <p className="text-xs font-black text-sky-300 font-mono">{entryStr}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(entryStr, 'entry')}
                  className="p-1 text-sky-400 hover:text-white"
                  title="Kopjo hyrjen"
                >
                  {copiedField === 'entry' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Stop Loss (Red) */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-500/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-rose-400 font-medium">Stop Loss (Kutia e Kuqe)</p>
                  <p className="text-xs font-black text-rose-300 font-mono">{slStr}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(slStr, 'sl')}
                  className="p-1 text-rose-400 hover:text-white"
                  title="Kopjo Stop Loss"
                >
                  {copiedField === 'sl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* TP1 (Green) */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-400 font-medium">TP1 1:2 (Kutia e Gjelbër)</p>
                  <p className="text-xs font-black text-emerald-300 font-mono">{tp1Str}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(tp1Str, 'tp1')}
                  className="p-1 text-emerald-400 hover:text-white"
                  title="Kopjo TP1"
                >
                  {copiedField === 'tp1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Breakeven Target */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-amber-500/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-amber-400 font-medium">Breakeven (Hyrja + 1p)</p>
                  <p className="text-xs font-black text-amber-300 font-mono">{beStr}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(beStr, 'be')}
                  className="p-1 text-amber-400 hover:text-white"
                  title="Kopjo Breakeven"
                >
                  {copiedField === 'be' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-2 pt-2">
            <button
              onClick={() => setActiveTab('steps')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'steps'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Hapat në Telefon (MT4/5)
            </button>
            <button
              onClick={() => setActiveTab('split_lots')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'split_lots'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Si të vendosni TP1 & TP2 (Ndarja)
            </button>
            <button
              onClick={() => setActiveTab('breakeven')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'breakeven'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Si bëhet Breakeven (0:0)
            </button>
          </div>

          {/* TAB 1: STEPS ON PHONE */}
          {activeTab === 'steps' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 border border-sky-500/30">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">Hapni Simbolin në MT4 / MT5</h4>
                  <p className="text-slate-400 mt-0.5">
                    Shkoni te lista <strong>"Quotes"</strong> ose tek grafiku dhe zgjidhni <strong>{cleanSymbol}</strong> (p.sh. XAUUSD / GOLD).
                    Klikoni <strong>"New Order"</strong> (ose shenjën <strong>"+"</strong> lart djathtas në iPhone/Android).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 border border-sky-500/30">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">Zgjidhni Llojin e Ekzekutimit</h4>
                  <p className="text-slate-400 mt-0.5">
                    • <strong>Kur çmimi nuk ka ardhur akoma te hyrja:</strong> Zgjidhni <strong>{isBuy ? 'BUY LIMIT' : 'SELL LIMIT'}</strong> dhe te fusha <em>"Price"</em> shkruani <strong>{entryStr}</strong>.
                    <br />
                    • <strong>Kur çmimi është duke prekur FVG në këtë moment:</strong> Lëreni <strong>Instant / Market Execution</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0 border border-rose-500/30">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">Plotësoni Stop Loss (Kutia e Kuqe)</h4>
                  <p className="text-slate-400 mt-0.5">
                    Te vija/kutia me ngjyrë të kuqe (majtas në MT4/5), shkruani: <strong className="text-rose-300 font-mono">{slStr}</strong>.
                    Ky ju mbron kapitalin nëse tregu thyen strukturën.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">
                  4
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">Plotësoni Take Profit (Kutia e Gjelbër)</h4>
                  <p className="text-slate-400 mt-0.5">
                    Te vija/kutia me ngjyrë të gjelbër (djathtas në MT4/5), shkruani TP1: <strong className="text-emerald-300 font-mono">{tp1Str}</strong>.
                    Kjo mbyll automatikisht fitimin me raport 1:2 R:R.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPLIT LOTS & TP2 */}
          {activeTab === 'split_lots' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  Mënyra Profesionale ICT: Ndarja në 2 Pozicione (Twin Orders)
                </h4>
                <p className="mt-1 text-slate-300">
                  MetaTrader lejon vetëm 1 Take Profit për çdo urdhër. Për të kapur edhe <strong>TP1 ({tp1Str})</strong> edhe <strong>TP2 ({tp2Str || '1:3'})</strong>, ndajeni lotin tuaj në 2 urdhra të njëjtë:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">Pozicioni 1 (70% - 80% e Lot-it)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">TP1 Kryesor</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>• Lot: <strong>0.07</strong> (nëse totali është 0.10)</li>
                    <li>• SL: <strong>{slStr}</strong></li>
                    <li>• TP: <strong>{tp1Str}</strong> (1:2 R:R)</li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Ky pozicion merr fitimin e sigurt dhe mbush xhepin sapo arrihet FVG.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">Pozicioni 2 (20% - 30% Runner)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">TP2 Likuiditet</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>• Lot: <strong>0.03</strong> (pjesa e mbetur)</li>
                    <li>• SL: <strong>{slStr}</strong> (zhvendoset në BE kur TP1 prek)</li>
                    <li>• TP: <strong>{tp2Str || '1:3 Target'}</strong></li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Ky pozicion lihet të vrapojë pa asnjë rrezik për llogarinë!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BREAKEVEN */}
          {activeTab === 'breakeven' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Si Zhvendoset Stop Loss në Breakeven në Telefon (0:0)
                </h4>
                <p className="mt-1 text-slate-300">
                  Rregulli ICT: <strong>Vetëm pasi çmimi të ketë prekur TP1 ({tp1Str})</strong>, ndiqni këto hapa për të hequr çdo rrezik humbjeje:
                </p>
              </div>

              <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                <li className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  Shkoni te menyja <strong>"Trade"</strong> në fund të ekranit të MT4/MT5 ku shihni pozicionet e hapura.
                </li>
                <li className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong>Mbani gishtin gjatë</strong> mbi pozicionin e hapur (ose tërhiqeni majtas në iPhone).
                </li>
                <li className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  Zgjidhni opsionin <strong>"Modify Position"</strong> (Modifiko Pozicionin).
                </li>
                <li className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  Te kutia e <strong>Stop Loss (SL)</strong> fshini çmimin e vjetër dhe shkruani çmimin e Breakeven: <strong className="text-amber-300 font-mono">{beStr}</strong>.
                </li>
                <li className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  Shtypni butonin e madh <strong>"Modify"</strong> në fund.
                </li>
              </ol>

              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-200">
                💡 <strong>Pse +1 pip mbi hyrjen?</strong> Sepse çdo broker ka një diferencë të vogël (spread). Duke e vendosur SL 1 pip në fitim nga hyrja juaj, ju garantohet që edhe nëse çmimi kthehet mbrapsht, nuk do të humbni asnjë cent!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Nivelet llogariten automatikisht nga skaneri ICT
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20"
          >
            E Kuptova, Mbyll
          </button>
        </div>
      </div>
    </div>
  );
};

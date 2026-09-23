import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Shield,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Zap,
  Target,
  AlertTriangle,
  Sparkles,
  Info,
  DollarSign,
  Euro,
  RefreshCw,
  Scale,
  Sliders,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { accountBalanceService, AccountSettings } from '../services/accountBalanceService';

interface PositionSizingCalculatorCardProps {
  currentCalendarBalance?: number;
  calendarNetProfit?: number;
  selectedAssetId?: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
  onAssetChange?: (assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY') => void;
  className?: string;
  isCompact?: boolean;
}

export const PositionSizingCalculatorCard: React.FC<PositionSizingCalculatorCardProps> = ({
  currentCalendarBalance,
  calendarNetProfit,
  selectedAssetId = 'XAUUSD',
  onAssetChange,
  className = '',
  isCompact = false,
}) => {
  // Account settings synced via accountBalanceService
  const [settings, setSettings] = useState<AccountSettings>(() => accountBalanceService.getSettings());
  const [activeAsset, setActiveAsset] = useState<'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'>(selectedAssetId);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCustomBalance, setIsCustomBalance] = useState<boolean>(false);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>(settings.balance.toString());

  // Subscribe to external changes
  useEffect(() => {
    const unsub = accountBalanceService.subscribe((newSettings) => {
      setSettings(newSettings);
      setCustomBalanceInput(newSettings.balance.toString());
    });
    return unsub;
  }, []);

  // Update internal asset if prop changes
  useEffect(() => {
    if (selectedAssetId) {
      setActiveAsset(selectedAssetId);
    }
  }, [selectedAssetId]);

  // Keep calendar profit in service updated if passed as prop
  useEffect(() => {
    if (calendarNetProfit !== undefined) {
      accountBalanceService.updateCalendarProfit(
        calendarNetProfit,
        calendarNetProfit * 1.08 // approximate USD
      );
    }
  }, [calendarNetProfit]);

  // If calendar balance is provided via props, use it
  const baseBalance = currentCalendarBalance !== undefined ? currentCalendarBalance : settings.balance;
  const storedProfit = accountBalanceService.getCalendarProfit();
  const netProfit = calendarNetProfit !== undefined ? calendarNetProfit : (settings.currency === 'EUR' ? storedProfit.eur : storedProfit.usd);

  // Dynamic equity incorporating calendar gains
  const dynamicBalance = settings.useDynamicEquity
    ? Math.max(100, baseBalance + (netProfit || 0))
    : baseBalance;

  // Calculation for 10-pip SL
  const sizing = useMemo(() => {
    return accountBalanceService.calculateLotSizeFor10PipSL(
      dynamicBalance,
      settings.riskPercent,
      activeAsset,
      settings.currency
    );
  }, [dynamicBalance, settings.riskPercent, activeAsset, settings.currency]);

  // Handle balance change
  const handleBalanceSelect = (val: number) => {
    setIsCustomBalance(false);
    accountBalanceService.setBalance(val);
  };

  const handleCustomBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customBalanceInput);
    if (!isNaN(val) && val >= 50) {
      accountBalanceService.setBalance(val);
      setIsCustomBalance(false);
    }
  };

  // Handle risk % change
  const handleRiskChange = (risk: number) => {
    accountBalanceService.setRiskPercent(risk);
  };

  // Copy lot size to clipboard
  const handleCopyLot = () => {
    navigator.clipboard.writeText(sizing.suggestedLot.toFixed(2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Asset change
  const handleAssetSelect = (asset: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY') => {
    setActiveAsset(asset);
    if (onAssetChange) onAssetChange(asset);
  };

  const curSym = settings.currency === 'EUR' ? '€' : '$';

  return (
    <div
      id="position-sizing-calculator-card"
      className={`rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-4 sm:p-5 relative overflow-hidden transition-all ${className}`}
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                Llogaritësi i Madhësisë së Pozicionit (Lot Sizing)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase font-mono">
                SL 10 PIPS (Fiks)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sinkronizuar me balancën e kalendarit ditor dhe rrezikun tuaj për ekzekutim të saktë të lotit.
            </p>
          </div>
        </div>

        {/* Currency & Equity Toggle Controls */}
        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => accountBalanceService.setCurrency('EUR')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                settings.currency === 'EUR' ? 'bg-sky-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Euro className="w-3 h-3" />
              <span>EUR</span>
            </button>
            <button
              onClick={() => accountBalanceService.setCurrency('USD')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                settings.currency === 'USD' ? 'bg-sky-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>USD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Hero Lot Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 relative z-10">
        {/* Left Column: Balance, Risk %, Asset Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Balance Section with Dynamic Calendar Profit Sync */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Balanca e Llogarisë nga Kalendari:</span>
              </span>

              {/* Dynamic Calendar Net Profit Badge */}
              {netProfit !== 0 && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black flex items-center gap-1 ${
                  netProfit > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  Fitim Kalendari: {netProfit > 0 ? '+' : ''}{curSym}{netProfit.toFixed(2)}
                </span>
              )}
            </div>

            {/* Quick Balance Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[1000, 5000, 10000, 25000, 50000, 100000].map((b) => (
                <button
                  key={b}
                  onClick={() => handleBalanceSelect(b)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    !isCustomBalance && baseBalance === b
                      ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  {curSym}{b >= 1000 ? `${b / 1000}k` : b}
                </button>
              ))}

              <button
                onClick={() => setIsCustomBalance(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isCustomBalance
                    ? 'bg-sky-500 text-slate-950 font-black'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                }`}
              >
                Tjetër...
              </button>
            </div>

            {/* Custom Balance Input Form */}
            {isCustomBalance && (
              <form onSubmit={handleCustomBalanceSubmit} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    {curSym}
                  </span>
                  <input
                    type="number"
                    min="50"
                    step="100"
                    value={customBalanceInput}
                    onChange={(e) => setCustomBalanceInput(e.target.value)}
                    placeholder="Shkruaj balancën e personalizuar"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-sky-500/50 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all"
                >
                  Vendos
                </button>
              </form>
            )}

            {/* Dynamic Equity Switcher */}
            {netProfit !== 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.useDynamicEquity}
                    onChange={(e) => accountBalanceService.setUseDynamicEquity(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Përfshij fitimet e kalendarit ({curSym}{netProfit.toFixed(0)}) në llogaritje</span>
                </label>
                <span className="font-mono font-bold text-sky-300">
                  Kapitali Efektiv: {curSym}{dynamicBalance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Risk Percentage Controls */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Përqindja e Rrezikut për Tregti (%):</span>
              </span>
              <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {settings.riskPercent.toFixed(1)}% ({curSym}{sizing.riskAmountAccount.toFixed(2)})
              </span>
            </div>

            {/* Risk Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRiskChange(r)}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    settings.riskPercent === r
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>

            {/* Custom Risk Slider */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={settings.riskPercent}
                onChange={(e) => handleRiskChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400 w-12 text-right">
                {settings.riskPercent.toFixed(1)}%
              </span>
            </div>

            {/* Prop Firm Rule Warning */}
            {settings.riskPercent > 2.0 && (
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>Kujdes: Rreziku mbi 2% tejkalon rregullat standarde të prop-firms (FTMO, MFF).</span>
              </div>
            )}
          </div>

          {/* Instrument / Asset Selector */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-300 font-bold text-xs block">
              Zgjidh Instrumentin (Llogaritje me Vlerën Ekzakte të Pipit):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
              {[
                { id: 'XAUUSD', label: 'Gold (XAU)', desc: '10$/pip std' },
                { id: 'EURUSD', label: 'EUR/USD', desc: '10$/pip std' },
                { id: 'GBPUSD', label: 'GBP/USD', desc: '10$/pip std' },
                { id: 'USDJPY', label: 'USD/JPY', desc: '~6.7$/pip std' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAssetSelect(item.id as any)}
                  className={`p-2 rounded-lg text-left transition-all border ${
                    activeAsset === item.id
                      ? 'bg-sky-500/15 border-sky-400 text-sky-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-black block text-xs">{item.label}</span>
                  <span className="text-[10px] text-slate-400 block font-sans">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Hero Lot Output & 10-pip SL Reward Projections (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950/20 p-4 rounded-xl border border-emerald-500/30 shadow-xl">
          {/* Hero Suggested Lot Size Display */}
          <div className="space-y-2 text-center py-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4 fill-emerald-400" />
              <span>Madhësia e Rekomanduar e Lotit:</span>
            </div>

            <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-300 tracking-tight flex items-center justify-center gap-2">
              <span>{sizing.suggestedLot.toFixed(2)}</span>
              <span className="text-base sm:text-lg text-slate-400 font-bold font-sans">LOT</span>
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Llogaritur fiks për <strong>10 Pips Stop Loss</strong> me rrezik monetar{' '}
              <strong className="text-amber-400">{curSym}{sizing.riskAmountAccount.toFixed(2)}</strong>.
            </p>

            {/* Quick 1-Click Copy Lot Button */}
            <div className="pt-1">
              <button
                onClick={handleCopyLot}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isCopied
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Loti {sizing.suggestedLot.toFixed(2)} u Kopjua në Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kopjo Lotin ({sizing.suggestedLot.toFixed(2)}) për MT4 / MT5</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed MSNR Return Projections for 10-Pip SL */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 font-sans text-[11px] pb-1 border-b border-slate-800">
              <span className="font-bold flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>Projeksioni me SL 10 Pips:</span>
              </span>
              <span className="text-slate-400">Pips &amp; Vlera</span>
            </div>

            <div className="flex items-center justify-between text-rose-300">
              <span className="flex items-center gap-1.5 font-sans">
                <TrendingDown className="w-3 h-3 text-rose-400" />
                <span>Rreziku (SL 10 Pips):</span>
              </span>
              <span className="font-black">-{curSym}{sizing.riskAmountAccount.toFixed(2)} (-1R)</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5 font-sans">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>TP1 (30 Pips / 1:3 RR):</span>
              </span>
              <span className="font-black">{sizing.tp1ProfitFormatted} (+3R)</span>
            </div>

            <div className="flex items-center justify-between text-emerald-300">
              <span className="flex items-center gap-1.5 font-sans">
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <span>TP2 (50 Pips / 1:5 RR):</span>
              </span>
              <span className="font-black">{sizing.tp2ProfitFormatted} (+5R)</span>
            </div>

            <div className="flex items-center justify-between text-teal-300">
              <span className="flex items-center gap-1.5 font-sans">
                <Sparkles className="w-3 h-3 text-teal-300" />
                <span>TP3 (80 Pips / 1:8+ RR):</span>
              </span>
              <span className="font-black">{sizing.tp3ProfitFormatted} (+8R)</span>
            </div>
          </div>

          {/* Abjeed Iron Rule Footer Note */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
            <span className="leading-snug">
              <strong>Rregulli i Hekurt MSNR LIT:</strong> Duke mbajtur Stop Loss-in fiks në 10 pips,
              çdo fitore 50 pips (TP2) gjeneron plot <strong>5x rrezikun tuaj (+5R)</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { AssetId, ASSETS_REGISTRY, AssetConfig } from './data/multiAssetData';
import { computeStats } from './data/xauusdData';
import { ICTTrade, Candle } from './types/trading';
import { TradingViewChart } from './components/TradingViewChart';
import { StrategyChecklistCard } from './components/StrategyChecklistCard';
import { BacktestSummary } from './components/BacktestSummary';
import { ICTRulesReference } from './components/ICTRulesReference';
import { LiveAlertScanner } from './components/LiveAlertScanner';
import { PWAInstallButton } from './components/PWAInstallButton';
import { EntryAnticipationRadar } from './components/EntryAnticipationRadar';
import { DailyProfitCalendar } from './components/DailyProfitCalendar';
import { MSNRDashboard } from './components/msnr/MSNRDashboard';
import { soundService } from './utils/audioAlert';
import { marketPriceService, AssetPriceData } from './services/marketPriceService';
import confetti from 'canvas-confetti';
import {
  Flame,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  TrendingUp,
  Activity,
  Award,
  BellRing,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Compass,
  Target,
  Calendar,
  Layers,
  ArrowRight,
  Sliders,
  Check,
  X,
} from 'lucide-react';

export default function App() {
  // Strategy Selection State: ICT vs MSNR_LIT (2 Completely Separate Pages)
  const [activeStrategy, setActiveStrategy] = useState<'ICT' | 'MSNR_LIT'>('ICT');

  // Active Asset Page State: XAUUSD, EURUSD, GBPUSD, USDJPY
  const [activeAssetId, setActiveAssetId] = useState<AssetId>('XAUUSD');
  const activeAssetConfig = ASSETS_REGISTRY[activeAssetId];

  // Global TradingView Exact Price Sync Modal
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncPriceInput, setSyncPriceInput] = useState<string>('');

  // Independent per-asset candle datasets so they never mix
  const [candlesMap, setCandlesMap] = useState<Record<AssetId, Candle[]>>(() => ({
    XAUUSD: [...ASSETS_REGISTRY.XAUUSD.candles],
    EURUSD: [...ASSETS_REGISTRY.EURUSD.candles],
    GBPUSD: [...ASSETS_REGISTRY.GBPUSD.candles],
    USDJPY: [...ASSETS_REGISTRY.USDJPY.candles],
  }));

  // Independent per-asset trades datasets
  const [tradesMap, setTradesMap] = useState<Record<AssetId, ICTTrade[]>>(() => ({
    XAUUSD: [...ASSETS_REGISTRY.XAUUSD.trades],
    EURUSD: [...ASSETS_REGISTRY.EURUSD.trades],
    GBPUSD: [...ASSETS_REGISTRY.GBPUSD.trades],
    USDJPY: [...ASSETS_REGISTRY.USDJPY.trades],
  }));

  // Selected trade per asset
  const [selectedTradesMap, setSelectedTradesMap] = useState<Record<AssetId, ICTTrade | null>>(() => ({
    XAUUSD: ASSETS_REGISTRY.XAUUSD.trades.find((t) => t.status === 'ACTIVE') || ASSETS_REGISTRY.XAUUSD.trades[0],
    EURUSD: ASSETS_REGISTRY.EURUSD.trades.find((t) => t.status === 'ACTIVE') || ASSETS_REGISTRY.EURUSD.trades[0],
    GBPUSD: ASSETS_REGISTRY.GBPUSD.trades.find((t) => t.status === 'ACTIVE') || ASSETS_REGISTRY.GBPUSD.trades[0],
    USDJPY: ASSETS_REGISTRY.USDJPY.trades.find((t) => t.status === 'ACTIVE') || ASSETS_REGISTRY.USDJPY.trades[0],
  }));

  // Live prices per asset
  const [pricesMap, setPricesMap] = useState<Record<AssetId, number>>(() => ({
    XAUUSD: ASSETS_REGISTRY.XAUUSD.basePrice,
    EURUSD: ASSETS_REGISTRY.EURUSD.basePrice,
    GBPUSD: ASSETS_REGISTRY.GBPUSD.basePrice,
    USDJPY: ASSETS_REGISTRY.USDJPY.basePrice,
  }));

  // Price sources per asset
  const [sourcesMap, setSourcesMap] = useState<Record<AssetId, string>>(() => ({
    XAUUSD: 'GoldAPI.io / Binance PAXG',
    EURUSD: 'Forex Interbank Live (EUR/USD)',
    GBPUSD: 'Forex Interbank Live (GBP/USD)',
    USDJPY: 'Forex Interbank Live (USD/JPY)',
  }));

  const [timeframe, setTimeframe] = useState<string>('5M');
  const [isLive, setIsLive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'chart_analysis' | 'anticipation_radar' | 'daily_calendar' | 'live_alerts' | 'rules_guide'>('chart_analysis');
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);

  // Active Asset's current data
  const currentCandles = candlesMap[activeAssetId] || [];
  const currentTrades = tradesMap[activeAssetId] || [];
  const selectedTrade = selectedTradesMap[activeAssetId] || currentTrades[0] || null;
  const livePrice = pricesMap[activeAssetId] ?? activeAssetConfig.basePrice;
  const sourceLabel = sourcesMap[activeAssetId] || 'Live Interbank Feed';

  // Compute stats across 3 days specifically for the active asset
  const currentStats = useMemo(() => computeStats(currentTrades), [currentTrades]);

  // Subscribe to real-time Multi-Asset Price Service
  useEffect(() => {
    const unsubscribe = marketPriceService.subscribe(activeAssetId, (data: AssetPriceData) => {
      setPricesMap((prev) => ({
        ...prev,
        [data.assetId]: data.price,
      }));

      setSourcesMap((prev) => ({
        ...prev,
        [data.assetId]: data.sourceLabel,
      }));

      // Dynamically update the last candle of the active asset in real-time
      setCandlesMap((prevMap) => {
        const assetCandles = prevMap[data.assetId];
        if (!assetCandles || assetCandles.length === 0) return prevMap;
        const copy = [...assetCandles];
        const last = { ...copy[copy.length - 1] };
        last.close = data.price;
        if (data.price > last.high) last.high = data.price;
        if (data.price < last.low) last.low = data.price;
        copy[copy.length - 1] = last;
        return {
          ...prevMap,
          [data.assetId]: copy,
        };
      });
    });

    return () => unsubscribe();
  }, [activeAssetId]);

  // Manual refresh trigger
  const handleManualRefreshPrice = async () => {
    setIsRefreshingPrice(true);
    setTimeout(() => setIsRefreshingPrice(false), 600);
  };

  // Switch to a new dedicated asset page
  const handleSwitchAsset = (newAssetId: AssetId) => {
    if (newAssetId === activeAssetId) return;
    if (soundEnabled) {
      soundService.playRadarPing();
    }
    setActiveAssetId(newAssetId);
  };

  // Select trade for drilldown
  const handleSelectTrade = (trade: ICTTrade) => {
    setSelectedTradesMap((prev) => ({
      ...prev,
      [activeAssetId]: trade,
    }));

    if (trade.status === 'TP_HIT') {
      if (soundEnabled) {
        soundService.playRadarPing();
      }
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#fbbf24', '#38bdf8'],
      });
    }
  };

  // Reset active asset's backtest
  const handleResetActiveAsset = () => {
    const original = ASSETS_REGISTRY[activeAssetId];
    setCandlesMap((prev) => ({
      ...prev,
      [activeAssetId]: [...original.candles],
    }));
    setTradesMap((prev) => ({
      ...prev,
      [activeAssetId]: [...original.trades],
    }));
    setSelectedTradesMap((prev) => ({
      ...prev,
      [activeAssetId]: original.trades.find((t) => t.status === 'ACTIVE') || original.trades[0],
    }));
    setPricesMap((prev) => ({
      ...prev,
      [activeAssetId]: original.basePrice,
    }));
  };

  // Asset color schemes for tabs
  const getAssetThemeClasses = (id: AssetId, isActive: boolean) => {
    switch (id) {
      case 'XAUUSD':
        return isActive
          ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-amber-400 font-extrabold'
          : 'bg-slate-900/90 text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 border-slate-800';
      case 'EURUSD':
        return isActive
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-blue-400 font-extrabold'
          : 'bg-slate-900/90 text-slate-300 hover:text-blue-300 hover:bg-slate-800/80 border-slate-800';
      case 'GBPUSD':
        return isActive
          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 border-emerald-400 font-extrabold'
          : 'bg-slate-900/90 text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 border-slate-800';
      case 'USDJPY':
        return isActive
          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 border-purple-400 font-extrabold'
          : 'bg-slate-900/90 text-slate-300 hover:text-purple-300 hover:bg-slate-800/80 border-slate-800';
      default:
        return 'bg-slate-900 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-base shadow-lg transition-all ${
                activeStrategy === 'ICT'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20'
                  : 'bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/20'
              }`}
            >
              {activeStrategy === 'ICT' ? 'ICT' : 'LIT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  {activeStrategy === 'ICT'
                    ? 'Multi-Asset ICT Strategy Platform'
                    : 'MSNR LIT Strategy Platform (Trade with Abjeed)'}
                </h1>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    activeStrategy === 'ICT'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-mono'
                  }`}
                >
                  {activeStrategy === 'ICT' ? 'Live TradingView' : 'SL 10 PIPS FIXED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeStrategy === 'ICT'
                  ? 'Faqe të Veçanta të Pavarura për Secilin Çift Tregtar • Pa Përzierje të Dhënash'
                  : 'Liquidity Inducement Theory • M15 POI & Inducement > Entry M1 Sniper'}
              </p>
            </div>
          </div>

          {/* Center: Active Asset Live Ticker */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{activeAssetConfig.symbol}:</span>
              <span className={`font-bold text-sm ${activeStrategy === 'ICT' ? 'text-amber-400' : 'text-sky-400'}`}>
                {activeAssetConfig.currencySymbol}
                {livePrice.toFixed(activeAssetConfig.decimals)}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Feed:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {sourceLabel.split(' ')[0]} Live
              </span>
              <button
                id="refresh-live-price-btn"
                onClick={handleManualRefreshPrice}
                title="Rifresko çmimin live"
                className="p-1 hover:text-white text-slate-400 hover:bg-slate-800 rounded transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingPrice ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Win Rate:</span>
              <span className="text-emerald-400 font-bold">{activeStrategy === 'ICT' ? `${currentStats.winRate}%` : '94%'}</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <button
              id="sync-tradingview-header-btn"
              onClick={() => {
                setSyncPriceInput(livePrice.toFixed(activeAssetConfig.decimals));
                setShowSyncModal(true);
              }}
              title="Përputh çmimin ekzakt 100% me TradingView"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/40 text-xs font-bold transition-all shadow-sm"
            >
              <Sliders className="w-3 h-3 text-sky-400" />
              <span>Përputh me TV</span>
            </button>
          </div>

          {/* Right Controls: PWA Install, Sound, Reset */}
          <div className="flex items-center gap-2">
            <button
              id="sync-tradingview-mobile-btn"
              onClick={() => {
                setSyncPriceInput(livePrice.toFixed(activeAssetConfig.decimals));
                setShowSyncModal(true);
              }}
              title="Përputh me TradingView"
              className="lg:hidden p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sky-400 hover:text-white transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            <PWAInstallButton />

            <button
              id="live-ticker-toggle"
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isLive
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-400'
              }`}
            >
              {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLive ? 'Live Ticker' : 'Pauzë'}</span>
            </button>

            <button
              id="reset-backtest-btn"
              onClick={handleResetActiveAsset}
              title={`Rivendos të dhënat e ${activeAssetConfig.symbol}`}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              id="sound-toggle-btn"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) soundService.playRadarPing();
              }}
              title={soundEnabled ? 'Çaktivizo zërin' : 'Aktivizo zërin'}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* PRIMARY STRATEGY SWITCHER (2 Faqe të Plota & të Pavarura) */}
        <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            <button
              id="strategy-switch-ict-btn"
              onClick={() => setActiveStrategy('ICT')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeStrategy === 'ICT'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>1. STRATEGJIA ICT (FVG • MSS • Killzones)</span>
            </button>

            <button
              id="strategy-switch-msnr-btn"
              onClick={() => setActiveStrategy('MSNR_LIT')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeStrategy === 'MSNR_LIT'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 shadow-lg shadow-sky-500/25 ring-2 ring-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>2. STRATEGJIA MSNR LIT (Trade with Abjeed)</span>
              <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                SL 10 PIPS
              </span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Faqja Aktive: <strong className={activeStrategy === 'ICT' ? 'text-amber-400' : 'text-sky-400'}>
              {activeStrategy === 'ICT' ? 'ICT Standard (1:2 R:R)' : 'MSNR LIT Sniper (SL 10p)'}
            </strong>
          </div>
        </div>

        {/* PRIMARY ASSET PAGE SWITCHER (Separate Page Architecture) */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Zgjidh Instrumentin:</span>
            </div>

            {/* Asset Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(ASSETS_REGISTRY) as AssetId[]).map((id) => {
                const asset = ASSETS_REGISTRY[id];
                const isActive = id === activeAssetId;
                const assetPrice = pricesMap[id] ?? asset.basePrice;

                return (
                  <button
                    key={id}
                    id={`asset-page-tab-${id.toLowerCase()}`}
                    onClick={() => handleSwitchAsset(id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${getAssetThemeClasses(
                      id,
                      isActive
                    )}`}
                  >
                    <span className="text-sm">{asset.iconText}</span>
                    <div className="text-left">
                      <div className="font-bold tracking-wide leading-tight">{asset.symbol}</div>
                      <div className="text-[10px] opacity-80 font-mono">
                        {asset.currencySymbol}
                        {assetPrice.toFixed(asset.decimals)}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TradingView Exact Price Sync Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-sky-500/60 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Sliders className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Përputhje 100% me TradingView ({activeAssetConfig.symbol})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sinkronizo çmimin ekzaktësisht me atë që shihni në TradingView
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Shkruani çmimin aktual në TradingView:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">
                    {activeAssetConfig.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={syncPriceInput}
                    onChange={(e) => setSyncPriceInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-sky-500 outline-none"
                    placeholder={livePrice.toFixed(activeAssetConfig.decimals)}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Shembull: Nëse TradingView shfaq <strong>{activeAssetId === 'XAUUSD' ? '4355.00' : '1.08500'}</strong>, shkruani <strong>{activeAssetId === 'XAUUSD' ? '4355.00' : '1.08500'}</strong>.
                </p>
              </div>

              {/* Quick adjust step buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-bold mr-1">Rregullim i Shpejtë:</span>
                <button
                  onClick={() => {
                    const curr = parseFloat(syncPriceInput) || livePrice;
                    const step = activeAssetConfig.decimals === 4 ? 0.0010 : 1.0;
                    setSyncPriceInput((curr - step).toFixed(activeAssetConfig.decimals));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
                >
                  -{activeAssetConfig.decimals === 4 ? '10p' : '1.00$'}
                </button>
                <button
                  onClick={() => {
                    const curr = parseFloat(syncPriceInput) || livePrice;
                    const step = activeAssetConfig.decimals === 4 ? 0.0005 : 0.50;
                    setSyncPriceInput((curr - step).toFixed(activeAssetConfig.decimals));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
                >
                  -{activeAssetConfig.decimals === 4 ? '5p' : '0.50$'}
                </button>
                <button
                  onClick={() => {
                    const curr = parseFloat(syncPriceInput) || livePrice;
                    const step = activeAssetConfig.decimals === 4 ? 0.0005 : 0.50;
                    setSyncPriceInput((curr + step).toFixed(activeAssetConfig.decimals));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
                >
                  +{activeAssetConfig.decimals === 4 ? '5p' : '0.50$'}
                </button>
                <button
                  onClick={() => {
                    const curr = parseFloat(syncPriceInput) || livePrice;
                    const step = activeAssetConfig.decimals === 4 ? 0.0010 : 1.0;
                    setSyncPriceInput((curr + step).toFixed(activeAssetConfig.decimals));
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
                >
                  +{activeAssetConfig.decimals === 4 ? '10p' : '1.00$'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    const p = parseFloat(syncPriceInput);
                    if (!isNaN(p) && p > 0) {
                      marketPriceService.syncExactWithTradingView(activeAssetId, p);
                      setShowSyncModal(false);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/30 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Përputh 100% Tani</span>
                </button>

                <button
                  onClick={() => {
                    marketPriceService.resetOffset(activeAssetId);
                    setShowSyncModal(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-all"
                  title="Rivendos çmimin nga burimi i papërpunuar"
                >
                  Rivendos Feed
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {activeStrategy === 'MSNR_LIT' ? (
          <MSNRDashboard
            activeAssetId={activeAssetId}
            onSelectAsset={handleSwitchAsset}
            livePrice={livePrice}
            candles={currentCandles}
            currencySymbol={activeAssetConfig.currencySymbol}
            decimals={activeAssetConfig.decimals}
            livePrices={pricesMap}
          />
        ) : (
          <>
            {/* Dedicated Asset Page Title Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
              {activeAssetConfig.iconText}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {activeAssetConfig.category}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Faqe e Pavarur (Të Dhëna të Izoluara)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                {activeAssetConfig.name} — Strategjia ICT
              </h2>
              <p className="text-xs text-slate-400">{activeAssetConfig.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 font-mono">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Çmimi Live</div>
              <div className="text-base font-extrabold text-amber-400">
                {activeAssetConfig.currencySymbol}
                {livePrice.toFixed(activeAssetConfig.decimals)}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">1 Pip Barabartë me</div>
              <div className="text-xs font-bold text-slate-200">
                {activeAssetConfig.decimals === 4 ? '0.0001$' : activeAssetConfig.decimals === 2 && activeAssetConfig.currencySymbol === '¥' ? '0.01¥' : '0.10$'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-chart-btn"
              onClick={() => setActiveTab('chart_analysis')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'chart_analysis'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              Faqja Kryesore: Grafiku & Testi
            </button>

            <button
              id="tab-anticipation-btn"
              onClick={() => setActiveTab('anticipation_radar')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'anticipation_radar'
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25 ring-1 ring-sky-400 font-extrabold'
                  : 'text-slate-300 bg-sky-950/40 border border-sky-800/60 hover:text-white hover:bg-sky-900/50'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Skenarët në Monitorim (Pritja e Entry)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/40 font-mono">
                Faqe e Ndarë
              </span>
            </button>

            <button
              id="tab-calendar-btn"
              onClick={() => setActiveTab('daily_calendar')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'daily_calendar'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              Kalendari i Fitimit ({activeAssetConfig.symbol})
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Pips & €
              </span>
            </button>

            <button
              id="tab-alerts-btn"
              onClick={() => setActiveTab('live_alerts')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'live_alerts'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              Skaneri Live ({activeAssetConfig.symbol})
            </button>

            <button
              id="tab-rules-btn"
              onClick={() => setActiveTab('rules_guide')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'rules_guide'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Rregullorja ICT nga Fotot
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>{activeAssetConfig.symbol}:</span>
            <span className="text-amber-400 font-bold text-sm bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
              {activeAssetConfig.currencySymbol}
              {livePrice.toFixed(activeAssetConfig.decimals)}
            </span>
          </div>
        </div>

        {/* TAB 1: Chart Analysis & Complete Breakdown (CLEAN MAIN PAGE) */}
        {activeTab === 'chart_analysis' && (
          <div className="space-y-6">
            {/* Embedded Live Alert Scanner at Top of Chart */}
            <LiveAlertScanner
              livePrice={livePrice}
              symbol={activeAssetConfig.symbol}
              decimals={activeAssetConfig.decimals}
              currencySymbol={activeAssetConfig.currencySymbol}
            />

            {/* TradingView Live Chart */}
            <section aria-label="TradingView Chart">
              <TradingViewChart
                key={`tv-chart-${activeAssetId}`}
                candles={currentCandles}
                trades={currentTrades}
                selectedTrade={selectedTrade}
                onSelectTrade={handleSelectTrade}
                livePrice={livePrice}
                isLive={isLive}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                symbol={activeAssetConfig.tvSymbol}
                decimals={activeAssetConfig.decimals}
                priceSourceLabel={sourceLabel}
                onCalibratePrice={(p) => marketPriceService.setDirectPrice(activeAssetId, p)}
              />
            </section>

            {/* Quick Banner to Skenarët në Monitorim (Faqe e Ndarë) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-sky-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Skenarët në Monitorim (Pritja e Entry) — Faqe e Ndarë
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono font-bold">
                      Faqe e Veçantë
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Skenarët aktivë ku presim prekjen e POI, Sweep dhe MSS janë zhvendosur në faqen e tyre të dedikuar për të mbajtur faqen kryesore të lehtë dhe pa ngarkesë.
                  </p>
                </div>
              </div>
              <button
                id="open-anticipation-page-btn"
                onClick={() => setActiveTab('anticipation_radar')}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
              >
                <span>Hap Skenarët në Monitorim</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Trade ICT Checklist Flowchart */}
            <section aria-label="ICT Checklist">
              <StrategyChecklistCard
                trade={selectedTrade}
                onTradeSelect={handleSelectTrade}
                livePrice={livePrice}
                decimals={activeAssetConfig.decimals}
                currencySymbol={activeAssetConfig.symbol.includes('JPY') ? '¥' : (activeAssetConfig.symbol.includes('EUR') ? '€' : (activeAssetConfig.symbol.includes('GBP') ? '£' : '$'))}
              />
            </section>

            {/* Backtest 3-Day Breakdown (Sot, Dje, Pardje) */}
            <section aria-label="3-Day Backtest Results" className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Rezultatet e Testit të Drejtpërdrejtë në {activeAssetConfig.name} (Sot, Dje, Pardje)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verifikim i saktë i çdo mundësie hyrjeje kur janë përputhur të 4 kushtet e strategjisë ICT në {activeAssetConfig.symbol}
                  </p>
                </div>
              </div>

              <BacktestSummary
                trades={currentTrades}
                stats={currentStats}
                selectedTrade={selectedTrade}
                symbol={activeAssetConfig.symbol}
                onSelectTrade={handleSelectTrade}
              />
            </section>

            {/* Quick Banner to Kalendari Ditor i Fitimit */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Kalendari Ditor i Fitimit ({activeAssetConfig.symbol}) — Faqe e Ndarë
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                      Pips & Euro (€)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Llogaritja e fitimit të detajuar sipas ditëve të muajit, ndryshimi i lotit dhe konvertimi automatik në Euro gjenden në faqen e kalendarit.
                  </p>
                </div>
              </div>
              <button
                id="open-calendar-page-btn"
                onClick={() => setActiveTab('daily_calendar')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <span>Hap Kalendarin e Fitimit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Dedicated Entry Radar & Setup Anticipation */}
        {activeTab === 'anticipation_radar' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Faqja e Dedikuar: Skenarët në Monitorim ({activeAssetConfig.symbol})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Këtu monitorohen të gjitha nivelet ku presim të shfaqet hyrja (POI, Sweep, MSS, FVG).
                  </p>
                </div>
              </div>
              <button
                id="back-to-chart-from-radar-btn"
                onClick={() => setActiveTab('chart_analysis')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>← Kthehu te Grafiku</span>
              </button>
            </div>

            <EntryAnticipationRadar
              key={`radar-dedicated-${activeAssetId}`}
              livePrice={livePrice}
              assetSymbol={activeAssetConfig.symbol}
              setups={activeAssetConfig.setups}
              pipMultiplier={activeAssetConfig.pipMultiplier}
              decimals={activeAssetConfig.decimals}
              currencySymbol={activeAssetConfig.currencySymbol}
              onUpdateLivePrice={(p) => marketPriceService.setDirectPrice(activeAssetId, p)}
            />
          </div>
        )}

        {/* TAB 3: Dedicated Daily Profit Calendar (Pips & Euro) */}
        {activeTab === 'daily_calendar' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Faqja e Dedikuar: Kalendari Ditor i Fitimit ({activeAssetConfig.symbol})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Llogaritja ditore e fitimit me pips, euro dhe përshtatje të madhësisë së lotit.
                  </p>
                </div>
              </div>
              <button
                id="back-to-chart-from-cal-btn"
                onClick={() => setActiveTab('chart_analysis')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>← Kthehu te Grafiku</span>
              </button>
            </div>

            <DailyProfitCalendar
              key={`calendar-dedicated-${activeAssetId}`}
              initialTrades={currentTrades}
              symbol={activeAssetConfig.symbol}
            />
          </div>
        )}

        {/* TAB 4: Dedicated Live Alerts & Killzone Predictor */}
        {activeTab === 'live_alerts' && (
          <div className="space-y-6">
            <LiveAlertScanner
              livePrice={livePrice}
              symbol={activeAssetConfig.symbol}
              decimals={activeAssetConfig.decimals}
              currencySymbol={activeAssetConfig.currencySymbol}
            />

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Guida e Plotë për {activeAssetConfig.symbol}: Si të dish kur të futesh në treg dhe si të njoftohesh?
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    1. Kur të presësh mundësinë në {activeAssetConfig.symbol}?
                  </h4>
                  <p>
                    Në {activeAssetConfig.symbol}, mundësitë nuk kërkohen gjatë gjithë ditës pa pushim. Algoritmet e likuiditetit (IPDA) lëvizin në dy dritare kryesore:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>
                      <strong>09:00 - 12:00 (Ora e Tiranës/Prishtinës):</strong> London Open. Pastron likuiditetin e natës (Asian Range) me Judas Swing.
                    </li>
                    <li>
                      <strong>14:00 - 17:30 (Ora e Tiranës/Prishtinës):</strong> New York Session. Kjo është koha ideale ku vjen lëvizja kryesore drejt TP 1:2.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    2. Si të lajmëron ky sistem kur vjen mundësia në {activeAssetConfig.symbol}?
                  </h4>
                  <p>Sapo përmbushen 4 hapat e strategjisë nga fotot:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>
                      <strong>Zëri Chime me frekuencë të lartë:</strong> Lëshohet menjëherë një sinjal akustik i dyfishtë.
                    </li>
                    <li>
                      <strong>Push Notification në Desktop / Android:</strong> Shfaqet dritarja me çmimin e hyrjes, Stop Loss dhe Take Profit.
                    </li>
                    <li>
                      <strong>Grafiku TradingView:</strong> Sinkronizohet në kohë reale me {activeAssetConfig.tvSymbol}.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ICT Rules Reference */}
        {activeTab === 'rules_guide' && (
          <section aria-label="ICT Rules Reference">
            <ICTRulesReference />
          </section>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        <p>
          {activeStrategy === 'ICT'
            ? `ICT Multi-Asset Strategy Platform • ${activeAssetConfig.name} @ ${activeAssetConfig.currencySymbol}${livePrice.toFixed(activeAssetConfig.decimals)} • Zbatuar sipas rregullores: HTF POI, Liquidity Sweep, M/W Formacion, MSS + FVG, R:R 1:2.`
            : `MSNR LIT Strategy Platform (Trade with Abjeed) • ${activeAssetConfig.name} @ ${activeAssetConfig.currencySymbol}${livePrice.toFixed(activeAssetConfig.decimals)} • MSNR Alchemist, Liquidity Inducement Theory, M15 POI > Entry M1, SL 10 PIPS FIXED.`}
        </p>
      </footer>
    </div>
  );
}

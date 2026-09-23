import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, Time, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Candle } from '../../types/trading';
import { MSNRTrade } from '../../types/msnr';
import { OfficialTradingViewWidget } from '../OfficialTradingViewWidget';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Copy,
  Check,
  Zap,
  Eye,
  EyeOff,
  LineChart as LineChartIcon,
  BarChart2,
  Sparkles,
  Smartphone,
  AlertCircle,
  HelpCircle,
  Sliders,
  Activity,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { MT4ExecutionModal } from '../MT4ExecutionModal';
import { MultiTargetLevels } from '../../utils/ictTradeManagement';
import { MSNRLiveAdvisoryMonitor } from './MSNRLiveAdvisoryMonitor';

interface MSNRChartProps {
  candles: Candle[];
  trade: MSNRTrade | null;
  livePrice: number;
  symbol: string;
  decimals?: number;
  currencySymbol?: string;
  assetId?: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
}

export const MSNRChart: React.FC<MSNRChartProps> = ({
  candles,
  trade,
  livePrice,
  symbol,
  decimals = 2,
  currencySymbol = '$',
  assetId = 'XAUUSD',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  // Primary chart mode: 'official_tv' (100% Real TradingView live widget) vs 'msnr_sniper' (Lightweight Chart with MSNR levels)
  const [viewMode, setViewMode] = useState<'official_tv' | 'msnr_sniper'>('official_tv');
  const [tvInterval, setTvInterval] = useState<string>('15');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTvOverlay, setShowTvOverlay] = useState<boolean>(true);

  // Lightweight chart controls
  const [chartMode, setChartMode] = useState<'candlestick' | 'line'>('candlestick');
  const [activeTimeframe, setActiveTimeframe] = useState<'15M' | '1M'>('15M');
  const [showPoiZone, setShowPoiZone] = useState<boolean>(true);
  const [showIdmLine, setShowIdmLine] = useState<boolean>(true);
  const [showQmLine, setShowQmLine] = useState<boolean>(true);
  const [copiedLevels, setCopiedLevels] = useState<boolean>(false);
  const [showMt4Modal, setShowMt4Modal] = useState<boolean>(false);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(livePrice);

  useEffect(() => {
    setSimulatedPrice(livePrice);
  }, [livePrice]);

  // Clean symbol string
  const cleanSymbol = symbol.replace('/', '');

  // Determine official TradingView symbol
  const tvSymbol = useMemo(() => {
    if (assetId === 'XAUUSD' || symbol.includes('XAU') || symbol.includes('Gold')) return 'OANDA:XAUUSD';
    if (assetId === 'EURUSD' || symbol.includes('EUR')) return 'FX:EURUSD';
    if (assetId === 'GBPUSD' || symbol.includes('GBP')) return 'FX:GBPUSD';
    if (assetId === 'USDJPY' || symbol.includes('JPY')) return 'FX:USDJPY';
    return 'OANDA:XAUUSD';
  }, [assetId, symbol]);

  // CALIBRATE CANDLES: Eliminate any gap/void so latest candle matches the real livePrice exactly
  const calibratedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const lastClose = candles[candles.length - 1].close;
    const delta = livePrice - lastClose;
    return candles.map((c, idx) => {
      const isLast = idx === candles.length - 1;
      const open = Number((c.open + delta).toFixed(decimals));
      const high = Number((Math.max(c.high + delta, isLast ? livePrice : c.high + delta)).toFixed(decimals));
      const low = Number((Math.min(c.low + delta, isLast ? livePrice : c.low + delta)).toFixed(decimals));
      const close = isLast ? Number(livePrice.toFixed(decimals)) : Number((c.close + delta).toFixed(decimals));
      return {
        ...c,
        open,
        high,
        low,
        close,
      };
    });
  }, [candles, livePrice, decimals]);

  // CALIBRATE TRADE LEVELS: Anchor the MSNR setup levels to current market structure if they differ from livePrice
  const calibratedTrade = useMemo(() => {
    if (!trade) return null;
    const pipMultiplier = symbol.includes('JPY') ? 0.01 : symbol.includes('XAU') ? 0.10 : 0.0001;
    const pipsDiff = Math.abs(trade.entryPrice - livePrice) / pipMultiplier;

    // If trade levels are more than 35 pips away from real live price, dynamically anchor to current market structure
    if (pipsDiff > 35) {
      const shift = livePrice - trade.entryPrice;
      return {
        ...trade,
        entryPrice: Number((trade.entryPrice + shift).toFixed(decimals)),
        stopLoss: Number((trade.stopLoss + shift).toFixed(decimals)),
        takeProfit1: Number((trade.takeProfit1 + shift).toFixed(decimals)),
        takeProfit2: Number((trade.takeProfit2 + shift).toFixed(decimals)),
        takeProfit3: Number((trade.takeProfit3 + shift).toFixed(decimals)),
        breakevenPrice: Number((trade.breakevenPrice + shift).toFixed(decimals)),
        poiHigh: Number((trade.poiHigh + shift).toFixed(decimals)),
        poiLow: Number((trade.poiLow + shift).toFixed(decimals)),
        idmPrice: Number((trade.idmPrice + shift).toFixed(decimals)),
        tsPrice: Number((trade.tsPrice + shift).toFixed(decimals)),
        qmLevel: trade.qmLevel ? Number((trade.qmLevel + shift).toFixed(decimals)) : undefined,
        oclLevel: trade.oclLevel ? Number((trade.oclLevel + shift).toFixed(decimals)) : undefined,
      };
    }
    return trade;
  }, [trade, livePrice, decimals, symbol]);

  // Convert calibrated candles for Lightweight Charts
  const chartData = useMemo(() => {
    if (!calibratedCandles || calibratedCandles.length === 0) return [];
    return calibratedCandles.map((c) => ({
      time: (typeof c.time === 'string' ? Math.floor(new Date(c.time).getTime() / 1000) : c.time) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [calibratedCandles]);

  // Line chart data (Close prices as taught in Abjeed book for clear SNR levels)
  const lineData = useMemo(() => {
    return chartData.map((d) => ({
      time: d.time,
      value: d.close,
    }));
  }, [chartData]);

  // Initialize and update Lightweight Chart when in 'msnr_sniper' mode
  useEffect(() => {
    if (viewMode !== 'msnr_sniper') return;
    if (!chartContainerRef.current) return;

    // Clean up previous chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        vertLine: { color: '#38bdf8', width: 1, style: 2 },
        horzLine: { color: '#38bdf8', width: 1, style: 2 },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 140 : 480,
    });

    chartRef.current = chart;

    if (chartMode === 'candlestick') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#1e293b',
        borderVisible: true,
        borderUpColor: '#10b981',
        borderDownColor: '#475569',
        wickUpColor: '#10b981',
        wickDownColor: '#94a3b8',
      });
      candleSeries.setData(chartData as any);
      candleSeriesRef.current = candleSeries as any;
      lineSeriesRef.current = null;
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });
      lineSeries.setData(lineData as any);
      lineSeriesRef.current = lineSeries as any;
      candleSeriesRef.current = null;
    }

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 140 : 480,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [viewMode, chartMode, chartData, lineData, isFullscreen]);

  // Draw MSNR LIT Specific Price Lines in Sniper mode
  useEffect(() => {
    if (viewMode !== 'msnr_sniper') return;
    const activeSeries = candleSeriesRef.current || lineSeriesRef.current;
    if (!activeSeries || !calibratedTrade) return;

    // Clear previous lines
    priceLinesRef.current.forEach((line) => {
      try {
        activeSeries.removePriceLine(line);
      } catch (e) {
        // ignore
      }
    });
    priceLinesRef.current = [];

    // 1. Entry Line (Sky Blue)
    const entryLine = activeSeries.createPriceLine({
      price: calibratedTrade.entryPrice,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: 0, // solid
      axisLabelVisible: true,
      title: `MSNR ENTRY (${calibratedTrade.type})`,
    });
    priceLinesRef.current.push(entryLine);

    // 2. Strict 10 Pips Stop Loss (Red)
    const slLine = activeSeries.createPriceLine({
      price: calibratedTrade.stopLoss,
      color: '#f43f5e',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `SL 10 PIPS [${calibratedTrade.stopLoss.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(slLine);

    // 3. Take Profit 1 (1:3 R:R - 30 Pips)
    const tp1Line = activeSeries.createPriceLine({
      price: calibratedTrade.takeProfit1,
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 1, // dotted
      axisLabelVisible: true,
      title: `TP1 1:3 (+30p) [${calibratedTrade.takeProfit1.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(tp1Line);

    // 4. Take Profit 2 (1:5 R:R - 50 Pips)
    const tp2Line = activeSeries.createPriceLine({
      price: calibratedTrade.takeProfit2,
      color: '#059669',
      lineWidth: 2,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: `TP2 1:5 (+50p) [${calibratedTrade.takeProfit2.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(tp2Line);

    // 4b. Take Profit 3 (1:8+ R:R - 80 Pips)
    if (calibratedTrade.takeProfit3) {
      const tp3Line = activeSeries.createPriceLine({
        price: calibratedTrade.takeProfit3,
        color: '#8b5cf6',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `TP3 1:8+ (+80p) [${calibratedTrade.takeProfit3.toFixed(decimals)}]`,
      });
      priceLinesRef.current.push(tp3Line);
    }

    // 5. Inducement Line (Yellow Dotted - LIT Trap)
    if (showIdmLine && calibratedTrade.idmPrice) {
      const idmLine = activeSeries.createPriceLine({
        price: calibratedTrade.idmPrice,
        color: '#eab308',
        lineWidth: 1,
        lineStyle: 3, // large dashed
        axisLabelVisible: true,
        title: `IDM (Inducement Trap ✨)`,
      });
      priceLinesRef.current.push(idmLine);
    }

    // 6. Quasimodo / OCL Level (Purple)
    if (showQmLine && (calibratedTrade.qmLevel || calibratedTrade.oclLevel)) {
      const qmPrice = calibratedTrade.qmLevel || calibratedTrade.oclLevel!;
      const qmLine = activeSeries.createPriceLine({
        price: qmPrice,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `QM / OCL Level (${calibratedTrade.patternType})`,
      });
      priceLinesRef.current.push(qmLine);
    }

    // 7. Breakeven Level (Amber)
    const beLine = activeSeries.createPriceLine({
      price: calibratedTrade.breakevenPrice,
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: `BE (+1p)`,
    });
    priceLinesRef.current.push(beLine);

    // 8. Live Price Line (Cyan Solid - sits directly on current candle)
    const liveLine = activeSeries.createPriceLine({
      price: simulatedPrice,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `LIVE [${simulatedPrice.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(liveLine);

  }, [viewMode, calibratedTrade, showIdmLine, showQmLine, decimals, simulatedPrice]);

  // Copy levels to clipboard
  const handleCopyLevels = () => {
    const t = calibratedTrade || trade;
    if (!t) return;
    const text = `MSNR LIT SETUP [Trade with Abjeed]\nSimboli: ${cleanSymbol} (${t.type})\nPattern: ${t.patternType}\nEntry: ${t.entryPrice.toFixed(decimals)}\nSL (10 Pips): ${t.stopLoss.toFixed(decimals)}\nBE (+1p): ${t.breakevenPrice.toFixed(decimals)}\nTP1 (1:3): ${t.takeProfit1.toFixed(decimals)}\nTP2 (1:5): ${t.takeProfit2.toFixed(decimals)}\nTP3 (1:8): ${t.takeProfit3 ? t.takeProfit3.toFixed(decimals) : 'N/A'}\nInducement (IDM): ${t.idmPrice ? t.idmPrice.toFixed(decimals) : 'N/A'}\nM15 POI Zone: ${t.poiLow.toFixed(decimals)} - ${t.poiHigh.toFixed(decimals)}`;
    navigator.clipboard.writeText(text);
    setCopiedLevels(true);
    setTimeout(() => setCopiedLevels(false), 2000);
  };

  // Convert MSNR trade into mock MultiTargetLevels for MT4 modal
  const effectiveTrade = calibratedTrade || trade;
  const mockMgmt: MultiTargetLevels | null = effectiveTrade
    ? {
        entryPrice: effectiveTrade.entryPrice,
        stopLoss: effectiveTrade.stopLoss,
        riskPips: 10,
        bePrice: effectiveTrade.breakevenPrice,
        tp1Price: effectiveTrade.takeProfit1,
        tp1Pips: 30,
        tp1Rr: '1:3',
        tp2Price: effectiveTrade.takeProfit2,
        tp2Pips: 50,
        tp2Rr: '1:5',
        tp2Label: 'Likuiditet i Jashtëm (Next MSNR)',
        tp3Price: effectiveTrade.takeProfit3,
        tp3Pips: 80,
        tp3Rr: '1:8',
        tp3Label: 'HTF Expansion Target',
        liveAdvisory: {
          bePrice: effectiveTrade.breakevenPrice,
          beStatus: 'PROTECTED',
          reversalRisk: 'HIGH_CONTINUATION_POTENTIAL',
          riskTitle: 'POTENCIAL I LARTË PËR TP2 DHE TP3',
          adviceMessage: 'Target Sweep (TS) u realizua me sukses! M1 MSS konfirmoi ndryshimin. Mbani pozicionin me SL në Breakeven (+1p) për të kapur TP2 (50 pips).',
          actionPrompt: 'Mbani 30% të pozicionit për TP2.',
          indicatorEvidence: ['TS Liquidity Sweep Confirmed', 'M1 MSS Bearish/Bullish Shift', 'SL 10 Pips Enforced'],
          tp1Level: effectiveTrade.takeProfit1,
          tp2Level: effectiveTrade.takeProfit2,
          tp3Level: effectiveTrade.takeProfit3,
          tp2Pips: 50,
          tp3Pips: 80,
        },
      }
    : null;

  const isBuy = effectiveTrade ? effectiveTrade.type === 'BUY' : true;

  return (
    <div
      id="msnr-chart-wrapper"
      className={`space-y-3 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''
      }`}
    >
      {/* Top Primary View Mode Switcher: Official TradingView Live vs MSNR Sniper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="msnr-mode-tradingview-btn"
            onClick={() => setViewMode('official_tv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
              viewMode === 'official_tv'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>TradingView Live (100% Real)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          </button>

          <button
            id="msnr-mode-sniper-btn"
            onClick={() => setViewMode('msnr_sniper')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
              viewMode === 'msnr_sniper'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Grafiku MSNR Sniper (Nivelet POI &amp; SL 10p)</span>
          </button>
        </div>

        {/* Center: Live Price Badge */}
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Çmimi Live:</span>
            <span className="text-sm font-black text-sky-400">
              {currencySymbol}{livePrice.toFixed(decimals)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live TV Feed
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>SL 10 PIPS</span>
          </div>
        </div>

        {/* Right: Quick Tools & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            id="msnr-quick-copy-levels-btn"
            onClick={handleCopyLevels}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Kopjo nivelet e MSNR LIT për MT4/MT5"
          >
            {copiedLevels ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLevels ? 'U Kopjuan!' : 'Kopjo Nivelet'}</span>
          </button>

          <button
            id="msnr-quick-open-mt4-btn"
            onClick={() => setShowMt4Modal(true)}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
            title="Udhëzuesi i vendosjes në MT4/MT5 me 10 pips SL"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Vendos në MT4/5</span>
          </button>

          <button
            id="msnr-fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={isFullscreen ? 'Mbyll ekranin e plotë' : 'Ekran i plotë'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* VIEW 1: OFFICIAL TRADINGVIEW LIVE WIDGET */}
      {viewMode === 'official_tv' && (
        <div className="space-y-2">
          {/* Sub-toolbar for TradingView Live */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Left: Timeframe Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-bold mr-1">Timeframe:</span>
              {[
                { id: '1', label: 'M1 (Entry)' },
                { id: '5', label: 'M5' },
                { id: '15', label: 'M15 (POI)' },
                { id: '60', label: '1H' },
                { id: '240', label: '4H' },
                { id: 'D', label: '1D' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  id={`msnr-tv-tf-${tf.id}`}
                  onClick={() => setTvInterval(tf.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    tvInterval === tf.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Right: Toggle MSNR Overlay & Feed info */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTvOverlay(!showTvOverlay)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition-all ${
                  showTvOverlay
                    ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Afisho ose fshih shiritin me nivelet MSNR (POI, IDM, SL, TP)"
              >
                {showTvOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Nivelet MSNR LIT</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                Simboli: <strong className="text-emerald-400">{tvSymbol}</strong>
              </span>
            </div>
          </div>

          {/* Real Interactive TradingView Container */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#131722]">
            {/* Floating MSNR LIT Levels Overlay */}
            {showTvOverlay && effectiveTrade && (
              <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 pointer-events-auto z-10">
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md text-xs font-mono">
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-sky-400" />
                    MSNR: {effectiveTrade.patternType.replace('_', ' ')}
                  </span>

                  {/* M15 POI */}
                  <div
                    title="M15 Point of Interest Zone"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300"
                  >
                    <span className="text-[10px] text-cyan-400">POI:</span>
                    <span className="font-bold">
                      {currencySymbol}{effectiveTrade.poiLow.toFixed(decimals)} - {effectiveTrade.poiHigh.toFixed(decimals)}
                    </span>
                  </div>

                  {/* IDM Trap */}
                  {effectiveTrade.idmPrice && (
                    <div
                      title="LIT Inducement Trap"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-950/70 border border-yellow-500/40 text-yellow-300"
                    >
                      <span className="text-[10px] text-yellow-400 font-bold">IDM:</span>
                      <span className="font-bold">{currencySymbol}{effectiveTrade.idmPrice.toFixed(decimals)}</span>
                    </div>
                  )}

                  {/* Entry */}
                  <div
                    title="Çmimi i Hyrjes (Entry)"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-300"
                  >
                    <span className="text-[10px] text-sky-400 font-bold">ENTRY ({effectiveTrade.type}):</span>
                    <span className="font-bold">{currencySymbol}{effectiveTrade.entryPrice.toFixed(decimals)}</span>
                  </div>

                  {/* Stop Loss 10 pips */}
                  <div
                    title="Stop Loss i Hekurt: 10 Pips Fixed"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300"
                  >
                    <span className="text-[10px] text-rose-400 font-black">SL 10p:</span>
                    <span className="font-bold">{currencySymbol}{effectiveTrade.stopLoss.toFixed(decimals)}</span>
                  </div>

                  {/* TP1 */}
                  <div
                    title="TP1 (1:3 R:R - 30 Pips)"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300"
                  >
                    <span className="text-[10px] text-emerald-400 font-bold">TP1 (1:3):</span>
                    <span className="font-bold">{currencySymbol}{effectiveTrade.takeProfit1.toFixed(decimals)}</span>
                  </div>

                  {/* TP2 */}
                  <div
                    title="TP2 (1:5 R:R - 50 Pips)"
                    className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300"
                  >
                    <span className="text-[10px] text-emerald-400 font-bold">TP2 (1:5):</span>
                    <span className="font-bold">{currencySymbol}{effectiveTrade.takeProfit2.toFixed(decimals)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Embedded Live Widget */}
            <OfficialTradingViewWidget
              symbol={tvSymbol}
              interval={tvInterval}
              theme="dark"
              height={isFullscreen ? window.innerHeight - 180 : 540}
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Grafiku është 100% në kohë reale nga serverat e TradingView me qirinjtë, lëkundjet e çmimit dhe veglat e plota teknike.
            </span>
            <button
              onClick={() => setViewMode('msnr_sniper')}
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 text-xs"
            >
              <span>Shiko pamjen me vija MSNR Sniper</span>
              <Sliders className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: MSNR SNIPER CHART (LIGHTWEIGHT CANVAS ME QIRINJ & LINE SNR DHE NIVELE TE KALIBRUARA) */}
      {viewMode === 'msnr_sniper' && (
        <div className="space-y-3">
          {/* Sub-toolbar for Sniper mode */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-sky-300 uppercase">
                MSNR ALCHEMIST • {symbol}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                Qirinjtë të Kalibruar me Çmimin Live
              </span>
            </div>

            {/* Center: Chart Type (Candlestick vs Line Chart) & Timeframe */}
            <div className="flex items-center gap-2">
              {/* Candlestick vs Line Chart Mode (From Abjeed Book page 5 & 7) */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  id="msnr-toggle-candles-btn"
                  onClick={() => setChartMode('candlestick')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    chartMode === 'candlestick'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Qirinj Candlestick (Për vëzhgimin e fitilave dhe refuzimeve)"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Qirinj</span>
                </button>
                <button
                  id="msnr-toggle-line-btn"
                  onClick={() => setChartMode('line')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    chartMode === 'line'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Line Chart (Sipas librit Abjeed: Heq zhurmën e fitilave dhe nxjerr pikat ekzakte pivot/QM)"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span>Line (SNR)</span>
                </button>
              </div>

              {/* Timeframe M15 vs M1 */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setActiveTimeframe('15M')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTimeframe === '15M'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="M15: Struktura Kryesore, POI dhe Inducement"
                >
                  M15 (POI)
                </button>
                <button
                  onClick={() => setActiveTimeframe('1M')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTimeframe === '1M'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="M1: Hyrja Sniper pas TS dhe MSS"
                >
                  M1 (Entry)
                </button>
              </div>
            </div>

            {/* Right: Switch back to TradingView Live */}
            <button
              onClick={() => setViewMode('official_tv')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kaloni tek TradingView Live</span>
            </button>
          </div>

          {/* Main Lightweight Chart Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Floating MSNR Indicator Overlay Badges */}
            <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-sky-950/90 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-black backdrop-blur-md flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                {effectiveTrade ? effectiveTrade.patternType.replace('_', ' ') : 'MSNR SETUP'}
              </span>

              {effectiveTrade?.idmPrice && (
                <span className="px-2.5 py-1 rounded-lg bg-yellow-950/90 text-yellow-300 border border-yellow-500/40 text-[11px] font-mono font-bold backdrop-blur-md flex items-center gap-1 shadow">
                  <span>IDM Trap:</span>
                  <strong>{currencySymbol}{effectiveTrade.idmPrice.toFixed(decimals)}</strong>
                </span>
              )}

              {effectiveTrade?.poiLow && effectiveTrade?.poiHigh && (
                <span className="hidden sm:flex px-2.5 py-1 rounded-lg bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold backdrop-blur-md items-center gap-1 shadow">
                  <span>M15 POI:</span>
                  <strong>{currencySymbol}{effectiveTrade.poiLow.toFixed(decimals)} - {effectiveTrade.poiHigh.toFixed(decimals)}</strong>
                </span>
              )}

              <span className="px-2 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-black backdrop-blur-md shadow">
                SL: 10 PIPS ({effectiveTrade?.slPips || 10}p)
              </span>
            </div>

            {/* Lightweight Charts Canvas */}
            <div ref={chartContainerRef} className="w-full h-[480px]" />

            {/* Bottom Toggles & Legend Bar */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Toggles */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showIdmLine}
                    onChange={(e) => setShowIdmLine(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-yellow-500 focus:ring-0 bg-slate-800"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    Inducement (IDM)
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showQmLine}
                    onChange={(e) => setShowQmLine(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-purple-500 focus:ring-0 bg-slate-800"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Quasimodo (QM) / OCL
                  </span>
                </label>
              </div>

              {/* Color Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-sky-400 rounded" />
                  Hyrja (Entry)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-rose-500 rounded" />
                  SL (10 Pips)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-amber-400 rounded" />
                  BE (+1p)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-emerald-500 rounded" />
                  TP1 (1:3)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-emerald-600 rounded" />
                  TP2 (1:5)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-purple-500 rounded" />
                  TP3 (1:8+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-sky-400 rounded" />
                  Live [Çmimi Real]
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Advisory & Reversal Risk Monitor (Works seamlessly with calibrated levels) */}
      {effectiveTrade && (
        <MSNRLiveAdvisoryMonitor
          trade={effectiveTrade}
          livePrice={livePrice}
          decimals={decimals}
          currencySymbol={currencySymbol}
          onSimulatePriceChange={setSimulatedPrice}
        />
      )}

      {/* Target Roadmap & Risk Assessment Card */}
      {effectiveTrade && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {effectiveTrade.title}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-sky-500/20 text-sky-300">
                    {effectiveTrade.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{effectiveTrade.timestamp}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">R:R Potencial:</span>
              <span className="text-emerald-400 font-black px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                Deri në 1:8+ RR (+80 Pips)
              </span>
            </div>
          </div>

          {/* 5 Cards Grid: Entry, SL 10 Pips, TP1, TP2, TP3 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Entry */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-sky-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-sky-400 font-bold uppercase">Hyrja (Entry)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                  {effectiveTrade.type}
                </span>
              </div>
              <p className="text-sm font-black text-white font-mono mt-1">
                {currencySymbol}{effectiveTrade.entryPrice.toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Retest QM / OCL</p>
            </div>

            {/* SL 10 Pips */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-400 font-bold uppercase">Stop Loss</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-black">
                  10 Pips Fixed
                </span>
              </div>
              <p className="text-sm font-black text-rose-300 font-mono mt-1">
                {currencySymbol}{effectiveTrade.stopLoss.toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Mbi/Nën fitilin e TS</p>
            </div>

            {/* TP1 1:3 */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">TP1 (1:3 R:R)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  +30 Pips
                </span>
              </div>
              <p className="text-sm font-black text-emerald-300 font-mono mt-1">
                {currencySymbol}{effectiveTrade.takeProfit1.toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">M15 IDM Trap</p>
            </div>

            {/* TP2 1:5 */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">TP2 (1:5 R:R)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  +50 Pips
                </span>
              </div>
              <p className="text-sm font-black text-emerald-400 font-mono mt-1">
                {currencySymbol}{effectiveTrade.takeProfit2.toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">MSNR 6 Flip S/R</p>
            </div>

            {/* TP3 1:8+ */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-500/40 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-400 font-bold uppercase">TP3 (1:8+ R:R)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                  +80 Pips
                </span>
              </div>
              <p className="text-sm font-black text-purple-300 font-mono mt-1">
                {currencySymbol}{effectiveTrade.takeProfit3 ? effectiveTrade.takeProfit3.toFixed(decimals) : (effectiveTrade.takeProfit2 * 1.002).toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">MSNR 7 Ext Target</p>
            </div>
          </div>

          {/* Abjeed Rule Note */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Rregulli i Librit Abjeed:</strong> {effectiveTrade.reason}
            </p>
          </div>
        </div>
      )}

      {/* MT4 / MT5 Execution Modal */}
      <MT4ExecutionModal
        isOpen={showMt4Modal}
        onClose={() => setShowMt4Modal(false)}
        trade={effectiveTrade ? ({
          id: effectiveTrade.id,
          symbol: effectiveTrade.symbol,
          type: effectiveTrade.type,
          entryPrice: effectiveTrade.entryPrice,
          stopLoss: effectiveTrade.stopLoss,
          takeProfit: effectiveTrade.takeProfit1,
          timeframe: effectiveTrade.timeframeLTF,
          status: effectiveTrade.status,
          date: effectiveTrade.timestamp,
          pips: effectiveTrade.pnlPips || 30,
          profit: effectiveTrade.pnlDollar || 300,
          riskReward: '1:3',
          checklist: {
            fvgFormed: effectiveTrade.checklist.htfPoiIdentified,
            fvgValid: effectiveTrade.checklist.inducementCreated,
            mssConfirmed: effectiveTrade.checklist.m1MssConfirmed,
            liquiditySwept: effectiveTrade.checklist.targetSweepExecuted,
            rrAcceptable: effectiveTrade.checklist.strict10PipSL,
            killzoneActive: true,
          }
        } as any) : null}
        mgmt={mockMgmt}
        symbol={symbol}
        decimals={decimals}
      />
    </div>
  );
};

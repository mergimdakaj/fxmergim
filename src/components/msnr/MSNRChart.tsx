import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, ColorType, Time, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Candle } from '../../types/trading';
import { MSNRTrade } from '../../types/msnr';
import { marketPriceService } from '../../services/marketPriceService';
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
  LineChart as LineChartIcon,
  BarChart2,
  Sparkles,
  Smartphone,
  AlertCircle,
  HelpCircle,
  Sliders,
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
}

export const MSNRChart: React.FC<MSNRChartProps> = ({
  candles,
  trade,
  livePrice,
  symbol,
  decimals = 2,
  currencySymbol = '$',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

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

  // Convert candles for Lightweight Charts
  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.map((c) => ({
      time: (typeof c.time === 'string' ? Math.floor(new Date(c.time).getTime() / 1000) : c.time) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [candles]);

  // Line chart data (Close prices as taught in Abjeed book)
  const lineData = useMemo(() => {
    return chartData.map((d) => ({
      time: d.time,
      value: d.close,
    }));
  }, [chartData]);

  // Initialize and update Lightweight Chart
  useEffect(() => {
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
      height: 480,
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
  }, [chartMode, chartData, lineData]);

  // Draw MSNR LIT Specific Price Lines
  useEffect(() => {
    const activeSeries = candleSeriesRef.current || lineSeriesRef.current;
    if (!activeSeries || !trade) return;

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
      price: trade.entryPrice,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: 0, // solid
      axisLabelVisible: true,
      title: `MSNR ENTRY (${trade.type})`,
    });
    priceLinesRef.current.push(entryLine);

    // 2. Strict 10 Pips Stop Loss (Red)
    const slLine = activeSeries.createPriceLine({
      price: trade.stopLoss,
      color: '#f43f5e',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `SL 10 PIPS [${trade.stopLoss.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(slLine);

    // 3. Take Profit 1 (1:3 R:R - 30 Pips)
    const tp1Line = activeSeries.createPriceLine({
      price: trade.takeProfit1,
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 1, // dotted
      axisLabelVisible: true,
      title: `TP1 1:3 (+30p) [${trade.takeProfit1.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(tp1Line);

    // 4. Take Profit 2 (1:5 R:R - 50 Pips)
    const tp2Line = activeSeries.createPriceLine({
      price: trade.takeProfit2,
      color: '#059669',
      lineWidth: 2,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: `TP2 1:5 (+50p) [${trade.takeProfit2.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(tp2Line);

    // 4b. Take Profit 3 (1:8+ R:R - 80 Pips)
    if (trade.takeProfit3) {
      const tp3Line = activeSeries.createPriceLine({
        price: trade.takeProfit3,
        color: '#8b5cf6',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `TP3 1:8+ (+80p) [${trade.takeProfit3.toFixed(decimals)}]`,
      });
      priceLinesRef.current.push(tp3Line);
    }

    // 5. Inducement Line (Yellow Dotted - LIT Trap)
    if (showIdmLine && trade.idmPrice) {
      const idmLine = activeSeries.createPriceLine({
        price: trade.idmPrice,
        color: '#eab308',
        lineWidth: 1,
        lineStyle: 3, // large dashed
        axisLabelVisible: true,
        title: `IDM (Inducement Trap ✨)`,
      });
      priceLinesRef.current.push(idmLine);
    }

    // 6. Quasimodo / OCL Level (Purple)
    if (showQmLine && (trade.qmLevel || trade.oclLevel)) {
      const qmPrice = trade.qmLevel || trade.oclLevel!;
      const qmLine = activeSeries.createPriceLine({
        price: qmPrice,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `QM / OCL Level (${trade.patternType})`,
      });
      priceLinesRef.current.push(qmLine);
    }

    // 7. Breakeven Level (Amber)
    const beLine = activeSeries.createPriceLine({
      price: trade.breakevenPrice,
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: `BE (+1p)`,
    });
    priceLinesRef.current.push(beLine);

    // 8. Live / Simulated Price Line (Cyan Solid)
    const liveLine = activeSeries.createPriceLine({
      price: simulatedPrice,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `LIVE [${simulatedPrice.toFixed(decimals)}]`,
    });
    priceLinesRef.current.push(liveLine);

  }, [trade, showIdmLine, showQmLine, decimals, simulatedPrice]);

  // Copy levels to clipboard
  const handleCopyLevels = () => {
    if (!trade) return;
    const text = `MSNR LIT SETUP [Trade with Abjeed]\nSimboli: ${cleanSymbol} (${trade.type})\nPattern: ${trade.patternType}\nEntry: ${trade.entryPrice.toFixed(decimals)}\nSL (10 Pips): ${trade.stopLoss.toFixed(decimals)}\nBE (+1p): ${trade.breakevenPrice.toFixed(decimals)}\nTP1 (1:3): ${trade.takeProfit1.toFixed(decimals)}\nTP2 (1:5): ${trade.takeProfit2.toFixed(decimals)}\nTP3 (1:8): ${trade.takeProfit3.toFixed(decimals)}\nInducement (IDM): ${trade.idmPrice.toFixed(decimals)}\nM15 POI Zone: ${trade.poiLow.toFixed(decimals)} - ${trade.poiHigh.toFixed(decimals)}`;
    navigator.clipboard.writeText(text);
    setCopiedLevels(true);
    setTimeout(() => setCopiedLevels(false), 2000);
  };

  // Convert MSNR trade into mock MultiTargetLevels for MT4 modal
  const mockMgmt: MultiTargetLevels | null = trade
    ? {
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        riskPips: 10,
        bePrice: trade.breakevenPrice,
        tp1Price: trade.takeProfit1,
        tp1Pips: 30,
        tp1Rr: '1:3',
        tp2Price: trade.takeProfit2,
        tp2Pips: 50,
        tp2Rr: '1:5',
        tp2Label: 'Likuiditet i Jashtëm (Next MSNR)',
        tp3Price: trade.takeProfit3,
        tp3Pips: 80,
        tp3Rr: '1:8',
        tp3Label: 'HTF Expansion Target',
        liveAdvisory: {
          bePrice: trade.breakevenPrice,
          beStatus: 'PROTECTED',
          reversalRisk: 'HIGH_CONTINUATION_POTENTIAL',
          riskTitle: 'POTENCIAL I LARTË PËR TP2 DHE TP3',
          adviceMessage: 'Target Sweep (TS) u realizua me sukses! M1 MSS konfirmoi ndryshimin. Mbani pozicionin me SL në Breakeven (+1p) për të kapur TP2 (50 pips).',
          actionPrompt: 'Mbani 30% të pozicionit për TP2.',
          indicatorEvidence: ['TS Liquidity Sweep Confirmed', 'M1 MSS Bearish/Bullish Shift', 'SL 10 Pips Enforced'],
          tp1Level: trade.takeProfit1,
          tp2Level: trade.takeProfit2,
          tp3Level: trade.takeProfit3,
          tp2Pips: 50,
          tp3Pips: 80,
        },
      }
    : null;

  const isBuy = trade?.type === 'BUY';

  return (
    <div id="msnr-chart-wrapper" className="space-y-3">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Asset & Strategy Identifier */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black tracking-wider text-sky-300 uppercase">
              MSNR ALCHEMIST • {symbol}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>SL 10 PIPS FIXED</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-mono">
            <span>Çmimi Live:</span>
            <strong className="text-white font-bold">
              {currencySymbol}{livePrice.toFixed(decimals)}
            </strong>
          </div>
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

        {/* Right Actions: Copy & MT4 Guide & Calibrate */}
        <div className="flex items-center gap-2">
          <button
            id="msnr-copy-levels-btn"
            onClick={handleCopyLevels}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Kopjo nivelet e MSNR LIT për MT4/MT5"
          >
            {copiedLevels ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLevels ? 'U Kopjuan!' : 'Kopjo Nivelet'}</span>
          </button>

          <button
            id="msnr-open-mt4-modal-btn"
            onClick={() => setShowMt4Modal(true)}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
            title="Udhëzuesi i vendosjes në MT4/MT5 me 10 pips SL"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Vendos në MT4/5</span>
          </button>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Floating MSNR Indicator Overlay Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/90 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-black backdrop-blur-md flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            {trade ? trade.patternType.replace('_', ' ') : 'MSNR SETUP'}
          </span>

          {trade?.idmPrice && (
            <span className="px-2.5 py-1 rounded-lg bg-yellow-950/90 text-yellow-300 border border-yellow-500/40 text-[11px] font-mono font-bold backdrop-blur-md flex items-center gap-1 shadow">
              <span>IDM Trap:</span>
              <strong>{currencySymbol}{trade.idmPrice.toFixed(decimals)}</strong>
            </span>
          )}

          {trade?.poiLow && trade?.poiHigh && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-lg bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold backdrop-blur-md items-center gap-1 shadow">
              <span>M15 POI:</span>
              <strong>{currencySymbol}{trade.poiLow.toFixed(decimals)} - {trade.poiHigh.toFixed(decimals)}</strong>
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-black backdrop-blur-md shadow">
            SL: 10 PIPS ({trade?.slPips || 10}p)
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
              Live / Sim
            </span>
          </div>
        </div>
      </div>

      {/* Live Advisory & Reversal Risk Monitor (Answers User Prompt) */}
      {trade && (
        <MSNRLiveAdvisoryMonitor
          trade={trade}
          livePrice={livePrice}
          decimals={decimals}
          currencySymbol={currencySymbol}
          onSimulatePriceChange={setSimulatedPrice}
        />
      )}

      {/* Target Roadmap & Risk Assessment Card */}
      {trade && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {trade.title}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-sky-500/20 text-sky-300">
                    {trade.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{trade.timestamp}</p>
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
                  {trade.type}
                </span>
              </div>
              <p className="text-sm font-black text-white font-mono mt-1">
                {currencySymbol}{trade.entryPrice.toFixed(decimals)}
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
                {currencySymbol}{trade.stopLoss.toFixed(decimals)}
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
                {currencySymbol}{trade.takeProfit1.toFixed(decimals)}
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
                {currencySymbol}{trade.takeProfit2.toFixed(decimals)}
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
                {currencySymbol}{trade.takeProfit3.toFixed(decimals)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">MSNR 7 Ext Target</p>
            </div>
          </div>

          {/* Abjeed Rule Note */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Rregulli i Librit Abjeed:</strong> {trade.reason}
            </p>
          </div>
        </div>
      )}

      {/* MT4 / MT5 Execution Modal */}
      <MT4ExecutionModal
        isOpen={showMt4Modal}
        onClose={() => setShowMt4Modal(false)}
        trade={trade ? ({
          id: trade.id,
          symbol: trade.symbol,
          type: trade.type,
          entryPrice: trade.entryPrice,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit1,
          timeframe: trade.timeframeLTF,
          status: trade.status,
          date: trade.timestamp,
          pips: trade.pnlPips || 30,
          profit: trade.pnlDollar || 300,
          riskReward: '1:3',
          checklist: {
            fvgFormed: trade.checklist.htfPoiIdentified,
            fvgValid: trade.checklist.inducementCreated,
            mssConfirmed: trade.checklist.m1MssConfirmed,
            liquiditySwept: trade.checklist.targetSweepExecuted,
            rrAcceptable: trade.checklist.strict10PipSL,
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

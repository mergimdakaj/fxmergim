import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
  createSeriesMarkers,
} from 'lightweight-charts';
import { Candle, ICTTrade } from '../types/trading';
import { OfficialTradingViewWidget } from './OfficialTradingViewWidget';
import { calculateICTTradeManagement } from '../utils/ictTradeManagement';
import { marketPriceService } from '../services/marketPriceService';
import {
  Maximize2,
  Minimize2,
  Target,
  Clock,
  Layers,
  Activity,
  Flame,
  Globe,
  Sliders,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Copy,
  Eye,
  EyeOff,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Rocket,
  Zap,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { MT4ExecutionModal } from './MT4ExecutionModal';

interface TradingViewChartProps {
  candles: Candle[];
  trades: ICTTrade[];
  selectedTrade: ICTTrade | null;
  onSelectTrade: (trade: ICTTrade) => void;
  livePrice: number;
  isLive: boolean;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  priceSourceLabel?: string;
  onCalibratePrice?: (price: number) => void;
  symbol?: string;
  decimals?: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  trades,
  selectedTrade,
  onSelectTrade,
  livePrice,
  isLive,
  timeframe,
  setTimeframe,
  priceSourceLabel = 'GoldAPI.io Real-Time Spot',
  onCalibratePrice,
  symbol = 'OANDA:XAUUSD',
  decimals = 2,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const markersPluginRef = useRef<any>(null);

  // View modes: 'official_tv' (100% exact TradingView live feed) vs 'ict_scanner' (Lightweight annotations)
  const [chartMode, setChartMode] = useState<'official_tv' | 'ict_scanner'>('official_tv');
  const [tvSymbol, setTvSymbol] = useState<string>(symbol);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showTvIctOverlay, setShowTvIctOverlay] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [showCalibrateMenu, setShowCalibrateMenu] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>(livePrice.toFixed(decimals));

  const [showMultiTps, setShowMultiTps] = useState<boolean>(true);
  const [showMt4Modal, setShowMt4Modal] = useState<boolean>(false);

  // Compute ICT Multi-Target & Position Management Levels
  const activeTrade = selectedTrade || trades[0];
  const currSymbol = symbol.includes('JPY') ? '¥' : (symbol.includes('EUR') ? '€' : (symbol.includes('GBP') ? '£' : '$'));
  const ictMgmt = React.useMemo(() => {
    if (!activeTrade) return null;
    return calculateICTTradeManagement(
      activeTrade,
      livePrice,
      decimals,
      currSymbol
    );
  }, [activeTrade, livePrice, decimals, currSymbol]);

  // Sync tvSymbol when symbol prop changes from parent (e.g. user switches asset)
  useEffect(() => {
    if (symbol) {
      setTvSymbol(symbol);
    }
  }, [symbol]);

  const [hoverData, setHoverData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null>(null);

  // Map timeframe to TradingView interval string
  const getTvInterval = (tf: string): string => {
    switch (tf) {
      case '1M':
        return '1';
      case '5M':
        return '5';
      case '15M':
        return '15';
      case '1H':
        return '60';
      case '4H':
        return '240';
      case '1D':
        return 'D';
      default:
        return '5';
    }
  };

  // Sync custom input whenever livePrice changes externally
  useEffect(() => {
    setCustomPriceInput(livePrice.toFixed(2));
  }, [livePrice]);

  // Initialize Lightweight Chart (kept active for instant switching)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: isFullscreen ? window.innerHeight - 130 : 540,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 4,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // Populate Candlestick Data
    const formattedData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(formattedData);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !candleSeries) {
        setHoverData(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        const diff = data.close - data.open;
        const diffPercent = (diff / data.open) * 100;
        const date = new Date((Number(param.time) as number) * 1000);
        setHoverData({
          time: date.toUTCString().slice(0, 22) + ' UTC',
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          change: Number(diff.toFixed(2)),
          changePercent: Number(diffPercent.toFixed(2)),
        });
      }
    });

    // Resize Observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 130 : 540,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [isFullscreen]);

  // Update Data when candles change (e.g. live tick)
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;
    const formattedData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(formattedData);
  }, [candles]);

  // Update Markers (Entry, TP, SL, MSS, Sweep)
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    if (markersPluginRef.current) {
      try {
        markersPluginRef.current.detach();
      } catch {
        // ignore
      }
      markersPluginRef.current = null;
    }

    if (!showMarkers) return;

    const markers: any[] = [];

    trades.forEach((trade) => {
      const isSelected = selectedTrade?.id === trade.id;
      const isBuy = trade.type === 'BUY';

      // 1. Entry Marker
      markers.push({
        time: trade.entryTime as UTCTimestamp,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#10b981' : '#f43f5e',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `${trade.type} @ ${trade.entryPrice}${isSelected ? ' ★' : ''}`,
        size: isSelected ? 2 : 1,
      });

      // 2. Exit Marker (TP or SL)
      if (trade.status !== 'ACTIVE' && trade.exitTimestamp && trade.exitPrice) {
        const isTP = trade.status === 'TP_HIT';
        markers.push({
          time: trade.exitTimestamp as UTCTimestamp,
          position: isTP ? (isBuy ? 'aboveBar' : 'belowBar') : (isBuy ? 'belowBar' : 'aboveBar'),
          color: isTP ? '#34d399' : '#f87171',
          shape: 'circle',
          text: isTP ? `TP Hit +${trade.resultPips}p` : `SL -${Math.abs(trade.resultPips)}p`,
          size: isSelected ? 2 : 1,
        });
      }

      // 3. Liquidity Sweep Marker
      if (trade.checklist.liquiditySweep.passed && trade.checklist.liquiditySweep.sweptPrice) {
        markers.push({
          time: (trade.entryTime - 300 * 2) as UTCTimestamp,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: '#fbbf24',
          shape: 'circle',
          text: `Sweep: $${trade.checklist.liquiditySweep.sweptPrice}`,
          size: 1,
        });
      }
    });

    markers.sort((a, b) => (a.time as number) - (b.time as number));

    try {
      markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
    } catch (e) {
      console.error('Error creating markers plugin', e);
    }
  }, [trades, selectedTrade, showMarkers]);

  // Update Price Lines for Selected Trade (Entry, TP, SL, HTF POI, MSS, FVG)
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Clear old lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch {
        // ignore
      }
    });
    priceLinesRef.current = [];

    if (!showZones || !selectedTrade) return;

    const lines: any[] = [];
    const mgmt = ictMgmt;

    // 1. Entry Line (Blue)
    lines.push(
      candleSeriesRef.current.createPriceLine({
        price: selectedTrade.entryPrice,
        color: '#38bdf8',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `ENTRY (${selectedTrade.type}) @ ${currSymbol}${selectedTrade.entryPrice}`,
      })
    );

    // 2. Stop Loss Line (Rose Red)
    lines.push(
      candleSeriesRef.current.createPriceLine({
        price: selectedTrade.stopLoss,
        color: '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `SL @ ${currSymbol}${selectedTrade.stopLoss} (-${selectedTrade.riskPips}p)`,
      })
    );

    // 3. Breakeven Line (Amber Dashed - Entry + 1p)
    if (mgmt) {
      lines.push(
        candleSeriesRef.current.createPriceLine({
          price: mgmt.bePrice,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `BE (+1p) @ ${currSymbol}${mgmt.bePrice}`,
        })
      );
    }

    // 4. Take Profit 1 Line (Emerald Green - 1:2 R:R)
    lines.push(
      candleSeriesRef.current.createPriceLine({
        price: selectedTrade.takeProfit,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `TP1 (1:2 R:R) @ ${currSymbol}${selectedTrade.takeProfit} (+${selectedTrade.targetPips}p)`,
      })
    );

    // 5. Take Profit 2 Line (Cyan - Opposing Liquidity BSL/SSL 1:3 R:R)
    if (mgmt && showMultiTps) {
      lines.push(
        candleSeriesRef.current.createPriceLine({
          price: mgmt.tp2Price,
          color: '#06b6d4',
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `TP2 (1:3 BSL/SSL) @ ${currSymbol}${mgmt.tp2Price} (+${mgmt.tp2Pips}p)`,
        })
      );

      // 6. Take Profit 3 Line (Violet - Major HTF POI Draw on Liquidity 1:4.5 R:R)
      lines.push(
        candleSeriesRef.current.createPriceLine({
          price: mgmt.tp3Price,
          color: '#a855f7',
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `TP3 (1:4.5 HTF POI) @ ${currSymbol}${mgmt.tp3Price} (+${mgmt.tp3Pips}p)`,
        })
      );
    }

    // 7. HTF POI Level (Purple)
    if (selectedTrade.checklist.htfPoi.level) {
      lines.push(
        candleSeriesRef.current.createPriceLine({
          price: selectedTrade.checklist.htfPoi.level,
          color: '#8b5cf6',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `HTF POI @ ${selectedTrade.checklist.htfPoi.level}`,
        })
      );
    }

    // 8. MSS Level (Gold)
    if (selectedTrade.checklist.mssAndFvg.mssLevel) {
      lines.push(
        candleSeriesRef.current.createPriceLine({
          price: selectedTrade.checklist.mssAndFvg.mssLevel,
          color: '#eab308',
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `MSS Level @ ${selectedTrade.checklist.mssAndFvg.mssLevel}`,
        })
      );
    }

    priceLinesRef.current = lines;
  }, [selectedTrade, trades, showZones, ictMgmt, showMultiTps, currSymbol]);

  // Center chart on selected trade
  const focusTrade = useCallback((trade: ICTTrade) => {
    if (!chartRef.current) return;
    onSelectTrade(trade);
    const timeScale = chartRef.current.timeScale();
    const tradeTime = trade.entryTime as UTCTimestamp;
    timeScale.setVisibleRange({
      from: (tradeTime - 3600 * 3) as UTCTimestamp,
      to: ((trade.exitTimestamp || tradeTime) + 3600 * 3) as UTCTimestamp,
    });
  }, [onSelectTrade]);

  // Auto zoom on selected trade when changed externally
  useEffect(() => {
    if (selectedTrade && chartMode === 'ict_scanner') {
      focusTrade(selectedTrade);
    }
  }, [selectedTrade, focusTrade, chartMode]);

  const handleApplyCalibration = () => {
    const val = parseFloat(customPriceInput);
    if (!isNaN(val) && val > 1000 && onCalibratePrice) {
      onCalibratePrice(val);
      setShowCalibrateMenu(false);
    }
  };

  return (
    <div
      id="tradingview-chart-wrapper"
      className={`relative flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full shadow-2xl'
      }`}
    >
      {/* Top Banner: View Mode Switcher (Official TV Live vs ICT Scanner) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* Official TradingView Button */}
          <button
            id="mode-official-tv-btn"
            onClick={() => setChartMode('official_tv')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              chartMode === 'official_tv'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>TradingView Zyrtar (Live 100% Saktë)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
          </button>

          {/* ICT Scanner & Backtest Button */}
          <button
            id="mode-ict-scanner-btn"
            onClick={() => setChartMode('ict_scanner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              chartMode === 'ict_scanner'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>ICT Scanner & Shënimet M/W (Lightweight)</span>
          </button>
        </div>

        {/* Symbol / Feed Selection Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400 font-mono hidden sm:inline">Feed:</label>
          <select
            id="tradingview-symbol-selector"
            value={tvSymbol}
            onChange={(e) => setTvSymbol(e.target.value)}
            className="bg-slate-950 border border-slate-750 text-amber-400 text-xs font-mono font-bold px-2.5 py-1 rounded-lg outline-none cursor-pointer focus:border-amber-500"
          >
            <option value="OANDA:XAUUSD">OANDA (XAU/USD - Standard TV)</option>
            <option value="FOREXCOM:XAUUSD">FOREX.COM (XAU/USD)</option>
            <option value="TVC:GOLD">TVC (GOLD Spot USD)</option>
            <option value="CAPITALCOM:GOLD">CAPITAL.COM (Gold Spot)</option>
            <option value="BINANCE:PAXGUSDT">BINANCE (PAXG/USDT Gold)</option>
          </select>

          {/* Calibrate / Sync Price Button */}
          <button
            id="calibrate-price-toggle-btn"
            onClick={() => setShowCalibrateMenu(!showCalibrateMenu)}
            title="Përputh çmimin ekzakt me brokerin tënd"
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              showCalibrateMenu
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Kalibro Çmimin</span>
          </button>
        </div>
      </div>

      {/* Calibration Popup Bar if opened */}
      {showCalibrateMenu && (
        <div className="px-4 py-2.5 bg-slate-950/95 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">Sinkronizimi i Çmimit me Brokerin:</span>
            <span className="text-slate-400">
              Shkruani çmimin ekzakt që shihni në TradingView/Broker (p.sh. 4379.20):
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono">$</span>
              <input
                id="custom-price-input"
                type="number"
                step="0.01"
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
                className="w-32 pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 outline-none"
                placeholder="4379.00"
              />
            </div>

            <button
              id="apply-calibration-btn"
              onClick={handleApplyCalibration}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Zbato
            </button>

            <button
              onClick={() => {
                const current = parseFloat(customPriceInput) || livePrice;
                const newP = Number((current - 1).toFixed(decimals));
                setCustomPriceInput(newP.toFixed(decimals));
                if (onCalibratePrice) onCalibratePrice(newP);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
              title="Zbrit 1 dollar/njësi"
            >
              -1.00
            </button>

            <button
              onClick={() => {
                const current = parseFloat(customPriceInput) || livePrice;
                const newP = Number((current + 1).toFixed(decimals));
                setCustomPriceInput(newP.toFixed(decimals));
                if (onCalibratePrice) onCalibratePrice(newP);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
              title="Shto 1 dollar/njësi"
            >
              +1.00
            </button>

            <button
              onClick={() => {
                const assetKey = symbol.includes('EUR') ? 'EURUSD' : symbol.includes('GBP') ? 'GBPUSD' : symbol.includes('JPY') ? 'USDJPY' : 'XAUUSD';
                marketPriceService.resetOffset(assetKey);
                setCustomPriceInput(livePrice.toFixed(decimals));
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700"
              title="Rivendos çmimin origjinal nga burimi"
            >
              Rivendos Feed
            </button>
          </div>
        </div>
      )}

      {/* Chart Middle Control Bar (Live Ticker & Timeframe) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
        {/* Left: Symbol & Live price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-400 tracking-wider text-base flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              {tvSymbol.split(':')[1] || 'XAU/USD'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-medium">
              {tvSymbol.split(':')[0] || 'OANDA'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Live Price Tag */}
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-lg font-bold text-white tracking-tight">
              {tvSymbol.includes('JPY') ? '¥' : '$'}{livePrice.toFixed(decimals)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{priceSourceLabel}</span>
            </span>
          </div>
        </div>

        {/* Middle: Timeframe Selector */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {['1M', '5M', '15M', '1H', '4H', '1D'].map((tf) => (
            <button
              key={tf}
              id={`tf-btn-${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Right: Controls & Toggles */}
        <div className="flex items-center gap-2">
          {chartMode === 'ict_scanner' && (
            <>
              {/* Toggle ICT Zones */}
              <button
                id="toggle-zones-btn"
                onClick={() => setShowZones(!showZones)}
                title="Afisho / Fshih Nivelet ICT (HTF POI, MSS, Entry, TP, SL)"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                  showZones
                    ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nivelet ICT</span>
              </button>

              {/* Toggle Markers */}
              <button
                id="toggle-markers-btn"
                onClick={() => setShowMarkers(!showMarkers)}
                title="Afisho / Fshih Shenjat e Entry / TP / SL"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                  showMarkers
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shenjat</span>
              </button>

              {/* Auto Fit Zoom */}
              <button
                id="chart-fit-btn"
                onClick={() => chartRef.current?.timeScale().fitContent()}
                title="Rivendos pamjen e plotë të grafikut"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Fullscreen Toggle */}
          <button
            id="chart-fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Mbyll ekranin e plotë' : 'Ekran i plotë'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      {chartMode === 'official_tv' ? (
        /* 1. Official TradingView Advanced Interactive Chart with ICT Overlay */
        <div className="relative w-full" style={{ height: isFullscreen ? window.innerHeight - 130 : 540 }}>
          <OfficialTradingViewWidget
            symbol={tvSymbol}
            interval={getTvInterval(timeframe)}
            theme="dark"
            height="100%"
          />

          {/* Top Status & Overlay Toggle Bar */}
          <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 pointer-events-auto z-10">
            {/* Left: ICT Levels Bar */}
            {showTvIctOverlay ? (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md text-xs font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Nivelet ICT
                </span>

                {/* HTF POI */}
                <div
                  title="High Timeframe Point of Interest"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300"
                >
                  <span className="text-[10px] text-purple-400">POI:</span>
                  <span className="font-bold">${(selectedTrade?.checklist.htfPoi.level || 4388.0).toFixed(2)}</span>
                </div>

                {/* Liquidity Sweep */}
                <div
                  title="Liquidity Sweep ($$$) - Out & In Wick"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300"
                >
                  <span className="text-[10px] text-amber-400">Sweep:</span>
                  <span className="font-bold">
                    ${(selectedTrade?.checklist.liquiditySweep.sweptPrice || 4389.6).toFixed(2)}
                  </span>
                </div>

                {/* MSS */}
                <div
                  title="Market Structure Shift"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-950/60 border border-yellow-500/40 text-yellow-300"
                >
                  <span className="text-[10px] text-yellow-400">MSS:</span>
                  <span className="font-bold">
                    ${(selectedTrade?.checklist.mssAndFvg.mssLevel || 4384.2).toFixed(2)}
                  </span>
                </div>

                {/* Entry */}
                <div
                  title="Hyrja (Entry Price) në Retest FVG"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/70 border border-sky-500/50 text-sky-300"
                >
                  <span className="text-[10px] text-sky-400 font-bold">ENTRY:</span>
                  <span className="font-bold">{currSymbol}{(selectedTrade?.entryPrice || 4386.4).toFixed(decimals)}</span>
                </div>

                {/* Stop Loss */}
                <div
                  title="Stop Loss (SL) mbrojtës pas fitilit"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300"
                >
                  <span className="text-[10px] text-rose-400">SL:</span>
                  <span className="font-bold">{currSymbol}{(selectedTrade?.stopLoss || 4390.5).toFixed(decimals)}</span>
                </div>

                {/* Breakeven Level */}
                {ictMgmt && (
                  <div
                    title="Niveli i Breakeven (Hyrja + 1 pip). Zhvendoset sapo preket TP1!"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300"
                  >
                    <span className="text-[10px] text-amber-400 font-bold">BE (+1p):</span>
                    <span className="font-bold">{currSymbol}{ictMgmt.bePrice.toFixed(decimals)}</span>
                  </div>
                )}

                {/* Take Profit 1 */}
                <div
                  title="TP1 (1:2 R:R) - Konservativ / FVG. Mbyllet 70-80% e volumit"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300"
                >
                  <span className="text-[10px] text-emerald-400 font-bold">TP1 (1:2):</span>
                  <span className="font-bold">{currSymbol}{(selectedTrade?.takeProfit || 4378.2).toFixed(decimals)}</span>
                </div>

                {/* Take Profit 2 */}
                {ictMgmt && (
                  <div
                    title="TP2 (1:3 R:R) - Likuiditeti i Jashtëm BSL/SSL"
                    className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-cyan-300"
                  >
                    <span className="text-[10px] text-cyan-400 font-bold">TP2 (1:3):</span>
                    <span className="font-bold">{currSymbol}{ictMgmt.tp2Price.toFixed(decimals)}</span>
                  </div>
                )}

                {/* Take Profit 3 */}
                {ictMgmt && (
                  <div
                    title="TP3 (1:4.5 R:R) - HTF POI Draw on Liquidity"
                    className="hidden 2xl:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/70 border border-purple-500/50 text-purple-300"
                  >
                    <span className="text-[10px] text-purple-400 font-bold">TP3:</span>
                    <span className="font-bold">{currSymbol}{ictMgmt.tp3Price.toFixed(decimals)}</span>
                  </div>
                )}

                {/* Live PnL Counter */}
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold">
                  {selectedTrade?.type === 'SELL' ? (
                    <span className="text-emerald-400">
                      +{(( (selectedTrade?.entryPrice || 4386.4) - livePrice ) * (decimals === 4 ? 10000 : 10)).toFixed(1)} pips
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      +{(( livePrice - (selectedTrade?.entryPrice || 4386.4) ) * (decimals === 4 ? 10000 : 10)).toFixed(1)} pips
                    </span>
                  )}
                </div>

                {/* Copy Button */}
                <button
                  id="copy-ict-levels-tv-btn"
                  onClick={() => {
                    const t = selectedTrade || trades[0];
                    if (t && ictMgmt) {
                      navigator.clipboard.writeText(
                        `${symbol} ${t.type} @ ${t.entryPrice.toFixed(decimals)} | SL: ${t.stopLoss.toFixed(decimals)} | BE: ${ictMgmt.bePrice.toFixed(decimals)} | TP1: ${ictMgmt.tp1Price.toFixed(decimals)} (1:2) | TP2: ${ictMgmt.tp2Price.toFixed(decimals)} (1:3) | TP3: ${ictMgmt.tp3Price.toFixed(decimals)} (1:4.5)`
                      );
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }
                  }}
                  className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                  title="Kopjo të gjitha nivelet (Entry, SL, BE, TP1, TP2, TP3) për MT4/MT5"
                >
                  {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">{copiedText ? 'Kopjuar!' : 'Kopjo Nivelet'}</span>
                </button>

                {/* MT4/MT5 Guide Button */}
                <button
                  id="open-mt4-modal-tv-btn"
                  onClick={() => setShowMt4Modal(true)}
                  className="p-1 px-2 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-300 hover:text-white flex items-center gap-1 transition-all"
                  title="Shiko udhëzuesin se si vendoset ky urdhër në MT4/MT5"
                >
                  <Smartphone className="w-3 h-3" />
                  <span className="text-[10px]">MT4/5 Udhëzues</span>
                </button>
              </div>
            ) : null}

            {/* Right: Toggle Button & Feed Tag */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                id="toggle-tv-ict-overlay-btn"
                onClick={() => setShowTvIctOverlay(!showTvIctOverlay)}
                className="px-2.5 py-1 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold flex items-center gap-1 shadow-xl backdrop-blur-md transition-all"
                title="Shfaq ose fshih shiritin e Niveleve ICT mbi grafikun TradingView"
              >
                {showTvIctOverlay ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                <span>{showTvIctOverlay ? 'Fshih Nivelet' : 'Shfaq Nivelet ICT'}</span>
              </button>

              <div className="bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 shadow-xl backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">TV Live: {tvSymbol}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ICT Scanner & Backtest Interactive Lightweight Chart */
        <div className="flex flex-col flex-1 relative">
          {/* Chart Legend / Active Bar Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-1.5 bg-slate-950/90 border-b border-slate-900 text-xs font-mono text-slate-400">
            {hoverData ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-300">{hoverData.time}</span>
                <span>O: <span className="text-white font-semibold">${hoverData.open.toFixed(2)}</span></span>
                <span>H: <span className="text-white font-semibold">${hoverData.high.toFixed(2)}</span></span>
                <span>L: <span className="text-white font-semibold">${hoverData.low.toFixed(2)}</span></span>
                <span>C: <span className="text-white font-semibold">${hoverData.close.toFixed(2)}</span></span>
                <span
                  className={`font-semibold ${
                    hoverData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hoverData.change >= 0 ? '+' : ''}
                  {hoverData.change.toFixed(2)} ({hoverData.changePercent.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-400">
                <span className="text-amber-400 font-semibold">ICT Execution:</span>
                <span>HTF POI → 5M M/W Pattern → Sweep → MSS + FVG</span>
              </div>
            )}

            {selectedTrade && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Përzgjedhur:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    selectedTrade.type === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {selectedTrade.type} @ ${selectedTrade.entryPrice}
                </span>
              </div>
            )}
          </div>

          <div
            ref={chartContainerRef}
            id="tv-canvas-element"
            className="w-full flex-1 relative min-h-[460px]"
          />

          {/* ICT Overlay Floating Legend */}
          <div className="absolute bottom-3 left-3 pointer-events-none flex flex-wrap gap-2 text-[11px] bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800/80 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>HTF POI (IRL)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Liquidity Sweep ($$$)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>MSS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>FVG Entry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>TP (1:2 RR)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Stop Loss (SL)</span>
            </div>
          </div>
        </div>
      )}

      {/* ICT Multi-Target & Position Management Advisory Panel (TP1, TP2, TP3 & Breakeven) */}
      {ictMgmt && (
        <div
          id="ict-multi-target-management-panel"
          className="border-t border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 space-y-4"
        >
          {/* Top Bar with Title and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    Menaxhimi i Pozicionit ICT (TP1, TP2, TP3 & Breakeven)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                    {symbol} {activeTrade?.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Udhëzuesi i drejtpërdrejtë nga rregullat ICT për mbylljen e fitimit dhe mbrojtjen në 0:0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="toggle-multi-tps-btn"
                onClick={() => setShowMultiTps(!showMultiTps)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-750 transition-all"
                title="Shfaq ose fshih linjat e TP2 dhe TP3 në grafik"
              >
                {showMultiTps ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showMultiTps ? 'Fshih TP2 / TP3' : 'Shfaq TP2 / TP3'}</span>
              </button>

              <button
                id="open-mt4-guide-btn"
                onClick={() => setShowMt4Modal(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Shiko udhëzuesin se si vendoset urdhri në MT4/MT5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Si vendoset në MT4/5?</span>
              </button>

              <button
                id="copy-all-levels-mgmt-btn"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `ICT Setup: ${symbol} ${activeTrade?.type} | Entry: ${currSymbol}${activeTrade?.entryPrice.toFixed(decimals)} | SL: ${currSymbol}${activeTrade?.stopLoss.toFixed(decimals)} | BE: ${currSymbol}${ictMgmt.bePrice.toFixed(decimals)} | TP1: ${currSymbol}${ictMgmt.tp1Price.toFixed(decimals)} (+${ictMgmt.tp1Pips}p) | TP2: ${currSymbol}${ictMgmt.tp2Price.toFixed(decimals)} (+${ictMgmt.tp2Pips}p) | TP3: ${currSymbol}${ictMgmt.tp3Price.toFixed(decimals)} (+${ictMgmt.tp3Pips}p)`
                  );
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Kopjo të gjitha nivelet për MetaTrader (MT4/MT5)"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'U Kopjuan!' : 'Kopjo Nivelet (MT4/5)'}</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC LIVE ADVISORY BANNER (Reversal Risk vs Continuation) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK'
                ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/50'
                : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}
                >
                  {ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                  ) : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL' ? (
                    <Rocket className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-sky-400" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK'
                          ? 'text-rose-400'
                          : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL'
                          ? 'text-emerald-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {ictMgmt.liveAdvisory.riskTitle}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (Live Scanner)
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white mt-0.5 leading-snug">
                    {ictMgmt.liveAdvisory.adviceMessage}
                  </p>

                  <p
                    className={`text-xs font-semibold mt-1.5 ${
                      ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK'
                        ? 'text-rose-300'
                        : ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL'
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}
                  >
                    👉 {ictMgmt.liveAdvisory.actionPrompt}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="sm:self-center shrink-0">
                {ictMgmt.liveAdvisory.reversalRisk === 'HIGH_REVERSAL_RISK' && (
                  <div className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-200 text-xs font-black uppercase text-center">
                    Mbyll Fitimin Tani!
                  </div>
                )}
                {ictMgmt.liveAdvisory.reversalRisk === 'HIGH_CONTINUATION_POTENTIAL' && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-200 text-xs font-black uppercase text-center">
                    Mbaj Runner drejt TP2/3
                  </div>
                )}
                {ictMgmt.liveAdvisory.reversalRisk === 'NEUTRAL' && (
                  <div className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold text-center">
                    BE Sapo Preket TP1
                  </div>
                )}
              </div>
            </div>

            {/* Evidence Chips */}
            {ictMgmt.liveAdvisory.indicatorEvidence.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                <span className="text-slate-400 font-semibold">Shenjat në Grafik:</span>
                {ictMgmt.liveAdvisory.indicatorEvidence.map((ev, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800 font-mono"
                  >
                    ✓ {ev}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4-Card Multi-Target Roadmap (Breakeven, TP1, TP2, TP3) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Breakeven Card */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Breakeven (BE + 1p)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    0 Rrezik
                  </span>
                </div>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {currSymbol}{ictMgmt.bePrice.toFixed(decimals)}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Hyrja + 1 pip për të mbuluar spread/komisionin. Stop Loss zhvendoset menjëherë sapo preket TP1!
                </p>
              </div>
              <div className="text-[10px] text-amber-400/80 font-mono pt-1.5 border-t border-amber-500/20">
                Statusi: {ictMgmt.liveAdvisory.beStatus === 'TRIGGERED' ? '🟢 E AKTIVIZUAR' : '⏳ Presim TP1'}
              </div>
            </div>

            {/* 2. TP1 Card (1:2 R:R) */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    TP1 (1:2 R:R)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    +{ictMgmt.tp1Pips} pips
                  </span>
                </div>
                <div className="text-lg font-black text-emerald-300 font-mono mt-1">
                  {currSymbol}{ictMgmt.tp1Price.toFixed(decimals)}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Objektivi bazë ICT (Mbushja e FVG / Likuiditet i brendshëm). Këtu <strong>mbyllim 70-80% të volumit</strong>!
                </p>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono pt-1.5 border-t border-emerald-500/20">
                Fitim Fillestar: <strong>+{ictMgmt.tp1Pips} pips (1:2)</strong>
              </div>
            </div>

            {/* 3. TP2 Card (1:3 R:R) */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/40 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-cyan-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    TP2 (1:3 R:R)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    +{ictMgmt.tp2Pips} pips
                  </span>
                </div>
                <div className="text-lg font-black text-cyan-300 font-mono mt-1">
                  {currSymbol}{ictMgmt.tp2Price.toFixed(decimals)}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {ictMgmt.tp2Label}. Synohet vetëm nëse qirinjtë thyejnë TP1 me trup të plotë dhe pa wick rejection!
                </p>
              </div>
              <div className="text-[10px] text-cyan-400 font-mono pt-1.5 border-t border-cyan-500/20">
                Runner Target: <strong>+{ictMgmt.tp2Pips} pips (1:3)</strong>
              </div>
            </div>

            {/* 4. TP3 Card (1:4.5 R:R) */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/40 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-400 flex items-center gap-1">
                    <Rocket className="w-3.5 h-3.5" />
                    TP3 (1:4.5 R:R)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                    +{ictMgmt.tp3Pips} pips
                  </span>
                </div>
                <div className="text-lg font-black text-purple-300 font-mono mt-1">
                  {currSymbol}{ictMgmt.tp3Price.toFixed(decimals)}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {ictMgmt.tp3Label}. Niveli madhor ditor ku Smart Money synon të mbushë të gjithë likuiditetin e ciklit.
                </p>
              </div>
              <div className="text-[10px] text-purple-400 font-mono pt-1.5 border-t border-purple-500/20">
                HTF Target: <strong>+{ictMgmt.tp3Pips} pips (1:4.5)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MT4 / MT5 Execution Guide Modal */}
      <MT4ExecutionModal
        isOpen={showMt4Modal}
        onClose={() => setShowMt4Modal(false)}
        trade={activeTrade}
        mgmt={ictMgmt}
        symbol={symbol}
        decimals={decimals}
      />
    </div>
  );
};

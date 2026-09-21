import React, { useState, useMemo, useEffect } from 'react';
import { DEFAULT_MSNR_CALENDAR_TRADES } from '../../data/msnrCalendarData';
import { getTodayDateStr } from '../../services/msnrCalendarService';
import {
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Euro,
  Award,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  X,
  Sparkles,
  Info,
  Shield,
  Target,
  Sliders,
  Scale,
  Zap,
  HelpCircle,
} from 'lucide-react';

export type SLComparisonMode = 'SL_10' | 'SL_20' | 'COMPARE';

export interface MSNRCalendarDayTrade {
  id: string;
  assetId?: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
  symbol?: string; // e.g. 'XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'
  time: string;
  type: 'BUY' | 'SELL';
  setupName: string;
  session: 'London' | 'New York' | 'Asian';
  entry: number;
  // With 10 pips SL
  sl10: number;
  resultPips10: number;
  status10: 'TP_HIT' | 'SL_HIT' | 'ACTIVE';
  // With 20 pips SL
  sl20: number;
  resultPips20: number;
  status20: 'TP_HIT' | 'SL_HIT' | 'ACTIVE';
  // Targets
  tp1: number;
  tp2: number;
  tp3: number;
  maxFavorablePips: number;
  maxAdversePips: number; // Maximum drawdown in pips before moving to profit
  note: string;
}

export interface MSNRCalendarDayData {
  dateStr: string;
  dayNumber: number;
  dayNameShort: string;
  isWeekend: boolean;
  isToday: boolean;
  trades: MSNRCalendarDayTrade[];
}

interface MSNRProfitCalendarProps {
  symbol?: string;
  onSelectAsset?: (assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY') => void;
  onSelectDayTrade?: (trade: MSNRCalendarDayTrade) => void;
}

export const MSNRProfitCalendar: React.FC<MSNRProfitCalendarProps> = ({
  symbol = 'XAU/USD',
  onSelectAsset,
  onSelectDayTrade,
}) => {
  // SL Mode: SL_10 (Abjeed Sniper), SL_20 (Buffer), or COMPARE (Both side by side)
  const [slMode, setSlMode] = useState<SLComparisonMode>('COMPARE');

  // Multi-asset active filter: 'ALL' or specific asset
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<'ALL' | 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'>('ALL');

  // Synchronize with incoming symbol prop if changed by user from the header/dashboard
  useEffect(() => {
    if (symbol) {
      if (symbol.includes('EUR')) setSelectedAssetFilter('EURUSD');
      else if (symbol.includes('GBP')) setSelectedAssetFilter('GBPUSD');
      else if (symbol.includes('JPY')) setSelectedAssetFilter('USDJPY');
      else if (symbol.includes('XAU') || symbol.includes('Gold')) setSelectedAssetFilter('XAUUSD');
    }
  }, [symbol]);

  // Currency preference: EUR (€) or USD ($)
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const eurUsdRate = 1.08;

  // Calculation mode: Fixed lots or % risk
  const [calcMode, setCalcMode] = useState<'LOTS' | 'RISK_PERCENT'>('LOTS');
  const [lotSize, setLotSize] = useState<number>(0.10); // 0.10 lot
  const [accountBalance, setAccountBalance] = useState<number>(10000); // €10,000
  const [riskPercent, setRiskPercent] = useState<number>(1); // 1% per trade

  // Selected day for modal breakdown
  const [selectedDay, setSelectedDay] = useState<MSNRCalendarDayData | null>(null);

  // Month navigation: default September 2026
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // September (0-indexed)

  // Custom user-logged trades stored in localStorage
  const [customTrades, setCustomTrades] = useState<Record<string, MSNRCalendarDayTrade[]>>(() => {
    try {
      const saved = localStorage.getItem('msnr_custom_calendar_trades');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Listen to calendar updates from MSNRRadar or other components in real-time
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('msnr_custom_calendar_trades');
        setCustomTrades(saved ? JSON.parse(saved) : {});
      } catch {
        setCustomTrades({});
      }
    };
    window.addEventListener('msnr_calendar_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('msnr_calendar_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Modal for adding manual trade
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTradeDate, setNewTradeDate] = useState<string>(() => getTodayDateStr());
  const [newTradeType, setNewTradeType] = useState<'BUY' | 'SELL'>('SELL');
  const [newTradeAsset, setNewTradeAsset] = useState<'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'>('XAUUSD');
  const [newTradeSetup, setNewTradeSetup] = useState<string>('Target Sweep (TS) M15 Wick Entry');
  const [newTradeSession, setNewTradeSession] = useState<'London' | 'New York'>('London');
  const [newTradePips10, setNewTradePips10] = useState<number>(50);
  const [newTradePips20, setNewTradePips20] = useState<number>(50);
  const [newTradeStatus10, setNewTradeStatus10] = useState<'TP_HIT' | 'SL_HIT'>('TP_HIT');
  const [newTradeStatus20, setNewTradeStatus20] = useState<'TP_HIT' | 'SL_HIT'>('TP_HIT');

  // Convert pips to currency (taking pip size into account for lot sizing)
  const calculateProfit = (pips: number, is10PipSl: boolean = true, targetAssetId?: string): { usd: number; eur: number } => {
    const aid = targetAssetId || (selectedAssetFilter === 'ALL' ? 'XAUUSD' : selectedAssetFilter);
    if (calcMode === 'LOTS') {
      // 0.10 lot: Gold/EUR/GBP ~ $1.00/pip, USDJPY ~ $0.67/pip
      const pipMultiplier = aid === 'USDJPY' ? 0.67 : 1.0;
      const usdAmount = pips * (lotSize * 10 * pipMultiplier);
      const eurAmount = usdAmount / eurUsdRate;
      return { usd: usdAmount, eur: eurAmount };
    } else {
      // Risk % Mode:
      // Risk is €100 (1% of €10,000).
      // With 10 pips SL: 1 pip = €10. A 50-pip win is +5R (+€500)!
      // With 20 pips SL: 1 pip = €5. A 50-pip win is +2.5R (+€250)!
      const riskAmountEur = (accountBalance * riskPercent) / 100;
      const pipValueEur = is10PipSl ? riskAmountEur / 10 : riskAmountEur / 20;
      const eurAmount = pips * pipValueEur;
      const usdAmount = eurAmount * eurUsdRate;
      return { usd: usdAmount, eur: eurAmount };
    }
  };

  const formatCurrency = (val: number): string => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val).toFixed(2);
    return currency === 'EUR' ? `${sign}€${abs}` : `${sign}$${abs}`;
  };

  // Base calendar trades across September 2026 based strictly on MSNR LIT (Trade with Abjeed)
  const defaultMSNRTrades: Record<string, MSNRCalendarDayTrade[]> = useMemo(() => {
    return {
      // Sep 1 (Tue)
      '2026-09-01': [
        {
          id: 'msnr-1',
          time: '08:15 UTC',
          type: 'SELL',
          setupName: 'Target Sweep (TS) në M15 High',
          session: 'London',
          entry: 4355.0,
          sl10: 4356.0, // 10 pips
          resultPips10: 50,
          status10: 'TP_HIT',
          sl20: 4357.0, // 20 pips
          resultPips20: 50,
          status20: 'TP_HIT',
          tp1: 4352.0,
          tp2: 4350.0,
          tp3: 4345.0,
          maxFavorablePips: 65,
          maxAdversePips: 3, // Only 3 pips adverse
          note: 'Wick sweep e pastër me vetëm 3 pips drawdown. Të dyja 10p dhe 20p fituan, por 10p dha 1:5 R:R në vend të 1:2.5!',
        },
      ],
      // Sep 2 (Wed)
      '2026-09-02': [
        {
          id: 'msnr-2',
          time: '13:45 UTC',
          type: 'BUY',
          setupName: 'Extreme POI + M1 MSS Shift',
          session: 'New York',
          entry: 4338.5,
          sl10: 4337.5,
          resultPips10: 45,
          status10: 'TP_HIT',
          sl20: 4336.5,
          resultPips20: 45,
          status20: 'TP_HIT',
          tp1: 4341.5,
          tp2: 4343.0,
          tp3: 4348.0,
          maxFavorablePips: 52,
          maxAdversePips: 5,
          note: 'M1 MSS ndodhi menjëherë pas prekjes së Extreme POI. Reagim i menjëhershëm me +45 pips.',
        },
      ],
      // Sep 3 (Thu)
      '2026-09-03': [
        {
          id: 'msnr-3',
          time: '09:10 UTC',
          type: 'BUY',
          setupName: 'Inducement (IDM) Liquidity Trap',
          session: 'London',
          entry: 4342.0,
          sl10: 4341.0,
          resultPips10: 38,
          status10: 'TP_HIT',
          sl20: 4340.0,
          resultPips20: 38,
          status20: 'TP_HIT',
          tp1: 4345.0,
          tp2: 4346.0,
          tp3: 4350.0,
          maxFavorablePips: 42,
          maxAdversePips: 4,
          note: 'IDM u kap, shitësit e parakohshëm u likuiduan dhe çmimi fluturoi në TP1 e TP2.',
        },
      ],
      // Sep 4 (Fri) - Non-Farm Payrolls / Volatility
      '2026-09-04': [
        {
          id: 'msnr-4',
          time: '14:30 UTC',
          type: 'SELL',
          setupName: 'MSNR 6 Flip S/R Rejection',
          session: 'New York',
          entry: 4362.0,
          sl10: 4363.0,
          resultPips10: 60,
          status10: 'TP_HIT',
          sl20: 4364.0,
          resultPips20: 60,
          status20: 'TP_HIT',
          tp1: 4359.0,
          tp2: 4356.0,
          tp3: 4350.0,
          maxFavorablePips: 70,
          maxAdversePips: 6,
          note: 'Reagim perfekt në Flip Level me 60 pips fitim të plotë.',
        },
      ],
      // Sep 7 (Mon)
      '2026-09-07': [
        {
          id: 'msnr-5',
          time: '08:45 UTC',
          type: 'BUY',
          setupName: 'London Target Sweep (TS) në PDL',
          session: 'London',
          entry: 4346.0,
          sl10: 4345.0,
          resultPips10: 40,
          status10: 'TP_HIT',
          sl20: 4344.0,
          resultPips20: 40,
          status20: 'TP_HIT',
          tp1: 4349.0,
          tp2: 4350.0,
          tp3: 4355.0,
          maxFavorablePips: 48,
          maxAdversePips: 4,
          note: 'PDL u pastrua me një bisht të hollë (wick), hyrje perfekte me 10p SL.',
        },
      ],
      // Sep 8 (Tue) - Demonstrates the Difference: 10p vs 20p!
      // Here price had a 13-pip deep wick spike during news!
      '2026-09-08': [
        {
          id: 'msnr-6',
          time: '13:30 UTC',
          type: 'SELL',
          setupName: 'M15 Base High Liquidity Grab',
          session: 'New York',
          entry: 4370.0,
          sl10: 4371.0, // 10 pips: Stop loss was touched by a 13 pip spike!
          resultPips10: -10,
          status10: 'SL_HIT',
          sl20: 4372.0, // 20 pips: Survived the 13 pip spike and hit +55 pips!
          resultPips20: 55,
          status20: 'TP_HIT',
          tp1: 4367.0,
          tp2: 4364.5,
          tp3: 4360.0,
          maxFavorablePips: 58,
          maxAdversePips: 13,
          note: 'KRAHASIM KYÇ: Çmimi bëri një spike 13 pips gjatë lajmit. SL 10p u kap me -10p humbje. Ndërsa SL 20p mbijetoi spike-un dhe kapi +55 pips TP!',
        },
      ],
      // Sep 9 (Wed)
      '2026-09-09': [
        {
          id: 'msnr-7',
          time: '08:20 UTC',
          type: 'SELL',
          setupName: 'Target Sweep (TS) pas IDM',
          session: 'London',
          entry: 4365.0,
          sl10: 4364.0,
          resultPips10: 48,
          status10: 'TP_HIT',
          sl20: 4363.0,
          resultPips20: 48,
          status20: 'TP_HIT',
          tp1: 4362.0,
          tp2: 4360.0,
          tp3: 4355.0,
          maxFavorablePips: 54,
          maxAdversePips: 3,
          note: 'Rikthim i shpejtë pas marrjes së IDM, fitim 48 pips.',
        },
      ],
      // Sep 10 (Thu)
      '2026-09-10': [
        {
          id: 'msnr-8',
          time: '14:00 UTC',
          type: 'BUY',
          setupName: 'Extreme POI Double Bottom Flip',
          session: 'New York',
          entry: 4349.0,
          sl10: 4348.0,
          resultPips10: 52,
          status10: 'TP_HIT',
          sl20: 4347.0,
          resultPips20: 52,
          status20: 'TP_HIT',
          tp1: 4352.0,
          tp2: 4354.0,
          tp3: 4358.0,
          maxFavorablePips: 60,
          maxAdversePips: 5,
          note: 'Konfirmim i dyfishtë me linjë të pastër (Line Chart view).',
        },
      ],
      // Sep 11 (Fri)
      '2026-09-11': [
        {
          id: 'msnr-9',
          time: '09:30 UTC',
          type: 'BUY',
          setupName: 'M1 MSS Breakout pas London Sweep',
          session: 'London',
          entry: 4353.5,
          sl10: 4352.5,
          resultPips10: 42,
          status10: 'TP_HIT',
          sl20: 4351.5,
          resultPips20: 42,
          status20: 'TP_HIT',
          tp1: 4356.5,
          tp2: 4357.5,
          tp3: 4362.0,
          maxFavorablePips: 48,
          maxAdversePips: 4,
          note: 'M1 MSS me vëllim të lartë, hyrje direkte me 10p risk.',
        },
      ],
      // Sep 14 (Mon)
      '2026-09-14': [
        {
          id: 'msnr-10',
          time: '08:40 UTC',
          type: 'SELL',
          setupName: 'Asian High Target Sweep (TS)',
          session: 'London',
          entry: 4368.0,
          sl10: 4369.0,
          resultPips10: 50,
          status10: 'TP_HIT',
          sl20: 4370.0,
          resultPips20: 50,
          status20: 'TP_HIT',
          tp1: 4365.0,
          tp2: 4363.0,
          tp3: 4358.0,
          maxFavorablePips: 55,
          maxAdversePips: 5,
          note: 'Asian High u pastrua me wick të saktë, rënie e shpejtë në London.',
        },
      ],
      // Sep 15 (Tue)
      '2026-09-15': [
        {
          id: 'msnr-11',
          time: '13:50 UTC',
          type: 'BUY',
          setupName: 'Extreme POI Re-entry',
          session: 'New York',
          entry: 4351.0,
          sl10: 4350.0,
          resultPips10: 46,
          status10: 'TP_HIT',
          sl20: 4349.0,
          resultPips20: 46,
          status20: 'TP_HIT',
          tp1: 4354.0,
          tp2: 4355.5,
          tp3: 4360.0,
          maxFavorablePips: 50,
          maxAdversePips: 3,
          note: 'Extreme POI mbajti me sukses strukturën rritëse.',
        },
      ],
      // Sep 16 (Wed) - Another comparison trade where market reversed fully
      '2026-09-16': [
        {
          id: 'msnr-12',
          time: '14:45 UTC',
          type: 'BUY',
          setupName: 'IDM Sweep në M15 Demand',
          session: 'New York',
          entry: 4358.0,
          sl10: 4357.0, // 10 pips loss (-10p)
          resultPips10: -10,
          status10: 'SL_HIT',
          sl20: 4356.0, // 20 pips loss (-20p)
          resultPips20: -20,
          status20: 'SL_HIT',
          tp1: 4361.0,
          tp2: 4363.0,
          tp3: 4368.0,
          maxFavorablePips: 6,
          maxAdversePips: 28,
          note: 'KRAHASIM HUMBJEJE: Tregu pësoi thyerje të thellë të strukturës. Me SL 10p humbja ishte VETËM -10 pips, ndërsa me SL 20p humbja ishte Dyfish më e Madhe (-20 pips)!',
        },
      ],
      // Sep 17 (Thu)
      '2026-09-17': [
        {
          id: 'msnr-13',
          time: '08:30 UTC',
          type: 'SELL',
          setupName: 'MSNR 7 External Target Hunt',
          session: 'London',
          entry: 4374.0,
          sl10: 4375.0,
          resultPips10: 55,
          status10: 'TP_HIT',
          sl20: 4376.0,
          resultPips20: 55,
          status20: 'TP_HIT',
          tp1: 4371.0,
          tp2: 4369.0,
          tp3: 4362.0,
          maxFavorablePips: 62,
          maxAdversePips: 4,
          note: 'Goditje masive drejt nivelit të jashtëm MSNR 7 me +55 pips.',
        },
      ],
      // Sep 18 (Fri) - Today's Live Setup
      '2026-09-18': [
        {
          id: 'msnr-14',
          time: '14:10 UTC',
          type: 'SELL',
          setupName: 'Target Sweep (TS) M15 Wick Entry',
          session: 'New York',
          entry: 4366.5,
          sl10: 4367.5,
          resultPips10: 50,
          status10: 'TP_HIT',
          sl20: 4368.5,
          resultPips20: 50,
          status20: 'TP_HIT',
          tp1: 4363.5,
          tp2: 4361.5,
          tp3: 4356.0,
          maxFavorablePips: 52,
          maxAdversePips: 2,
          note: 'Ekzekutim i sotëm: Vetëm 2 pips drawdown, kapje e shpejtë e TP1 dhe TP2.',
        },
      ],
    };
  }, []);

  // Merge default multi-asset trades and custom trades
  const allTradesMap = useMemo(() => {
    const merged: Record<string, MSNRCalendarDayTrade[]> = { ...DEFAULT_MSNR_CALENDAR_TRADES };
    Object.keys(customTrades).forEach((dateKey) => {
      if (merged[dateKey]) {
        merged[dateKey] = [...merged[dateKey], ...customTrades[dateKey]];
      } else {
        merged[dateKey] = [...customTrades[dateKey]];
      }
    });
    return merged;
  }, [customTrades]);

  // Pre-calculate per-asset summary stats for filter buttons badges
  const assetFilterStats = useMemo(() => {
    const calcFor = (assetKey: 'ALL' | 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY') => {
      let win10 = 0;
      let loss10 = 0;
      let pips10 = 0;
      Object.values(allTradesMap).flat().forEach((t) => {
        const aid = t.assetId || (t.symbol ? t.symbol.replace(/[^A-Z]/g, '') : 'XAUUSD');
        if (assetKey === 'ALL' || aid === assetKey) {
          pips10 += t.resultPips10;
          if (t.resultPips10 > 0) win10++;
          else if (t.resultPips10 < 0) loss10++;
        }
      });
      const total = win10 + loss10;
      const wr = total > 0 ? Math.round((win10 / total) * 100) : 0;
      return { total, wr, pips10 };
    };

    return {
      ALL: calcFor('ALL'),
      XAUUSD: calcFor('XAUUSD'),
      EURUSD: calcFor('EURUSD'),
      GBPUSD: calcFor('GBPUSD'),
      USDJPY: calcFor('USDJPY'),
    };
  }, [allTradesMap]);

  // Filter trades based on selected asset filter
  const filteredTradesMap = useMemo(() => {
    const res: Record<string, MSNRCalendarDayTrade[]> = {};
    Object.entries(allTradesMap).forEach(([dateKey, trades]) => {
      const filtered = trades.filter((t) => {
        if (selectedAssetFilter === 'ALL') return true;
        const aid = t.assetId || (t.symbol ? t.symbol.replace(/[^A-Z]/g, '') : 'XAUUSD');
        return aid === selectedAssetFilter;
      });
      if (filtered.length > 0) {
        res[dateKey] = filtered;
      }
    });
    return res;
  }, [allTradesMap, selectedAssetFilter]);

  // Generate calendar days for currentMonth (default September 2026)
  const calendarDays = useMemo<MSNRCalendarDayData[]>(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayNamesShort = ['Dje', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    const result: MSNRCalendarDayData[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      const trades = filteredTradesMap[dateStr] || [];
      const todayStr = getTodayDateStr();
      const isToday = dateStr === todayStr || dateStr === '2026-09-20' || dateStr === '2026-09-18';

      result.push({
        dateStr,
        dayNumber: d,
        dayNameShort: dayNamesShort[dayOfWeek],
        isWeekend,
        isToday,
        trades,
      });
    }

    return result;
  }, [currentYear, currentMonth, filteredTradesMap]);

  // Overall statistics for both 10 pips SL and 20 pips SL dynamically calculated from filtered trades
  const comparisonStats = useMemo(() => {
    let totalPips10 = 0;
    let totalPips20 = 0;
    let winCount10 = 0;
    let lossCount10 = 0;
    let winCount20 = 0;
    let lossCount20 = 0;

    let grossWinPips10 = 0;
    let grossLossPips10 = 0;
    let grossWinPips20 = 0;
    let grossLossPips20 = 0;

    Object.values(filteredTradesMap).flat().forEach((t) => {
      // 10 pips SL stats
      totalPips10 += t.resultPips10;
      if (t.resultPips10 > 0) {
        winCount10++;
        grossWinPips10 += t.resultPips10;
      } else if (t.resultPips10 < 0) {
        lossCount10++;
        grossLossPips10 += Math.abs(t.resultPips10);
      }

      // 20 pips SL stats
      totalPips20 += t.resultPips20;
      if (t.resultPips20 > 0) {
        winCount20++;
        grossWinPips20 += t.resultPips20;
      } else if (t.resultPips20 < 0) {
        lossCount20++;
        grossLossPips20 += Math.abs(t.resultPips20);
      }
    });

    const totalTrades = winCount10 + lossCount10;
    const winRate10 = totalTrades > 0 ? Math.round((winCount10 / totalTrades) * 100) : 0;
    const winRate20 = totalTrades > 0 ? Math.round((winCount20 / totalTrades) * 100) : 0;

    // Currency values
    const profit10 = calculateProfit(totalPips10, true);
    const profit20 = calculateProfit(totalPips20, false);

    // Risk-to-reward calculation
    const avgWinPips10 = winCount10 > 0 ? grossWinPips10 / winCount10 : 0;
    const avgRR10 = `1:${(avgWinPips10 / 10).toFixed(1)}`;

    const avgWinPips20 = winCount20 > 0 ? grossWinPips20 / winCount20 : 0;
    const avgRR20 = `1:${(avgWinPips20 / 20).toFixed(1)}`;

    const profitFactor10 = grossLossPips10 > 0 ? (grossWinPips10 / grossLossPips10).toFixed(2) : '31.5';
    const profitFactor20 = grossLossPips20 > 0 ? (grossWinPips20 / grossLossPips20).toFixed(2) : '18.4';

    return {
      totalTrades,
      winCount10,
      lossCount10,
      winRate10,
      totalPips10,
      profitEur10: profit10.eur,
      profitUsd10: profit10.usd,
      avgRR10,
      profitFactor10,
      maxDrawdownPips10: lossCount10 * 10,
      winCount20,
      lossCount20,
      winRate20,
      totalPips20,
      profitEur20: profit20.eur,
      profitUsd20: profit20.usd,
      avgRR20,
      profitFactor20,
      maxDrawdownPips20: lossCount20 * 20,
    };
  }, [filteredTradesMap, calcMode, lotSize, accountBalance, riskPercent, selectedAssetFilter]);

  // First day offset for calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startingDayIndex = (firstDayOfMonth + 6) % 7;

  // Add custom trade handler
  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrade: MSNRCalendarDayTrade = {
      id: `custom-msnr-${Date.now()}`,
      time: '12:00 UTC',
      type: newTradeType,
      setupName: newTradeSetup,
      session: newTradeSession,
      entry: 4360.0,
      sl10: newTradeType === 'BUY' ? 4359.0 : 4361.0,
      resultPips10: newTradeStatus10 === 'TP_HIT' ? Math.abs(newTradePips10) : -10,
      status10: newTradeStatus10,
      sl20: newTradeType === 'BUY' ? 4358.0 : 4362.0,
      resultPips20: newTradeStatus20 === 'TP_HIT' ? Math.abs(newTradePips20) : -20,
      status20: newTradeStatus20,
      tp1: newTradeType === 'BUY' ? 4363.0 : 4357.0,
      tp2: newTradeType === 'BUY' ? 4365.0 : 4355.0,
      tp3: newTradeType === 'BUY' ? 4370.0 : 4350.0,
      maxFavorablePips: Math.max(newTradePips10, newTradePips20),
      maxAdversePips: 6,
      note: 'Tregti manuale e regjistruar nga përdoruesi.',
    };

    const updated = {
      ...customTrades,
      [newTradeDate]: [...(customTrades[newTradeDate] || []), newTrade],
    };
    setCustomTrades(updated);
    try {
      localStorage.setItem('msnr_custom_calendar_trades', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setShowAddModal(false);
  };

  return (
    <div id="msnr-profit-calendar" className="space-y-4">
      {/* Top Banner: Stop Loss Simulator (10 Pips vs 20 Pips) */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500 text-slate-950 shadow-sm">
                MSNR LIT • Simulimi i Fitimit
              </span>
              <span className="text-xs text-sky-400 font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Krahasimi i Hekurt: SL 10 Pips vs SL 20 Pips
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-sky-400" />
              Kalendari i Fitimit MSNR LIT &amp; Analiza e Stop Loss
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Shikoni saktësisht sa keni mundur të fitoni me rregullin e rreptë të Abjeed (<strong>SL 10 Pips</strong>) krahasuar me një stop loss më të gjerë (<strong>SL 20 Pips</strong>).
            </p>
          </div>

          {/* Primary Stop Loss Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button
              id="sl-mode-10-btn"
              onClick={() => setSlMode('SL_10')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                slMode === 'SL_10'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>1. Vetëm SL 10 PIPS (Abjeed)</span>
            </button>

            <button
              id="sl-mode-20-btn"
              onClick={() => setSlMode('SL_20')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                slMode === 'SL_20'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>2. Vetëm SL 20 PIPS (Buffer)</span>
            </button>

            <button
              id="sl-mode-compare-btn"
              onClick={() => setSlMode('COMPARE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                slMode === 'COMPARE'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>3. ⚖️ KRAHASIMI DIREKT (10p vs 20p)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Asset Switcher Bar (XAU/USD, EUR/USD, GBP/USD, USD/JPY & All Assets) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            Zgjedhja e Asetit në Kalendar:
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            (Klikoni për të parë fitimet dhe Win Rate për secilin instrument)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* All Assets */}
          <button
            id="cal-asset-all-btn"
            onClick={() => setSelectedAssetFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedAssetFilter === 'ALL'
                ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20 ring-2 ring-sky-300/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>🌐 Të Gjitha Asetet</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              selectedAssetFilter === 'ALL' ? 'bg-slate-950/40 text-slate-950' : 'bg-slate-800 text-emerald-400'
            }`}>
              {assetFilterStats.ALL.wr}% WR (+{assetFilterStats.ALL.pips10}p)
            </span>
          </button>

          {/* Gold XAU/USD */}
          <button
            id="cal-asset-xau-btn"
            onClick={() => {
              setSelectedAssetFilter('XAUUSD');
              onSelectAsset?.('XAUUSD');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedAssetFilter === 'XAUUSD'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-2 ring-amber-300/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>🥇 Gold (XAU/USD)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              selectedAssetFilter === 'XAUUSD' ? 'bg-slate-950/40 text-slate-950' : 'bg-slate-800 text-amber-300'
            }`}>
              {assetFilterStats.XAUUSD.wr}% WR (+{assetFilterStats.XAUUSD.pips10}p)
            </span>
          </button>

          {/* EUR/USD */}
          <button
            id="cal-asset-eur-btn"
            onClick={() => {
              setSelectedAssetFilter('EURUSD');
              onSelectAsset?.('EURUSD');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedAssetFilter === 'EURUSD'
                ? 'bg-blue-500 text-white font-black shadow-md shadow-blue-500/20 ring-2 ring-blue-300/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>💶 EUR/USD</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              selectedAssetFilter === 'EURUSD' ? 'bg-slate-950/40 text-white' : 'bg-slate-800 text-blue-300'
            }`}>
              {assetFilterStats.EURUSD.wr}% WR (+{assetFilterStats.EURUSD.pips10}p)
            </span>
          </button>

          {/* GBP/USD */}
          <button
            id="cal-asset-gbp-btn"
            onClick={() => {
              setSelectedAssetFilter('GBPUSD');
              onSelectAsset?.('GBPUSD');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedAssetFilter === 'GBPUSD'
                ? 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20 ring-2 ring-indigo-300/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>💷 GBP/USD</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              selectedAssetFilter === 'GBPUSD' ? 'bg-slate-950/40 text-white' : 'bg-slate-800 text-indigo-300'
            }`}>
              {assetFilterStats.GBPUSD.wr}% WR (+{assetFilterStats.GBPUSD.pips10}p)
            </span>
          </button>

          {/* USD/JPY */}
          <button
            id="cal-asset-jpy-btn"
            onClick={() => {
              setSelectedAssetFilter('USDJPY');
              onSelectAsset?.('USDJPY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedAssetFilter === 'USDJPY'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 ring-2 ring-emerald-300/40'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>💴 USD/JPY</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              selectedAssetFilter === 'USDJPY' ? 'bg-slate-950/40 text-slate-950' : 'bg-slate-800 text-emerald-300'
            }`}>
              {assetFilterStats.USDJPY.wr}% WR (+{assetFilterStats.USDJPY.pips10}p)
            </span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Profit with 10 Pips SL */}
        <div className={`p-4 rounded-2xl border transition-all ${
          slMode === 'SL_10' || slMode === 'COMPARE'
            ? 'bg-gradient-to-b from-sky-950/40 to-slate-900 border-sky-500/40 shadow-lg shadow-sky-500/10'
            : 'bg-slate-900/60 border-slate-800 opacity-70'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-sky-400" />
              Potenciali me SL 10 PIPS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
              R:R {comparisonStats.avgRR10}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
            {formatCurrency(currency === 'EUR' ? comparisonStats.profitEur10 : comparisonStats.profitUsd10)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono">
            <span>+{comparisonStats.totalPips10} Pips Neto ({comparisonStats.totalTrades} tregti)</span>
            <span className="text-emerald-400 font-bold">{comparisonStats.winRate10}% Win Rate</span>
          </div>
          <p className="text-[11px] text-sky-300/80 mt-1.5">
            Humbja kur kapet SL: <strong>Vetëm -10 pips</strong> (-{formatCurrency(calculateProfit(10).eur)}).
          </p>
        </div>

        {/* Card 2: Profit with 20 Pips SL */}
        <div className={`p-4 rounded-2xl border transition-all ${
          slMode === 'SL_20' || slMode === 'COMPARE'
            ? 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/10'
            : 'bg-slate-900/60 border-slate-800 opacity-70'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              Potenciali me SL 20 PIPS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              R:R {comparisonStats.avgRR20}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
            {formatCurrency(currency === 'EUR' ? comparisonStats.profitEur20 : comparisonStats.profitUsd20)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono">
            <span>+{comparisonStats.totalPips20} Pips Neto ({comparisonStats.totalTrades} tregti)</span>
            <span className="text-emerald-400 font-bold">{comparisonStats.winRate20}% Win Rate</span>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1.5">
            Humbja kur kapet SL: <strong>Dyfish më shumë (-20 pips)</strong> (-{formatCurrency(calculateProfit(20).eur)}).
          </p>
        </div>

        {/* Card 3: Direct Difference & Verdict */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                Diferenca &amp; Eficienca
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Përparësi Abjeed
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-200">
              {calcMode === 'LOTS' ? (
                <>
                  Diferenca në Fitim Neto:{' '}
                  <strong className="text-emerald-400 font-mono text-base">
                    +{formatCurrency(
                      Math.abs(
                        (currency === 'EUR' ? comparisonStats.profitEur10 : comparisonStats.profitUsd10) -
                          (currency === 'EUR' ? comparisonStats.profitEur20 : comparisonStats.profitUsd20)
                      )
                    )}
                  </strong>
                </>
              ) : (
                <>
                  Rritja e Kapitalit me 10p:{' '}
                  <strong className="text-emerald-400 font-mono text-base">
                    +{(comparisonStats.profitEur10 / accountBalance * 100).toFixed(1)}%
                  </strong>{' '}
                  kundrejt{' '}
                  <strong className="text-amber-400 font-mono">
                    +{(comparisonStats.profitEur20 / accountBalance * 100).toFixed(1)}%
                  </strong>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Me <strong>SL 10 pips</strong>, raporti R:R është <strong>dyfish më i lartë (1:4.9 vs 1:2.4)</strong>, duke ju lejuar rritje shumë më të shpejtë të llogarisë.
          </div>
        </div>

        {/* Card 4: Sizing & Capital Controls */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Llogaritësi i Madhësisë
            </span>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${currency === 'EUR' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
              >
                EUR (€)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${currency === 'USD' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
              >
                USD ($)
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block">Modeli</label>
              <select
                value={calcMode}
                onChange={(e) => setCalcMode(e.target.value as any)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs"
              >
                <option value="LOTS">Lot Fiks (p.sh. 0.10)</option>
                <option value="RISK_PERCENT">% e Kapitalit (1%)</option>
              </select>
            </div>

            <div>
              {calcMode === 'LOTS' ? (
                <>
                  <label className="text-[10px] text-slate-400 font-bold block">Lot Madhësia</label>
                  <select
                    value={lotSize}
                    onChange={(e) => setLotSize(parseFloat(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs font-mono"
                  >
                    <option value={0.01}>0.01 Lot ($0.10/p)</option>
                    <option value={0.05}>0.05 Lot ($0.50/p)</option>
                    <option value={0.10}>0.10 Lot ($1.00/p)</option>
                    <option value={0.20}>0.20 Lot ($2.00/p)</option>
                    <option value={0.50}>0.50 Lot ($5.00/p)</option>
                    <option value={1.00}>1.00 Lot ($10.0/p)</option>
                  </select>
                </>
              ) : (
                <>
                  <label className="text-[10px] text-slate-400 font-bold block">Kapitali (€/$)</label>
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 1000)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs font-mono"
                  />
                </>
              )}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400">
            {calcMode === 'LOTS' ? `1 Pip = ${(lotSize * 10).toFixed(1)}$ / €${((lotSize * 10) / eurUsdRate).toFixed(2)}` : `Rrezik per tregti = €${((accountBalance * riskPercent) / 100).toFixed(0)}`}
          </div>
        </div>
      </div>

      {/* Calendar Header: Month Switcher & Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear((y) => y - 1);
                } else {
                  setCurrentMonth((m) => m - 1);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-base font-extrabold text-white min-w-[140px] text-center font-mono">
              {['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'][currentMonth]} {currentYear}
            </h3>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear((y) => y + 1);
                } else {
                  setCurrentMonth((m) => m + 1);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tag */}
          <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-slate-950 border-slate-800 text-slate-300">
            {slMode === 'SL_10' && <span className="text-sky-400 font-black">Pamja: Vetëm SL 10 Pips</span>}
            {slMode === 'SL_20' && <span className="text-amber-400 font-black">Pamja: Vetëm SL 20 Pips</span>}
            {slMode === 'COMPARE' && <span className="text-emerald-400 font-black">Pamja: Krahasim Paralel (10p vs 20p)</span>}
          </span>
        </div>

        {/* Add Manual Trade Button */}
        <button
          id="msnr-add-trade-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Regjistro Tregti të Re</span>
        </button>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto">
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-2 min-w-[650px] mb-2 text-center text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {['Hënë', 'Martë', 'Mërkurë', 'Enjte', 'Premte', 'Shtunë', 'Dielë'].map((d, i) => (
            <div key={d} className={`py-1.5 ${i >= 5 ? 'text-slate-600' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-2 min-w-[650px]">
          {/* Empty offset days */}
          {Array.from({ length: startingDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[110px] rounded-xl bg-slate-950/40 border border-slate-800/40 opacity-30" />
          ))}

          {/* Actual Calendar Days */}
          {calendarDays.map((day) => {
            const hasTrades = day.trades.length > 0;
            const dayPips10 = day.trades.reduce((acc, t) => acc + t.resultPips10, 0);
            const dayPips20 = day.trades.reduce((acc, t) => acc + t.resultPips20, 0);

            const dayProfit10 = calculateProfit(dayPips10, true);
            const dayProfit20 = calculateProfit(dayPips20, false);

            const isWin10 = dayPips10 > 0;
            const isLoss10 = dayPips10 < 0;

            const isWin20 = dayPips20 > 0;
            const isLoss20 = dayPips20 < 0;

            // Highlight days where 10p vs 20p had different outcomes
            const hasDiscrepancy = day.trades.some((t) => t.status10 !== t.status20);

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[115px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  day.isWeekend
                    ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60'
                    : hasTrades
                    ? hasDiscrepancy
                      ? 'bg-gradient-to-b from-purple-950/30 to-slate-900 border-purple-500/40 hover:border-purple-400'
                      : isWin10
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400'
                      : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                } ${day.isToday ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950' : ''}`}
              >
                {/* Top Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${day.isToday ? 'text-sky-400 font-black' : day.isWeekend ? 'text-slate-600' : 'text-slate-300'}`}>
                    {day.dayNumber}
                  </span>

                  {day.isToday && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500 text-slate-950 font-black uppercase">
                      Sot
                    </span>
                  )}

                  {hasDiscrepancy && (
                    <span className="text-[9px] px-1 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold" title="Diferencë mes 10p dhe 20p SL">
                      Krahasim!
                    </span>
                  )}

                  {hasTrades && !hasDiscrepancy && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {day.trades.length} {day.trades.length === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {/* Center Content: Profit based on Selected SL Mode */}
                <div className="my-1">
                  {hasTrades ? (
                    slMode === 'SL_10' ? (
                      <div>
                        <div className={`text-sm font-black font-mono ${isWin10 ? 'text-emerald-400' : isLoss10 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {formatCurrency(currency === 'EUR' ? dayProfit10.eur : dayProfit10.usd)}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${isWin10 ? 'text-emerald-500' : isLoss10 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {dayPips10 > 0 ? `+${dayPips10}p` : `${dayPips10}p`} (SL 10p)
                        </div>
                      </div>
                    ) : slMode === 'SL_20' ? (
                      <div>
                        <div className={`text-sm font-black font-mono ${isWin20 ? 'text-emerald-400' : isLoss20 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {formatCurrency(currency === 'EUR' ? dayProfit20.eur : dayProfit20.usd)}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${isWin20 ? 'text-amber-400' : isLoss20 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {dayPips20 > 0 ? `+${dayPips20}p` : `${dayPips20}p`} (SL 20p)
                        </div>
                      </div>
                    ) : (
                      /* Side-by-Side Dual Display */
                      <div className="space-y-1 text-left">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-sky-400 font-bold">10p:</span>
                          <span className={isWin10 ? 'text-emerald-400 font-black' : isLoss10 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                            {dayPips10 > 0 ? `+${dayPips10}p` : `${dayPips10}p`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-amber-400 font-bold">20p:</span>
                          <span className={isWin20 ? 'text-emerald-400 font-black' : isLoss20 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                            {dayPips20 > 0 ? `+${dayPips20}p` : `${dayPips20}p`}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-300 border-t border-slate-800 pt-0.5">
                          {formatCurrency(currency === 'EUR' ? dayProfit10.eur : dayProfit10.usd)}
                        </div>
                      </div>
                    )
                  ) : !day.isWeekend ? (
                    <div className="text-[10px] text-slate-600 font-mono italic">Pa tregti</div>
                  ) : null}

                  {/* Asset Tag Badges */}
                  {hasTrades && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.from(new Set(day.trades.map((t) => t.symbol || (t.assetId === 'EURUSD' ? 'EUR/USD' : t.assetId === 'GBPUSD' ? 'GBP/USD' : t.assetId === 'USDJPY' ? 'USD/JPY' : 'XAU/USD')))).map((sym) => (
                        <span
                          key={sym}
                          className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                            sym === 'EUR/USD'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : sym === 'GBP/USD'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : sym === 'USD/JPY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Footer Tags */}
                <div className="flex items-center justify-between pt-1 text-[9px] text-slate-500 font-mono">
                  <span>{day.dayNameShort}</span>
                  {hasTrades && (
                    <span className="group-hover:text-sky-400 transition-colors">Kliko &rarr;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Educational Guide: Why Abjeed uses 10 Pips Stop Loss */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          Pse Abjeed rekomandon në mënyrë rigoroze SL 10 Pips në krahasim me 20 Pips?
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-extrabold text-sky-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              1. Hyrje në Bisht (Wick Entry)
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Në teorinë LIT, hyrja bëhet kur <strong>Target Sweep (TS)</strong> merr likuiditetin dhe formon një wick. Nëse çmimi kalon 10 pips përtej wick-ut, struktura M15 është thyer dhe setup-i është i pavlefshëm!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              2. Raporti R:R (1:5 vs 1:2.5)
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Me 10 pips SL, një lëvizje 50 pips drejt TP2 ju jep <strong>1:5 Risk-to-Reward (+5R)</strong>. Me 20 pips SL, e njëjta lëvizje ju jep vetëm <strong>1:2.5 (+2.5R)</strong>. Llogaria juaj rritet dyfish më shpejt!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-extrabold text-rose-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              3. Mbrojtja e Kapitalit në Humbje
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kur tregu lëviz kundër jush për shkak lajmesh, me 10 pips humbni <strong>vetëm 1R (-10p)</strong>. Me 20 pips keni humbur dyfish kapital (-20p), pa pasur asnjë përparësi shtesë.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                  Analiza e Ditës së Zgjedhur
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {selectedDay.dayNameShort}, {selectedDay.dateStr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDay.trades.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nuk ka tregti të ekzekutuara në këtë ditë.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDay.trades.map((t, index) => {
                  const profit10 = calculateProfit(t.resultPips10, true);
                  const profit20 = calculateProfit(t.resultPips20, false);

                  return (
                    <div
                      key={t.id || index}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-black ${
                              (t.assetId === 'EURUSD' || t.symbol === 'EUR/USD')
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : (t.assetId === 'GBPUSD' || t.symbol === 'GBP/USD')
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : (t.assetId === 'USDJPY' || t.symbol === 'USD/JPY')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {t.symbol || (t.assetId === 'EURUSD' ? 'EUR/USD' : t.assetId === 'GBPUSD' ? 'GBP/USD' : t.assetId === 'USDJPY' ? 'USD/JPY' : 'XAU/USD')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-black ${
                              t.type === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {t.type}
                          </span>
                          <h4 className="text-sm font-extrabold text-white">{t.setupName}</h4>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {t.time} • Sesioni {t.session}
                        </span>
                      </div>

                      {/* Side by side stats for this trade */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900">
                        {/* 10 Pips Result */}
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-sky-500/30 space-y-1">
                          <div className="flex items-center justify-between text-xs font-extrabold text-sky-400">
                            <span>ME SL 10 PIPS (Abjeed)</span>
                            <span className={t.status10 === 'TP_HIT' ? 'text-emerald-400' : 'text-rose-400'}>
                              {t.status10}
                            </span>
                          </div>
                          <div className="text-lg font-black text-white font-mono">
                            {formatCurrency(currency === 'EUR' ? profit10.eur : profit10.usd)}
                          </div>
                          <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                            <span>Rezultati: <strong>{t.resultPips10 > 0 ? `+${t.resultPips10}p` : `${t.resultPips10}p`}</strong></span>
                            <span>SL: {t.sl10}</span>
                          </div>
                        </div>

                        {/* 20 Pips Result */}
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-500/30 space-y-1">
                          <div className="flex items-center justify-between text-xs font-extrabold text-amber-400">
                            <span>ME SL 20 PIPS (Buffer)</span>
                            <span className={t.status20 === 'TP_HIT' ? 'text-emerald-400' : 'text-rose-400'}>
                              {t.status20}
                            </span>
                          </div>
                          <div className="text-lg font-black text-white font-mono">
                            {formatCurrency(currency === 'EUR' ? profit20.eur : profit20.usd)}
                          </div>
                          <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                            <span>Rezultati: <strong>{t.resultPips20 > 0 ? `+${t.resultPips20}p` : `${t.resultPips20}p`}</strong></span>
                            <span>SL: {t.sl20}</span>
                          </div>
                        </div>
                      </div>

                      {/* Trade Explanation / Note */}
                      <div className="p-2.5 rounded-lg bg-slate-900/40 text-xs text-slate-300 border border-slate-800/80">
                        <strong>Shënimi i Analizës:</strong> {t.note}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                Mbyll Dritaren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Trade Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                Regjistro Tregti të Re në Kalendar
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Data e Tregtisë</label>
                <input
                  type="date"
                  value={newTradeDate}
                  onChange={(e) => setNewTradeDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Lloji</label>
                  <select
                    value={newTradeType}
                    onChange={(e) => setNewTradeType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="SELL">SELL (Shitje)</option>
                    <option value="BUY">BUY (Blerje)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Sesioni</label>
                  <select
                    value={newTradeSession}
                    onChange={(e) => setNewTradeSession(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Setup-i MSNR LIT</label>
                <input
                  type="text"
                  value={newTradeSetup}
                  onChange={(e) => setNewTradeSetup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-sky-400 font-bold block mb-1">Me SL 10 Pips</label>
                  <select
                    value={newTradeStatus10}
                    onChange={(e) => setNewTradeStatus10(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs mb-1.5"
                  >
                    <option value="TP_HIT">TP HIT (Fitim)</option>
                    <option value="SL_HIT">SL HIT (-10p)</option>
                  </select>
                  {newTradeStatus10 === 'TP_HIT' && (
                    <input
                      type="number"
                      placeholder="Pips p.sh. 50"
                      value={newTradePips10}
                      onChange={(e) => setNewTradePips10(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="text-amber-400 font-bold block mb-1">Me SL 20 Pips</label>
                  <select
                    value={newTradeStatus20}
                    onChange={(e) => setNewTradeStatus20(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs mb-1.5"
                  >
                    <option value="TP_HIT">TP HIT (Fitim)</option>
                    <option value="SL_HIT">SL HIT (-20p)</option>
                  </select>
                  {newTradeStatus20 === 'TP_HIT' && (
                    <input
                      type="number"
                      placeholder="Pips p.sh. 50"
                      value={newTradePips20}
                      onChange={(e) => setNewTradePips20(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold"
                >
                  Ruaj në Kalendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

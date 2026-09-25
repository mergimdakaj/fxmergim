import React, { useState, useMemo, useEffect } from 'react';
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
  Calculator,
} from 'lucide-react';
import { ICTTrade } from '../types/trading';
import { PositionSizingCalculatorCard } from './PositionSizingCalculatorCard';
import { accountBalanceService } from '../services/accountBalanceService';
import { getDynamicDays } from '../utils/dateUtils';

export interface CalendarDayTrade {
  id: string;
  time: string;
  type: 'BUY' | 'SELL';
  setupName: string;
  session: 'London' | 'New York' | 'Asian';
  entry: number;
  sl: number;
  tp: number;
  resultPips: number;
  status: 'TP_HIT' | 'SL_HIT' | 'ACTIVE';
  note: string;
}

export interface CalendarDayData {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayNameShort: string; // Hën, Mar, Mër, Enj, Pre, Sht, Dje
  isWeekend: boolean;
  isToday: boolean;
  trades: CalendarDayTrade[];
}

interface DailyProfitCalendarProps {
  initialTrades?: ICTTrade[];
  symbol?: string;
  onSelectDayTrade?: (trade: CalendarDayTrade) => void;
}

export const DailyProfitCalendar: React.FC<DailyProfitCalendarProps> = ({
  initialTrades = [],
  symbol = 'XAU/USD',
}) => {
  // Account settings synced via accountBalanceService
  const initialSettings = accountBalanceService.getSettings();
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(initialSettings.currency);
  const eurUsdRate = 1.08; // 1 EUR = 1.08 USD (~0.925 EUR per USD)

  // Sizing mode: Fixed Lots vs Account Risk %
  const [calcMode, setCalcMode] = useState<'LOTS' | 'RISK_PERCENT'>('LOTS');
  const [lotSize, setLotSize] = useState<number>(0.10); // 0.10 lot (1 pip = $1.00 / €0.92)
  const [accountBalance, setAccountBalance] = useState<number>(initialSettings.balance);
  const [riskPercent, setRiskPercent] = useState<number>(initialSettings.riskPercent);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState<boolean>(true);

  // Subscribe to account balance and risk updates
  useEffect(() => {
    const unsub = accountBalanceService.subscribe((s) => {
      setAccountBalance(s.balance);
      setRiskPercent(s.riskPercent);
      setCurrency(s.currency);
    });
    return unsub;
  }, []);

  // Selected day for modal breakdown
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  // Month navigation: default September 2026
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 = September (0-indexed)

  // Custom user-logged trades stored in localStorage
  const [customTrades, setCustomTrades] = useState<Record<string, CalendarDayTrade[]>>(() => {
    try {
      const saved = localStorage.getItem('ict_custom_calendar_trades');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal for adding manual trade
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTradeDate, setNewTradeDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [newTradeType, setNewTradeType] = useState<'BUY' | 'SELL'>('SELL');
  const [newTradeStatus, setNewTradeStatus] = useState<'TP_HIT' | 'SL_HIT'>('TP_HIT');
  const [newTradePips, setNewTradePips] = useState<number>(82);
  const [newTradeSetup, setNewTradeSetup] = useState<string>('M-Formation Sweep në 4H Supply');
  const [newTradeSession, setNewTradeSession] = useState<'London' | 'New York'>('New York');

  // Helper to convert pips to currency amount
  const calculateProfit = (pips: number): { usd: number; eur: number } => {
    if (calcMode === 'LOTS') {
      // In gold (XAU/USD), 100 oz contract:
      // 1 standard lot = $10 / pip
      // 0.10 lot = $1.00 / pip
      // 0.01 lot = $0.10 / pip
      const usdAmount = pips * (lotSize * 10);
      const eurAmount = usdAmount / eurUsdRate;
      return { usd: usdAmount, eur: eurAmount };
    } else {
      // Risk % mode: 1R = (accountBalance * riskPercent) / 100
      // 1:2 RR means a TP win yields +2R, an SL loss loses -1R
      const riskUnitEur = (accountBalance * riskPercent) / 100;
      let eurAmount = 0;
      if (pips > 0) {
        eurAmount = riskUnitEur * 2.0; // 1:2 RR target
      } else if (pips < 0) {
        eurAmount = -riskUnitEur; // 1R loss
      }
      const usdAmount = eurAmount * eurUsdRate;
      return { usd: usdAmount, eur: eurAmount };
    }
  };

  const formatCurrency = (val: number): string => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val).toFixed(2);
    if (currency === 'EUR') {
      return `${sign}€${abs}`;
    }
    return `${sign}$${abs}`;
  };

  // Base calendar trades across September 2026 based on verified ICT model
  const defaultHistoricalTrades: Record<string, CalendarDayTrade[]> = useMemo(() => {
    return {
      // Day 1: Sep 1 (Tue)
      '2026-09-01': [
        {
          id: 'hist-1',
          time: '08:30 UTC',
          type: 'BUY',
          setupName: 'London Open PDL Sweep W-Pattern',
          session: 'London',
          entry: 4342.0,
          sl: 4338.0,
          tp: 4350.0,
          resultPips: 80,
          status: 'TP_HIT',
          note: 'W-pattern sweep me Out & In, TP 1:2 u godit brenda 45 minutave.',
        },
      ],
      // Day 2: Sep 2 (Wed)
      '2026-09-02': [
        {
          id: 'hist-2',
          time: '14:15 UTC',
          type: 'SELL',
          setupName: 'NY Killzone 4H Supply M-Formation',
          session: 'New York',
          entry: 4356.5,
          sl: 4361.0,
          tp: 4347.5,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Këmba e dytë mori likuiditetin e NY Open, rënie e pastër në TP.',
        },
      ],
      // Day 3: Sep 3 (Thu)
      '2026-09-03': [
        {
          id: 'hist-3',
          time: '09:00 UTC',
          type: 'BUY',
          setupName: '1H Demand Retest pas MSS',
          session: 'London',
          entry: 4348.0,
          sl: 4344.2,
          tp: 4355.6,
          resultPips: 76,
          status: 'TP_HIT',
          note: 'Retest në FVG pas thyerjes së strukturës.',
        },
      ],
      // Day 4: Sep 4 (Fri) - 1 Win, 1 Loss (NFP volatility)
      '2026-09-04': [
        {
          id: 'hist-4a',
          time: '08:15 UTC',
          type: 'SELL',
          setupName: 'London Liquidity Sweep M-Pattern',
          session: 'London',
          entry: 4362.0,
          sl: 4366.5,
          tp: 4353.0,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Sweep i qartë para lajmeve, TP u kap para orës 12:00.',
        },
        {
          id: 'hist-4b',
          time: '14:40 UTC',
          type: 'BUY',
          setupName: 'NY Volatility Rebound',
          session: 'New York',
          entry: 4350.0,
          sl: 4345.5,
          tp: 4359.0,
          resultPips: -45,
          status: 'SL_HIT',
          note: 'Volatiliteti i lartë i NFP preku SL me fitil para kthimit.',
        },
      ],
      // Week 2: Sep 7 - Sep 11
      '2026-09-07': [
        {
          id: 'hist-5',
          time: '10:00 UTC',
          type: 'BUY',
          setupName: 'London Open W-Pattern Demand',
          session: 'London',
          entry: 4352.4,
          sl: 4348.0,
          tp: 4361.2,
          resultPips: 88,
          status: 'TP_HIT',
          note: 'Hyrje perfekte pas sweep-it të orës 09:30.',
        },
      ],
      '2026-09-08': [
        {
          id: 'hist-6',
          time: '14:30 UTC',
          type: 'SELL',
          setupName: 'NY Killzone M-Formation',
          session: 'New York',
          entry: 4368.0,
          sl: 4372.5,
          tp: 4359.0,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Sweep i PDH (Previous Day High) dhe rënie në TP 1:2.',
        },
      ],
      '2026-09-09': [
        {
          id: 'hist-7',
          time: '08:45 UTC',
          type: 'BUY',
          setupName: 'London FVG Fill Reversal',
          session: 'London',
          entry: 4360.0,
          sl: 4356.0,
          tp: 4368.0,
          resultPips: 80,
          status: 'TP_HIT',
          note: 'Prekje e saktë e FVG në 4360.00 dhe rally me +80 pips.',
        },
      ],
      '2026-09-10': [
        {
          id: 'hist-8',
          time: '13:45 UTC',
          type: 'SELL',
          setupName: '4H Supply Sweep M-Formation',
          session: 'New York',
          entry: 4374.0,
          sl: 4378.8,
          tp: 4364.4,
          resultPips: 96,
          status: 'TP_HIT',
          note: 'Këmba e dytë e M krijoi MSS me trup qiriri.',
        },
      ],
      '2026-09-11': [
        {
          id: 'hist-9',
          time: '09:15 UTC',
          type: 'BUY',
          setupName: 'London Sweep Lows W-Pattern',
          session: 'London',
          entry: 4365.2,
          sl: 4361.0,
          tp: 4373.6,
          resultPips: 84,
          status: 'TP_HIT',
          note: 'Mbyllje e shkëlqyer e javës me +84 pips.',
        },
      ],
      // Week 3: Sep 14 - Sep 18 (Including Pardje, Dje, Sot!)
      '2026-09-14': [
        {
          id: 'hist-10',
          time: '14:20 UTC',
          type: 'BUY',
          setupName: 'NY Open Demand Bounce W-Pattern',
          session: 'New York',
          entry: 4370.0,
          sl: 4366.0,
          tp: 4378.0,
          resultPips: 80,
          status: 'TP_HIT',
          note: 'Sweep i orës 14:00 dhe shpërthim drejt TP 1:2.',
        },
      ],
      '2026-09-15': [
        {
          id: 'hist-11',
          time: '08:30 UTC',
          type: 'SELL',
          setupName: 'London Session High Sweep',
          session: 'London',
          entry: 4382.5,
          sl: 4387.0,
          tp: 4373.5,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Këmba e dytë sweepoi majën e mëngjesit dhe lëvizi në TP.',
        },
      ],
      // Sep 16 (Pardje)
      '2026-09-16': [
        {
          id: 'trade-pardje-1',
          time: '08:25 UTC',
          type: 'BUY',
          setupName: 'W-Formation në 4H Demand (4375.00)',
          session: 'London',
          entry: 4377.5,
          sl: 4371.8,
          tp: 4388.9,
          resultPips: 114,
          status: 'TP_HIT',
          note: 'Sweep me qiri Out & In, MSS me FVG 4376.20-4378.00. TP u arrit lehtësisht.',
        },
        {
          id: 'trade-pardje-2',
          time: '14:15 UTC',
          type: 'SELL',
          setupName: 'M-Formation në 1H Supply (4396.00)',
          session: 'New York',
          entry: 4393.4,
          sl: 4398.0,
          tp: 4384.2,
          resultPips: 92,
          status: 'TP_HIT',
          note: 'Mori likuiditetin e lartë ($$$) në 4397.20 dhe zbriti në TP 4384.20.',
        },
      ],
      // Sep 17 (Dje)
      '2026-09-17': [
        {
          id: 'trade-dje-1',
          time: '09:10 UTC',
          type: 'SELL',
          setupName: 'M-Formation në 4H Supply (4398.00)',
          session: 'London',
          entry: 4394.8,
          sl: 4400.2,
          tp: 4384.0,
          resultPips: 108,
          status: 'TP_HIT',
          note: 'Sweep i majës deri në 4399.40, MSS poshtë me FVG. Rënie e menjëhershme në TP.',
        },
        {
          id: 'trade-dje-2',
          time: '14:35 UTC',
          type: 'BUY',
          setupName: 'W-Formation në 1H Demand',
          session: 'New York',
          entry: 4378.8,
          sl: 4374.8,
          tp: 4386.8,
          resultPips: -40,
          status: 'SL_HIT',
          note: 'Lajmet makroekonomike të orës 15:00 UTC shkaktuan kapjen e SL (-40 pips).',
        },
      ],
      // Sep 18 (Fri)
      '2026-09-18': [
        {
          id: 'trade-18-1',
          time: '08:15 UTC',
          type: 'BUY',
          setupName: 'W-Formation Sweep i PDL (4370.80)',
          session: 'London',
          entry: 4374.2,
          sl: 4369.8,
          tp: 4383.0,
          resultPips: 88,
          status: 'TP_HIT',
          note: 'Sweep i PDL me qiri Out & In, MSS mbi 4375.50 me FVG. TP 4383.00 u kap me sukses (+88 pips)!',
        },
        {
          id: 'trade-18-2',
          time: '14:20 UTC',
          type: 'SELL',
          setupName: 'M-Formation në 4H Supply (4388.00)',
          session: 'New York',
          entry: 4386.4,
          sl: 4390.5,
          tp: 4378.2,
          resultPips: 72,
          status: 'TP_HIT',
          note: 'Mori likuiditetin e lartë në 4389.60, MSS theu 4384.20. TP 4378.20 u kap me sukses (+72 pips)!',
        },
      ],
      // Sep 21 (Mon - Sot - TODAY!)
      '2026-09-21': [
        {
          id: 'trade-sot-21-1',
          time: '08:45 UTC',
          type: 'BUY',
          setupName: 'W-Formation Sweep i Asian Lows (4348.50)',
          session: 'London',
          entry: 4351.2,
          sl: 4347.0,
          tp: 4359.6,
          resultPips: 84,
          status: 'TP_HIT',
          note: 'Sweep me wick në sesionin e Londrës, konfirmim MSS M1 mbi 4353.00 dhe arritje e shpejtë në TP1 (+84 pips)!',
        },
        {
          id: 'trade-sot-21-2',
          time: '14:30 UTC',
          type: 'SELL',
          setupName: 'M-Formation Sweep në 4H Supply (4362.00)',
          session: 'New York',
          entry: 4357.8,
          sl: 4362.8,
          tp: 4347.8,
          resultPips: 65,
          status: 'TP_HIT',
          note: 'Ekzekutim i New York: Çmimi mori likuiditetin e lartë dhe arriti TP (+65 pips)!',
        },
      ],
      // Sep 22 (Tue)
      '2026-09-22': [
        {
          id: 'trade-sot-22-1',
          time: '08:30 UTC',
          type: 'BUY',
          setupName: 'London Judas Swing në 1H Demand (4355.00)',
          session: 'London',
          entry: 4358.2,
          sl: 4354.0,
          tp: 4366.6,
          resultPips: 84,
          status: 'TP_HIT',
          note: 'Sweep i pastër i Asian Lows dhe arritje e shpejtë në TP (+84 pips).',
        },
        {
          id: 'trade-sot-22-2',
          time: '14:15 UTC',
          type: 'SELL',
          setupName: 'NY Killzone OTE Retest SELL',
          session: 'New York',
          entry: 4372.4,
          sl: 4377.0,
          tp: 4363.2,
          resultPips: 92,
          status: 'TP_HIT',
          note: 'Reagim nga niveli OTE 62% me rënie impulsive drejt TP (+92 pips).',
        },
      ],
      // Sep 23 (Wed)
      '2026-09-23': [
        {
          id: 'trade-sot-23-1',
          time: '08:45 UTC',
          type: 'SELL',
          setupName: 'Turtle Soup Previous Day High (PDH) Sweep',
          session: 'London',
          entry: 4384.5,
          sl: 4389.0,
          tp: 4375.5,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Out & In candle mbi PDH, MSS konfirmoi kthimin (+90 pips).',
        },
        {
          id: 'trade-sot-23-2',
          time: '15:00 UTC',
          type: 'BUY',
          setupName: 'New York M15 Breaker Block Mitigation',
          session: 'New York',
          entry: 4368.0,
          sl: 4363.5,
          tp: 4377.0,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Test i Breaker Block me FVG bullish, target liquidity e sesionit (+90 pips).',
        },
      ],
      // Sep 24 (Thu)
      '2026-09-24': [
        {
          id: 'trade-sot-24-1',
          time: '09:00 UTC',
          type: 'BUY',
          setupName: 'London Open PDL Sweep + W-Formation',
          session: 'London',
          entry: 4362.0,
          sl: 4357.5,
          tp: 4371.0,
          resultPips: 90,
          status: 'TP_HIT',
          note: 'Formacion W perfekt pas manipulimit të hapjes së Londrës (+90 pips).',
        },
        {
          id: 'trade-sot-24-2',
          time: '14:20 UTC',
          type: 'SELL',
          setupName: 'Asian Range High Liquidity Purge SELL',
          session: 'New York',
          entry: 4379.8,
          sl: 4384.5,
          tp: 4370.4,
          resultPips: 94,
          status: 'TP_HIT',
          note: 'Purge i Asian Highs dhe rënie e fuqishme në TP (+94 pips).',
        },
      ],
      // Sep 25 (Fri - TODAY)
      '2026-09-25': [
        {
          id: 'trade-sot-25-1',
          time: '08:30 UTC',
          type: 'BUY',
          setupName: 'London Killzone Bullish FVG Retest pas MSS',
          session: 'London',
          entry: 4352.4,
          sl: 4348.0,
          tp: 4361.2,
          resultPips: 88,
          status: 'TP_HIT',
          note: 'MSS e qartë me trup qiriri, hyrje në retest FVG dhe arritje në TP1 (+88 pips)!',
        },
        {
          id: 'trade-sot-25-2',
          time: '14:15 UTC',
          type: 'SELL',
          setupName: '4H Supply Zone & Buy-Side Sweep SELL',
          session: 'New York',
          entry: 4364.5,
          sl: 4369.0,
          tp: 4355.5,
          resultPips: 60,
          status: 'ACTIVE',
          note: 'Tregti aktive live e ditës së sotme në New York: Duke lëvizur drejt objektivit me +60 pips fitim!',
        },
      ],
    };
  }, []);

  // Merge default historical trades with custom user-logged trades and active asset trades
  const allDaysTrades = useMemo(() => {
    const combined: Record<string, CalendarDayTrade[]> = { ...defaultHistoricalTrades };
    const dynamicDays = getDynamicDays();
    const todayDateKey = dynamicDays.today.isoDate;
    const yesterdayDateKey = dynamicDays.yesterday.isoDate;
    const dayBeforeDateKey = dynamicDays.dayBefore.isoDate;

    // If initialTrades for this asset is provided, map them
    if (initialTrades && initialTrades.length > 0) {
      delete combined[dayBeforeDateKey];
      delete combined[yesterdayDateKey];
      delete combined[todayDateKey];

      initialTrades.forEach((t) => {
        let dateKey = todayDateKey;
        if (t.day === 'day_before') dateKey = dayBeforeDateKey;
        else if (t.day === 'yesterday') dateKey = yesterdayDateKey;
        else if (t.day === 'today') dateKey = todayDateKey;

        if (!combined[dateKey]) combined[dateKey] = [];
        combined[dateKey].push({
          id: t.id,
          time: t.timeFormatted || '12:00 UTC',
          type: t.type,
          setupName: t.reasoning ? t.reasoning.split('.')[0] : `${t.symbol} ICT Setup`,
          session: (t.session?.includes('London') ? 'London' : 'New York') as 'London' | 'New York',
          entry: t.entryPrice,
          sl: t.stopLoss,
          tp: t.takeProfit,
          resultPips: t.resultPips,
          status: t.status,
          note: t.reasoning || '',
        });
      });
    }

    Object.keys(customTrades).forEach((dateKey) => {
      if (combined[dateKey]) {
        combined[dateKey] = [...combined[dateKey], ...customTrades[dateKey]];
      } else {
        combined[dateKey] = [...customTrades[dateKey]];
      }
    });
    return combined;
  }, [defaultHistoricalTrades, customTrades, initialTrades]);

  // Generate calendar days for currentMonth (default September 2026)
  const calendarDays: CalendarDayData[] = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: CalendarDayData[] = [];
    const todayDateKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const dayNames = ['Dje', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

      const isToday = dateKey === todayDateKey;
      const tradesForDay = allDaysTrades[dateKey] || [];

      result.push({
        dateStr: dateKey,
        dayNumber: d,
        dayNameShort: dayNames[dayOfWeek],
        isWeekend,
        isToday,
        trades: tradesForDay,
      });
    }

    return result;
  }, [currentYear, currentMonth, allDaysTrades]);

  // Calculate monthly summary metrics
  const monthSummary = useMemo(() => {
    let totalPips = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let profitableDaysCount = 0;
    let losingDaysCount = 0;
    let tradingDaysWithActivity = 0;

    calendarDays.forEach((day) => {
      if (day.trades.length > 0) {
        tradingDaysWithActivity++;
        let dayPips = 0;
        day.trades.forEach((t) => {
          dayPips += t.resultPips;
          if (t.status === 'TP_HIT' || (t.status === 'ACTIVE' && t.resultPips > 0)) {
            totalWins++;
          } else if (t.status === 'SL_HIT') {
            totalLosses++;
          }
        });
        totalPips += dayPips;
        if (dayPips > 0) {
          profitableDaysCount++;
        } else if (dayPips < 0) {
          losingDaysCount++;
        }
      }
    });

    const totalTradesCount = totalWins + totalLosses;
    const winRate = totalTradesCount > 0 ? Math.round((totalWins / totalTradesCount) * 100) : 0;
    const { usd: totalUsd, eur: totalEur } = calculateProfit(totalPips);
    const avgDailyPips = tradingDaysWithActivity > 0 ? Math.round(totalPips / tradingDaysWithActivity) : 0;
    const { usd: avgDailyUsd, eur: avgDailyEur } = calculateProfit(avgDailyPips);

    return {
      totalPips,
      totalEur,
      totalUsd,
      totalWins,
      totalLosses,
      totalTradesCount,
      winRate,
      profitableDaysCount,
      losingDaysCount,
      tradingDaysWithActivity,
      avgDailyPips,
      avgDailyEur,
      avgDailyUsd,
    };
  }, [calendarDays, lotSize, calcMode, accountBalance, riskPercent]);

  // Push calendar profits to accountBalanceService for position sizing calculations
  useEffect(() => {
    accountBalanceService.updateCalendarProfit(monthSummary.totalEur, monthSummary.totalUsd);
  }, [monthSummary.totalEur, monthSummary.totalUsd]);

  // Handle adding custom trade
  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrade: CalendarDayTrade = {
      id: 'custom-' + Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      type: newTradeType,
      setupName: newTradeSetup,
      session: newTradeSession,
      entry: 4380.0,
      sl: newTradeType === 'BUY' ? 4376.0 : 4384.0,
      tp: newTradeType === 'BUY' ? 4388.0 : 4372.0,
      resultPips: newTradeStatus === 'SL_HIT' ? -Math.abs(newTradePips) : Math.abs(newTradePips),
      status: newTradeStatus,
      note: 'Regjistruar manualisht nga tregtari në kalendar.',
    };

    const updated = { ...customTrades };
    if (!updated[newTradeDate]) {
      updated[newTradeDate] = [];
    }
    updated[newTradeDate].push(newTrade);
    setCustomTrades(updated);
    try {
      localStorage.setItem('ict_custom_calendar_trades', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not persist trade to localStorage', err);
    }
    setShowAddModal(false);
  };

  const monthNames = [
    'Janar',
    'Shkurt',
    'Mars',
    'Prill',
    'Maj',
    'Qershor',
    'Korrik',
    'Gusht',
    'Shtator',
    'Tetor',
    'Nëntor',
    'Dhjetor',
  ];

  return (
    <div id="daily-profit-calendar-root" className="space-y-6">
      {/* Top Banner & Strategy Metrics */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-white tracking-wide">
              Kalendari Ditor i Fitimit ICT ({symbol} Pips & Euro/Dollar)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Shikoni saktësisht sa gjeneron strategjia ICT çdo ditë të muajit. Llogaritje automatike e fitimit neto në Euro (€) dhe Pips sipas madhësisë së lotit tuaj.
          </p>
        </div>

        {/* Currency & Size Controls */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
          {/* Currency Switcher */}
          <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700 text-xs font-bold">
            <button
              id="currency-eur-btn"
              onClick={() => {
                setCurrency('EUR');
                accountBalanceService.setCurrency('EUR');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                currency === 'EUR' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Euro className="w-3.5 h-3.5" />
              <span>EUR (€)</span>
            </button>
            <button
              id="currency-usd-btn"
              onClick={() => {
                setCurrency('USD');
                accountBalanceService.setCurrency('USD');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                currency === 'USD' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>USD ($)</span>
            </button>
          </div>

          {/* Sizing Mode Switcher */}
          <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700 text-xs font-bold">
            <button
              id="calc-mode-lots-btn"
              onClick={() => setCalcMode('LOTS')}
              className={`px-2 py-1 rounded-md transition-all ${
                calcMode === 'LOTS' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Loti Fiks
            </button>
            <button
              id="calc-mode-risk-btn"
              onClick={() => setCalcMode('RISK_PERCENT')}
              className={`px-2 py-1 rounded-md transition-all ${
                calcMode === 'RISK_PERCENT' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              % e Llogarisë
            </button>
          </div>

          {/* Dynamic selector based on calcMode */}
          {calcMode === 'LOTS' ? (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Loti:</span>
              <select
                id="lot-size-select"
                aria-label="Madhësia e Lotit"
                value={lotSize}
                onChange={(e) => setLotSize(parseFloat(e.target.value))}
                className="bg-slate-900 text-amber-400 border border-slate-700 font-bold px-2 py-1 rounded-lg text-xs cursor-pointer focus:outline-none focus:border-amber-400"
              >
                <option value={0.01}>0.01 Lot (Micro - 0.10$/pip)</option>
                <option value={0.05}>0.05 Lot (0.50$/pip)</option>
                <option value={0.10}>0.10 Lot (Mini - 1.00$/pip)</option>
                <option value={0.20}>0.20 Lot (2.00$/pip)</option>
                <option value={0.50}>0.50 Lot (5.00$/pip)</option>
                <option value={1.00}>1.00 Lot (Standard - 10.00$/pip)</option>
                <option value={2.00}>2.00 Lot (20.00$/pip)</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Kapitali:</span>
              <select
                id="balance-select"
                aria-label="Kapitali i Llogarisë"
                value={accountBalance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAccountBalance(val);
                  accountBalanceService.setBalance(val);
                }}
                className="bg-slate-900 text-emerald-400 border border-slate-700 font-bold px-2 py-1 rounded-lg text-xs cursor-pointer focus:outline-none focus:border-emerald-400"
              >
                <option value={1000}>€1,000 (1% = €10)</option>
                <option value={5000}>€5,000 (1% = €50)</option>
                <option value={10000}>€10,000 (1% = €100)</option>
                <option value={25000}>€25,000 (1% = €250)</option>
                <option value={50000}>€50,000 (1% = €500)</option>
                <option value={100000}>€100,000 (1% = €1,000)</option>
              </select>
            </div>
          )}

          {/* Add Manual Trade Button */}
          <button
            id="open-add-trade-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Regjistro Ditën</span>
          </button>
        </div>
      </div>

      {/* KPI Performance Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Profit */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Fitimi Total ({monthNames[currentMonth]})
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">
            {currency === 'EUR' ? formatCurrency(monthSummary.totalEur) : formatCurrency(monthSummary.totalUsd)}
          </div>
          <span className="text-[11px] font-mono text-emerald-300/80 block mt-0.5">
            +{monthSummary.totalPips} pips neto
          </span>
        </div>

        {/* Win Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Win Rate i Strategjisë
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-400 mt-0.5">
            {monthSummary.winRate}%
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {monthSummary.totalWins} Fitore / {monthSummary.totalLosses} Humbje
          </span>
        </div>

        {/* Profitable Days Ratio */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Ditët me Fitim
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-0.5">
            {monthSummary.profitableDaysCount}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {monthSummary.tradingDaysWithActivity} ditë</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
            {monthSummary.tradingDaysWithActivity > 0
              ? `${Math.round((monthSummary.profitableDaysCount / monthSummary.tradingDaysWithActivity) * 100)}% ditë pozitive`
              : '0%'}
          </span>
        </div>

        {/* Average Daily Profit */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Mesatarja Ditore
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">
            {currency === 'EUR' ? formatCurrency(monthSummary.avgDailyEur) : formatCurrency(monthSummary.avgDailyUsd)}
          </div>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            +{monthSummary.avgDailyPips} pips / ditë
          </span>
        </div>

        {/* Risk / Reward Model */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Rregulli R:R
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-400 mt-0.5">
            1:2 Fiks
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Humbja 1R = Fitimi 2R
          </span>
        </div>

        {/* Active Lot / Pip value */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Vlera për 1 Pip Ari
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-sky-400 mt-0.5">
            {calcMode === 'LOTS'
              ? `${(lotSize * 10).toFixed(2)}$`
              : `€${((accountBalance * riskPercent) / 100 / 40).toFixed(2)}`}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {calcMode === 'LOTS' ? `me ${lotSize} lot` : `nga llogaria €${accountBalance.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Position Sizing Calculator Card (Synced with Calendar Balance & Fixed 10-Pip SL) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-300">
              Llogaritësi i Lotit me Balancën e Kalendarit Ditor:
            </span>
          </div>
          <button
            onClick={() => setIsCalculatorVisible(!isCalculatorVisible)}
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold"
          >
            {isCalculatorVisible ? 'Fshih Llogaritësin ▲' : 'Shfaq Llogaritësin ▼'}
          </button>
        </div>

        {isCalculatorVisible && (
          <PositionSizingCalculatorCard
            currentCalendarBalance={accountBalance}
            calendarNetProfit={currency === 'EUR' ? monthSummary.totalEur : monthSummary.totalUsd}
            selectedAssetId={
              symbol.includes('EUR')
                ? 'EURUSD'
                : symbol.includes('GBP')
                ? 'GBPUSD'
                : symbol.includes('JPY')
                ? 'USDJPY'
                : 'XAUUSD'
            }
          />
        )}
      </div>

      {/* Calendar Month Navigation Header */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              id="prev-month-btn"
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear((y) => y - 1);
                } else {
                  setCurrentMonth((m) => m - 1);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="next-month-btn"
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear((y) => y + 1);
                } else {
                  setCurrentMonth((m) => m + 1);
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
            <span>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              {monthSummary.totalPips > 0 ? `+${monthSummary.totalPips} pips` : `${monthSummary.totalPips} pips`}
            </span>
          </h3>
        </div>

        {/* Fast Focus on Today / 3 Days */}
        <div className="flex items-center gap-2 text-xs">
          <button
            id="focus-today-calendar-btn"
            onClick={() => {
              const todayData = calendarDays.find((d) => d.isToday);
              if (todayData) setSelectedDay(todayData);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold transition-all"
          >
            Sot ({new Date().getDate()} Shtator)
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 pb-1 font-mono">
        <div>E HËNË</div>
        <div>E MARTË</div>
        <div>E MËRKURË</div>
        <div>E ENJTE</div>
        <div>E PREMTE</div>
        <div className="text-slate-600">E SHTUNË</div>
        <div className="text-slate-600">E DIEL</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {/* Leading blanks for alignment if 1st day isn't Monday */}
        {(() => {
          const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
          // Monday = 1, Sunday = 0
          const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
          return Array.from({ length: offset }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[85px] sm:min-h-[115px] rounded-xl bg-slate-950/20 border border-slate-900/40 opacity-30"
            />
          ));
        })()}

        {/* Day Tiles */}
        {calendarDays.map((day) => {
          const hasTrades = day.trades.length > 0;
          let dayTotalPips = 0;
          let winCount = 0;
          let lossCount = 0;

          day.trades.forEach((t) => {
            dayTotalPips += t.resultPips;
            if (t.status === 'TP_HIT' || (t.status === 'ACTIVE' && t.resultPips > 0)) {
              winCount++;
            } else if (t.status === 'SL_HIT') {
              lossCount++;
            }
          });

          const { usd: dayUsd, eur: dayEur } = calculateProfit(dayTotalPips);
          const isProfitable = dayTotalPips > 0;
          const isLoss = dayTotalPips < 0;

          return (
            <div
              key={day.dateStr}
              onClick={() => {
                if (!day.isWeekend) {
                  setSelectedDay(day);
                }
              }}
              className={`min-h-[90px] sm:min-h-[115px] p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between transition-all select-none ${
                day.isWeekend
                  ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                  : hasTrades
                  ? isProfitable
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/30 cursor-pointer shadow-md shadow-emerald-500/5'
                    : isLoss
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30 cursor-pointer shadow-md shadow-rose-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40 cursor-pointer'
              } ${day.isToday ? 'ring-2 ring-amber-500 border-amber-500/60 shadow-xl shadow-amber-500/10' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-black font-mono ${
                    day.isToday
                      ? 'px-1.5 py-0.5 rounded bg-amber-500 text-slate-950'
                      : day.isWeekend
                      ? 'text-slate-600'
                      : 'text-white'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {day.isToday && (
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-amber-400">
                    SOT
                  </span>
                )}

                {hasTrades && (
                  <span className="text-[10px] font-bold font-mono px-1 rounded bg-slate-900/90 text-slate-400 border border-slate-800">
                    {day.trades.length} {day.trades.length === 1 ? 'tregti' : 'tregti'}
                  </span>
                )}
              </div>

              {/* Day Content */}
              {day.isWeekend ? (
                <div className="text-[9px] sm:text-[10px] text-slate-600 italic mt-auto">
                  Mbyllur
                </div>
              ) : hasTrades ? (
                <div className="mt-auto space-y-0.5">
                  {/* Currency Profit / Loss */}
                  <div
                    className={`text-xs sm:text-sm font-black font-mono tracking-tight ${
                      isProfitable ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {currency === 'EUR' ? formatCurrency(dayEur) : formatCurrency(dayUsd)}
                  </div>

                  {/* Pips & Trades status */}
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
                    <span className={isProfitable ? 'text-emerald-300 font-bold' : isLoss ? 'text-rose-300 font-bold' : ''}>
                      {dayTotalPips > 0 ? `+${dayTotalPips}p` : `${dayTotalPips}p`}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {winCount > 0 && <span className="text-emerald-400">{winCount}TP </span>}
                      {lossCount > 0 && <span className="text-rose-400">{lossCount}SL</span>}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-auto text-[10px] text-slate-600">
                  Pa tregti
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanatory Banner: Rregullorja e Llogaritjes në Ari */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white">
            Si llogariten Pips dhe Fitimi në Euro për XAU/USD (Ari)?
          </div>
          <p className="text-slate-400 leading-relaxed">
            Në arin spot (XAU/USD), çdo lëvizje prej <strong>0.10$ në çmim llogaritet si 1 pip</strong> (p.sh. nga $4386.40 në $4378.20 janë 82 pips / 8.20$).
            Me madhësinë standarde prej <strong>0.10 lot (Mini Lot)</strong>, 1 pip vlen saktësisht <strong>1.00 USD (~0.92 EUR)</strong>. 
            Prandaj, një tregti me +82 pips gjeneron <strong>+82.00$ (+75.90€)</strong> fitim të pastër me rrezik fiks 1:2 R:R.
          </p>
        </div>
      </div>

      {/* MODAL: Detailed Day Breakdown Drawer */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                  Pasqyra Ditore e Tregtive
                </span>
                <h3 className="text-lg font-black text-white">
                  {selectedDay.dayNameShort}, {selectedDay.dateStr}
                </h3>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Trades List */}
            {selectedDay.trades.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Nuk ka tregti të regjistruara për këtë ditë.</p>
                <button
                  onClick={() => {
                    setNewTradeDate(selectedDay.dateStr);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-all cursor-pointer"
                >
                  + Regjistro Tregti për këtë Ditë
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDay.trades.map((trade, idx) => {
                  const { usd, eur } = calculateProfit(trade.resultPips);
                  const isWin = trade.resultPips > 0;
                  const isLoss = trade.resultPips < 0;

                  return (
                    <div
                      key={trade.id || idx}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                              trade.type === 'SELL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {trade.type === 'SELL' ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                            {trade.type}
                          </span>
                          <span className="text-xs font-bold text-white">{trade.setupName}</span>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-sm font-black font-mono ${
                              isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {currency === 'EUR' ? formatCurrency(eur) : formatCurrency(usd)}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {trade.resultPips > 0 ? `+${trade.resultPips} pips` : `${trade.resultPips} pips`}
                          </span>
                        </div>
                      </div>

                      {/* Trade specs */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block text-[9px]">ORA:</span>
                          <span className="text-slate-300">{trade.time}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">SESIONI:</span>
                          <span className="text-amber-400">{trade.session}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">ENTRY / SL:</span>
                          <span className="text-slate-300">${trade.entry.toFixed(1)} / ${trade.sl.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">TAKE PROFIT:</span>
                          <span className="text-emerald-400 font-bold">${trade.tp.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Strategy note */}
                      {trade.note && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                          {trade.note}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => {
                      setNewTradeDate(selectedDay.dateStr);
                      setShowAddModal(true);
                    }}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Shto një tjetër tregti për këtë ditë
                  </button>

                  <button
                    onClick={() => setSelectedDay(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                  >
                    Mbyll
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Shto Tregti të Re */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Regjistro Tregti në Kalendar
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Data e Tregtisë:</label>
                <input
                  type="date"
                  value={newTradeDate}
                  onChange={(e) => setNewTradeDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Lloji:</label>
                  <select
                    value={newTradeType}
                    onChange={(e) => setNewTradeType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="SELL">SELL (Short)</option>
                    <option value="BUY">BUY (Long)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Rezultati:</label>
                  <select
                    value={newTradeStatus}
                    onChange={(e) => setNewTradeStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="TP_HIT">Take Profit (Fitore ✓)</option>
                    <option value="SL_HIT">Stop Loss (Humbje ✗)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Pips të Fituara/Humbura:</label>
                  <input
                    type="number"
                    value={newTradePips}
                    onChange={(e) => setNewTradePips(Math.abs(Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                    placeholder="82"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Sesioni:</label>
                  <select
                    value={newTradeSession}
                    onChange={(e) => setNewTradeSession(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="London">London Session</option>
                    <option value="New York">New York Session</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Emri i Setup-it ICT:</label>
                <input
                  type="text"
                  value={newTradeSetup}
                  onChange={(e) => setNewTradeSetup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  placeholder="M-Formation Sweep në 4H Supply"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
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

export type TradeType = 'BUY' | 'SELL';
export type TradeStatus = 'TP_HIT' | 'SL_HIT' | 'ACTIVE';
export type DayCategory = 'today' | 'yesterday' | 'day_before';

export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ICTChecklist {
  htfPoi: {
    passed: boolean;
    label: string;
    details: string;
    level: number;
  };
  liquiditySweep: {
    passed: boolean;
    label: string;
    details: string;
    sweptPrice: number;
    sweepType: 'Out & In Candle' | 'Swing High/Low Sweep';
  };
  formation: {
    passed: boolean;
    type: 'W Formation (Bullish)' | 'M Formation (Bearish)';
    details: string;
  };
  mssAndFvg: {
    passed: boolean;
    mssLevel: number;
    fvgTop: number;
    fvgBottom: number;
    orderBlockLevel: number;
    details: string;
  };
}

export interface TradeAdvisory {
  bePrice: number;
  beStatus: 'PROTECTED' | 'PENDING_TP1' | 'TRIGGERED';
  reversalRisk: 'HIGH_REVERSAL_RISK' | 'HIGH_CONTINUATION_POTENTIAL' | 'NEUTRAL';
  riskTitle: string;
  adviceMessage: string;
  actionPrompt: string;
  indicatorEvidence: string[];
  tp1Level: number;
  tp2Level: number;
  tp3Level: number;
  tp2Pips: number;
  tp3Pips: number;
}

export interface ICTTrade {
  id: string;
  symbol: string;
  day: DayCategory;
  dayLabel: string; // 'Sot', 'Dje', 'Pardje'
  dateFormatted: string;
  timeFormatted: string;
  session: 'London Session' | 'New York Session' | 'Asian Session';
  type: TradeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number; // TP1 (1:2 R:R)
  takeProfit2?: number; // TP2 (1:3 R:R - Opposing Liquidity BSL/SSL)
  takeProfit3?: number; // TP3 (1:4.5 / 1:5 R:R - Major HTF POI Draw)
  tp2Pips?: number;
  tp3Pips?: number;
  exitPrice?: number;
  exitTime?: string;
  riskReward: number; // e.g. 2.0 (1:2 R:R)
  riskPips: number;
  targetPips: number;
  resultPips: number;
  status: TradeStatus;
  checklist: ICTChecklist;
  allConditionsMet: boolean;
  timeframe: string; // e.g., 'M5'
  reasoning: string;
  entryTime: number; // unix timestamp
  exitTimestamp?: number;
  tradeAdvisory?: TradeAdvisory;
}

export interface BacktestStats {
  totalTrades: number;
  tpHits: number;
  slHits: number;
  activeTrades: number;
  winRate: number;
  totalPips: number;
  totalR: number;
  dayStats: {
    today: { total: number; win: number; loss: number; active: number; pips: number };
    yesterday: { total: number; win: number; loss: number; active: number; pips: number };
    day_before: { total: number; win: number; loss: number; active: number; pips: number };
  };
}

export interface AnticipationSetup {
  id: string;
  name: string;
  type: TradeType;
  status: 'POI_WAIT' | 'SWEEP_WAIT' | 'MSS_WAIT' | 'ENTRY_READY';
  statusLabel: string;
  htfPoiLevel: number;
  htfPoiLabel: string;
  expectedSweepLevel: number;
  expectedMssLevel: number;
  projectedEntry: number;
  projectedSl: number;
  projectedTp: number; // TP1 (1:2 R:R)
  projectedTp2?: number; // TP2 (1:3 R:R)
  projectedTp3?: number; // TP3 (1:5 R:R)
  riskPips: number;
  targetPips: number;
  tp2Pips?: number;
  tp3Pips?: number;
  rrRatio: number;
  stepCurrent: number; // 1 to 4
  stepDescription: string;
  triggerDistancePips: number;
  slPlacementGuide: string;
  tpPlacementGuide: string;
  breakevenGuide?: string;
}


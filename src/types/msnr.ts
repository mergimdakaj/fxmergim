// MSNR LIT Strategy Type Definitions
// Based on "Trade with Abjeed - MSNR Alchemist & Liquidity Inducement Theory (LIT)"

export type MSNRLevelType =
  | 'RBS' // Resistance Becomes Support
  | 'SBR' // Support Becomes Resistance
  | 'OCL' // Open/Close Level (from OHLC)
  | 'QM_BEARISH' // Bearish Quasimodo (High -> Low -> HH -> LL -> Retest Left Shoulder)
  | 'QM_BULLISH' // Bullish Quasimodo (Low -> High -> LL -> HH -> Retest Left Shoulder)
  | 'ENGULFING_OB' // Engulfing x Strong Order Block
  | 'TRENDLINE_SNR'; // Trendline Breakout + SNR Retest

export interface MSNRChecklist {
  htfPoiIdentified: boolean; // M15 POI / Supply or Demand marked
  inducementCreated: boolean; // Minor trap (IDM) formed before true POI
  targetSweepExecuted: boolean; // TS (Target Sweep) took IDM liquidity with long wick
  candleRejectionConfirmed: boolean; // Reversal candlestick / rejection wick into POI
  m1MssConfirmed: boolean; // M1 Market Structure Shift confirms MM reversal
  strict10PipSL: boolean; // SL strictly set at 10 pips from entry
  msnrLevelConfluence: boolean; // Retest aligns with RBS, SBR, QM, or OCL
}

export interface MSNRTrade {
  id: string;
  symbol: string;
  assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
  type: 'BUY' | 'SELL';
  status: 'ACTIVE' | 'PENDING' | 'WIN' | 'LOSS';
  timeframeHTF: '15M' | '1H';
  timeframeLTF: '1M' | '5M';
  
  // Price parameters
  entryPrice: number;
  stopLoss: number; // Strictly 10 pips
  slPips: number; // 10 pips fixed
  takeProfit1: number; // 1:3 R:R (30 pips)
  takeProfit2: number; // 1:5 R:R (50 pips)
  takeProfit3: number; // 1:8+ R:R (80+ pips)
  breakevenPrice: number; // Entry + 1 pip after TP1
  
  // MSNR & LIT Specific Structure Levels
  poiHigh: number; // POI Zone High (M15)
  poiLow: number; // POI Zone Low (M15)
  idmPrice: number; // Inducement Level (Trap)
  tsPrice: number; // Target Sweep Wick Peak
  qmLevel?: number; // Quasimodo Left Shoulder level
  oclLevel?: number; // Open/Close body level
  patternType: MSNRLevelType;
  
  // Metadata & Timestamps
  timestamp: string;
  title: string;
  reason: string;
  checklist: MSNRChecklist;
  pnlPips?: number;
  pnlDollar?: number;
}

export interface MSNRRuleBookSection {
  id: string;
  title: string;
  subTitle: string;
  badge: string;
  description: string;
  englishNotes: string[];
  keyTakeaway: string;
  diagramType: 'ohlc' | 'msnr_levels' | 'trendlines' | 'inducement_flow' | 'ts_rejection' | 'qm_pattern';
}

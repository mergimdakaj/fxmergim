import { MSNRTrade, MSNRRuleBookSection, MSNRLevelType } from '../types/msnr';

export const MSNR_RULES_BOOK: MSNRRuleBookSection[] = [
  {
    id: 'ohlc_foundation',
    title: 'OHLC - The Story of Price & SNR',
    subTitle: 'Understanding the Open, High, Low, Close to mark precise SNR zones',
    badge: 'Foundation',
    description: 'OHLC represents four key price points: O (Open), H (High), L (Low), C (Close). High and Low indicate how far buyers and sellers pushed the price. Close shows which side "won" or controlled the market at the end of the period.',
    englishNotes: [
      'Support usually forms near the previous Low.',
      'Resistance usually forms near the previous High.',
      'Observing the OHLC points helps you clearly see the market decisions.',
      'Conclusion: OHLC is the key to reading the market. Once you understand it, marking SNR zones becomes much more accurate.'
    ],
    keyTakeaway: 'SL 10 PIPS: Fixed strict risk rule applied across all setups.',
    diagramType: 'ohlc',
  },
  {
    id: 'msnr_7_levels',
    title: 'The 7 Key MSNR Levels',
    subTitle: 'Resistance, Support, RBS, SBR, OCL, QM, Engulfing OB',
    badge: 'Core Structure',
    description: 'MSNR identifies high-probability turning points by classifying structural price reactions.',
    englishNotes: [
      '1. Resistance: Previous Highs where selling pressure emerged.',
      '2. Support: Previous Lows where buying pressure emerged.',
      '3. RBS (Resistance Become Support): Broken resistance tested from above as new support for BUY entries.',
      '4. SBR (Support Become Resistance): Broken support tested from below as new resistance for SELL entries.',
      '5. OCL (Open/Close Level): Horizontal level aligned with the real body opens/closes of candlesticks.',
      '6. QM (Quasimodo): Bullish (L -> H -> LL -> HH) and Bearish (H -> L -> HH -> LL) reversal patterns.',
      '7. Engulfing x Strong OB: Institutional order block created after sweeping opposing liquidity with full momentum.'
    ],
    keyTakeaway: 'Quasimodo (QM) and RBS/SBR offer the cleanest structural retests for 10-pip precision entries.',
    diagramType: 'msnr_levels',
  },
  {
    id: 'trendlines_snr',
    title: 'Trendlines Flow & SNR Confluence',
    subTitle: 'Markets move in directions — trendlines reveal flow and reversal timing',
    badge: 'Directional Flow',
    description: 'A trendline is the key to seeing direction and trading with it. In this lesson, learn how to read price direction, find trend-based entry points, and spot early trend reversals.',
    englishNotes: [
      'The market does not move randomly — it follows a clear directional order flow.',
      'Bearish trendlines connect lower highs. A break + pullback to retest trendline with SNR provides explosive continuation.',
      'Bullish trendlines connect higher lows. Retest at confluence with RBS generates high win rate entries.',
      'Use Line Charts to eliminate wick noise and highlight true swing pivots.'
    ],
    keyTakeaway: 'Always look for confluence between a broken Trendline and a horizontal MSNR level.',
    diagramType: 'trendlines',
  },
  {
    id: 'lit_inducement',
    title: 'LIT - Liquidity Inducement Theory',
    subTitle: 'Recognizing market traps and where real institutional money is flowing',
    badge: 'Smart Money Trap',
    description: 'Each BOS (Break of Structure) confirms continuation. Before price reaches the true POI (Point of Interest), the market often creates an Inducement — a trap designed to collect liquidity from early retail traders.',
    englishNotes: [
      'Inducement (IDM) is an obvious minor high or low built before the genuine POI.',
      'Retail traders see IDM as support/resistance and place early orders with stop losses just beyond it.',
      'Market Makers intentionally bait this liquidity pool.',
      'Once early liquidity is collected, price taps into the M15 POI and explodes in the intended direction.'
    ],
    keyTakeaway: 'Never enter on the Inducement! Wait for the Inducement to be SWEPT into the POI.',
    diagramType: 'inducement_flow',
  },
  {
    id: 'ts_target_sweep',
    title: 'TS (Target Sweep) + Rejection Candle',
    subTitle: 'How to confirm institutional entry with wick sweeps and body control',
    badge: 'Sniper Confirmation',
    description: 'TS is the decisive moment when price sweeps the liquidity pool with a prominent wick. Immediately after, a strong rejection candlestick confirms the opposing side has seized control.',
    englishNotes: [
      '1. Wait for TS to happen -> Ensure that liquidity is swept.',
      '2. Observe the price rejection (rejection) -> Ensure that price will not continue beyond.',
      '3. Enter the order according to the HTF trend after M1 MSS (Market Structure Shift) is born.',
      'Looking for a good candle: Strong rejection candle without wick on the opposing side, showing overwhelming momentum.'
    ],
    keyTakeaway: 'TS + Clear Rejection = High-Probability Entry with strictly 10 Pips Stop Loss!',
    diagramType: 'ts_rejection',
  },
  {
    id: 'm15_m1_execution',
    title: 'M15 (POI) > Entry M1 Execution',
    subTitle: 'The dual timeframe mechanism for sniper 10-pip entries',
    badge: 'Execution Rule',
    description: 'Map the battlefield on the M15 timeframe (identify POI and Inducement). Then drop to M1 to execute right when TS and MSS occur.',
    englishNotes: [
      'Step 1 (M15): Locate the Point of Interest (Unmitigated OB / QM / SBR / RBS).',
      'Step 2 (M15): Identify the Inducement (IDM) trap resting right ahead of the POI.',
      'Step 3 (M1): Watch price pierce the IDM (Target Sweep TS) and touch the M15 POI.',
      'Step 4 (M1): Wait for M1 candle rejection and Market Structure Shift (MSS).',
      'Step 5 (Entry): Enter on the retest of the M1 OCL / QM level with strict 10 Pips SL!',
      'Step 6 (Targets): TP1 (1:3 R:R), TP2 (1:5 R:R), TP3 (1:8 R:R). Move to BE (+1p) upon TP1 hit.'
    ],
    keyTakeaway: 'M15 gives the direction and zone; M1 gives the 10-pip precision entry.',
    diagramType: 'qm_pattern',
  },
];

export const INITIAL_MSNR_TRADES: Record<'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY', MSNRTrade[]> = {
  XAUUSD: [
    {
      id: 'msnr-gold-1',
      symbol: 'XAU/USD',
      assetId: 'XAUUSD',
      type: 'SELL',
      status: 'ACTIVE',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 4337.20,
      stopLoss: 4338.20, // 10 pips ($1.00 on gold)
      slPips: 10,
      takeProfit1: 4334.20, // 30 pips (1:3 R:R)
      takeProfit2: 4332.20, // 50 pips (1:5 R:R)
      takeProfit3: 4329.20, // 80 pips (1:8 R:R)
      breakevenPrice: 4337.10,
      poiHigh: 4339.00,
      poiLow: 4337.50,
      idmPrice: 4335.80,
      tsPrice: 4338.60,
      qmLevel: 4337.20,
      oclLevel: 4337.10,
      patternType: 'QM_BEARISH',
      timestamp: 'Sot, 14:15 - M15 POI Retest',
      title: 'M15 Bearish Quasimodo + TS Inducement Sweep',
      reason: 'Price created an Inducement at 4335.80 before the M15 Bearish POI. Aggressive Target Sweep (TS) swept IDM to 4338.60, leaving a long upper wick rejection. M1 MSS confirmed bearish shift. Entry at QM level with strict 10 pips SL.',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 24,
      pnlDollar: 240,
    },
    {
      id: 'msnr-gold-2',
      symbol: 'XAU/USD',
      assetId: 'XAUUSD',
      type: 'BUY',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 4371.20,
      stopLoss: 4370.20, // 10 pips ($1.00)
      slPips: 10,
      takeProfit1: 4374.20, // 30 pips (1:3 R:R)
      takeProfit2: 4376.20, // 50 pips (1:5 R:R)
      takeProfit3: 4379.20, // 80 pips (1:8 R:R)
      breakevenPrice: 4371.30,
      poiHigh: 4372.50,
      poiLow: 4370.50,
      idmPrice: 4373.00,
      tsPrice: 4370.60,
      qmLevel: 4371.20,
      oclLevel: 4371.00,
      patternType: 'RBS',
      timestamp: 'Dje, 10:45 - M15 RBS Demand',
      title: 'RBS (Resistance Become Support) + TS Sweep',
      reason: 'Resistance at 4371.20 was broken with high momentum. Retail formed minor inducement at 4373.00. Institutional TS swept down into the RBS zone, rejected with zero lower wick on the engulfing candle. Full TP2 (+50 pips) hit!',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 50,
      pnlDollar: 500,
    },
    {
      id: 'msnr-gold-3',
      symbol: 'XAU/USD',
      assetId: 'XAUUSD',
      type: 'SELL',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 4394.50,
      stopLoss: 4395.50, // 10 pips
      slPips: 10,
      takeProfit1: 4391.50, // 30 pips
      takeProfit2: 4389.50, // 50 pips
      takeProfit3: 4386.50, // 80 pips
      breakevenPrice: 4394.40,
      poiHigh: 4396.00,
      poiLow: 4394.00,
      idmPrice: 4393.20,
      tsPrice: 4395.20,
      oclLevel: 4394.50,
      patternType: 'OCL',
      timestamp: 'Pardje, 15:30 - M15 OCL Supply',
      title: 'OCL (Open/Close Level) Sweep & Marubozu Reversal',
      reason: 'M15 candle bodies aligned at 4394.50 forming key OCL. Market swept past early buyers with TS wick to 4395.20. Solid bearish candle closed below OCL. TP3 (+80 pips) hit on NY session expansion!',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 80,
      pnlDollar: 800,
    }
  ],
  EURUSD: [
    {
      id: 'msnr-eur-1',
      symbol: 'EUR/USD',
      assetId: 'EURUSD',
      type: 'BUY',
      status: 'ACTIVE',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 1.14760,
      stopLoss: 1.14660, // 10 pips (0.00100)
      slPips: 10,
      takeProfit1: 1.15060, // 30 pips (1:3 R:R)
      takeProfit2: 1.15260, // 50 pips (1:5 R:R)
      takeProfit3: 1.15560, // 80 pips (1:8 R:R)
      breakevenPrice: 1.14770,
      poiHigh: 1.14790,
      poiLow: 1.14680,
      idmPrice: 1.14820,
      tsPrice: 1.14690,
      qmLevel: 1.14760,
      patternType: 'QM_BULLISH',
      timestamp: 'Sot, 11:20 - M15 Bullish QM',
      title: 'Bullish Quasimodo + Inducement Liquidity Cleanout',
      reason: 'Price printed Lower Low into 1.14690 (TS) sweeping retail trendline liquidity, then immediately printed Higher High on M1. Re-test of QM Left Shoulder at 1.14760 with strictly 10 pips SL.',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 24,
      pnlDollar: 240,
    },
    {
      id: 'msnr-eur-2',
      symbol: 'EUR/USD',
      assetId: 'EURUSD',
      type: 'SELL',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 1.15120,
      stopLoss: 1.15220, // 10 pips
      slPips: 10,
      takeProfit1: 1.14820, // 30 pips
      takeProfit2: 1.14620, // 50 pips
      takeProfit3: 1.14320, // 80 pips
      breakevenPrice: 1.15110,
      poiHigh: 1.15200,
      poiLow: 1.15100,
      idmPrice: 1.15040,
      tsPrice: 1.15190,
      oclLevel: 1.15120,
      patternType: 'OCL',
      timestamp: 'Dje, 14:15 - London/NY Overlap Supply',
      title: 'OCL (Open/Close Level) Sweep + Strong Bearish Marubozu',
      reason: 'Key London high swept with wick TS to 1.15190 taking out retail early sellers. M1 MSS created with impulsive displacement. Full +50 pips TP2 hit at London close.',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 50,
      pnlDollar: 500,
    },
    {
      id: 'msnr-eur-3',
      symbol: 'EUR/USD',
      assetId: 'EURUSD',
      type: 'BUY',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 1.08280,
      stopLoss: 1.08180, // 10 pips
      slPips: 10,
      takeProfit1: 1.08580, // 30 pips
      takeProfit2: 1.08780, // 50 pips
      takeProfit3: 1.09080, // 80 pips
      breakevenPrice: 1.08290,
      poiHigh: 1.08320,
      poiLow: 1.08220,
      idmPrice: 1.08350,
      tsPrice: 1.08240,
      patternType: 'RBS',
      timestamp: '16 Shtator, 09:45 - London RBS Demand',
      title: 'RBS (Resistance Become Support) + Asian Sweep',
      reason: 'Asian low swept with single tick wick into M15 RBS. Clean M1 engulfing entry with 10p SL. Hit full TP2 (+50 pips).',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 50,
      pnlDollar: 500,
    }
  ],
  GBPUSD: [
    {
      id: 'msnr-gbp-1',
      symbol: 'GBP/USD',
      assetId: 'GBPUSD',
      type: 'SELL',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 1.29420,
      stopLoss: 1.29520, // 10 pips
      slPips: 10,
      takeProfit1: 1.29120, // 30 pips
      takeProfit2: 1.28920, // 50 pips
      takeProfit3: 1.28620, // 80 pips
      breakevenPrice: 1.29410,
      poiHigh: 1.29550,
      poiLow: 1.29400,
      idmPrice: 1.29330,
      tsPrice: 1.29490,
      patternType: 'SBR',
      timestamp: 'Dje, 13:45 - M15 SBR Resistance',
      title: 'SBR (Support Become Resistance) + IDM Sweep',
      reason: 'Major Asian support at 1.29420 broke down during London open. Price engineered an inducement at 1.29330, swept retail sellers with TS to 1.29490, and collapsed. Full TP2 (+50 pips) hit!',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 50,
      pnlDollar: 500,
    },
    {
      id: 'msnr-gbp-2',
      symbol: 'GBP/USD',
      assetId: 'GBPUSD',
      type: 'BUY',
      status: 'ACTIVE',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 1.29150,
      stopLoss: 1.29050, // 10 pips
      slPips: 10,
      takeProfit1: 1.29450, // 30 pips
      takeProfit2: 1.29650, // 50 pips
      takeProfit3: 1.29950, // 80 pips
      breakevenPrice: 1.29160,
      poiHigh: 1.29220,
      poiLow: 1.29100,
      idmPrice: 1.29250,
      tsPrice: 1.29110,
      qmLevel: 1.29150,
      patternType: 'QM_BULLISH',
      timestamp: 'Sot, 10:15 - London Open Bullish QM',
      title: 'London Bullish Quasimodo + Target Sweep',
      reason: 'Price swept Asian range low into 1.29110. Instant M1 MSS upward. Retest of Quasimodo left shoulder at 1.29150 with 10p SL. Running in profit!',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 26,
      pnlDollar: 260,
    }
  ],
  USDJPY: [
    {
      id: 'msnr-jpy-1',
      symbol: 'USD/JPY',
      assetId: 'USDJPY',
      type: 'BUY',
      status: 'ACTIVE',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 154.600,
      stopLoss: 154.500, // 10 pips (0.100)
      slPips: 10,
      takeProfit1: 154.900, // 30 pips
      takeProfit2: 155.100, // 50 pips
      takeProfit3: 155.400, // 80 pips
      breakevenPrice: 154.610,
      poiHigh: 154.700,
      poiLow: 154.520,
      idmPrice: 154.750,
      tsPrice: 154.530,
      patternType: 'ENGULFING_OB',
      timestamp: 'Sot, 09:10 - Engulfing Demand Retest',
      title: 'Engulfing x Strong Order Block + TS Sweep',
      reason: 'M15 institutional order block marked by massive bullish engulfing candle. Inducement formed at 154.750. TS swept liquidity into the 50% equilibrium of the OB. M1 rejection confirmed.',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 22,
      pnlDollar: 220,
    },
    {
      id: 'msnr-jpy-2',
      symbol: 'USD/JPY',
      assetId: 'USDJPY',
      type: 'SELL',
      status: 'WIN',
      timeframeHTF: '15M',
      timeframeLTF: '1M',
      entryPrice: 155.250,
      stopLoss: 155.350, // 10 pips
      slPips: 10,
      takeProfit1: 154.950, // 30 pips
      takeProfit2: 154.750, // 50 pips
      takeProfit3: 154.450, // 80 pips
      breakevenPrice: 155.240,
      poiHigh: 155.350,
      poiLow: 155.200,
      idmPrice: 155.150,
      tsPrice: 155.320,
      patternType: 'QM_BEARISH',
      timestamp: '15 Shtator, 15:00 - NY Session High Reversal',
      title: 'Bearish Quasimodo + Asian High Liquidity Grab',
      reason: 'USD/JPY swept liquidity over 155.300 with high upper wick. M1 MSS breakdown confirmed sell entry. Full TP2 (+50 pips) hit cleanly.',
      checklist: {
        htfPoiIdentified: true,
        inducementCreated: true,
        targetSweepExecuted: true,
        candleRejectionConfirmed: true,
        m1MssConfirmed: true,
        strict10PipSL: true,
        msnrLevelConfluence: true,
      },
      pnlPips: 50,
      pnlDollar: 500,
    }
  ]
};

// Detajet e Konfirmimit për Skenarët e Radararit (Checklist me Shenjën Nice)
export interface MSNRRadarConfirmationItem {
  id: string;
  name: string;
  confirmed: boolean;
  ruleDetail: string;
}

// Skenarët në Monitorim për MSNR LIT (Anticipation Radar)
export interface MSNRRadarSetup {
  id: string;
  symbol: string;
  assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
  type: 'BUY' | 'SELL';
  patternName: string;
  patternType: MSNRLevelType;
  timeframe: string;
  poiRange: string;
  idmLevel: number;
  expectedEntry: number;
  sl10Pips: number;
  targetTp1: number;
  targetTp2: number;
  targetTp3?: number;
  progressPercent: number; // 25, 50, 75, 95%
  currentStepDescription: string;
  isReadyForEntry: boolean;
  distancePips: number;
  waitingOnlyForEntry?: boolean;
  confirmations?: MSNRRadarConfirmationItem[];
}

export const INITIAL_MSNR_RADAR_SETUPS: MSNRRadarSetup[] = [
  {
    id: 'radar-msnr-gold-active',
    symbol: 'XAU/USD',
    assetId: 'XAUUSD',
    type: 'SELL',
    patternName: 'Bearish Quasimodo + M15 POI Sweep',
    patternType: 'QM_BEARISH',
    timeframe: 'M15 POI > M1 Entry',
    poiRange: '4337.50 - 4339.00',
    idmLevel: 4335.80,
    expectedEntry: 4337.20,
    sl10Pips: 4338.20, // 10 pips strictly ($1.00 on Gold)
    targetTp1: 4334.20, // 1:3 R:R (30 pips)
    targetTp2: 4332.20, // 1:5 R:R (50 pips)
    targetTp3: 4329.20, // 1:8+ R:R (80 pips)
    progressPercent: 75,
    waitingOnlyForEntry: false,
    currentStepDescription: 'M15 Bearish POI në 4337.50 - 4339.00. Çmimi po lëviz drejt IDM 4335.80. Presim Target Sweep (TS) me fitil para hyrjes në 4337.20!',
    isReadyForEntry: false,
    distancePips: 27.0,
    confirmations: [
      {
        id: 'c1',
        name: 'M15 HTF Struktura & POI',
        confirmed: true,
        ruleDetail: 'Zona Bearish POI (4337.50 - 4339.00) e identifikuar në M15 me drejtim të qartë',
      },
      {
        id: 'c2',
        name: 'Kurthi i Likuiditetit (IDM)',
        confirmed: true,
        ruleDetail: 'Inducement u formua në 4335.80 duke bllokuar retail blerësit e hershëm',
      },
      {
        id: 'c3',
        name: 'Target Sweep (TS)',
        confirmed: false,
        ruleDetail: 'Presim që çmimi të marrë likuiditetin me wick në 4338.60 pa mbyllje qiriri sipër',
      },
      {
        id: 'c4',
        name: 'M1 MSS (Market Structure Shift)',
        confirmed: false,
        ruleDetail: 'Në M1 pritet thyerja e strukturës me qiri të plotë marubozu',
      },
      {
        id: 'c5',
        name: 'Rregulli i Hekurt: SL 10 Pips',
        confirmed: true,
        ruleDetail: 'SL është fiks 10 pips në 4338.20 (asnjëherë 20p apo 30p)',
      },
      {
        id: 'c6',
        name: 'Pritja e Prekjes së Hyrjes Sniper',
        confirmed: false,
        ruleDetail: 'Presim prekjen e QM Left Shoulder në 4337.20 pas konfirmimit të TS',
      },
    ],
  },
  {
    id: 'radar-msnr-eur-anticipate',
    symbol: 'EUR/USD',
    assetId: 'EURUSD',
    type: 'BUY',
    patternName: 'Bullish Quasimodo (QM Left Shoulder)',
    patternType: 'QM_BULLISH',
    timeframe: 'M15 POI > M1 Entry',
    poiRange: '1.14620 - 1.14700',
    idmLevel: 1.14780,
    expectedEntry: 1.14650,
    sl10Pips: 1.14550, // 10 pips (0.00100)
    targetTp1: 1.14950, // 1:3 R:R
    targetTp2: 1.15150, // 1:5 R:R
    targetTp3: 1.15450, // 1:8+ R:R
    progressPercent: 80,
    waitingOnlyForEntry: false,
    currentStepDescription: 'M15 Bullish POI në 1.14620 - 1.14700. Çmimi po afrohet drejt zonës Demand me SL fiks 10 pips.',
    isReadyForEntry: false,
    distancePips: 11.0,
    confirmations: [
      {
        id: 'c1',
        name: 'M15 HTF Bullish POI',
        confirmed: true,
        ruleDetail: 'Zona institucionale Bullish Demand në 1.14620 - 1.14700 e konfirmuar',
      },
      {
        id: 'c2',
        name: 'Inducement (IDM) Trap',
        confirmed: true,
        ruleDetail: 'IDM u krijua në 1.14780 duke futur retail shitësit në kurth',
      },
      {
        id: 'c3',
        name: 'Target Sweep (TS)',
        confirmed: true,
        ruleDetail: 'Likuiditeti u sweep-ua në 1.14630 duke lënë fitil refuzimi',
      },
      {
        id: 'c4',
        name: 'M1 MSS Reversal',
        confirmed: false,
        ruleDetail: 'Pritet mbyllja e qiririt M1 mbi Higher High',
      },
      {
        id: 'c5',
        name: 'Rregulli i Hekurt: SL 10 Pips',
        confirmed: true,
        ruleDetail: 'SL fiks në 1.14550 (0.00100 nga hyrja, mbrojtje maksimale)',
      },
      {
        id: 'c6',
        name: 'Pritja e Prekjes së Hyrjes Sniper',
        confirmed: false,
        ruleDetail: 'Presim prekjen e 1.14650 në QM Left Shoulder për hyrje!',
      },
    ],
  },
  {
    id: 'radar-msnr-gbp-anticipate',
    symbol: 'GBP/USD',
    assetId: 'GBPUSD',
    type: 'SELL',
    patternName: 'SBR + Asian Range Liquidity Sweep',
    patternType: 'SBR',
    timeframe: 'M15 POI > M1 Entry',
    poiRange: '1.33800 - 1.33920',
    idmLevel: 1.33550,
    expectedEntry: 1.33820,
    sl10Pips: 1.33920, // 10 pips
    targetTp1: 1.33520, // 1:3 R:R
    targetTp2: 1.33320, // 1:5 R:R
    targetTp3: 1.33020, // 1:8+ R:R
    progressPercent: 75,
    waitingOnlyForEntry: false,
    currentStepDescription: 'M15 SBR Rezistenca në 1.33800 - 1.33920. Presim Target Sweep mbi Asian High para hyrjes në 1.33820!',
    isReadyForEntry: false,
    distancePips: 14.0,
    confirmations: [
      {
        id: 'c1',
        name: 'M15 HTF SBR Rezistenca',
        confirmed: true,
        ruleDetail: 'Niveli i mbështetjes së thyer në 1.33820 u shndërrua në rezistencë SBR',
      },
      {
        id: 'c2',
        name: 'Inducement (IDM) Trap',
        confirmed: true,
        ruleDetail: 'Retail shitësit u futën herët në 1.33550 duke krijuar inducement likuiditeti',
      },
      {
        id: 'c3',
        name: 'Target Sweep (TS)',
        confirmed: false,
        ruleDetail: 'Presim sweep të IDM deri në 1.33890',
      },
      {
        id: 'c4',
        name: 'M1 MSS Reversal',
        confirmed: false,
        ruleDetail: 'Në M1 pritet qiri marubozu shitës',
      },
      {
        id: 'c5',
        name: 'Rregulli i Hekurt: SL 10 Pips',
        confirmed: true,
        ruleDetail: 'SL fiks në 1.33920 (10 pips mbi hyrjen 1.33820)',
      },
      {
        id: 'c6',
        name: 'Pritja e Prekjes së Hyrjes Sniper',
        confirmed: false,
        ruleDetail: 'Presim retestin e saktë në 1.33820 për urdhër Sell Limit!',
      },
    ],
  },
  {
    id: 'radar-msnr-jpy-anticipate',
    symbol: 'USD/JPY',
    assetId: 'USDJPY',
    type: 'BUY',
    patternName: 'Engulfing Order Block + Equilibrium Sweep',
    patternType: 'ENGULFING_OB',
    timeframe: 'M15 POI > M1 Entry',
    poiRange: '157.200 - 157.350',
    idmLevel: 157.450,
    expectedEntry: 157.250,
    sl10Pips: 157.150, // 10 pips (0.100)
    targetTp1: 157.550, // 1:3 R:R
    targetTp2: 157.750, // 1:5 R:R
    targetTp3: 158.050, // 1:8+ R:R
    progressPercent: 75,
    waitingOnlyForEntry: false,
    currentStepDescription: 'Engulfing Demand POI në 157.200 - 157.350. Çmimi po korrigjon drejt pikës së hyrjes 157.250 me SL fiks 10 pips.',
    isReadyForEntry: false,
    distancePips: 23.0,
    confirmations: [
      {
        id: 'c1',
        name: 'M15 Engulfing Demand POI',
        confirmed: true,
        ruleDetail: 'Qiriu institutional engulfing formoi zonën në 157.200 - 157.350',
      },
      {
        id: 'c2',
        name: 'Inducement (IDM) Trap',
        confirmed: true,
        ruleDetail: 'IDM u krijua në 157.450 nga blerësit e paduruar',
      },
      {
        id: 'c3',
        name: 'Target Sweep (TS)',
        confirmed: false,
        ruleDetail: 'Presim sweep në 157.220 duke lënë pinbar bullish me vëllim',
      },
      {
        id: 'c4',
        name: 'M1 MSS Reversal',
        confirmed: false,
        ruleDetail: 'M1 pritet të konfirmojë Higher High me absorbim institucional',
      },
      {
        id: 'c5',
        name: 'Rregulli i Hekurt: SL 10 Pips',
        confirmed: true,
        ruleDetail: 'SL fiks në 157.150 (0.100 nga hyrja)',
      },
      {
        id: 'c6',
        name: 'Pritja e Prekjes së Hyrjes Sniper',
        confirmed: false,
        ruleDetail: 'Presim prekjen e nivelit 157.250 për ekzekutim Buy!',
      },
    ],
  },
  {
    id: 'radar-msnr-gold-anticipate',
    symbol: 'XAU/USD',
    assetId: 'XAUUSD',
    type: 'BUY',
    patternName: 'RBS (Resistance Become Support) Retest',
    patternType: 'RBS',
    timeframe: 'M15 POI',
    poiRange: '4328.80 - 4330.20',
    idmLevel: 4331.20,
    expectedEntry: 4329.50,
    sl10Pips: 4328.50, // 10 pips
    targetTp1: 4332.50, // 1:3 R:R
    targetTp2: 4334.50, // 1:5 R:R
    targetTp3: 4337.50, // 1:8+ R:R
    progressPercent: 70,
    waitingOnlyForEntry: false,
    currentStepDescription: 'M15 RBS Demand e lokalizuar në 4328.80 - 4330.20. Presim pastrimin e likuiditetit (TS) në 4329.50 para futjes në blerje me SL 10 pips!',
    isReadyForEntry: false,
    distancePips: 50.0,
    confirmations: [
      {
        id: 'c1',
        name: 'M15 HTF Rezistenca e Thyer (RBS)',
        confirmed: true,
        ruleDetail: 'Rezistenca u thye me impuls dhe u shënua si RBS Demand',
      },
      {
        id: 'c2',
        name: 'Inducement (IDM) në Krijim',
        confirmed: true,
        ruleDetail: 'Inducement i identifikuar në 4331.20',
      },
      {
        id: 'c3',
        name: 'Target Sweep (TS)',
        confirmed: false,
        ruleDetail: 'Çmimi ende nuk ka bërë sweep me wick poshtë IDM',
      },
      {
        id: 'c4',
        name: 'M1 MSS',
        confirmed: false,
        ruleDetail: 'Pritet formimi pas goditjes së zonës RBS',
      },
      {
        id: 'c5',
        name: 'Rregulli i Hekurt: SL 10 Pips',
        confirmed: true,
        ruleDetail: 'Llogaritur në 4328.50',
      },
      {
        id: 'c6',
        name: 'Pritja e Prekjes së Hyrjes',
        confirmed: false,
        ruleDetail: 'Pritet pas realizimit të TS dhe MSS',
      },
    ],
  }
];

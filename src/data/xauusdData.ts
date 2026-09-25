import { Candle, ICTTrade, BacktestStats } from '../types/trading';
import { syncTradeDynamicDates } from '../utils/dateUtils';

// Base timestamps for the 3 days (Pardje: Sep 16, Dje: Sep 17, Sot: Sep 18, 2026)
// Using 5-minute intervals (300 seconds)
const SEP_16_START = Math.floor(new Date('2026-09-16T00:00:00Z').getTime() / 1000);
const SEP_17_START = Math.floor(new Date('2026-09-17T00:00:00Z').getTime() / 1000);
const SEP_18_START = Math.floor(new Date('2026-09-18T00:00:00Z').getTime() / 1000);

export function generateCandles(): { candles: Candle[]; trades: ICTTrade[] } {
  const candles: Candle[] = [];
  
  // Helper to push a series of candles
  let currentTime = SEP_16_START;
  let currentPrice = 4378.40;

  function addCandle(open: number, high: number, low: number, close: number, volume = 1200) {
    candles.push({
      time: currentTime,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
    currentTime += 300; // 5m candle
  }

  // Segment helper to generate gentle drift
  function generateTrend(steps: number, targetEnd: number, volatility = 1.2) {
    const stepDiff = (targetEnd - currentPrice) / steps;
    for (let i = 0; i < steps; i++) {
      const open = currentPrice;
      const noise = (Math.sin(i * 0.7) + (Math.random() - 0.48)) * volatility;
      const close = open + stepDiff + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.8) + 0.3;
      const low = Math.min(open, close) - Math.abs(noise * 0.8) - 0.3;
      addCandle(open, high, low, close, Math.floor(800 + Math.random() * 800));
      currentPrice = close;
    }
  }

  // ==========================================
  // DAY 1: PARDJE (2026-09-16)
  // ==========================================
  // Asian Range: 4378.00 - 4384.00
  generateTrend(36, 4382.50, 0.9); // 00:00 to 03:00 UTC

  // Consolidation into London Pre-market (03:00 - 07:00 UTC)
  generateTrend(48, 4386.00, 1.1);

  // TRADE 1 (Pardje London Open - Bullish W Formation):
  // 1. HTF POI: 4H Demand at 4375.00
  // 2. Liquidity Sweep: Price drops at 07:30 to 4374.20, creating leg 1.
  // Pulls back to 4378.50.
  // 3. Leg 2 sweeps down to 4372.80 (sweeping leg 1 & taking out liquidity with "Out & In candle").
  // 4. MSS + FVG: Explosive 5m candle up through 4379.50 breaking swing high, creating FVG [4376.20 - 4378.00].
  // 5. Entry at 08:25 on FVG retest at 4377.50. SL = 4371.80 (57 pips). TP = 4388.90 (1:2 RR).
  const pardjeTrade1Time = currentTime + (12 * 300);

  // Draw Leg 1 of W
  generateTrend(6, 4374.20, 1.5);
  // Pullback center of W
  generateTrend(5, 4378.80, 1.2);
  // Leg 2 Sweep (Out & In candle)
  addCandle(4377.50, 4377.80, 4372.50, 4374.60, 2800); // Sweep candle
  addCandle(4374.60, 4379.20, 4374.00, 4378.90, 3200); // Immediate rejection back inside (Out & In)
  // MSS Displacement candle creating FVG
  addCandle(4378.90, 4383.50, 4378.50, 4383.10, 4500); // MSS candle
  // FVG Retest & Entry candle
  addCandle(4383.10, 4383.40, 4377.20, 4379.00, 2400); // Retest tap into 4377.50
  
  // Follow-through towards TP (hits 4389.50)
  generateTrend(18, 4390.50, 1.4); // Hits TP 4388.90!

  // NY Session Pardje - Trade 2 (Bearish M Formation at NY Open 13:30 UTC):
  // Price pushes to HTF 1H Supply zone at 4396.00
  generateTrend(40, 4394.00, 1.5);
  // Leg 1 of M high: 4395.50
  generateTrend(4, 4395.50, 0.8);
  // Center dip: 4391.00
  generateTrend(4, 4391.20, 0.9);
  // Leg 2 Sweep (takes out 4395.50 liquidity to 4397.20 with wicked exhaustion)
  addCandle(4392.50, 4397.20, 4392.00, 4395.10, 3100); // Sweep high
  addCandle(4395.10, 4395.40, 4388.20, 4388.80, 4800); // MSS impulse downwards breaking 4391.00
  // FVG created at 4392.50 - 4394.20.
  // Entry at retest of 4393.40. SL = 4398.00. TP = 4384.20 (1:2 RR).
  const pardjeTrade2Time = currentTime;
  addCandle(4388.80, 4393.60, 4387.90, 4390.20, 2600); // Retest entry!
  // Price sinks smoothly into NY afternoon target
  generateTrend(22, 4383.00, 1.4); // Hits TP 4384.20!

  // Remaining evening drift
  generateTrend(50, 4385.50, 1.0);

  // ==========================================
  // DAY 2: DJE (2026-09-17)
  // ==========================================
  // Asian Session steady range (4384.00 - 4389.00)
  currentTime = SEP_17_START;
  currentPrice = 4385.50;
  generateTrend(36, 4387.20, 0.8);

  // London Session Dje (07:30 - 11:00 UTC) - Trade 3 (Bearish M Formation):
  // HTF POI: 4H Supply at 4398.00.
  generateTrend(36, 4397.50, 1.6);
  // Leg 1 top: 4397.80
  addCandle(4396.50, 4398.00, 4394.00, 4394.80, 2200);
  // Small pullback: 4392.80
  generateTrend(4, 4392.80, 0.8);
  // Leg 2 of M: Sweeps leg 1 high up to 4399.40 (Fakeout into Supply OB)
  addCandle(4393.50, 4399.40, 4393.00, 4397.60, 3400); // Sweep
  // MSS Downwards: Closes below 4392.80
  addCandle(4397.60, 4397.80, 4390.50, 4391.20, 4600); // MSS displacement
  // FVG created: 4394.00 - 4396.00. Entry at 4394.80. SL = 4400.20 (54 pips). TP = 4384.00 (108 pips, 1:2).
  const djeTrade1Time = currentTime;
  addCandle(4391.20, 4395.20, 4390.80, 4392.00, 2300); // Retest tap into FVG
  // Drops hard towards TP:
  generateTrend(24, 4383.50, 1.5); // Hits TP 4384.00!

  // NY Session Dje (13:30 - 16:00 UTC) - Trade 4 (Bullish setup that hit Stop Loss on news volatility):
  generateTrend(20, 4380.00, 1.8);
  // Price attempts W formation at 4377.00 demand
  addCandle(4380.00, 4380.50, 4376.80, 4377.50, 2100); // Leg 1
  addCandle(4377.50, 4379.80, 4377.00, 4379.20, 1800);
  addCandle(4379.20, 4379.50, 4375.40, 4376.80, 3100); // Leg 2 sweep
  addCandle(4376.80, 4381.50, 4376.50, 4381.00, 3900); // MSS candle
  const djeTrade2Time = currentTime;
  addCandle(4381.00, 4381.20, 4378.20, 4379.00, 2500); // Retest entry at 4378.80. SL = 4374.80. TP = 4386.80.
  // Sudden news flash / heavy sell volume breaks lower, hitting SL at 4374.80
  addCandle(4379.00, 4379.40, 4373.50, 4374.00, 5200); // SL hit!
  generateTrend(16, 4370.00, 2.0);

  // Late NY recovery
  generateTrend(40, 4378.00, 1.1);

  // ==========================================
  // DAY 3: SOT (2026-09-18 - TODAY!)
  // ==========================================
  // Asian Session builds liquidity above 4386.00 and below 4374.00
  currentTime = SEP_18_START;
  currentPrice = 4377.50;
  generateTrend(36, 4382.00, 0.9);

  // London Session SOT (07:00 - 10:00 UTC) - Trade 5 (Bullish W Formation):
  // 1. HTF POI: 1H Demand zone at 4372.00.
  // 2. Liquidity Sweep: Price sweeps PDL (Previous Day Low) down to 4371.50.
  // 3. W Formation: Leg 1 at 4372.50, slight bump, then leg 2 sweeps to 4370.80 with Out & In candle.
  // 4. MSS + FVG: Powerful green displacement candle above 4375.50 creating FVG [4373.00 - 4374.80].
  // 5. Entry at 4374.20. SL = 4369.80. TP = 4383.00 (1:2 RR).
  generateTrend(20, 4373.00, 1.3);
  addCandle(4373.00, 4373.50, 4371.80, 4372.20, 2600); // Leg 1
  addCandle(4372.20, 4374.60, 4372.00, 4374.20, 1900); // Center
  addCandle(4374.20, 4374.40, 4370.50, 4372.00, 3800); // Leg 2 sweep (Out & In)
  addCandle(4372.00, 4377.80, 4371.80, 4377.20, 5100); // MSS impulse + FVG
  const sotTrade1Time = currentTime;
  addCandle(4377.20, 4377.50, 4373.80, 4375.00, 2800); // Entry tap at 4374.20!
  // Price rallies and hits TP 4383.00!
  generateTrend(20, 4384.50, 1.4);

  // New York Session SOT (13:30 - Current Time ~ 15:30 UTC):
  // Trade 6 (Bearish M Formation at HTF 4H Order Block 4388.00):
  // Price pushes up into Supply at 4388.50.
  // Leg 1 of M: 4388.00.
  // Pullback to 4384.50.
  // Leg 2 sweeps high to 4389.60 (sweeping Buyside Liquidity $$$).
  // MSS drops hard breaking 4384.50 to 4382.00, leaving FVG [4385.50 - 4387.20].
  // Retest entry at 4386.40. SL = 4390.50. TP = 4378.20 (1:2 RR).
  generateTrend(18, 4387.50, 1.2);
  addCandle(4387.50, 4388.60, 4385.00, 4385.50, 2400); // Leg 1
  generateTrend(3, 4384.20, 0.7); // Center dip
  addCandle(4384.80, 4389.80, 4384.50, 4388.20, 3600); // Leg 2 Sweep ($$$ taken out)
  addCandle(4388.20, 4388.50, 4381.80, 4382.40, 4900); // MSS break below 4384.20
  const sotTrade2Time = currentTime;
  addCandle(4382.40, 4386.80, 4382.00, 4385.00, 2700); // Retest tap entry at 4386.40!
  
  // Currently live running towards TP! Sits right around 4379.20 (matching live TradingView)
  generateTrend(8, 4379.20, 0.4);

  // Now create the explicit ICTTrade instances with the strict 4-step checklist
  const trades: ICTTrade[] = [
    {
      id: 'trade-pardje-1',
      symbol: 'XAU/USD',
      day: 'day_before',
      dayLabel: 'Pardje (16 Shtator)',
      dateFormatted: '16 Shtator 2026',
      timeFormatted: '08:25 UTC',
      session: 'London Session',
      type: 'BUY',
      entryPrice: 4377.50,
      stopLoss: 4371.80,
      takeProfit: 4388.90,
      exitPrice: 4388.90,
      exitTime: '10:05 UTC',
      riskReward: 2.0,
      riskPips: 57,
      targetPips: 114,
      resultPips: 114,
      status: 'TP_HIT',
      allConditionsMet: true,
      timeframe: 'M5 (Aligns me 1H IRL)',
      reasoning: 'Perfekt W Formation në Zonën HTF 4H Demand (4375.00). Sweep me qiri Out & In, MSS me FVG 4376.20-4378.00. Retest i OB dhe shkoi drejt në TP 4388.90 (+114 pips).',
      entryTime: pardjeTrade1Time,
      exitTimestamp: pardjeTrade1Time + 20 * 300,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Çmimi brenda zonës 4H Bullish Order Block / Demand në 4375.00',
          level: 4375.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Swept liquidity e ulët me qiri "Out & In" duke marrë stopet në 4372.80',
          sweptPrice: 4372.80,
          sweepType: 'Out & In Candle',
        },
        formation: {
          passed: true,
          type: 'W Formation (Bullish)',
          details: 'W formation e rregullt: këmba e dytë sweepon këmbën e parë brenda zonës HTF',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4379.50,
          fvgTop: 4378.00,
          fvgBottom: 4376.20,
          orderBlockLevel: 4377.50,
          details: 'MSS mbi 4379.50 me impuls të pastër dhe FVG imbalance të pambuluar',
        },
      },
    },
    {
      id: 'trade-pardje-2',
      symbol: 'XAU/USD',
      day: 'day_before',
      dayLabel: 'Pardje (16 Shtator)',
      dateFormatted: '16 Shtator 2026',
      timeFormatted: '14:15 UTC',
      session: 'New York Session',
      type: 'SELL',
      entryPrice: 4393.40,
      stopLoss: 4398.00,
      takeProfit: 4384.20,
      exitPrice: 4384.20,
      exitTime: '16:00 UTC',
      riskReward: 2.0,
      riskPips: 46,
      targetPips: 92,
      resultPips: 92,
      status: 'TP_HIT',
      allConditionsMet: true,
      timeframe: 'M5 (Aligns me 1H Supply)',
      reasoning: 'M Formation në HTF 1H Supply. Këmba e dytë mori likuiditetin e lartë ($$$) në 4397.20. MSS poshtë me FVG. Retest entry dhe goditi TP 4384.20 (+92 pips).',
      entryTime: pardjeTrade2Time,
      exitTimestamp: pardjeTrade2Time + 21 * 300,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Çmimi goditi 1H Bearish Supply zone në 4396.00',
          level: 4396.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Swept Buyside Liquidity ($$$) mbi 4395.50 duke krijuar majë në 4397.20',
          sweptPrice: 4397.20,
          sweepType: 'Swing High/Low Sweep',
        },
        formation: {
          passed: true,
          type: 'M Formation (Bearish)',
          details: 'M Formation klasik: këmba e dytë sweepoi këmbën e parë në zonë',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4391.00,
          fvgTop: 4394.20,
          fvgBottom: 4392.50,
          orderBlockLevel: 4393.40,
          details: 'MSS i fuqishëm me thyerje të 4391.00 dhe FVG e qartë midis qirinjve 1 dhe 3',
        },
      },
    },
    {
      id: 'trade-dje-1',
      symbol: 'XAU/USD',
      day: 'yesterday',
      dayLabel: 'Dje (17 Shtator)',
      dateFormatted: '17 Shtator 2026',
      timeFormatted: '09:10 UTC',
      session: 'London Session',
      type: 'SELL',
      entryPrice: 4394.80,
      stopLoss: 4400.20,
      takeProfit: 4384.00,
      exitPrice: 4384.00,
      exitTime: '11:15 UTC',
      riskReward: 2.0,
      riskPips: 54,
      targetPips: 108,
      resultPips: 108,
      status: 'TP_HIT',
      allConditionsMet: true,
      timeframe: 'M5 (Aligns me 4H IRL)',
      reasoning: 'Bearish Orderblock Retest me Significant High Fake Out në 4H Supply (4398.00). Sweep i 4398.00 deri në 4399.40, MSS poshtë me FVG. Rënie e menjëhershme në TP 4384.00 (+108 pips).',
      entryTime: djeTrade1Time,
      exitTimestamp: djeTrade1Time + 25 * 300,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Çmimi brenda zonës 4H Supply / Bearish Order Block në 4398.00',
          level: 4398.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Fakeout dhe sweep i majës së ditës duke arritur 4399.40 me wick të gjatë',
          sweptPrice: 4399.40,
          sweepType: 'Swing High/Low Sweep',
        },
        formation: {
          passed: true,
          type: 'M Formation (Bearish)',
          details: 'M Formation brenda HTF IRL sipas rregullores së fotos',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4392.80,
          fvgTop: 4396.00,
          fvgBottom: 4394.00,
          orderBlockLevel: 4394.80,
          details: 'Thyerje MSS në 4392.80 me FVG bearish dhe Order Block të vlefshëm',
        },
      },
    },
    {
      id: 'trade-dje-2',
      symbol: 'XAU/USD',
      day: 'yesterday',
      dayLabel: 'Dje (17 Shtator)',
      dateFormatted: '17 Shtator 2026',
      timeFormatted: '14:35 UTC',
      session: 'New York Session',
      type: 'BUY',
      entryPrice: 4378.80,
      stopLoss: 4374.80,
      takeProfit: 4386.80,
      exitPrice: 4374.80,
      exitTime: '15:05 UTC',
      riskReward: 2.0,
      riskPips: 40,
      targetPips: 80,
      resultPips: -40,
      status: 'SL_HIT',
      allConditionsMet: true,
      timeframe: 'M5',
      reasoning: 'U plotësuan të 4 kushtet (W pattern, sweep, MSS në 4377.00), mirëpo lajmet makroekonomike të orës 15:00 UTC shkaktuan shitje masive duke kapur Stop Loss (-40 pips). Menaxhimi i rrezikut 1:2 mbrojti llogarinë.',
      entryTime: djeTrade2Time,
      exitTimestamp: djeTrade2Time + 6 * 300,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Tepricë kërkese në 1H Demand zone 4377.00',
          level: 4377.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Sweep i low-it të mëparshëm deri në 4375.40',
          sweptPrice: 4375.40,
          sweepType: 'Swing High/Low Sweep',
        },
        formation: {
          passed: true,
          type: 'W Formation (Bullish)',
          details: 'Formacion W fillestar në M5',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4379.80,
          fvgTop: 4379.20,
          fvgBottom: 4378.00,
          orderBlockLevel: 4378.80,
          details: 'Zhvendosje fillestare MSS me FVG mikro, por u thye nga presioni i lajmeve',
        },
      },
    },
    {
      id: 'trade-sot-1',
      symbol: 'XAU/USD',
      day: 'today',
      dayLabel: 'Sot (21 Shtator)',
      dateFormatted: '21 Shtator 2026',
      timeFormatted: '08:15 UTC',
      session: 'London Session',
      type: 'BUY',
      entryPrice: 4374.20,
      stopLoss: 4369.80,
      takeProfit: 4383.00,
      exitPrice: 4383.00,
      exitTime: '10:10 UTC',
      riskReward: 2.0,
      riskPips: 44,
      targetPips: 88,
      resultPips: 88,
      status: 'TP_HIT',
      allConditionsMet: true,
      timeframe: 'M5 (Aligns me 1H IRL)',
      reasoning: 'Setup perfekt i librit: Sweep i PDL (Previous Day Low) me "Out & In Candle" në 4370.80. Formacion W me këmbë të dytë më të thellë. MSS mbi 4375.50 me FVG të gjerë. Retest i saktë në 4374.20 dhe arriti në TP 4383.00 (+88 pips).',
      entryTime: sotTrade1Time,
      exitTimestamp: sotTrade1Time + 23 * 300,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Çmimi u zhyt në 1H Demand zone / PDL në 4372.00',
          level: 4372.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Sweep i qartë me "Out & In Candle": mbyllje nën swing low dhe kthim i menjëhershëm brenda',
          sweptPrice: 4370.80,
          sweepType: 'Out & In Candle',
        },
        formation: {
          passed: true,
          type: 'W Formation (Bullish)',
          details: 'W formation ideale ku këmba e dytë merr likuiditetin para shpërthimit',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4375.50,
          fvgTop: 4374.80,
          fvgBottom: 4373.00,
          orderBlockLevel: 4374.20,
          details: 'MSS i fuqishëm me FVG të konfirmuar dhe Order Block me wick sweep',
        },
      },
    },
    {
      id: 'trade-sot-2',
      symbol: 'XAU/USD',
      day: 'today',
      dayLabel: 'Sot (21 Shtator)',
      dateFormatted: '21 Shtator 2026',
      timeFormatted: '14:20 UTC',
      session: 'New York Session',
      type: 'SELL',
      entryPrice: 4386.40,
      stopLoss: 4390.50,
      takeProfit: 4378.20,
      riskReward: 2.0,
      riskPips: 41,
      targetPips: 82,
      resultPips: 72, // Currently floating in profit +72 pips (price around 4379.20)
      status: 'ACTIVE',
      allConditionsMet: true,
      timeframe: 'M5 (Aligns me 4H Supply)',
      reasoning: 'M Formation në 4H Supply (4388.00). Këmba e dytë sweepoi Buyside Liquidity ($$$) në 4389.60. MSS i fuqishëm poshtë duke thyer 4384.20 me FVG. Hyrja në retest 4386.40, aktualisht në fitim aktiv (+72 pips) me çmim në $4379 drejt TP 4378.20.',
      entryTime: sotTrade2Time,
      checklist: {
        htfPoi: {
          passed: true,
          label: 'HTF POI (Point of Interest)',
          details: 'Çmimi brenda zonës 4H Supply në 4388.00',
          level: 4388.00,
        },
        liquiditySweep: {
          passed: true,
          label: 'Liquidity Sweep',
          details: 'Swept Buyside Liquidity ($$$) mbi 4388.60 me wick në 4389.60',
          sweptPrice: 4389.60,
          sweepType: 'Swing High/Low Sweep',
        },
        formation: {
          passed: true,
          type: 'M Formation (Bearish)',
          details: 'M Formation i konfirmuar në HTF IRL sipas fotografisë 5 & 6',
        },
        mssAndFvg: {
          passed: true,
          mssLevel: 4384.20,
          fvgTop: 4387.20,
          fvgBottom: 4385.50,
          orderBlockLevel: 4386.40,
          details: 'MSS me FVG imbalance të dukshme (3-candle sequence) dhe Order Block të vlefshëm',
        },
      },
    },
  ];

  return { candles, trades: syncTradeDynamicDates(trades) };
}

export function computeStats(trades: ICTTrade[]): BacktestStats {
  const tpHits = trades.filter((t) => t.status === 'TP_HIT').length;
  const slHits = trades.filter((t) => t.status === 'SL_HIT').length;
  const activeTrades = trades.filter((t) => t.status === 'ACTIVE').length;
  const closedTrades = tpHits + slHits;
  const winRate = closedTrades > 0 ? Math.round((tpHits / closedTrades) * 100) : 0;
  
  const totalPips = trades.reduce((sum, t) => sum + t.resultPips, 0);
  const totalR = Number((tpHits * 2 - slHits * 1).toFixed(1));

  const filterDay = (d: string) => trades.filter((t) => t.day === d);
  const dayStats = {
    today: {
      total: filterDay('today').length,
      win: filterDay('today').filter((t) => t.status === 'TP_HIT').length,
      loss: filterDay('today').filter((t) => t.status === 'SL_HIT').length,
      active: filterDay('today').filter((t) => t.status === 'ACTIVE').length,
      pips: filterDay('today').reduce((s, t) => s + t.resultPips, 0),
    },
    yesterday: {
      total: filterDay('yesterday').length,
      win: filterDay('yesterday').filter((t) => t.status === 'TP_HIT').length,
      loss: filterDay('yesterday').filter((t) => t.status === 'SL_HIT').length,
      active: filterDay('yesterday').filter((t) => t.status === 'ACTIVE').length,
      pips: filterDay('yesterday').reduce((s, t) => s + t.resultPips, 0),
    },
    day_before: {
      total: filterDay('day_before').length,
      win: filterDay('day_before').filter((t) => t.status === 'TP_HIT').length,
      loss: filterDay('day_before').filter((t) => t.status === 'SL_HIT').length,
      active: filterDay('day_before').filter((t) => t.status === 'ACTIVE').length,
      pips: filterDay('day_before').reduce((s, t) => s + t.resultPips, 0),
    },
  };

  return {
    totalTrades: trades.length,
    tpHits,
    slHits,
    activeTrades,
    winRate,
    totalPips,
    totalR,
    dayStats,
  };
}

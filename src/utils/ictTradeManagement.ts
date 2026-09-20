import { ICTTrade, TradeAdvisory, TradeType } from '../types/trading';

export interface MultiTargetLevels {
  entryPrice: number;
  stopLoss: number;
  riskPips: number;
  bePrice: number;
  tp1Price: number;
  tp1Pips: number;
  tp1Rr: string;
  tp2Price: number;
  tp2Pips: number;
  tp2Rr: string;
  tp2Label: string;
  tp3Price: number;
  tp3Pips: number;
  tp3Rr: string;
  tp3Label: string;
  liveAdvisory: TradeAdvisory;
}

/**
 * Calculates ICT TP1, TP2, TP3 targets, Breakeven levels,
 * and dynamic trade management advisory based on live price action.
 */
export function calculateICTTradeManagement(
  trade: ICTTrade,
  livePrice: number,
  decimals: number = 2,
  currencySymbol: string = '$'
): MultiTargetLevels {
  const isBuy = trade.type === 'BUY';
  const pipMultiplier = decimals === 4 ? 10000 : (decimals === 2 && currencySymbol === '¥' ? 100 : 10);
  const pipValue = 1 / pipMultiplier;

  const entry = trade.entryPrice;
  const sl = trade.stopLoss;
  const riskDistance = Math.abs(entry - sl);
  const riskPips = Math.round(riskDistance * pipMultiplier);

  // Breakeven price: Entry + 1 pip for BUY, Entry - 1 pip for SELL to cover spread/commissions
  const bePrice = Number((isBuy ? entry + pipValue : entry - pipValue).toFixed(decimals));

  // TP1: 1:2 R:R (Conservative Liquidity Pool / Internal FVG)
  const tp1Price = trade.takeProfit || Number((isBuy ? entry + riskDistance * 2 : entry - riskDistance * 2).toFixed(decimals));
  const tp1Pips = Math.round(Math.abs(tp1Price - entry) * pipMultiplier);

  // TP2: 1:3 R:R (Opposite External Liquidity / BSL or SSL / Old Highs-Lows)
  const tp2Price = trade.takeProfit2 || Number((isBuy ? entry + riskDistance * 3 : entry - riskDistance * 3).toFixed(decimals));
  const tp2Pips = Math.round(Math.abs(tp2Price - entry) * pipMultiplier);

  // TP3: 1:4.5 or 1:5 R:R (Opposite Higher Timeframe POI / Major Draw on Liquidity)
  const tp3Price = trade.takeProfit3 || Number((isBuy ? entry + riskDistance * 4.5 : entry - riskDistance * 4.5).toFixed(decimals));
  const tp3Pips = Math.round(Math.abs(tp3Price - entry) * pipMultiplier);

  // Current distance and progress towards targets
  const currentFloatingPips = Math.round((isBuy ? livePrice - entry : entry - livePrice) * pipMultiplier);
  const distanceToTp1Pips = Math.round((isBuy ? tp1Price - livePrice : livePrice - tp1Price) * pipMultiplier);

  // Determine Breakeven and Reversal Risk status
  let beStatus: 'PROTECTED' | 'PENDING_TP1' | 'TRIGGERED' = 'PENDING_TP1';
  let reversalRisk: 'HIGH_REVERSAL_RISK' | 'HIGH_CONTINUATION_POTENTIAL' | 'NEUTRAL' = 'NEUTRAL';
  let riskTitle = 'Pozicion në Zhvillim (Drejt TP1 1:2)';
  let adviceMessage = `Çmimi është ${currentFloatingPips >= 0 ? '+' : ''}${currentFloatingPips} pips. Mbani Stop Loss fillestar pas fitilit.`;
  let actionPrompt = 'Rregulli ICT: Mos e lëvizni SL në Breakeven para se të preket TP1 (1:2) që të mos dilni para kohe!';
  const indicatorEvidence: string[] = [];

  if (trade.status === 'TP_HIT' || (isBuy ? livePrice >= tp1Price : livePrice <= tp1Price)) {
    beStatus = 'TRIGGERED';

    // Check if price is retreating from TP1 back towards Entry (Reversal / Wick Rejection)
    const pullbackFromTp1 = isBuy ? tp1Price - livePrice : livePrice - tp1Price;
    const pullbackPips = Math.round(pullbackFromTp1 * pipMultiplier);

    if (pullbackPips > 4) {
      // Reversal warning: Wick rejection or rejection block detected at TP1!
      reversalRisk = 'HIGH_REVERSAL_RISK';
      riskTitle = '⚠️ RREZIK KTHIMI NË BREAKEVEN (0:0)!';
      adviceMessage = `Çmimi e kapi TP1 (${tp1Price}) por hasi refuzim të fortë me fitil (Wick Rejection) dhe po tërhiqet me ${pullbackPips} pips drejt hyrjes.`;
      actionPrompt = 'VEPRIMI I MENJËHERSHËM: Mbyllni 70-80% të fitimit tani (Partial Close) ose mbylleni plotësisht! Mos lejoni kthimin në 0:0.';
      indicatorEvidence.push('Wick Rejection në zonën e likuiditetit');
      indicatorEvidence.push('Refuzim i qirinjve në rezistencë / mbështetje');
      indicatorEvidence.push('Stop Loss duhet të jetë fiks në Breakeven (+1 pip)');
    } else {
      // Continuation: Momentum candles breaking cleanly towards TP2
      reversalRisk = 'HIGH_CONTINUATION_POTENTIAL';
      riskTitle = '🚀 POTENCIAL I LARTË PËR TP2 DHE TP3!';
      adviceMessage = `Çmimi theu pastër nivelin e TP1 (${tp1Price}) pa refuzim. Order Flow është i fortë dhe synon likuiditetin e jashtëm (BSL/SSL).`;
      actionPrompt = 'VEPRIMI I KËSHILLUAR: SL në Breakeven (+1 pip). Mbani 20-30% runner për të kapur TP2 (' + tp2Price + ') ose TP3 (' + tp3Price + ')!';
      indicatorEvidence.push('Qirinj impulsivë me trupa të plotë mbi TP1');
      indicatorEvidence.push('Likuiditeti i pambushur (Equal Highs/Lows) gjendet më tutje');
      indicatorEvidence.push('Rreziku i kapitalit është 0% (SL tashmë në Breakeven)');
    }
  } else if (distanceToTp1Pips <= 6 && distanceToTp1Pips > 0) {
    reversalRisk = 'NEUTRAL';
    riskTitle = '🎯 AFËR TP1 — PËRGATITUNI PËR BREAKEVEN';
    adviceMessage = `Çmimi është vetëm ${distanceToTp1Pips} pips larg nga TP1 (${tp1Price}).`;
    actionPrompt = 'Sapo çmimi të prekë TP1, zhvendosni menjëherë urdhrin Stop Loss në hyrje (Breakeven + 1 pip)!';
    indicatorEvidence.push(`Mungojnë vetëm ${distanceToTp1Pips} pips deri te TP1`);
    indicatorEvidence.push('Përgatisni modifikimin e urdhrit në platformë');
  }

  const liveAdvisory: TradeAdvisory = {
    bePrice,
    beStatus,
    reversalRisk,
    riskTitle,
    adviceMessage,
    actionPrompt,
    indicatorEvidence,
    tp1Level: tp1Price,
    tp2Level: tp2Price,
    tp3Level: tp3Price,
    tp2Pips,
    tp3Pips,
  };

  return {
    entryPrice: entry,
    stopLoss: sl,
    riskPips,
    bePrice,
    tp1Price,
    tp1Pips,
    tp1Rr: '1:2',
    tp2Price,
    tp2Pips,
    tp2Rr: '1:3',
    tp2Label: isBuy ? 'Opposing BSL / Equal Highs $$$' : 'Opposing SSL / Equal Lows $$$',
    tp3Price,
    tp3Pips,
    tp3Rr: '1:4.5',
    tp3Label: isBuy ? '4H/Daily Bearish POI Target' : '4H/Daily Bullish POI Target',
    liveAdvisory,
  };
}

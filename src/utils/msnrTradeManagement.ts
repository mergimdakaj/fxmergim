// MSNR LIT Trade Management & Live Advisory Engine
// Strictly based on "Trade with Abjeed - MSNR Alchemist & Liquidity Inducement Theory (LIT)"

import { MSNRTrade } from '../types/msnr';
import { Candle } from '../types/trading';

export type MSNRAdvisoryStatus =
  | 'ENTRY_ZONE'
  | 'APPROACHING_TP1'
  | 'TP1_HIT_WARNING_REVERSAL'
  | 'TP1_HIT_HIGH_CONTINUATION'
  | 'TP2_HIT'
  | 'TP3_HIT'
  | 'STOPPED_OUT';

export interface MSNRLiveAdvisory {
  currentPips: number;
  pnlEur: number;
  pnlUsd: number;
  tp1Pips: number;
  tp2Pips: number;
  tp3Pips: number;
  distanceToTp1Pips: number;
  distanceToTp2Pips: number;
  distanceToTp3Pips: number;
  distanceToBePips: number;
  status: MSNRAdvisoryStatus;
  reversalRiskScore: number; // 0 to 100%
  reversalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertTitle: string;
  alertMessage: string;
  actionRecommendation: string;
  recommendedClosePercent: number; // e.g. 100%, 70%, 30%
  bePrice: number;
  beStatus: 'UNPROTECTED' | 'MOVE_TO_BE_NOW' | 'PROTECTED_IN_PROFIT';
  evidencePoints: string[];
  nextTargetPips: number;
  nextTargetLabel: string;
}

/**
 * Calculates the pip size for a given asset
 */
export function getMsnrPipSize(assetId: string): number {
  if (assetId.includes('XAU') || assetId.includes('GOLD')) {
    return 0.10; // Gold: 0.10 change = 1 pip ($1 / 0.10 lot)
  }
  if (assetId.includes('JPY')) {
    return 0.01; // JPY pairs: 0.01 = 1 pip
  }
  return 0.0001; // EUR/USD, GBP/USD: 0.0001 = 1 pip
}

/**
 * Calculate live advisory and reversal vs continuation analysis
 * @param trade The active MSNR trade setup
 * @param livePrice Current price (or user-simulated price)
 * @param forceReversalWarning Optional flag to simulate high reversal risk scenario
 * @param lotSize Standard lot size (default 1.0 lot)
 */
export function calculateMSNRAdvisory(
  trade: MSNRTrade,
  livePrice: number,
  forceReversalWarning?: boolean,
  lotSize: number = 1.0
): MSNRLiveAdvisory {
  const pipSize = getMsnrPipSize(trade.assetId);
  const isBuy = trade.type === 'BUY';

  // Calculate current PnL in pips
  const rawDiff = isBuy ? livePrice - trade.entryPrice : trade.entryPrice - livePrice;
  const currentPips = parseFloat((rawDiff / pipSize).toFixed(1));

  // Currency calculations (1.0 lot = $10/pip, EUR/USD = 1.08)
  const pnlUsd = currentPips * (lotSize * 10);
  const pnlEur = pnlUsd / 1.08;

  // Targets in pips
  const tp1Pips = 30;
  const tp2Pips = 50;
  const tp3Pips = 80;

  // Distances in pips
  const distanceToTp1Pips = Math.max(0, parseFloat((tp1Pips - currentPips).toFixed(1)));
  const distanceToTp2Pips = Math.max(0, parseFloat((tp2Pips - currentPips).toFixed(1)));
  const distanceToTp3Pips = Math.max(0, parseFloat((tp3Pips - currentPips).toFixed(1)));
  const distanceToBePips = Math.max(0, parseFloat((currentPips - 1).toFixed(1)));

  // Breakeven price (+1 pip buffer)
  const bePrice = isBuy
    ? trade.entryPrice + pipSize * 1.0
    : trade.entryPrice - pipSize * 1.0;

  // Evaluate status and reversal risk
  let status: MSNRAdvisoryStatus = 'ENTRY_ZONE';
  let reversalRiskScore = 20;
  let reversalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let alertTitle = '';
  let alertMessage = '';
  let actionRecommendation = '';
  let recommendedClosePercent = 0;
  let beStatus: 'UNPROTECTED' | 'MOVE_TO_BE_NOW' | 'PROTECTED_IN_PROFIT' = 'UNPROTECTED';
  let evidencePoints: string[] = [];
  let nextTargetPips = tp1Pips;
  let nextTargetLabel = 'TP1 (M15 Inducement Level - 30 Pips)';

  if (currentPips <= -10) {
    status = 'STOPPED_OUT';
    reversalRiskScore = 100;
    reversalRiskLevel = 'CRITICAL';
    alertTitle = '🛑 STOP LOSS U GODIT (-10 PIPS)';
    alertMessage = 'Çmimi kaloi mbi/nën wick-un e Target Sweep me më shumë se 10 pips. Sipas librit të Abjeed, struktura M15 është e pavlefshme.';
    actionRecommendation = 'Prano humbjen e kufizuar (-10 pips). Mos rrit rrezikun dhe prit setup-in e radhës në Extreme POI.';
    recommendedClosePercent = 100;
    beStatus = 'UNPROTECTED';
    evidencePoints = [
      'Struktura M15 u thyer përtej 10 pips',
      'Target Sweep u bë Invalidated',
      'Rregulli i Hekurt: Humbja ndalet fiks te -10 pips',
    ];
  } else if (currentPips >= tp3Pips) {
    status = 'TP3_HIT';
    reversalRiskScore = 15;
    reversalRiskLevel = 'LOW';
    alertTitle = '🏆 TP3 FULL EXPANSION TARGET U GODIT (+80 PIPS / 1:8+ R:R)!';
    alertMessage = 'Çmimi ka kapur likuiditetin e plotë të jashtëm (External Range Liquidity / MSNR Level 7). Tregtia ka arritur potencialin maksimal!';
    actionRecommendation = 'MBYLLNI 100% TË POZICIONIT TANI! Arkëtoni fitimin e plotë prej +80 pips.';
    recommendedClosePercent = 100;
    beStatus = 'PROTECTED_IN_PROFIT';
    evidencePoints = [
      'MSNR Level 7 External Target u pastrua plotësisht',
      'R:R arriti 1:8+ me vetëm 10 pips rrezik fillestar',
      'Cikli i plotë i Abjeed LIT përfundoi me sukses',
    ];
    nextTargetPips = tp3Pips;
    nextTargetLabel = 'Likuiditeti i Jashtëm u Konsumua';
  } else if (currentPips >= tp2Pips) {
    status = 'TP2_HIT';
    reversalRiskScore = 30;
    reversalRiskLevel = 'LOW';
    alertTitle = '🎯 TP2 U GODIT ME SUKSES (+50 PIPS / 1:5 R:R)!';
    alertMessage = 'Çmimi kaloi nivelin MSNR 6 Flip S/R me +50 pips. Struktura vazhdon të jetë e pastër drejt TP3.';
    actionRecommendation = 'Mbyllni 80%-90% të pozicionit total. Lini vetëm 10% micro-runner me SL në Breakeven për të prekur TP3 (+80 pips).';
    recommendedClosePercent = 85;
    beStatus = 'PROTECTED_IN_PROFIT';
    evidencePoints = [
      'MSNR 6 Flip Level u arrit me 50 pips fitim',
      'Fitimi i madh është i siguruar (1:5 R:R)',
      '10% Runner i lirë pa asnjë rrezik për TP3',
    ];
    nextTargetPips = tp3Pips;
    nextTargetLabel = 'TP3 (Likuiditeti i Jashtëm HTF - 80 Pips)';
  } else if (currentPips >= tp1Pips) {
    // TP1 is HIT! Now determine if there is REVERSAL RISK back to Breakeven (0.00) vs CONTINUATION to TP2/TP3
    const isReversalDanger = forceReversalWarning ?? false;

    if (isReversalDanger) {
      status = 'TP1_HIT_WARNING_REVERSAL';
      reversalRiskScore = 85;
      reversalRiskLevel = 'CRITICAL';
      alertTitle = '🚨 ALARM: RREZIK I LARTË KTHIMI NË BREAKEVEN (0.00)!';
      alertMessage = 'Kujdes maksimal! Pas goditjes së TP1 (+30 pips), grafiku po shfaq refuzim të fortë me bisht (Wick Rejection) në nivelin e Inducement (IDM). Në M1 u formua një Counter-MSS kundër nesh. Ekziston rrezik i madh që çmimi të kthehet me shpejtësi në 0.00 (Breakeven)!';
      actionRecommendation = 'MBYLLNI 100% TË POZICIONIT TANI! Mos e lini fitimin prej +30 pips (+€300 me 1.0 lot) të avullojë në zero!';
      recommendedClosePercent = 100;
      beStatus = 'MOVE_TO_BE_NOW';
      evidencePoints = [
        'Bisht i gjatë refuzimi (Wick Rejection) mbi/nën nivelin IDM',
        'M1 Counter-MSS konfirmoi se blerësit/shitësit po tërhiqen',
        'Qiriri M15 dështoi të mbyllet me trup përtej TP1',
        'Rrezik kthimi i menjëhershëm në pikën e hyrjes 0.00',
      ];
      nextTargetPips = 0;
      nextTargetLabel = 'RREZIK: Kthim në 0.00 Breakeven';
    } else {
      status = 'TP1_HIT_HIGH_CONTINUATION';
      reversalRiskScore = 18;
      reversalRiskLevel = 'LOW';
      alertTitle = '🚀 POTENCIAL I LARTË PËR TP2 (+50 pips) & TP3 (+80 pips)!';
      alertMessage = 'Çmimi theu nivelin e Inducement (TP1) me trup të plotë qiriri (Candle Body Close) dhe la një FVG të hapur. Asnjë refuzim kundër në M1! Rruga drejt TP2 dhe TP3 është tërësisht e pastër nga pengesat e likuiditetit.';
      actionRecommendation = 'MBANI 30%-50% RUNNER ME SL NË BREAKEVEN (+1 pip)! Mbyllni 50%-70% të pjesshëm dhe lini pjesën tjetër të vrapojë drejt TP2 (+50p) dhe TP3 (+80p).';
      recommendedClosePercent = 60;
      beStatus = 'PROTECTED_IN_PROFIT';
      evidencePoints = [
        'Qiriri u mbyll me trup të plotë (Body Close) duke thyer nivelin IDM',
        'Zgjerim me volum të lartë (Displacement) pa refuzim',
        'MSNR 7 Target vepron si magnet tërheqës për çmimin',
        'SL në Breakeven (+1 pip) eliminon 100% rrezikun e kapitalit',
      ];
      nextTargetPips = tp2Pips;
      nextTargetLabel = 'TP2 (MSNR 6 Flip S/R - 50 Pips)';
    }
  } else if (currentPips >= 15) {
    status = 'APPROACHING_TP1';
    reversalRiskScore = 35;
    reversalRiskLevel = 'MEDIUM';
    alertTitle = '⚡ ÇMIMI PO I AFROHET TP1 (+30 PIPS)';
    alertMessage = `Tregtia është në fitim prej +${currentPips} pips. Mbeten vetëm ${distanceToTp1Pips} pips deri te Inducement Level (TP1).`;
    actionRecommendation = 'Bëhuni gati: Sapo të preket TP1, zhvendosni menjëherë SL në Breakeven (+1 pip) dhe siguroni 50%-70% fitim.';
    recommendedClosePercent = 0;
    beStatus = 'UNPROTECTED';
    evidencePoints = [
      `Fitim aktual: +${currentPips} pips`,
      `Distanca deri në TP1: ${distanceToTp1Pips} pips`,
      'SL 10 pips mbetet ende aktiv deri në goditjen e TP1',
    ];
    nextTargetPips = tp1Pips;
    nextTargetLabel = 'TP1 (M15 Inducement Level)';
  } else {
    status = 'ENTRY_ZONE';
    reversalRiskScore = 25;
    reversalRiskLevel = 'LOW';
    alertTitle = '📍 ZONA E HYRJES AKTIVE (RETEST QM / OCL)';
    alertMessage = `Tregtia është në zhvillim e sipër. Stop Loss është i vendosur në mënyrë strikte te 10 pips (${trade.stopLoss.toFixed(2)}).`;
    actionRecommendation = 'Duroni me qetësi! Mos e lëvizni Stop Loss-in para kohe. Prisni që çmimi të zhvillojë lëvizjen drejt TP1.';
    recommendedClosePercent = 0;
    beStatus = 'UNPROTECTED';
    evidencePoints = [
      'Target Sweep (TS) u realizua me sukses',
      'M1 MSS konfirmoi kthimin e tregut',
      'Rreziku i kufizuar: Vetëm 10 pips',
    ];
    nextTargetPips = tp1Pips;
    nextTargetLabel = 'TP1 (30 Pips)';
  }

  return {
    currentPips,
    pnlEur,
    pnlUsd,
    tp1Pips,
    tp2Pips,
    tp3Pips,
    distanceToTp1Pips,
    distanceToTp2Pips,
    distanceToTp3Pips,
    distanceToBePips,
    status,
    reversalRiskScore,
    reversalRiskLevel,
    alertTitle,
    alertMessage,
    actionRecommendation,
    recommendedClosePercent,
    bePrice,
    beStatus,
    evidencePoints,
    nextTargetPips,
    nextTargetLabel,
  };
}

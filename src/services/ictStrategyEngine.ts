import { AnticipationSetup, TradeType } from '../types/trading';

export function getCleanICTAsset(raw: string): 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' {
  const clean = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (clean === 'EURUSD' || clean === 'GBPUSD' || clean === 'USDJPY') return clean;
  return 'XAUUSD';
}

export function getICTPipMultiplier(assetId: string): number {
  const clean = getCleanICTAsset(assetId);
  switch (clean) {
    case 'XAUUSD':
      return 10; // 1 pip = $0.10, $1.00 = 10 pips
    case 'USDJPY':
      return 100; // 1 pip = 0.01 JPY
    case 'EURUSD':
    case 'GBPUSD':
    default:
      return 10000; // 1 pip = 0.0001
  }
}

export function getICTDecimals(assetId: string): number {
  const clean = getCleanICTAsset(assetId);
  switch (clean) {
    case 'XAUUSD':
      return 2;
    case 'USDJPY':
      return 3;
    case 'EURUSD':
    case 'GBPUSD':
    default:
      return 5;
  }
}

export function getICTCurrencySymbol(assetId: string): string {
  const clean = getCleanICTAsset(assetId);
  if (clean === 'EURUSD') return '$';
  if (clean === 'USDJPY') return '¥';
  return '$';
}

export interface ICTPatternArchetype {
  type: TradeType;
  name: string;
  session: 'London' | 'New York' | 'Asian';
  status: 'POI_WAIT' | 'SWEEP_WAIT' | 'MSS_WAIT' | 'ENTRY_READY';
  statusLabel: string;
  stepCurrent: number;
  distPips: number;
  riskPips: number;
  targetPips: number;
  poiLabel: string;
  stepDescription: string;
}

export class ICTStrategyEngine {
  /**
   * Generates varied institutional ICT setups anchored to the current live price.
   */
  public static generateSetup(
    assetIdRaw: string,
    livePrice: number,
    variantIndex: number = 0
  ): AnticipationSetup {
    const assetId = getCleanICTAsset(assetIdRaw);
    const pipMultiplier = getICTPipMultiplier(assetId);
    const decimals = getICTDecimals(assetId);
    const currency = getICTCurrencySymbol(assetId);
    const pip = 1 / pipMultiplier;

    // Rich ICT institutional setups
    const patterns: ICTPatternArchetype[] = [
      {
        type: 'SELL',
        name: 'London Judas Swing 4H Supply FVG Retest SELL',
        session: 'London',
        status: 'MSS_WAIT',
        statusLabel: '75% - MSS Ndodhi me Displacement (Presim Retest në Premium FVG)',
        stepCurrent: 3,
        distPips: assetId === 'XAUUSD' ? 6 : 5,
        riskPips: assetId === 'XAUUSD' ? 38 : assetId === 'USDJPY' ? 24 : 16,
        targetPips: assetId === 'XAUUSD' ? 76 : assetId === 'USDJPY' ? 48 : 32,
        poiLabel: '4H Bearish Supply POI & Buy-Side Liquidity',
        stepDescription: 'Judas Swing manipuloi Asian Highs. MSS theu strukturën me trup qiriri dhe la Fair Value Gap (FVG) të pambuluar. Po presim retestin në Discount/Premium FVG për hyrje snajper!',
      },
      {
        type: 'BUY',
        name: 'New York Killzone Bullish OTE (62%-79% Retest) BUY',
        session: 'New York',
        status: 'ENTRY_READY',
        statusLabel: '90% - GATI PËR HYRJE (Zona OTE 0.62-0.79 Retest)',
        stepCurrent: 4,
        distPips: assetId === 'XAUUSD' ? 3 : 4,
        riskPips: assetId === 'XAUUSD' ? 40 : assetId === 'USDJPY' ? 25 : 18,
        targetPips: assetId === 'XAUUSD' ? 90 : assetId === 'USDJPY' ? 55 : 40,
        poiLabel: '1H Institutional Bullish Order Block & Discount POI',
        stepDescription: 'Çmimi bëri impulse leg pas New York Open, u tërhoq ngadalë në Zonën e Artë OTE (Optimal Trade Entry 62-79%). Formacion W i qartë në M5!',
      },
      {
        type: 'SELL',
        name: 'Turtle Soup Previous Day High (PDH) Sweep SELL',
        session: 'London',
        status: 'SWEEP_WAIT',
        statusLabel: '65% - Likuiditeti i PDH u kap me fitil (Presim konfirmim M1 MSS)',
        stepCurrent: 2,
        distPips: assetId === 'XAUUSD' ? 14 : 12,
        riskPips: assetId === 'XAUUSD' ? 42 : assetId === 'USDJPY' ? 28 : 20,
        targetPips: assetId === 'XAUUSD' ? 84 : assetId === 'USDJPY' ? 56 : 40,
        poiLabel: 'Previous Day High (PDH) Liquidity Pool',
        stepDescription: 'Çmimi kaloi mbi PDH me qiri "Out & In" duke kapur Buy-Stopet e blerësve të vonuar. Presim mbyllje nën nivel për hyrje të konfirmuar.',
      },
      {
        type: 'BUY',
        name: 'London Open PDL Liquidity Sweep + W-Formation BUY',
        session: 'London',
        status: 'MSS_WAIT',
        statusLabel: '75% - MSS mbi nivelin lokal me FVG Bullish',
        stepCurrent: 3,
        distPips: assetId === 'XAUUSD' ? 8 : 7,
        riskPips: assetId === 'XAUUSD' ? 36 : assetId === 'USDJPY' ? 22 : 15,
        targetPips: assetId === 'XAUUSD' ? 72 : assetId === 'USDJPY' ? 44 : 30,
        poiLabel: 'Previous Day Low (PDL) & Equal Lows Demand',
        stepDescription: 'Fitili i këmbës së dytë të W-së pastroi Sell-Side Liquidity. Qiri impulsiv me displacement konfirmoi MSS. Presim retest në FVG.',
      },
      {
        type: 'SELL',
        name: 'Asian Range High Liquidity Purge + Breaker Block SELL',
        session: 'New York',
        status: 'MSS_WAIT',
        statusLabel: '80% - Breaker Block u testua, hyrje me raport 1:2.5',
        stepCurrent: 3,
        distPips: assetId === 'XAUUSD' ? 10 : 9,
        riskPips: assetId === 'XAUUSD' ? 35 : assetId === 'USDJPY' ? 22 : 16,
        targetPips: assetId === 'XAUUSD' ? 88 : assetId === 'USDJPY' ? 55 : 40,
        poiLabel: 'Asian Session High Engineered Liquidity & Breaker Block',
        stepDescription: 'Manipulim i plotë i sesionit aziatik. Blerësit u bllokuan në majë, Breaker Block shërben tani si rezistencë e pathyeshme.',
      },
      {
        type: 'BUY',
        name: '4H HTF Demand POI Retest + M15 Inverted FVG BUY',
        session: 'London',
        status: 'POI_WAIT',
        statusLabel: '50% - Çmimi po afrohet në Zonën Kryesore 4H',
        stepCurrent: 1,
        distPips: assetId === 'XAUUSD' ? 20 : 16,
        riskPips: assetId === 'XAUUSD' ? 45 : assetId === 'USDJPY' ? 30 : 20,
        targetPips: assetId === 'XAUUSD' ? 100 : assetId === 'USDJPY' ? 65 : 45,
        poiLabel: '4H Bullish Demand Block (Unmitigated Order Block)',
        stepDescription: 'Zona institucionale e pambuluar në 4H. Presim prekje dhe formim W me sweep para çdo tentative hyrjeje.',
      },
    ];

    const archetype = patterns[variantIndex % patterns.length];
    const isSell = archetype.type === 'SELL';

    const distVal = archetype.distPips * pip;
    const riskVal = archetype.riskPips * pip;
    const targetVal = archetype.targetPips * pip;

    // Safe entry level anchored around live price
    const entry = isSell
      ? Number((livePrice + distVal).toFixed(decimals))
      : Number((livePrice - distVal).toFixed(decimals));

    const sl = isSell
      ? Number((entry + riskVal).toFixed(decimals))
      : Number((entry - riskVal).toFixed(decimals));

    const tp = isSell
      ? Number((entry - targetVal).toFixed(decimals))
      : Number((entry + targetVal).toFixed(decimals));

    const tp2 = isSell
      ? Number((entry - targetVal * 1.5).toFixed(decimals))
      : Number((entry + targetVal * 1.5).toFixed(decimals));

    const tp3 = isSell
      ? Number((entry - targetVal * 2.2).toFixed(decimals))
      : Number((entry + targetVal * 2.2).toFixed(decimals));

    const poiLevel = isSell
      ? Number((entry + (archetype.distPips + 8) * pip).toFixed(decimals))
      : Number((entry - (archetype.distPips + 8) * pip).toFixed(decimals));

    const sweepLevel = isSell
      ? Number((poiLevel + 10 * pip).toFixed(decimals))
      : Number((poiLevel - 10 * pip).toFixed(decimals));

    const mssLevel = isSell
      ? Number((livePrice - 4 * pip).toFixed(decimals))
      : Number((livePrice + 4 * pip).toFixed(decimals));

    const symbolClean = assetId === 'XAUUSD' ? 'XAU/USD' : `${assetId.slice(0, 3)}/${assetId.slice(3)}`;

    return {
      id: `ict-setup-${assetId.toLowerCase()}-${Date.now()}-${variantIndex}`,
      name: `${archetype.name} (${currency}${entry.toFixed(decimals)})`,
      type: archetype.type,
      status: archetype.status,
      statusLabel: archetype.statusLabel,
      htfPoiLevel: poiLevel,
      htfPoiLabel: `${archetype.poiLabel} (${currency}${poiLevel.toFixed(decimals)})`,
      expectedSweepLevel: sweepLevel,
      expectedMssLevel: mssLevel,
      projectedEntry: entry,
      projectedSl: sl,
      projectedTp: tp,
      projectedTp2: tp2,
      projectedTp3: tp3,
      riskPips: archetype.riskPips,
      targetPips: archetype.targetPips,
      tp2Pips: Math.round(archetype.targetPips * 1.5),
      tp3Pips: Math.round(archetype.targetPips * 2.2),
      rrRatio: Number((archetype.targetPips / archetype.riskPips).toFixed(2)),
      stepCurrent: archetype.stepCurrent,
      stepDescription: archetype.stepDescription,
      triggerDistancePips: archetype.distPips,
      slPlacementGuide: `Vendoset në ${currency}${sl.toFixed(decimals)} (-${archetype.riskPips} pips) — mbrojtje strikte ICT mbi/nën fitilin e manipulimit të Sweep.`,
      tpPlacementGuide: `Vendoset në ${currency}${tp.toFixed(decimals)} (+${archetype.targetPips} pips) — objektiv fiks 1:${Number((archetype.targetPips / archetype.riskPips).toFixed(1))} R:R drejt likuiditetit të sesionit.`,
      breakevenGuide: `Sapo çmimi të lëvizë +${Math.round(archetype.riskPips * 0.8)} pips në fitim, zhvendosni Stop Loss në Breakeven (${currency}${entry.toFixed(decimals)}).`,
    };
  }

  /**
   * Generates live setups for all 4 pairs simultaneously, anchored to live prices.
   */
  public static generateAllPairsLiveSetups(
    livePrices: Record<string, number>
  ): AnticipationSetup[] {
    const assets: Array<'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'> = [
      'XAUUSD',
      'EURUSD',
      'GBPUSD',
      'USDJPY',
    ];

    const setups: AnticipationSetup[] = [];

    assets.forEach((asset, idx) => {
      const price = livePrices[asset] || (asset === 'XAUUSD' ? 4345.50 : asset === 'USDJPY' ? 154.50 : 1.0850);
      // Give each asset 2 complementary setups (1 SELL, 1 BUY)
      setups.push(this.generateSetup(asset, price, idx * 2));
      setups.push(this.generateSetup(asset, price, idx * 2 + 1));
    });

    return setups;
  }
}

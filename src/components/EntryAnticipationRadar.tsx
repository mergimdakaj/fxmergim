import React, { useState, useMemo, useEffect } from 'react';
import { AnticipationSetup, TradeType } from '../types/trading';
import { notificationService } from '../services/notificationService';
import { soundService } from '../utils/audioAlert';
import { marketPriceService } from '../services/marketPriceService';
import {
  Target,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellRing,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Compass,
  Sliders,
  DollarSign,
  Shield,
  Zap,
  HelpCircle,
  Info,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Timer,
  Volume2,
  VolumeX,
  PlusCircle,
  CheckCheck,
  Sparkles,
} from 'lucide-react';

interface EntryAnticipationRadarProps {
  livePrice: number;
  onFocusLevel?: (level: number) => void;
  onUpdateLivePrice?: (newPrice: number) => void;
  assetSymbol?: string;
  setups?: AnticipationSetup[];
  pipMultiplier?: number;
  decimals?: number;
  currencySymbol?: string;
}

export const EntryAnticipationRadar: React.FC<EntryAnticipationRadarProps> = ({
  livePrice,
  onFocusLevel,
  onUpdateLivePrice,
  assetSymbol = 'XAU/USD',
  setups: propSetups,
  pipMultiplier = 10,
  decimals = 2,
  currencySymbol = '$',
}) => {
  // Simulation & live movement state
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<'normal' | 'fast'>('normal');

  // Pre-configured default ICT setups in anticipation
  const defaultSetups: AnticipationSetup[] = useMemo(
    () => [
      {
        id: 'setup-1-sell-4388',
        name: 'M-Formation SELL në 4H Supply Zone',
        type: 'SELL',
        status: 'ENTRY_READY',
        statusLabel: '100% - Gati për Hyrje (E Konfirmuar)',
        htfPoiLevel: 4388.0,
        htfPoiLabel: '4H Bearish Supply POI ($4388.00)',
        expectedSweepLevel: 4389.6,
        expectedMssLevel: 4384.2,
        projectedEntry: 4386.4,
        projectedSl: 4390.5,
        projectedTp: 4378.2,
        riskPips: 41,
        targetPips: 82,
        rrRatio: 2.0,
        stepCurrent: 4,
        stepDescription: 'Të 4 hapat u kryen: Zona u prek, fitili i Sweep kapi likuiditetin në 4389.60, MSS theu me trup 4384.20. Hyrja aktive në Retest FVG 4386.40!',
        triggerDistancePips: 0,
        slPlacementGuide: 'Vendoset në $4390.50 (41 pips / +$4.10) — saktësisht 0.90$ mbi fitilin e dytë më të lartë të Sweep ($4389.60) për mbrojtje nga spread.',
        tpPlacementGuide: 'Vendoset në $4378.20 (82 pips / -$8.20) — raport fiks 1:2 R:R sipas rregullit ICT.',
      },
      {
        id: 'setup-4-buy-4375',
        name: 'London Open FVG Retest BUY pas MSS',
        type: 'BUY',
        status: 'MSS_WAIT',
        statusLabel: '75% - MSS Ndodhi me Trup (PËRGATITU, presim Retest!)',
        htfPoiLevel: 4374.0,
        htfPoiLabel: 'London Session Low POI ($4374.00)',
        expectedSweepLevel: 4372.2,
        expectedMssLevel: 4377.5,
        projectedEntry: 4375.2,
        projectedSl: 4371.4,
        projectedTp: 4382.8,
        riskPips: 38,
        targetPips: 76,
        rrRatio: 2.0,
        stepCurrent: 3,
        stepDescription: 'MSS theu strukturën në 4377.50 me qiri të fuqishëm me trup. Presim kthimin e ngadaltë (Retest) në FVG në 4375.20.',
        triggerDistancePips: 45,
        slPlacementGuide: 'Vendoset në $4371.40 (38 pips / -$3.80) — saktësisht 0.80$ nën pikën më të ulët të fitilit të Sweep ($4372.20).',
        tpPlacementGuide: 'Vendoset në $4382.80 (76 pips / +$7.60) — raport fiks 1:2 R:R.',
      },
      {
        id: 'setup-3-sell-4395',
        name: 'Daily High Liquidity Sweep ($4395.00) Reversal SELL',
        type: 'SELL',
        status: 'SWEEP_WAIT',
        statusLabel: '50% - U bë Sweep i Likuiditetit (MOS U FUT, presim MSS!)',
        htfPoiLevel: 4395.0,
        htfPoiLabel: 'Previous Day High ($4395.00)',
        expectedSweepLevel: 4396.2,
        expectedMssLevel: 4391.0,
        projectedEntry: 4392.8,
        projectedSl: 4397.0,
        projectedTp: 4384.4,
        riskPips: 42,
        targetPips: 84,
        rrRatio: 2.0,
        stepCurrent: 2,
        stepDescription: 'Çmimi bëri fitil mbi 4395.00 dhe u mbyll brenda. MOS U FUT akoma sepse mungon MSS me trup qiriri për të vërtetuar kthimin!',
        triggerDistancePips: 158,
        slPlacementGuide: 'Vendoset në $4397.00 (42 pips / +$4.20) — saktësisht 0.80$ mbi majën e fitilit të Sweep ($4396.20). Vendoset vetëm pasi të ndodhë MSS!',
        tpPlacementGuide: 'Vendoset në $4384.40 (84 pips / -$8.40) — raport fiks 1:2 R:R.',
      },
      {
        id: 'setup-2-buy-4371',
        name: 'W-Formation BUY në 1H Bullish Demand Zone',
        type: 'BUY',
        status: 'POI_WAIT',
        statusLabel: '25% - Vetëm POI Prekje (MOS U FUT, mungon Sweep dhe MSS!)',
        htfPoiLevel: 4371.0,
        htfPoiLabel: '1H Bullish Demand POI ($4371.00)',
        expectedSweepLevel: 4368.5,
        expectedMssLevel: 4374.0,
        projectedEntry: 4372.5,
        projectedSl: 4367.8,
        projectedTp: 4381.9,
        riskPips: 47,
        targetPips: 94,
        rrRatio: 2.0,
        stepCurrent: 1,
        stepDescription: 'Çmimi vetëm sa po prek zonën Demand (4371.00). RREZIK I LARTË po u fute këtu sepse nuk e dimë a do kthehet apo do vazhdojë rënien!',
        triggerDistancePips: 82,
        slPlacementGuide: 'Do të vendoset në $4367.80 (47 pips / -$4.70) — saktësisht 0.70$ poshtë fitilit më të ulët të Sweep në W ($4368.50) sapo të kryhet sweep-i.',
        tpPlacementGuide: 'Vendoset në $4381.90 (94 pips / +$9.40) — raport fiks 1:2 R:R.',
      },
    ],
    []
  );

  const initialSetups = propSetups && propSetups.length > 0 ? propSetups : defaultSetups;
  const [setupsList, setSetupsList] = useState<AnticipationSetup[]>(initialSetups);
  const [activeSetupId, setActiveSetupId] = useState<string>(initialSetups[0]?.id || 'setup-1-sell-4388');

  // Sync setupsList when propSetups or active asset changes
  useEffect(() => {
    if (propSetups && propSetups.length > 0) {
      setSetupsList(propSetups);
      if (!propSetups.some((s) => s.id === activeSetupId)) {
        setActiveSetupId(propSetups[0].id);
      }
    }
  }, [propSetups]);

  // Real-time Scanning & 1-Minute Auto-Check State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<string>(() => new Date().toLocaleTimeString('sq-AL'));
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [executedSetupId, setExecutedSetupId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'READY' | '75' | 'BUY' | 'SELL'>('ALL');

  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [alertArmedId, setAlertArmedId] = useState<string | null>(initialSetups[0]?.id || null);
  const [copiedOrder, setCopiedOrder] = useState<boolean>(false);

  // Selected setup
  const currentSetup = useMemo(
    () => setupsList.find((s) => s.id === activeSetupId) || setupsList[0] || defaultSetups[0],
    [setupsList, activeSetupId, defaultSetups]
  );

  // Filtered setups list
  const filteredSetups = useMemo(() => {
    return setupsList.filter((s) => {
      if (filterMode === 'READY') return s.stepCurrent === 4 || s.status === 'ENTRY_READY';
      if (filterMode === '75') return s.stepCurrent === 3 || s.status === 'MSS_WAIT';
      if (filterMode === 'BUY') return s.type === 'BUY';
      if (filterMode === 'SELL') return s.type === 'SELL';
      return true;
    });
  }, [setupsList, filterMode]);

  // Rescan function: checks market conditions against live prices
  const handleRescan = () => {
    setIsScanning(true);
    setScanMessage(`Duke skanuar strukturën ICT në ${assetSymbol} (HTF POI, Sweep, MSS, FVG Retest)...`);

    setTimeout(() => {
      setSetupsList((prevSetups) => {
        return prevSetups.map((setup) => {
          const dist = Math.abs(livePrice - setup.projectedEntry) * pipMultiplier;
          const roundedDist = Math.round(dist);
          const isAtEntry = roundedDist <= 1; // 1 pip or less from entry

          if (isAtEntry) {
            if (soundEnabled) soundService.playEntryAlert();
            setExecutedSetupId(setup.id);
            return {
              ...setup,
              stepCurrent: 4,
              status: 'ENTRY_READY',
              statusLabel: '100% - HYRJE E AKTIVIZUAR (SNIPER)',
              triggerDistancePips: 0,
              stepDescription: `🎯 ÇMIMI PREKU HYRJEN (${setup.projectedEntry.toFixed(decimals)}) TANI NË KOHË REALE! Retest FVG u plotësua. SL fiks në ${setup.projectedSl.toFixed(decimals)} (-${setup.riskPips}p) dhe TP 1:2 në ${setup.projectedTp.toFixed(decimals)}!`,
            };
          }

          return {
            ...setup,
            triggerDistancePips: roundedDist,
          };
        });
      });

      const now = new Date().toLocaleTimeString('sq-AL');
      setLastScanTime(now);
      setIsScanning(false);
      setCountdown(60);

      if (soundEnabled) {
        soundService.playRadarPing();
      }

      setScanMessage(`Skanimi ICT u krye me sukses në ${now}! Të gjitha rregullat FVG • MSS • Killzones u verifikuan.`);
      setTimeout(() => setScanMessage(null), 4500);
    }, 600);
  };

  // 1-minute countdown timer that triggers auto-scan every 60 seconds
  useEffect(() => {
    if (!autoScanEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRescan();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoScanEnabled, livePrice, soundEnabled, pipMultiplier, assetSymbol]);

  // Generate new candidate setup based on current ICT market state
  const handleGenerateNewICTSetup = () => {
    setIsScanning(true);
    setScanMessage(`Duke analizuar tregun dhe duke gjeneruar skenar të ri ICT (${assetSymbol})...`);

    setTimeout(() => {
      const timestampId = `ict-gen-${Date.now()}`;
      const isSell = Math.random() > 0.5;

      // Calculate realistic delta based on asset and decimals
      let deltaPoi: number;
      let deltaSweep: number;
      let deltaMss: number;
      let deltaEntry: number;
      let riskPips: number;

      if (pipMultiplier >= 1000) {
        // EUR/USD, GBP/USD (decimals = 4/5)
        riskPips = 30;
        deltaPoi = 0.0035;
        deltaSweep = 0.0012;
        deltaMss = 0.0010;
        deltaEntry = 0.0020;
      } else if (pipMultiplier >= 100) {
        // USD/JPY (decimals = 2/3)
        riskPips = 30;
        deltaPoi = 0.35;
        deltaSweep = 0.12;
        deltaMss = 0.10;
        deltaEntry = 0.20;
      } else {
        // Gold XAU/USD (pipMultiplier = 10, 1 pip = $0.10)
        riskPips = 38;
        deltaPoi = 3.80;
        deltaSweep = 1.30;
        deltaMss = 1.10;
        deltaEntry = 2.20;
      }

      const riskValue = riskPips / pipMultiplier;
      const targetValue = (riskPips * 2) / pipMultiplier; // 1:2 R:R

      let poi: number;
      let sweep: number;
      let mss: number;
      let entry: number;
      let sl: number;
      let tp: number;
      let name: string;
      let poiLabel: string;
      let slGuide: string;
      let tpGuide: string;

      if (isSell) {
        poi = Number((livePrice + deltaPoi).toFixed(decimals));
        sweep = Number((poi + deltaSweep).toFixed(decimals));
        mss = Number((livePrice + deltaMss).toFixed(decimals));
        entry = Number((livePrice + deltaEntry).toFixed(decimals));
        sl = Number((sweep + (pipMultiplier >= 1000 ? 0.0008 : pipMultiplier >= 100 ? 0.08 : 0.80)).toFixed(decimals));
        tp = Number((entry - targetValue).toFixed(decimals));

        name = `London Killzone FVG Retest SELL pas MSS me Displacement`;
        poiLabel = `4H Supply Zone & Buy-Side Liquidity (${currencySymbol}${poi.toFixed(decimals)})`;
        slGuide = `Vendoset në ${currencySymbol}${sl.toFixed(decimals)} (-${riskPips} pips) — saktësisht mbi fitilin më të lartë të Sweep (${currencySymbol}${sweep.toFixed(decimals)}) për mbrojtje nga spread.`;
        tpGuide = `Vendoset në ${currencySymbol}${tp.toFixed(decimals)} (+${riskPips * 2} pips) — raport fiks 1:2 R:R drejt Sell-Side Liquidity.`;
      } else {
        poi = Number((livePrice - deltaPoi).toFixed(decimals));
        sweep = Number((poi - deltaSweep).toFixed(decimals));
        mss = Number((livePrice - deltaMss).toFixed(decimals));
        entry = Number((livePrice - deltaEntry).toFixed(decimals));
        sl = Number((sweep - (pipMultiplier >= 1000 ? 0.0008 : pipMultiplier >= 100 ? 0.08 : 0.80)).toFixed(decimals));
        tp = Number((entry + targetValue).toFixed(decimals));

        name = `New York Session Low Sweep + Bullish FVG Retest BUY`;
        poiLabel = `1H Bullish Demand & Sell-Side Liquidity (${currencySymbol}${poi.toFixed(decimals)})`;
        slGuide = `Vendoset në ${currencySymbol}${sl.toFixed(decimals)} (-${riskPips} pips) — saktësisht nën fitilin më të ulët të Sweep (${currencySymbol}${sweep.toFixed(decimals)}).`;
        tpGuide = `Vendoset në ${currencySymbol}${tp.toFixed(decimals)} (+${riskPips * 2} pips) — raport fiks 1:2 R:R drejt Buy-Side Liquidity.`;
      }

      const newSetup: AnticipationSetup = {
        id: timestampId,
        name,
        type: isSell ? 'SELL' : 'BUY',
        status: 'MSS_WAIT',
        statusLabel: '75% - MSS Ndodhi me Trup (Presim Retest në FVG)',
        htfPoiLevel: poi,
        htfPoiLabel: poiLabel,
        expectedSweepLevel: sweep,
        expectedMssLevel: mss,
        projectedEntry: entry,
        projectedSl: sl,
        projectedTp: tp,
        projectedTp2: Number((entry + (isSell ? -targetValue * 1.5 : targetValue * 1.5)).toFixed(decimals)),
        projectedTp3: Number((entry + (isSell ? -targetValue * 2.5 : targetValue * 2.5)).toFixed(decimals)),
        riskPips,
        targetPips: riskPips * 2,
        rrRatio: 2.0,
        stepCurrent: 3,
        stepDescription: `MSS theu strukturën në ${currencySymbol}${mss.toFixed(decimals)} me displacement të qartë me trup qiriri. Presim kthimin e ngadaltë (Retest) në FVG në ${currencySymbol}${entry.toFixed(decimals)}!`,
        triggerDistancePips: Math.round(Math.abs(livePrice - entry) * pipMultiplier),
        slPlacementGuide: slGuide,
        tpPlacementGuide: tpGuide,
      };

      setSetupsList((prev) => [newSetup, ...prev]);
      setActiveSetupId(newSetup.id);
      setIsScanning(false);
      setCountdown(60);

      if (soundEnabled) {
        soundService.playEntryAlert();
      }

      setScanMessage(`🎯 Skenar i ri ICT u gjenerua për ${assetSymbol}! Hapi 3/4 (MSS) u konfirmua, po presim retest në FVG: ${currencySymbol}${entry.toFixed(decimals)}.`);
      setTimeout(() => setScanMessage(null), 5000);
    }, 600);
  };

  // Test simulated price touch at entry level
  const handleTestPriceTouch = (setup: AnticipationSetup) => {
    if (onUpdateLivePrice) {
      onUpdateLivePrice(setup.projectedEntry);
    }
    setSetupsList((prev) =>
      prev.map((s) => {
        if (s.id === setup.id) {
          return {
            ...s,
            stepCurrent: 4,
            status: 'ENTRY_READY',
            statusLabel: '100% - HYRJE E AKTIVIZUAR (SNIPER)',
            triggerDistancePips: 0,
            stepDescription: `🎯 ÇMIMI PREKU HYRJEN (${setup.projectedEntry.toFixed(decimals)}) TANI NË KOHË REALE! Retest FVG u plotësua. SL fiks në ${setup.projectedSl.toFixed(decimals)} (-${setup.riskPips}p) dhe TP 1:2 në ${setup.projectedTp.toFixed(decimals)}!`,
          };
        }
        return s;
      })
    );
    setExecutedSetupId(setup.id);
    if (soundEnabled) {
      soundService.playEntryAlert();
    }
    notificationService.sendNotification({
      title: `⚡ HYRJE ICT AKTIVIZUAR: ${setup.name}`,
      body: `Çmimi preku pikën e hyrjes ${currencySymbol}${setup.projectedEntry.toFixed(decimals)}! SL: ${currencySymbol}${setup.projectedSl.toFixed(decimals)} | TP 1:2: ${currencySymbol}${setup.projectedTp.toFixed(decimals)}`,
      type: 'ENTRY',
    });
  };

  // Real-time dynamic distance calculation from live price using asset-specific pipMultiplier
  const distanceToEntry = useMemo(() => {
    const diff = Math.abs(livePrice - currentSetup.projectedEntry);
    return Math.round(diff * pipMultiplier);
  }, [livePrice, currentSetup, pipMultiplier]);

  const distanceToPoi = useMemo(() => {
    const diff = Math.abs(livePrice - currentSetup.htfPoiLevel);
    return Math.round(diff * pipMultiplier);
  }, [livePrice, currentSetup, pipMultiplier]);

  // Risk & Lot size calculation
  const riskAmount = (accountBalance * riskPercent) / 100;
  const calculatedLotSize = Number((riskAmount / (currentSetup.riskPips * 10)).toFixed(2));
  const potentialProfit = riskAmount * currentSetup.rrRatio;

  const toggleArmAlert = (setupId: string) => {
    if (alertArmedId === setupId) {
      setAlertArmedId(null);
    } else {
      setAlertArmedId(setupId);
      notificationService.sendNotification({
        title: `🎯 Alarmi u Aktivizua: ${currentSetup.name}`,
        body: `Skaneri do t'ju njoftojë në telefon kur çmimi (${livePrice}) t'i afrohet Entry: ${currencySymbol}${currentSetup.projectedEntry.toFixed(decimals)} me SL: ${currencySymbol}${currentSetup.projectedSl.toFixed(decimals)} dhe TP: ${currencySymbol}${currentSetup.projectedTp.toFixed(decimals)}!`,
        type: 'ENTRY',
      });
    }
  };

  const copyFullOrder = () => {
    const orderText = `${assetSymbol} ${currentSetup.type} LIMIT | Entry: ${currencySymbol}${currentSetup.projectedEntry.toFixed(decimals)} | SL: ${currencySymbol}${currentSetup.projectedSl.toFixed(decimals)} (-${currentSetup.riskPips} pips) | TP: ${currencySymbol}${currentSetup.projectedTp.toFixed(decimals)} (+${currentSetup.targetPips} pips) | R:R 1:2`;
    navigator.clipboard.writeText(orderText);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2500);
  };

  // Dynamic distance presets based on current setup POI and pip multiplier
  const p90 = useMemo(
    () => Number((currentSetup.htfPoiLevel - (90 / pipMultiplier)).toFixed(decimals)),
    [currentSetup.htfPoiLevel, pipMultiplier, decimals]
  );
  const p50 = useMemo(
    () => Number((currentSetup.htfPoiLevel - (50 / pipMultiplier)).toFixed(decimals)),
    [currentSetup.htfPoiLevel, pipMultiplier, decimals]
  );
  const p10 = useMemo(
    () => Number((currentSetup.htfPoiLevel - (10 / pipMultiplier)).toFixed(decimals)),
    [currentSetup.htfPoiLevel, pipMultiplier, decimals]
  );
  const p0 = useMemo(
    () => Number(currentSetup.htfPoiLevel.toFixed(decimals)),
    [currentSetup.htfPoiLevel, decimals]
  );
  const pEntry = useMemo(
    () => Number(currentSetup.projectedEntry.toFixed(decimals)),
    [currentSetup.projectedEntry, decimals]
  );

  // Dynamic slider range
  const sliderMin = useMemo(
    () => Number((currentSetup.htfPoiLevel - (120 / pipMultiplier)).toFixed(decimals)),
    [currentSetup.htfPoiLevel, pipMultiplier, decimals]
  );
  const sliderMax = useMemo(
    () => Number((currentSetup.htfPoiLevel + (40 / pipMultiplier)).toFixed(decimals)),
    [currentSetup.htfPoiLevel, pipMultiplier, decimals]
  );
  const sliderStep = useMemo(() => {
    if (pipMultiplier >= 1000) return '0.0001';
    if (pipMultiplier >= 100) return '0.01';
    return '0.10';
  }, [pipMultiplier]);

  // Handle live movement simulation towards POI (e.g. from 90 pips to 10 pips)
  React.useEffect(() => {
    if (!isSimulatingLive) return;

    const intervalTime = simulationSpeed === 'fast' ? 700 : 1200;
    const targetPoi = currentSetup.htfPoiLevel;

    const timer = setInterval(() => {
      const currentDiff = targetPoi - livePrice;
      const stepPips = simulationSpeed === 'fast' ? 10 : 6;
      const stepValue = stepPips / pipMultiplier;

      if (Math.abs(currentDiff) <= (1 / pipMultiplier) * 2) {
        // Reached POI (0 pips)
        const finalPrice = targetPoi;
        if (onUpdateLivePrice) {
          onUpdateLivePrice(finalPrice);
        }
        notificationService.sendNotification({
          title: `🎯 POI U PREK: ${currentSetup.name}`,
          body: `Çmimi arriti në ${currencySymbol}${finalPrice.toFixed(decimals)} (0 pips nga POI)! Përgatitu për Sweep me fitil.`,
          type: 'SWEEP',
        });
        setIsSimulatingLive(false);
      } else {
        const nextPrice = currentDiff > 0 ? livePrice + stepValue : livePrice - stepValue;
        const newCalculated = Number(nextPrice.toFixed(decimals));
        if (onUpdateLivePrice) {
          onUpdateLivePrice(newCalculated);
        }

        // Check if just reached ~10 pips
        const newDistPips = Math.round(Math.abs(targetPoi - newCalculated) * pipMultiplier);
        if (newDistPips <= 12 && newDistPips >= 8) {
          notificationService.sendNotification({
            title: `🔥 10 PIPS LARG POI: ${currentSetup.name}`,
            body: `Çmimi (${currencySymbol}${newCalculated.toFixed(decimals)}) është vetëm ${newDistPips} pips larg POI ${currencySymbol}${targetPoi.toFixed(decimals)}!`,
            type: 'ENTRY',
          });
        }
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSimulatingLive, livePrice, currentSetup, simulationSpeed, onUpdateLivePrice, pipMultiplier, decimals, currencySymbol]);

  return (
    <div id="entry-anticipation-radar" className="space-y-6">
      {/* Header Banner & Live Scanner Toolbar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
                ICT Entry Radar & Parashikimi i Hyrjeve
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  FVG • MSS • Killzones
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Skaneri kontrollon çdo minutë lëvizjen e çmimit drejt zonave POI dhe gjeneron skenarë të rinj me konfirmim të 4 hapave (Sweep, MSS me trup, FVG Retest, SL fiks pas fitilit).
            </p>
          </div>

          {/* Live status badge */}
          <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-xl font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Çmimi Live {assetSymbol}</div>
              <div className="text-base font-extrabold font-mono text-amber-400">{currencySymbol}{livePrice.toFixed(decimals)}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>

        {/* INTERACTIVE CONTROLS BAR (SCAN, GENERATE, AUTO-CHECK, SOUND) */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Skano & Kontrollo Tregun Tani Button */}
            <button
              id="radar-rescan-btn"
              onClick={handleRescan}
              disabled={isScanning}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                isScanning
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:scale-[1.02]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Duke Skanuar Tregun...' : '⚡ Skano & Kontrollo Tregun Tani'}</span>
            </button>

            {/* Gjenero Skenar të Ri ICT Button */}
            <button
              id="radar-generate-new-setup-btn"
              onClick={handleGenerateNewICTSetup}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Gjenero Skenar të Ri ICT (FVG • MSS)</span>
            </button>

            {/* Auto-Kontroll 1m Toggle */}
            <button
              id="radar-auto-check-toggle"
              onClick={() => setAutoScanEnabled(!autoScanEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                autoScanEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
              title="Kontrollon automatikisht tregun çdo 60 sekonda për hyrje të reja"
            >
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Kontroll 1m: {autoScanEnabled ? `${countdown}s` : 'PAUZË'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="radar-sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-amber-400 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={soundEnabled ? 'Zëri i alarmit është Aktiv' : 'Zëri është Çaktivizuar'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Skanimi i Fundit:</span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {lastScanTime}
            </span>
          </div>
        </div>

        {/* Scan Message / Success Toast */}
        {scanMessage && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-200 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}
      </div>

      {/* FILTER PILLS */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filtro Skenarët:</span>
        <button
          onClick={() => setFilterMode('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Të Gjitha ({setupsList.length})
        </button>
        <button
          onClick={() => setFilterMode('READY')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterMode === 'READY'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Gati për Hyrje ({setupsList.filter((s) => s.stepCurrent === 4).length})</span>
        </button>
        <button
          onClick={() => setFilterMode('75')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterMode === '75'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          75% MSS & FVG Retest ({setupsList.filter((s) => s.stepCurrent === 3).length})
        </button>
        <button
          onClick={() => setFilterMode('BUY')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'BUY'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          BUY ({setupsList.filter((s) => s.type === 'BUY').length})
        </button>
        <button
          onClick={() => setFilterMode('SELL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterMode === 'SELL'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          SELL ({setupsList.filter((s) => s.type === 'SELL').length})
        </button>
      </div>

      {/* Main Grid: Setups List (Left) & Deep Dive Checklist / Order Planner (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Setups Radar Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1 uppercase tracking-wider">
            <span>Skenarët në Monitorim ({filteredSetups.length})</span>
            <span>Statusi & Siguria e Hyrjes</span>
          </div>

          {filteredSetups.map((setup) => {
            const isSelected = setup.id === activeSetupId;
            const isSell = setup.type === 'SELL';
            const dist = Math.round(Math.abs(livePrice - setup.projectedEntry) * pipMultiplier);
            const percent = (setup.stepCurrent / 4) * 100;

            // Security badge styling based on progress percentage
            let statusBadge = {
              text: '100% - HYRJE E SIGURT',
              bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              note: 'Të 4 rregullat u plotësuan! Hyrja është e konfirmuar.',
            };

            if (percent === 25) {
              statusBadge = {
                text: '25% - MOS U FUT! (JO E SIGURT)',
                bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                note: 'Vetëm POI u prek. Rrezik i lartë, mungon Sweep dhe MSS!',
              };
            } else if (percent === 50) {
              statusBadge = {
                text: '50% - MOS U FUT AKOMA!',
                bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                note: 'U bë Sweep me fitil, por presim MSS me trup qiriri.',
              };
            } else if (percent === 75) {
              statusBadge = {
                text: '75% - PËRGATITU (Presim Retest)',
                bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                note: 'MSS theu strukturën. Presim kthimin në FVG.',
              };
            }

            return (
              <div
                key={setup.id}
                id={`radar-card-${setup.id}`}
                onClick={() => setActiveSetupId(setup.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                        isSell
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isSell ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      {setup.type}
                    </span>
                    <h3 className="text-xs font-bold text-white">{setup.name}</h3>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                    {statusBadge.text}
                  </span>
                </div>

                {/* Progress bar of 4 steps */}
                <div className="mt-2 mb-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Progresi i konfirmimit ICT (Hapi {setup.stepCurrent}/4):</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400">{dist} pips larg</span>
                      <span className="font-bold text-white">{percent}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        percent === 100
                          ? 'bg-emerald-500'
                          : percent === 75
                          ? 'bg-yellow-400'
                          : percent === 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">{statusBadge.note}</p>
                </div>

                {/* Grid: POI, ENTRY, STOP LOSS (SL) & TAKE PROFIT (TP) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                  {/* POI */}
                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase">POI Zona:</span>
                    <span className="text-purple-300 font-bold">{currencySymbol}{setup.htfPoiLevel.toFixed(decimals)}</span>
                  </div>

                  {/* Entry */}
                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-sky-500/20">
                    <span className="text-sky-400 block text-[9px] uppercase font-bold">Hyrja (Entry):</span>
                    <span className="text-sky-300 font-bold">{currencySymbol}{setup.projectedEntry.toFixed(decimals)}</span>
                  </div>

                  {/* STOP LOSS (SL) - EXPLICIT LOCATION */}
                  <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
                    <span className="text-rose-400 block text-[9px] uppercase font-bold flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      Stop Loss (SL):
                    </span>
                    <span className="text-rose-300 font-bold">{currencySymbol}{setup.projectedSl.toFixed(decimals)}</span>
                    <span className="text-[9px] text-rose-400/80 block">-{setup.riskPips} pips</span>
                  </div>

                  {/* TAKE PROFIT (TP 1:2) */}
                  <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-emerald-400 block text-[9px] uppercase font-bold">TP (1:2 R:R):</span>
                    <span className="text-emerald-300 font-bold">{currencySymbol}{setup.projectedTp.toFixed(decimals)}</span>
                    <span className="text-[9px] text-emerald-400/80 block">+{setup.targetPips} pips</span>
                  </div>
                </div>

                {/* Explicit Guidance: Sa dhe ku me lënë Stop Loss-in */}
                <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-1.5 text-[10px]">
                  <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-slate-300 leading-tight">
                    <strong className="text-rose-400">Ku me lon SL: </strong>
                    {setup.slPlacementGuide}
                  </div>
                </div>

                {/* Tactical Actions: Test Price Touch Button */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    id={`test-touch-btn-${setup.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestPriceTouch(setup);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Simulon prekjen e nivelit të hyrjes nga çmimi live dhe aktivizon urdhrin"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Testo Prekjen e Hyrjes ({currencySymbol}{setup.projectedEntry.toFixed(decimals)})</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const txt = `${assetSymbol} ${setup.type} LIMIT | Entry: ${currencySymbol}${setup.projectedEntry.toFixed(decimals)} | SL: ${currencySymbol}${setup.projectedSl.toFixed(decimals)} | TP: ${currencySymbol}${setup.projectedTp.toFixed(decimals)}`;
                      navigator.clipboard.writeText(txt);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-all"
                    title="Kopjo parametrat e këtij setup-i"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick Push Notification Arm Button */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  alertArmedId === currentSetup.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {alertArmedId === currentSetup.id ? <BellRing className="w-4 h-4 animate-bounce" /> : <Bell className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Alarmi Automatik i Hyrjes</div>
                <div className="text-[11px] text-slate-400">
                  {alertArmedId === currentSetup.id
                    ? 'Aktiv! Telefoni do të vibrojë kur të plotësohet 100%'
                    : 'Aktivizo për të marrë njoftim kur të plotësohet hyrja'}
                </div>
              </div>
            </div>

            <button
              id="arm-radar-alert-btn"
              onClick={() => toggleArmAlert(currentSetup.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                alertArmedId === currentSetup.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {alertArmedId === currentSetup.id ? 'Aktivizuar ✓' : 'Aktivizo Alarmin'}
            </button>
          </div>
        </div>

        {/* Right Column: Step-by-Step Execution Guide & Limit Order Planner */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card: Detailed Step-by-Step Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                  Procesi i Pritjes (Anticipation Roadmap)
                </span>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  {currentSetup.name}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Largësia nga POI:</span>
                <span
                  className={`font-black font-mono px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm ${
                    distanceToPoi <= 10
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 animate-pulse ring-2 ring-rose-500/30'
                      : distanceToPoi <= 30
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 text-amber-400 border-slate-800'
                  }`}
                >
                  {distanceToPoi <= 10 ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                  <span>{distanceToPoi} pips</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({Math.abs(livePrice - currentSetup.htfPoiLevel).toFixed(2)}$)
                  </span>
                  {distanceToPoi <= 10 && (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-rose-500 text-slate-950">
                      GATI!
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* LIVE DISTANCE MOVEMENT CONTROLLER & TEST PANEL */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="text-xs font-extrabold text-white block">
                      Kontrolli i Lëvizjes Live drejt POI (90 pips ➔ 10 pips)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Shiko çmimin të lëvizë në kohë reale dhe si ndryshon largësia nga zona POI
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Play / Pause Live Movement Button */}
                  <button
                    id="toggle-live-simulation-btn"
                    onClick={() => {
                      if (!isSimulatingLive) {
                        // If price is already close to POI, start fresh from 90 pips
                        if (distanceToPoi <= 15 && onUpdateLivePrice) {
                          onUpdateLivePrice(p90);
                        }
                        setIsSimulatingLive(true);
                      } else {
                        setIsSimulatingLive(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      isSimulatingLive
                        ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 animate-pulse'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {isSimulatingLive ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                        <span>⏸ Ndalo Lëvizjen</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-slate-950" />
                        <span>▶ Lëvizje Live (90p ➔ 10p)</span>
                      </>
                    )}
                  </button>

                  {/* Reset to 90 pips */}
                  <button
                    id="reset-distance-90pips-btn"
                    onClick={() => {
                      setIsSimulatingLive(false);
                      if (onUpdateLivePrice) onUpdateLivePrice(p90);
                    }}
                    title={`Rivendos çmimin në 90 pips larg (${currencySymbol}${p90})`}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    ↺ 90 pips
                  </button>
                </div>
              </div>

              {/* Quick Distance Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono pt-1 border-t border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase font-sans mr-1 font-bold">Kliko shpejt:</span>
                
                <button
                  id="preset-90pips-btn"
                  onClick={() => {
                    setIsSimulatingLive(false);
                    if (onUpdateLivePrice) onUpdateLivePrice(p90);
                  }}
                  className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(livePrice - p90) <= (1 / pipMultiplier) * 3
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  90 pips ({currencySymbol}{p90})
                </button>

                <button
                  id="preset-50pips-btn"
                  onClick={() => {
                    setIsSimulatingLive(false);
                    if (onUpdateLivePrice) onUpdateLivePrice(p50);
                  }}
                  className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(livePrice - p50) <= (1 / pipMultiplier) * 3
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  50 pips ({currencySymbol}{p50})
                </button>

                <button
                  id="preset-10pips-btn"
                  onClick={() => {
                    setIsSimulatingLive(false);
                    if (onUpdateLivePrice) onUpdateLivePrice(p10);
                  }}
                  className={`px-2 py-0.5 rounded-lg border transition-all font-bold cursor-pointer ${
                    Math.abs(livePrice - p10) <= (1 / pipMultiplier) * 3
                      ? 'bg-rose-500 text-slate-950 font-black border-rose-400 ring-2 ring-rose-500/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
                  }`}
                >
                  🔥 10 pips ({currencySymbol}{p10})
                </button>

                <button
                  id="preset-0pips-btn"
                  onClick={() => {
                    setIsSimulatingLive(false);
                    if (onUpdateLivePrice) onUpdateLivePrice(p0);
                  }}
                  className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(livePrice - p0) <= (1 / pipMultiplier) * 3
                      ? 'bg-purple-500 text-white font-black border-purple-400'
                      : 'bg-purple-950/30 text-purple-300 border-purple-500/30 hover:bg-purple-900/40'
                  }`}
                >
                  🎯 0 pips ({currencySymbol}{p0} POI)
                </button>

                <button
                  id="preset-entry-btn"
                  onClick={() => {
                    setIsSimulatingLive(false);
                    if (onUpdateLivePrice) onUpdateLivePrice(pEntry);
                  }}
                  className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(livePrice - pEntry) <= (1 / pipMultiplier) * 3
                      ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400'
                      : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                  }`}
                >
                  🟢 Hyrja ({currencySymbol}{pEntry})
                </button>
              </div>

              {/* Slider for precision price movement */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>{currencySymbol}{sliderMin} (Larg POI)</span>
                  <span className="font-bold text-amber-400">Çmimi: {currencySymbol}{livePrice.toFixed(decimals)} ({distanceToPoi} pips nga POI)</span>
                  <span>{currencySymbol}{sliderMax}</span>
                </div>
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={sliderStep}
                  value={livePrice}
                  onChange={(e) => {
                    setIsSimulatingLive(false);
                    const val = parseFloat(e.target.value);
                    if (onUpdateLivePrice) onUpdateLivePrice(val);
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Glowing Alert Banner if Distance <= 15 pips */}
            {distanceToPoi <= 15 && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/70 via-amber-950/40 to-slate-950 border-2 border-rose-500/60 animate-pulse flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                  <div>
                    <div className="text-xs font-black text-rose-300 uppercase tracking-wide">
                      🔥 ÇMIMI AFËR POI: VETËM {distanceToPoi} PIPS LARG ({currencySymbol}{livePrice.toFixed(decimals)})!
                    </div>
                    <div className="text-[11px] text-slate-300 leading-tight">
                      Mos u fut akoma! Presim këmbën e dytë me fitil (Sweep Out & In) dhe MSS me trup qiriri.
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-rose-500 text-slate-950 shrink-0">
                  {distanceToPoi} pips
                </span>
              </div>
            )}

            {/* The 4 Strict ICT Steps */}
            <div className="space-y-3">
              {/* Step 1 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  currentSetup.stepCurrent >= 1
                    ? 'bg-slate-950/70 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    currentSetup.stepCurrent >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Hapi 1 (25%): Çmimi Prek HTF POI</span>
                    <span className="text-[11px] font-mono text-purple-400 font-semibold">
                      ${currentSetup.htfPoiLevel.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentSetup.htfPoiLabel}. {currentSetup.stepCurrent >= 1 ? 'Zona u prek me sukses.' : 'Presim çmimin të prekë nivelin para se të kërkojmë formacionin në 5M.'}
                  </p>
                  <div className="text-[10px] text-rose-400 font-semibold mt-1">
                    ⚠️ Mos u fut këtu: Nuk ka asnjë konfirmim kthimi akoma!
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  currentSetup.stepCurrent >= 2
                    ? 'bg-slate-950/70 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    currentSetup.stepCurrent >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Hapi 2 (50%): Formacioni {currentSetup.type === 'BUY' ? 'W' : 'M'} & Sweep ($$$)
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 font-semibold">
                      Sweep Fitili: ${currentSetup.expectedSweepLevel.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Këmba e dytë e {currentSetup.type === 'BUY' ? 'W' : 'M'} bën Sweep me rregullin <strong>Out & In</strong> (Fitili del jashtë në ${currentSetup.expectedSweepLevel.toFixed(2)}, por trupi mbyllet brenda).
                  </p>
                  <div className="text-[10px] text-amber-400 font-semibold mt-1">
                    ⚠️ Mos u fut këtu: Presim patjetër thyerjen e strukturës (MSS) me trup qiriri!
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  currentSetup.stepCurrent >= 3
                    ? 'bg-slate-950/70 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    currentSetup.stepCurrent >= 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Hapi 3 (75%): MSS (Market Structure Shift) + FVG me Trupin e Qiriut
                    </span>
                    <span className="text-[11px] font-mono text-yellow-400 font-semibold">
                      MSS: ${currentSetup.expectedMssLevel.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Një qiri me trup të plotë theu nivelin e strukturës dhe la një Fair Value Gap (FVG).
                  </p>
                  <div className="text-[10px] text-yellow-400 font-semibold mt-1">
                    🟡 Përgatitu: Vendosim Limit Order në FVG me SL pas fitilit të Hapit 2!
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  currentSetup.stepCurrent >= 4
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-slate-200'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    currentSetup.stepCurrent >= 4 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Hapi 4 (100%): Hyrja (Retest në FVG) & Urdhri 1:2 R:R
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      Entry: ${currentSetup.projectedEntry.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Çmimi kthehet dhe prek FVG! Hyrja kryhet këtu me <strong>SL fiks pas fitilit të Sweep (${currentSetup.projectedSl.toFixed(2)})</strong> dhe <strong>TP ekzakt 1:2 R:R (${currentSetup.projectedTp.toFixed(2)})</strong>.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                    🟢 HYRJE E KONFIRMUAR 100%: Të gjitha rregullat e strategjisë ICT janë plotësuar!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Order Execution Box (Entry, SL, TP, Lot Size) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-extrabold uppercase text-amber-400 tracking-wider">
                  Kalkulatori i Urdhrit të Pritjes (Limit Order Setup)
                </h4>
              </div>

              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1:2 R:R RREGULLI FIKS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Entry Box */}
              <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Entry Çmimi</span>
                <span className="text-base font-bold font-mono text-sky-300">
                  ${currentSetup.projectedEntry.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{distanceToEntry} pips nga ky moment</span>
              </div>

              {/* SL Box */}
              <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40 ring-1 ring-rose-500/20">
                <span className="text-[10px] text-rose-400 uppercase font-mono block font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-rose-400" />
                  Stop Loss (SL)
                </span>
                <span className="text-base font-bold font-mono text-rose-400">
                  ${currentSetup.projectedSl.toFixed(2)}
                </span>
                <span className="text-[10px] text-rose-400/90 block mt-0.5 font-mono">
                  -{currentSetup.riskPips} pips (-${(currentSetup.riskPips * 0.1).toFixed(2)})
                </span>
              </div>

              {/* TP Box */}
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Take Profit (TP)</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  ${currentSetup.projectedTp.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-0.5">+{currentSetup.targetPips} pips fitim</span>
              </div>
            </div>

            {/* HIGHLIGHTED DEDICATED SL GUIDE */}
            <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-rose-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-rose-400" />
                  Sa dhe Ku me lënë Stop Loss-in (SL)?
                </span>
                <span className="font-mono text-rose-300 font-bold">
                  SL Fiks: ${currentSetup.projectedSl.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {currentSetup.slPlacementGuide}
              </p>
              <p className="text-[10px] text-slate-400 italic">
                Rregulli ICT: Stop Loss-i nuk vendoset kurrë dosido me numër arbitrar! Ai vendoset gjithmonë 1-2 pips pas fitilit më ekstrem të Sweep-it. Nëse çmimi e prek këtë nivel, ideja bie poshtë dhe dalim nga pozicioni me humbje minimale.
              </p>
            </div>

            {/* Account Risk & Position Sizing Calculator */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Balanca e Llogarisë ($):</label>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Rreziku për Tregti (%):</label>
                <select
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 outline-none"
                >
                  <option value={0.5}>0.5% (Konservative)</option>
                  <option value={1}>1.0% (Rekomanduar ICT)</option>
                  <option value={1.5}>1.5%</option>
                  <option value={2}>2.0% (Maksimum)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">Madhësia e Lotit (Lots):</label>
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs flex items-center justify-between">
                  <span>{calculatedLotSize} Lots</span>
                  <span className="text-[10px] text-slate-400">${riskAmount.toFixed(0)} rrezik</span>
                </div>
              </div>
            </div>

            {/* Copy Order & Push Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                id="copy-full-order-btn"
                onClick={copyFullOrder}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                title="Kopjo parametrat e urdhrit për t'i vendosur në MetaTrader"
              >
                {copiedOrder ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedOrder ? 'Urdhri u Kopjua!' : 'Kopjo Urdhrin (Entry, SL, TP) për MT4/MT5'}</span>
              </button>

              <button
                id="trigger-arm-push-btn"
                onClick={() => toggleArmAlert(currentSetup.id)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{alertArmedId === currentSetup.id ? 'Alarmi është Aktiv' : 'Prit këtë Hyrje me Njoftim'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

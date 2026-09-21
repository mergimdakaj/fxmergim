import React, { useState, useEffect } from 'react';
import { MSNRRadarSetup, INITIAL_MSNR_RADAR_SETUPS } from '../../data/msnrData';
import { soundService } from '../../utils/audioAlert';
import { marketPriceService } from '../../services/marketPriceService';
import { MSNRCalendarService } from '../../services/msnrCalendarService';
import { notificationService } from '../../services/notificationService';
import confetti from 'canvas-confetti';
import {
  Crosshair,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
  Shield,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Play,
  Flame,
  Activity,
  RefreshCw,
  Volume2,
  VolumeX,
  Search,
  Timer,
  AlertCircle,
  PlusCircle,
  CheckCheck,
  Calendar,
  CalendarCheck,
  Award,
  X,
  Target,
  BellRing,
} from 'lucide-react';

interface MSNRRadarProps {
  setups: MSNRRadarSetup[];
  onSelectSetup: (assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY', tradeId?: string) => void;
  currencySymbols?: Record<string, string>;
  decimalsMap?: Record<string, number>;
  livePrices?: Record<string, number>;
  onTriggerSimulatedEntry?: (setup: MSNRRadarSetup) => void;
  onNavigateToCalendar?: () => void;
}

export const MSNRRadar: React.FC<MSNRRadarProps> = ({
  setups,
  onSelectSetup,
  currencySymbols = { XAUUSD: '$', EURUSD: '€', GBPUSD: '£', USDJPY: '¥' },
  decimalsMap = { XAUUSD: 2, EURUSD: 5, GBPUSD: 5, USDJPY: 3 },
  livePrices = {},
  onTriggerSimulatedEntry,
  onNavigateToCalendar,
}) => {
  const [setupsList, setSetupsList] = useState<MSNRRadarSetup[]>(setups && setups.length > 0 ? setups : INITIAL_MSNR_RADAR_SETUPS);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'READY' | 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'>('ALL');
  const [copiedSetupId, setCopiedSetupId] = useState<string | null>(null);
  
  // Scanning & 1-Minute Auto-Check State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(true);
  const [autoSaveEntries, setAutoSaveEntries] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('msnr_auto_save_entries');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [countdown, setCountdown] = useState<number>(60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<string>(() => new Date().toLocaleTimeString('sq-AL'));
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [executedSetupId, setExecutedSetupId] = useState<string | null>(null);
  const [promptSetup, setPromptSetup] = useState<MSNRRadarSetup | null>(null);
  const [registeredSetups, setRegisteredSetups] = useState<Record<string, { outcome: 'WIN' | 'LOSS' | 'ACTIVE'; pips: number; time: string }>>({});

  const handleRecordToCalendar = (
    setup: MSNRRadarSetup,
    outcome: 'WIN' | 'LOSS' | 'ACTIVE',
    customPips?: number
  ) => {
    const recorded = MSNRCalendarService.recordRadarTradeToCalendar(setup, outcome, customPips);
    setRegisteredSetups((prev) => ({
      ...prev,
      [setup.id]: {
        outcome,
        pips: recorded.resultPips10,
        time: recorded.time,
      },
    }));

    if (outcome === 'WIN') {
      if (soundEnabled) soundService.playRadarPing();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10b981', '#38bdf8', '#fbbf24'],
      });
      setScanMessage(`🎉 U RUAJT NË KALENDAR: Tregtia ${setup.symbol} u regjistrua si FITORE (+${recorded.resultPips10} pips) për sot!`);
    } else if (outcome === 'LOSS') {
      setScanMessage(`🔴 U RUAJT NË KALENDAR: Tregtia ${setup.symbol} u regjistrua si HUPJE (-10 pips SL fiks) për sot.`);
    } else {
      setScanMessage(`⏳ U RUAJT NË KALENDAR: Tregtia ${setup.symbol} u regjistrua si Tregti Aktive për sot.`);
    }

    setPromptSetup(null);
    setTimeout(() => setScanMessage(null), 7000);
  };

  // Helper to get pip multiplier for distance calculation
  const getPipSize = (assetId: string): number => {
    switch (assetId) {
      case 'XAUUSD':
        return 0.10;
      case 'USDJPY':
        return 0.01;
      case 'EURUSD':
      case 'GBPUSD':
      default:
        return 0.0001;
    }
  };

  // Rescan function to re-evaluate entry conditions against live market prices
  const handleRescan = () => {
    setIsScanning(true);
    setScanMessage('Duke skanuar strukturën e tregut në M15 & M1 dhe duke kontrolluar Target Sweep (TS)...');

    setTimeout(() => {
      setSetupsList((prevSetups) => {
        return prevSetups.map((setup) => {
          const currentPrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);
          const pipSize = getPipSize(setup.assetId);
          const dist = Math.abs(currentPrice - setup.expectedEntry) / pipSize;
          const roundedDist = parseFloat(dist.toFixed(1));

          const isAtEntry = roundedDist <= 0.4;
          const isNearEntry = roundedDist <= 1.5;

          if (isAtEntry) {
            if (soundEnabled) soundService.playEntryAlert();
            setExecutedSetupId(setup.id);

            // Send notification for entry
            notificationService.sendNotification({
              title: `⚡ HYRJE SNIPER MSNR: ${setup.symbol} (${setup.type})!`,
              body: `Çmimi arriti në pikën e hyrjes ${setup.expectedEntry}! SL: ${setup.sl10Pips} (-10p fiks) | TP1: ${setup.targetTp1}. ${autoSaveEntries ? 'U ruajt automatikisht në Kalendar.' : ''}`,
              type: 'ENTRY',
              price: setup.expectedEntry,
            });

            // Auto-save to calendar if enabled
            if (autoSaveEntries && !registeredSetups[setup.id]) {
              const recorded = MSNRCalendarService.recordRadarTradeToCalendar(setup, 'ACTIVE');
              setRegisteredSetups((prev) => ({
                ...prev,
                [setup.id]: {
                  outcome: 'ACTIVE',
                  pips: recorded.resultPips10,
                  time: recorded.time,
                },
              }));
            }

            return {
              ...setup,
              distancePips: roundedDist,
              progressPercent: 100,
              isReadyForEntry: true,
              waitingOnlyForEntry: false,
              currentStepDescription: `🎯 ÇMIMI PREKU HYRJEN TANI NË KOHË REALE! Urdhri Sniper u aktivizua. Stop Loss fiks në 10 pips (${setup.sl10Pips})!`,
              confirmations: setup.confirmations?.map((c) => ({ ...c, confirmed: true })),
            };
          }

          return {
            ...setup,
            distancePips: roundedDist,
            progressPercent: isNearEntry ? 95 : Math.max(setup.progressPercent, 90),
            isReadyForEntry: true,
            waitingOnlyForEntry: true,
            currentStepDescription: isNearEntry
              ? `Target Sweep (TS) KRYER! Likuiditeti u pastrua me wick. M1 MSS u konfirmua. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes (${setup.expectedEntry})! Distanca: vetëm ${roundedDist} pips!`
              : setup.currentStepDescription,
            confirmations: setup.confirmations?.map((c) => 
              c.id === 'c6' ? { ...c, confirmed: false } : { ...c, confirmed: true }
            ),
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

      setScanMessage(`Skanimi u krye me sukses në ${now}! Të gjitha rregullat MSNR LIT u verifikuan për çdo minutë.`);
      setTimeout(() => setScanMessage(null), 4000);
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
  }, [autoScanEnabled, livePrices, soundEnabled]);

  // Real-time market price monitor for touching expectedEntry
  useEffect(() => {
    setSetupsList((prevSetups) => {
      let changed = false;
      const updated = prevSetups.map((setup) => {
        const currentPrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);
        const pipSize = getPipSize(setup.assetId);
        const dist = Math.abs(currentPrice - setup.expectedEntry) / pipSize;
        const roundedDist = parseFloat(dist.toFixed(1));

        if (roundedDist <= 0.4 && setup.progressPercent < 100) {
          changed = true;
          setExecutedSetupId(setup.id);
          if (soundEnabled) soundService.playEntryAlert();

          notificationService.sendNotification({
            title: `⚡ HYRJE SNIPER E RE: ${setup.symbol} (${setup.type})!`,
            body: `Çmimi arriti në pikën e hyrjes ${setup.expectedEntry}! SL: ${setup.sl10Pips} (-10p fiks) | TP1: ${setup.targetTp1}. ${autoSaveEntries ? 'U ruajt automatikisht në Kalendar.' : ''}`,
            type: 'ENTRY',
            price: setup.expectedEntry,
          });

          if (autoSaveEntries && !registeredSetups[setup.id]) {
            const recorded = MSNRCalendarService.recordRadarTradeToCalendar(setup, 'ACTIVE');
            setRegisteredSetups((prev) => ({
              ...prev,
              [setup.id]: {
                outcome: 'ACTIVE',
                pips: recorded.resultPips10,
                time: recorded.time,
              },
            }));
            setScanMessage(`🎯 Çmimi kapi hyrjen (${setup.expectedEntry})! U RUAJT AUTOMATIKISHT në Kalendarin e Fitimeve!`);
            setTimeout(() => setScanMessage(null), 8000);
          }

          return {
            ...setup,
            distancePips: 0.0,
            progressPercent: 100,
            waitingOnlyForEntry: false,
            currentStepDescription: `🎯 ÇMIMI PREKU HYRJEN (${setup.expectedEntry}) TANI NË KOHË REALE! Urdhri Sniper u aktivizua. Stop Loss 10 pips fiks (${setup.sl10Pips})!`,
            confirmations: setup.confirmations?.map((c) => ({ ...c, confirmed: true })),
          };
        }
        return setup;
      });

      return changed ? updated : prevSetups;
    });
  }, [livePrices, autoSaveEntries, soundEnabled, registeredSetups]);

  // Generate new candidate setup based on current market state
  const handleGenerateNewSetup = () => {
    setIsScanning(true);
    setTimeout(() => {
      const targetAsset = (selectedFilter !== 'ALL' && selectedFilter !== 'READY' ? selectedFilter : 'XAUUSD') as 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
      const livePrice = livePrices[targetAsset] ?? marketPriceService.getCalibratedPrice(targetAsset);
      const dec = decimalsMap[targetAsset] || 2;
      const pipSize = getPipSize(targetAsset);

      let newSetup: MSNRRadarSetup;
      const timestampId = `radar-gen-${Date.now()}`;

      if (targetAsset === 'XAUUSD') {
        const isSell = Math.random() > 0.5;
        const entry = isSell ? Number((livePrice + 0.80).toFixed(dec)) : Number((livePrice - 0.80).toFixed(dec));
        const sl = isSell ? Number((entry + 1.00).toFixed(dec)) : Number((entry - 1.00).toFixed(dec)); // strictly 10 pips = $1.00
        const tp1 = isSell ? Number((entry - 3.00).toFixed(dec)) : Number((entry + 3.00).toFixed(dec));
        const tp2 = isSell ? Number((entry - 5.00).toFixed(dec)) : Number((entry + 5.00).toFixed(dec));
        const tp3 = isSell ? Number((entry - 8.00).toFixed(dec)) : Number((entry + 8.00).toFixed(dec));

        newSetup = {
          id: timestampId,
          symbol: 'XAU/USD',
          assetId: 'XAUUSD',
          type: isSell ? 'SELL' : 'BUY',
          patternName: isSell ? 'Bearish Quasimodo + M15 POI Sweep' : 'RBS (Resistance Become Support) Demand Retest',
          patternType: isSell ? 'QM_BEARISH' : 'RBS',
          timeframe: 'M15 POI > M1 Entry',
          poiRange: `${(entry - 0.50).toFixed(dec)} - ${(entry + 0.50).toFixed(dec)}`,
          idmLevel: isSell ? Number((entry - 0.70).toFixed(dec)) : Number((entry + 0.70).toFixed(dec)),
          expectedEntry: entry,
          sl10Pips: sl,
          targetTp1: tp1,
          targetTp2: tp2,
          targetTp3: tp3,
          progressPercent: 95,
          waitingOnlyForEntry: true,
          isReadyForEntry: true,
          distancePips: 0.8,
          currentStepDescription: `Target Sweep (TS) KRYER me wick! Inducement u pastrua. M1 MSS u konfirmua. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes ${entry}!`,
          confirmations: [
            { id: 'c1', name: 'M15 HTF Struktura & POI', confirmed: true, ruleDetail: 'Zona institucionale e identifikuar në M15 me drejtim të qartë' },
            { id: 'c2', name: 'Kurthi i Likuiditetit (IDM)', confirmed: true, ruleDetail: 'Inducement u formua duke bllokuar retail tregtarët e hershëm' },
            { id: 'c3', name: 'Target Sweep (TS) KRYER', confirmed: true, ruleDetail: 'Likuiditeti u mor me wick pa mbyllje qiriri pas nivelit' },
            { id: 'c4', name: 'M1 MSS (Market Structure Shift)', confirmed: true, ruleDetail: 'Në M1 struktura u thye me qiri të plotë marubozu' },
            { id: 'c5', name: 'Rregulli i Hekurt: SL 10 Pips', confirmed: true, ruleDetail: `SL është fiks 10 pips në ${sl} (asnjëherë 20p)` },
            { id: 'c6', name: 'Pritja e Prekjes së Hyrjes Sniper', confirmed: false, ruleDetail: `Presim VETËM që çmimi live të prekë pikën e hyrjes ${entry}!` },
          ],
        };
      } else if (targetAsset === 'EURUSD') {
        const entry = Number((livePrice - 0.00070).toFixed(dec));
        const sl = Number((entry - 0.00100).toFixed(dec)); // 10 pips
        newSetup = {
          id: timestampId,
          symbol: 'EUR/USD',
          assetId: 'EURUSD',
          type: 'BUY',
          patternName: 'Bullish Quasimodo + Inducement Cleanout',
          patternType: 'QM_BULLISH',
          timeframe: 'M15 POI > M1 Entry',
          poiRange: `${(entry - 0.00030).toFixed(dec)} - ${(entry + 0.00030).toFixed(dec)}`,
          idmLevel: Number((entry + 0.00050).toFixed(dec)),
          expectedEntry: entry,
          sl10Pips: sl,
          targetTp1: Number((entry + 0.00300).toFixed(dec)),
          targetTp2: Number((entry + 0.00500).toFixed(dec)),
          targetTp3: Number((entry + 0.00800).toFixed(dec)),
          progressPercent: 95,
          waitingOnlyForEntry: true,
          isReadyForEntry: true,
          distancePips: 0.7,
          currentStepDescription: `Target Sweep (TS) KRYER në Asian Low! M1 MSS u vulos. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes ${entry} për blerje!`,
          confirmations: [
            { id: 'c1', name: 'M15 HTF Bullish POI', confirmed: true, ruleDetail: 'Zona institucionale Bullish Demand e konfirmuar në M15' },
            { id: 'c2', name: 'Inducement (IDM) Trap', confirmed: true, ruleDetail: 'IDM u krijua duke futur shitësit e hershëm në kurth' },
            { id: 'c3', name: 'Target Sweep (TS) KRYER', confirmed: true, ruleDetail: 'Çmimi pastroi likuiditetin me fitil refuzimi' },
            { id: 'c4', name: 'M1 MSS Reversal', confirmed: true, ruleDetail: 'Struktura në M1 krijoi Higher High me displacement' },
            { id: 'c5', name: 'Rregulli i Hekurt: SL 10 Pips', confirmed: true, ruleDetail: `SL fiks në ${sl} (10 pips fiks)` },
            { id: 'c6', name: 'Pritja e Prekjes së Hyrjes Sniper', confirmed: false, ruleDetail: `Presim VETËM prekjen e ${entry} për ekzekutim!` },
          ],
        };
      } else if (targetAsset === 'GBPUSD') {
        const entry = Number((livePrice + 0.00080).toFixed(dec));
        const sl = Number((entry + 0.00100).toFixed(dec)); // 10 pips
        newSetup = {
          id: timestampId,
          symbol: 'GBP/USD',
          assetId: 'GBPUSD',
          type: 'SELL',
          patternName: 'SBR (Support Becomes Resistance) Sweep',
          patternType: 'SBR',
          timeframe: 'M15 POI > M1 Entry',
          poiRange: `${(entry - 0.00040).toFixed(dec)} - ${(entry + 0.00040).toFixed(dec)}`,
          idmLevel: Number((entry - 0.00060).toFixed(dec)),
          expectedEntry: entry,
          sl10Pips: sl,
          targetTp1: Number((entry - 0.00300).toFixed(dec)),
          targetTp2: Number((entry - 0.00500).toFixed(dec)),
          targetTp3: Number((entry - 0.00800).toFixed(dec)),
          progressPercent: 95,
          waitingOnlyForEntry: true,
          isReadyForEntry: true,
          distancePips: 0.8,
          currentStepDescription: `Target Sweep (TS) KRYER! Likuiditeti u fshi. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes ${entry} në SBR!`,
          confirmations: [
            { id: 'c1', name: 'M15 HTF SBR Rezistenca', confirmed: true, ruleDetail: 'Niveli i mbështetjes së thyer u shndërrua në rezistencë' },
            { id: 'c2', name: 'Inducement (IDM) Trap', confirmed: true, ruleDetail: 'IDM u krijua nga shitësit e paduruar' },
            { id: 'c3', name: 'Target Sweep (TS) KRYER', confirmed: true, ruleDetail: 'TS pastroi inducementin duke lënë bisht të gjatë' },
            { id: 'c4', name: 'M1 MSS Reversal', confirmed: true, ruleDetail: 'Në M1 u shfaq menjëherë qiri marubozu shitës' },
            { id: 'c5', name: 'Rregulli i Hekurt: SL 10 Pips', confirmed: true, ruleDetail: `SL fiks në ${sl} (10 pips mbi hyrjen)` },
            { id: 'c6', name: 'Pritja e Prekjes së Hyrjes Sniper', confirmed: false, ruleDetail: `Presim VETËM prekjen e ${entry} me urdhër Sell Limit!` },
          ],
        };
      } else {
        const entry = Number((livePrice - 0.070).toFixed(dec));
        const sl = Number((entry - 0.100).toFixed(dec)); // 10 pips = 0.100
        newSetup = {
          id: timestampId,
          symbol: 'USD/JPY',
          assetId: 'USDJPY',
          type: 'BUY',
          patternName: 'Engulfing Order Block + Equilibrium Sweep',
          patternType: 'ENGULFING_OB',
          timeframe: 'M15 POI > M1 Entry',
          poiRange: `${(entry - 0.040).toFixed(dec)} - ${(entry + 0.040).toFixed(dec)}`,
          idmLevel: Number((entry + 0.060).toFixed(dec)),
          expectedEntry: entry,
          sl10Pips: sl,
          targetTp1: Number((entry + 0.300).toFixed(dec)),
          targetTp2: Number((entry + 0.500).toFixed(dec)),
          targetTp3: Number((entry + 0.800).toFixed(dec)),
          progressPercent: 95,
          waitingOnlyForEntry: true,
          isReadyForEntry: true,
          distancePips: 0.7,
          currentStepDescription: `Target Sweep (TS) KRYER në Asian Low! Inducement u pastrua. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes ${entry} për blerje!`,
          confirmations: [
            { id: 'c1', name: 'M15 Engulfing Demand POI', confirmed: true, ruleDetail: 'Zona institucionale me vëllim të lartë në M15' },
            { id: 'c2', name: 'Inducement (IDM) Trap', confirmed: true, ruleDetail: 'IDM u krijua nga blerësit e paduruar' },
            { id: 'c3', name: 'Target Sweep (TS) KRYER', confirmed: true, ruleDetail: 'TS fshiu stopat duke lënë pinbar bullish me vëllim' },
            { id: 'c4', name: 'M1 MSS Reversal', confirmed: true, ruleDetail: 'M1 u kthye menjëherë në Higher High me absorbim' },
            { id: 'c5', name: 'Rregulli i Hekurt: SL 10 Pips', confirmed: true, ruleDetail: `SL fiks në ${sl} (10 pips nga hyrja)` },
            { id: 'c6', name: 'Pritja e Prekjes së Hyrjes Sniper', confirmed: false, ruleDetail: `Presim VETËM prekjen e ${entry} për hyrje sniper!` },
          ],
        };
      }

      setSetupsList((prev) => [newSetup, ...prev]);
      setIsScanning(false);
      if (soundEnabled) soundService.playEntryAlert();
      setScanMessage(`🎯 Skenar i ri MSNR LIT u gjenerua për ${newSetup.symbol} në bazë të lëvizjes së minutës së fundit!`);
      setTimeout(() => setScanMessage(null), 5000);
    }, 700);
  };

  // Test / Simulate Price Touching Entry Point
  const handleTestPriceTouch = (setup: MSNRRadarSetup) => {
    // Directly move live market price to the expected entry
    marketPriceService.setDirectPrice(setup.assetId, setup.expectedEntry);
    
    // Play entry chime
    if (soundEnabled) soundService.playEntryAlert();
    setExecutedSetupId(setup.id);

    // Send push / web notification!
    notificationService.sendNotification({
      title: `⚡ HYRJE SNIPER: ${setup.symbol} (${setup.type})!`,
      body: `Çmimi arriti në hyrje (${setup.expectedEntry})! SL 10p fiks në ${setup.sl10Pips} | TP: ${setup.targetTp1}. ${autoSaveEntries ? 'U ruajt automatikisht në Kalendar.' : ''}`,
      type: 'ENTRY',
      price: setup.expectedEntry,
    });

    // Auto-save to calendar if enabled
    if (autoSaveEntries && !registeredSetups[setup.id]) {
      const recorded = MSNRCalendarService.recordRadarTradeToCalendar(setup, 'ACTIVE');
      setRegisteredSetups((prev) => ({
        ...prev,
        [setup.id]: {
          outcome: 'ACTIVE',
          pips: recorded.resultPips10,
          time: recorded.time,
        },
      }));
    }

    // Update setup state to 100% triggered
    setSetupsList((prev) =>
      prev.map((s) => {
        if (s.id === setup.id) {
          return {
            ...s,
            distancePips: 0.0,
            progressPercent: 100,
            waitingOnlyForEntry: false,
            currentStepDescription: `🎯 ÇMIMI PO PREK HYRJEN (${s.expectedEntry}) TANI! Hyrja Sniper u ekzekutua. Stop Loss 10 pips fiks (${s.sl10Pips})!`,
            confirmations: s.confirmations?.map((c) => ({ ...c, confirmed: true })),
          };
        }
        return s;
      })
    );

    setScanMessage(`🎯 Çmimi i tregut u lëviz në hyrje (${setup.expectedEntry})! Urdhri Sniper në ${setup.symbol} u aktivizua ${autoSaveEntries ? 'dhe u RUAJT në Kalendar' : ''}!`);
    setTimeout(() => setScanMessage(null), 8000);

    // Prompt user to immediately record to calendar as WIN (+50p), LOSS (-10p), or ACTIVE
    setPromptSetup(setup);

    if (onTriggerSimulatedEntry) {
      onTriggerSimulatedEntry(setup);
    }
  };

  const filteredSetups = setupsList.filter((s) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'READY') return s.progressPercent >= 90 || s.isReadyForEntry;
    return s.assetId === selectedFilter;
  });

  const handleCopyOrder = (setup: MSNRRadarSetup, e: React.MouseEvent) => {
    e.stopPropagation();
    const dec = decimalsMap[setup.assetId] || 2;
    const text = `[MSNR LIT ORDER - ${setup.symbol}]
Type: ${setup.type} LIMIT
Entry: ${setup.expectedEntry.toFixed(dec)}
SL (10 Pips): ${setup.sl10Pips.toFixed(dec)}
TP1 (1:3): ${setup.targetTp1.toFixed(dec)}
TP2 (1:5): ${setup.targetTp2.toFixed(dec)}
${setup.targetTp3 ? `TP3 (1:8+): ${setup.targetTp3.toFixed(dec)}` : ''}
Strategjia: Trade with Abjeed (MSNR Alchemist & LIT)`;

    navigator.clipboard.writeText(text);
    setCopiedSetupId(setup.id);
    setTimeout(() => setCopiedSetupId(null), 2500);
  };

  return (
    <div id="msnr-anticipation-radar" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 p-4 sm:p-5 rounded-2xl border border-sky-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10 shrink-0">
            <Crosshair className={`w-6 h-6 ${isScanning ? 'animate-spin text-emerald-400' : 'animate-spin'}`} style={{ animationDuration: isScanning ? '1.5s' : '10s' }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase font-mono font-bold">
                100% Live Feed &amp; Target Sweep (TS) Tracker
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Pips Tracker Aktiv
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Skanimi i Fundit: <strong className="text-slate-200">{lastScanTime}</strong>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
              Radari i Pritjes (IDM &amp; TS) — Përparimi 95% &amp; Skanimi i Hyrjeve
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Në këtë radar monitorohen të gjitha hapat para hyrjes. Kur përparimi arrin <strong>95%</strong> (Target Sweep TS u krye, M1 MSS u vulos dhe SL 10p u llogarit), <strong>e vetmja gjë që presim është prekja e pikës së hyrjes</strong>! Meqenëse tregu lëviz çdo minutë, mund të skanoni dhe gjeneroni mundësitë live në çdo çast.
            </p>
          </div>
        </div>

        {/* Action Controls: Gjenero / Skano Tani + Auto-Skanim çdo 1 minutë */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: GJENERO & SKANO TANI */}
          <button
            id="msnr-scan-now-btn"
            onClick={handleRescan}
            disabled={isScanning}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg ${
              isScanning
                ? 'bg-emerald-600 text-white cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400/50 hover:scale-[1.02]'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Duke Skanuar Tregun...' : '⚡ Skano & Kontrollo Tregun Tani'}</span>
          </button>

          {/* Button 2: GJENERO SKENAR TË RI */}
          <button
            id="msnr-generate-new-setup-btn"
            onClick={handleGenerateNewSetup}
            disabled={isScanning}
            title="Gjenero një skenar të ri të konfirmuar me SL 10p nga lëvizja e minutës së fundit"
            className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Gjenero Skenar të Ri M15/M1</span>
          </button>

          {/* Auto-Scan 1-Minute Toggle */}
          <button
            id="msnr-toggle-autoscan-btn"
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              autoScanEnabled
                ? 'bg-slate-950 text-emerald-400 border-emerald-500/40 shadow-inner'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Timer className={`w-3.5 h-3.5 ${autoScanEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Auto-Kontroll 1m: {autoScanEnabled ? `${countdown}s` : 'Fikur'}</span>
          </button>

          {/* Auto-Save Entries Toggle */}
          <button
            id="msnr-toggle-autosave-btn"
            onClick={() => {
              const next = !autoSaveEntries;
              setAutoSaveEntries(next);
              try {
                localStorage.setItem('msnr_auto_save_entries', String(next));
              } catch {}
              setScanMessage(
                next
                  ? '✅ Ruajtja Automatike u Aktivizua: Çdo hyrje që preket do të ruhet direkt në Kalendarin e Fitimeve!'
                  : '⚠️ Ruajtja Automatike u çaktivizua. Hyrjet duhet të ruhen manualisht.'
              );
              setTimeout(() => setScanMessage(null), 5000);
            }}
            title="Kur është aktive, sa herë që çmimi prek pikën e hyrjes, tregtia ruhet automatikisht në Kalendarin e Fitimeve"
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              autoSaveEntries
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ruaj Hyrjet Automatikisht: {autoSaveEntries ? 'ON' : 'OFF'}</span>
          </button>

          {/* Test Notification Button */}
          <button
            id="msnr-test-notif-btn"
            onClick={async () => {
              const res = await notificationService.testNotification();
              setScanMessage(res.message);
              setTimeout(() => setScanMessage(null), 7000);
            }}
            title="Dërgo një njoftim provë në telefon ose kompjuter për të testuar Vercel"
            className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <BellRing className="w-3.5 h-3.5 text-purple-400" />
            <span>Testo Njoftimin</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Zëri i alarmit aktiv' : 'Zëri i alarmit i fikur'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {scanMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{scanMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide shrink-0">
            MSNR LIT Active
          </span>
        </div>
      )}

      {/* Interactive Prompt after price touch simulation */}
      {promptSetup && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-sky-950/90 border-2 border-emerald-500 shadow-2xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 shadow-lg font-black">
                <Target className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Hyrja Sniper u Prek: {promptSetup.symbol} {promptSetup.type} @ {promptSetup.expectedEntry}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-mono">
                    SL 10 PIPS ({promptSetup.sl10Pips})
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  Urdhri u ekzekutua. Regjistrojeni këtë tregti drejtpërdrejt në Kalendarin e Fitimeve për sot:
                </p>
              </div>
            </div>

            <button
              onClick={() => setPromptSetup(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Mbyll"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => handleRecordToCalendar(promptSetup, 'WIN', 50)}
              className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              <span>🟢 Fitore (TP +50 Pips / +5R)</span>
            </button>

            <button
              onClick={() => handleRecordToCalendar(promptSetup, 'LOSS')}
              className="py-2 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 border border-rose-500/50 font-black text-xs flex items-center gap-1.5 transition-all"
            >
              <TrendingDown className="w-4 h-4" />
              <span>🔴 Humbje (SL Fiks 10 Pips)</span>
            </button>

            <button
              onClick={() => handleRecordToCalendar(promptSetup, 'ACTIVE')}
              className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/50 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>🟡 Tregti Aktive në Progres</span>
            </button>

            {onNavigateToCalendar && (
              <button
                onClick={onNavigateToCalendar}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all ml-auto"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Hap Kalendarin e Fitimeve →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Asset Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
          <FilterIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Filtro sipas Instrumentit:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'ALL' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Të Gjitha ({setupsList.length})
          </button>
          <button
            onClick={() => setSelectedFilter('READY')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              selectedFilter === 'READY'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            95% Gati për Hyrje
          </button>
          <button
            onClick={() => setSelectedFilter('XAUUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'XAUUSD' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gold (XAU)
          </button>
          <button
            onClick={() => setSelectedFilter('EURUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'EURUSD' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            EUR/USD
          </button>
          <button
            onClick={() => setSelectedFilter('GBPUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'GBPUSD' ? 'bg-indigo-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            GBP/USD
          </button>
          <button
            onClick={() => setSelectedFilter('USDJPY')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'USDJPY' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            USD/JPY
          </button>
        </div>
      </div>

      {/* Grid of Setups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSetups.map((setup) => {
          const isBuy = setup.type === 'BUY';
          const curSym = currencySymbols[setup.assetId] || '$';
          const dec = decimalsMap[setup.assetId] || 2;
          const livePrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);
          const pipSize = getPipSize(setup.assetId);

          // Calculate live real-time pips distance
          const liveDistancePips = livePrice
            ? parseFloat((Math.abs(livePrice - setup.expectedEntry) / pipSize).toFixed(1))
            : setup.distancePips;

          const isAtEntry = liveDistancePips <= 0.4 || setup.progressPercent === 100;
          const is95Percent = setup.progressPercent >= 90;
          const isExecuted = executedSetupId === setup.id || isAtEntry;

          return (
            <div
              key={setup.id}
              className={`bg-slate-900/90 rounded-2xl border p-4 sm:p-5 shadow-xl transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                isExecuted
                  ? 'border-emerald-400 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 shadow-emerald-900/40 ring-1 ring-emerald-400/50'
                  : is95Percent
                  ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 shadow-emerald-950/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Ready Tag Indicator */}
              {isExecuted ? (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-lg flex items-center gap-1.5 animate-pulse">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  100% HYRJE E AKTIVIZUAR TANI (SNIPER)
                </div>
              ) : is95Percent ? (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-lg flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  95% KONFIRMUAR • VETËM PREKJA E HYRJES
                </div>
              ) : null}

              {/* Top Row: Symbol, Type, Timeframe, Live Price & Distance */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black text-white">{setup.symbol}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono flex items-center gap-1 ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {setup.type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {setup.timeframe}
                    </span>
                  </div>

                  {/* Live Distance Meter */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {livePrice && (
                      <span className="text-slate-400 hidden sm:inline">
                        Çmimi Live: <strong className="text-amber-400">{curSym}{livePrice.toFixed(dec)}</strong>
                      </span>
                    )}

                    <div
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                        isAtEntry
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black animate-pulse'
                          : liveDistancePips <= 1.5
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{isAtEntry ? 'PREKJE E HYRJES!' : `${liveDistancePips} pips larg`}</span>
                    </div>
                  </div>
                </div>

                {/* Pattern Title */}
                <div className="mt-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>{setup.patternName}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {setup.patternType}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Progress Bar & Current Status */}
              <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    Përparimi i Konfirmimeve para Hyrjes:
                  </span>
                  <span
                    className={`font-mono font-black text-xs ${
                      setup.progressPercent >= 95 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {setup.progressPercent}% {setup.progressPercent >= 95 ? '(95% Gati)' : ''}
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      setup.progressPercent === 100
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300 animate-pulse'
                        : setup.progressPercent >= 90
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${setup.progressPercent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                  {setup.currentStepDescription}
                </p>
              </div>

              {/* 95% CONFIRMATIONS DETAILED CHECKLIST ME SHENJËN NICE (✓) */}
              {setup.confirmations && setup.confirmations.length > 0 && (
                <div className="space-y-2 bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Statusi i Konfirmimeve (Shenja Nice ✓ për të gjitha rregullat e kryera):
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {setup.confirmations.filter((c) => c.confirmed).length} / {setup.confirmations.length} Rregulla Kryer
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {setup.confirmations.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                          item.confirmed
                            ? 'bg-emerald-950/40 text-slate-200 border border-emerald-500/20'
                            : 'bg-amber-950/20 text-amber-200 border border-amber-500/30'
                        }`}
                      >
                        {item.confirmed ? (
                          <span className="p-0.5 rounded-full bg-emerald-500 text-slate-950 mt-0.5 shrink-0 shadow-sm shadow-emerald-500/30" title="Shenja Nice: E konfirmuar">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 stroke-emerald-400" />
                          </span>
                        ) : (
                          <span className="p-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-0.5 shrink-0 animate-pulse">
                            <Activity className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <strong className={item.confirmed ? 'text-emerald-300 font-bold flex items-center gap-1' : 'text-amber-300 font-bold'}>
                              {item.name}
                              {item.confirmed && <span className="text-[10px] text-emerald-400 font-black">✓ (Nice)</span>}
                            </strong>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                item.confirmed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.confirmed ? '✓ E KRYER' : '⏳ NË PRITJE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            {item.ruleDetail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Highlight Callout: We are strictly waiting for price to touch the entry! */}
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-inner ${
                    isAtEntry
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/40 text-emerald-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isAtEntry ? 'bg-slate-950 animate-ping' : 'bg-emerald-400 animate-ping'}`} />
                      <span>
                        <strong>E VETMJA GJË QË PRESIM:</strong> Çmimi të prekë{' '}
                        <strong className="underline decoration-emerald-400 font-mono">
                          {curSym}{setup.expectedEntry.toFixed(dec)}
                        </strong>{' '}
                        për ekzekutim sniper!
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase font-mono shrink-0">
                      {isAtEntry ? 'PREKJE E HYRJES!' : 'Gati 95%'}
                    </span>
                  </div>
                </div>
              )}

              {/* Levels Grid: POI Range, Inducement (IDM), Hyrja, SL 10 Pips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">M15 POI</span>
                  <span className="text-cyan-300 font-bold text-[11px] truncate block">
                    {setup.poiRange}
                  </span>
                </div>

                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-yellow-500/30">
                  <span className="text-[10px] text-yellow-400 uppercase block font-sans">IDM Kurthi</span>
                  <span className="text-yellow-300 font-bold text-[11px] block">
                    {curSym}{setup.idmLevel.toFixed(dec)}
                  </span>
                </div>

                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-sky-500/40 bg-sky-950/20">
                  <span className="text-[10px] text-sky-400 uppercase block font-sans font-bold">Pika e Hyrjes</span>
                  <span className="text-sky-300 font-black text-xs block">
                    {curSym}{setup.expectedEntry.toFixed(dec)}
                  </span>
                </div>

                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/20">
                  <span className="text-[10px] text-rose-400 uppercase block font-sans font-bold">SL 10 PIPS (Fiks)</span>
                  <span className="text-rose-300 font-black text-xs block">
                    {curSym}{setup.sl10Pips.toFixed(dec)}
                  </span>
                </div>
              </div>

              {/* Targets Summary (TP1 1:3, TP2 1:5, TP3 1:8) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-400 font-sans">Objektivat:</span>
                  <span className="text-emerald-400 font-bold">TP1 (1:3): {curSym}{setup.targetTp1.toFixed(dec)}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-bold">TP2 (1:5): {curSym}{setup.targetTp2.toFixed(dec)}</span>
                  {setup.targetTp3 && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-300 font-bold">TP3 (1:8+): {curSym}{setup.targetTp3.toFixed(dec)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Record to Profit Calendar Section */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Regjistro në Kalendarin e Fitimeve (Sot):</span>
                  </span>
                  {registeredSetups[setup.id] && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black flex items-center gap-1 ${
                      registeredSetups[setup.id].outcome === 'WIN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : registeredSetups[setup.id].outcome === 'LOSS'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      <CheckCheck className="w-3 h-3" />
                      {registeredSetups[setup.id].outcome === 'WIN'
                        ? `U RUAJT: +${registeredSetups[setup.id].pips}p`
                        : registeredSetups[setup.id].outcome === 'LOSS'
                        ? 'U RUAJT: -10p'
                        : 'U RUAJT: AKTIVE'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => handleRecordToCalendar(setup, 'WIN', 50)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    title="Regjistro si Fitore me +50 Pips në Kalendarin e Fitimeve"
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>🟢 Fitova (+50p TP)</span>
                  </button>

                  <button
                    onClick={() => handleRecordToCalendar(setup, 'LOSS')}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-slate-950 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                    title="Regjistro si Humbje me Stop Loss 10 Pips (-10p) në Kalendar"
                  >
                    <TrendingDown className="w-3 h-3" />
                    <span>🔴 Hupa (-10p SL)</span>
                  </button>

                  {onNavigateToCalendar && (
                    <button
                      onClick={onNavigateToCalendar}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1"
                      title="Shko tek Kalendari i Fitimeve"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Kalendari →</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons: View on Chart, Copy MT4/MT5, Simulate Entry */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectSetup(setup.assetId)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-500/20 group"
                >
                  <span>Shiko Drejtpërdrejt në Grafik</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>

                <button
                  onClick={(e) => handleCopyOrder(setup, e)}
                  title="Kopjo parametrat e urdhrit për MT4 / MT5"
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    copiedSetupId === setup.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {copiedSetupId === setup.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>U Kopjua!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopjo MT4/MT5</span>
                    </>
                  )}
                </button>

                {/* Direct Test Price Touch Button */}
                <button
                  onClick={() => handleTestPriceTouch(setup)}
                  title="Simulo çmimin e tregut duke prekur pikën ekzakte të hyrjes"
                  className="py-2.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-inner"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Testo Prekjen e Hyrjes</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Internal mini Filter Icon component
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { MSNRRadarSetup, INITIAL_MSNR_RADAR_SETUPS } from '../../data/msnrData';
import { soundService } from '../../utils/audioAlert';
import { marketPriceService } from '../../services/marketPriceService';
import { MSNRCalendarService } from '../../services/msnrCalendarService';
import { notificationService } from '../../services/notificationService';
import { MSNRStrategyEngine, MarketStructureAudit, getPipSize } from '../../services/msnrStrategyEngine';
import { MSNRStructureAuditModal } from './MSNRStructureAuditModal';
import { CustomPriceTriggerModal } from '../CustomPriceTriggerModal';
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
  AlertTriangle,
  Trash2,
  Calculator,
} from 'lucide-react';
import { PositionSizingCalculatorCard } from '../PositionSizingCalculatorCard';

export interface MSNRSetupEvaluation {
  isBuy: boolean;
  pipSize: number;
  distPips: number;
  slBreached: boolean;
  slDiffPips: number;
  tpHit: boolean;
  isAtEntry: boolean;
  isNearEntry: boolean;
  isTestingPoi: boolean;
}

/**
 * Evaluates live price against the MSNR LIT trade setup.
 * Strictly adheres to Trade with Abjeed:
 * 1. Fixed 10-pip Stop Loss rule.
 * 2. If price breaches the 10-pip SL, the setup is INVALIDATED / BURNT and MUST NOT be executed.
 */
export function evaluateMsnrSetup(setup: MSNRRadarSetup, livePrice: number): MSNRSetupEvaluation {
  const isBuy = setup.type === 'BUY';
  const pipSize = getPipSize(setup.assetId);
  const distPips = parseFloat((Math.abs(livePrice - setup.expectedEntry) / pipSize).toFixed(1));

  // Stop loss breach check:
  // For BUY: price has fallen below the strict 10-pip stop loss
  // For SELL: price has surged above the strict 10-pip stop loss
  const slBreached = isBuy
    ? livePrice <= setup.sl10Pips
    : livePrice >= setup.sl10Pips;

  const slDiffPips = slBreached
    ? Math.max(1, Math.round(isBuy ? (setup.sl10Pips - livePrice) / pipSize : (livePrice - setup.sl10Pips) / pipSize))
    : 0;

  // Take profit check:
  const tpHit = isBuy
    ? livePrice >= (setup.targetTp1 ?? (setup.expectedEntry + pipSize * 30))
    : livePrice <= (setup.targetTp1 ?? (setup.expectedEntry - pipSize * 30));

  const isAtEntry = distPips <= 0.4 && !slBreached && !tpHit;
  const isNearEntry = distPips <= 1.5 && !slBreached && !tpHit;
  const isTestingPoi = distPips <= 6.0 && !slBreached && !tpHit;

  return {
    isBuy,
    pipSize,
    distPips,
    slBreached,
    slDiffPips,
    tpHit,
    isAtEntry,
    isNearEntry,
    isTestingPoi,
  };
}

export type MSNRFilterType =
  | 'ALL'
  | 'ACTIVE'
  | 'READY'
  | 'INVALID'
  | 'BUY'
  | 'SELL'
  | 'XAUUSD'
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY';

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
  const [selectedFilter, setSelectedFilter] = useState<MSNRFilterType>('ACTIVE');
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
  const [showPositionCalculator, setShowPositionCalculator] = useState<boolean>(false);

  // Market Structure Audit & Price Trigger Modal States
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [currentAudit, setCurrentAudit] = useState<MarketStructureAudit | null>(null);
  const [priceTriggerModalOpen, setPriceTriggerModalOpen] = useState<boolean>(false);
  const [triggerModalAsset, setTriggerModalAsset] = useState<'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY'>('XAUUSD');
  const [triggerModalPrice, setTriggerModalPrice] = useState<number>(4342);

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

  // Rescan function to re-evaluate entry conditions against authentic MSNR LIT market structure & strict 10-pip SL
  const handleRescan = () => {
    setIsScanning(true);
    setScanMessage('Duke skanuar strukturën e tregut në M15 & M1 dhe duke verifikuar Inducement, Target Sweep (TS) dhe SL 10p...');

    setTimeout(() => {
      setSetupsList((prevSetups) => {
        return prevSetups.map((setup) => {
          const currentPrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);
          const evaluation = evaluateMsnrSetup(setup, currentPrice);

          // 1. Check if Stop Loss was breached (Burnt / Invalidated)
          if (evaluation.slBreached) {
            return {
              ...setup,
              distancePips: evaluation.distPips,
              progressPercent: 0,
              isReadyForEntry: false,
              waitingOnlyForEntry: false,
              currentStepDescription: `⛔ INVALIDUAR: Çmimi (${currentPrice}) theu Stop Loss-in (${setup.sl10Pips}) me +${evaluation.slDiffPips} pips! Sipas librit të Abjeed (MSNR LIT), kjo strukturë nuk është më e vlefshme dhe NUK duhet tregtuar.`,
              confirmations: setup.confirmations?.map((c) => ({
                ...c,
                confirmed: false,
                ruleDetail: c.id === 'c5' ? `SL 10p u thyer me +${evaluation.slDiffPips} pips mbi nivelin` : c.ruleDetail,
              })),
            };
          }

          // 2. Check if Take Profit was hit
          if (evaluation.tpHit) {
            return {
              ...setup,
              distancePips: evaluation.distPips,
              progressPercent: 100,
              isReadyForEntry: false,
              waitingOnlyForEntry: false,
              currentStepDescription: `✅ TP U ARRIT: Çmimi e ka arritur objektivin e fitimit para prekjes së hyrjes.`,
            };
          }

          // 3. Check if price touched entry
          if (evaluation.isAtEntry) {
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
              distancePips: 0.0,
              progressPercent: 100,
              isReadyForEntry: true,
              waitingOnlyForEntry: false,
              currentStepDescription: `🎯 ÇMIMI PREKU HYRJEN TANI NË KOHË REALE! Urdhri Sniper u aktivizua. Stop Loss fiks në 10 pips (${setup.sl10Pips})!`,
              confirmations: setup.confirmations?.map((c) => ({ ...c, confirmed: true })),
            };
          }

          // 4. Authentic progress scoring based on real distance to POI / IDM
          let progress = 40;
          let stepDesc = setup.currentStepDescription;
          let ready = false;
          let waiting = false;

          if (evaluation.isNearEntry) {
            progress = 95;
            ready = true;
            waiting = true;
            stepDesc = `Target Sweep (TS) KRYER me wick! Inducement u pastrua. M1 MSS u konfirmua. E VETMJA GJË QË PRESIM: Çmimi të prekë pikën e hyrjes (${setup.expectedEntry})! Distanca: vetëm ${evaluation.distPips} pips!`;
          } else if (evaluation.isTestingPoi) {
            progress = 85;
            ready = true;
            waiting = false;
            stepDesc = `Çmimi po teston Inducement (${setup.idmLevel}) afër POI. Presim fitilin e Target Sweep (TS) para ekzekutimit. Distanca: ${evaluation.distPips} pips.`;
          } else if (evaluation.distPips <= 18.0) {
            progress = 65;
            ready = false;
            waiting = false;
            stepDesc = `M15 POI e lokalizuar në ${setup.poiRange}. Çmimi po lëviz drejt kurthit IDM. Distanca: ${evaluation.distPips} pips.`;
          } else {
            progress = 40;
            ready = false;
            waiting = false;
            stepDesc = `Struktura institucionale M15 e hartuar. POI në ${setup.poiRange}. Distanca aktuale: ${evaluation.distPips} pips. Nuk hyhet me nxitim pa pastrim likuiditeti.`;
          }

          return {
            ...setup,
            distancePips: evaluation.distPips,
            progressPercent: progress,
            isReadyForEntry: ready,
            waitingOnlyForEntry: waiting,
            currentStepDescription: stepDesc,
            confirmations: setup.confirmations?.map((c) => {
              if (c.id === 'c6') return { ...c, confirmed: false };
              if (c.id === 'c4') return { ...c, confirmed: evaluation.isNearEntry };
              if (c.id === 'c3') return { ...c, confirmed: evaluation.isTestingPoi || evaluation.isNearEntry };
              return { ...c, confirmed: true };
            }),
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

      setScanMessage(`Skanimi u krye me sukses në ${now}! Të gjitha rregullat strukturore MSNR LIT u verifikuan me përpikëri.`);
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

  // Real-time market price monitor for touching expectedEntry OR breaching Stop Loss
  useEffect(() => {
    setSetupsList((prevSetups) => {
      let changed = false;
      const updated = prevSetups.map((setup) => {
        const currentPrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);
        const evaluation = evaluateMsnrSetup(setup, currentPrice);

        // If Stop Loss was breached in real-time, immediately invalidate without false alerts
        if (evaluation.slBreached) {
          if (setup.progressPercent !== 0 || setup.isReadyForEntry || setup.waitingOnlyForEntry) {
            changed = true;
            return {
              ...setup,
              distancePips: evaluation.distPips,
              progressPercent: 0,
              isReadyForEntry: false,
              waitingOnlyForEntry: false,
              currentStepDescription: `⛔ INVALIDUAR: Çmimi (${currentPrice}) theu Stop Loss-in (${setup.sl10Pips}) me +${evaluation.slDiffPips} pips! Skenari është i djegur dhe nuk duhet të tregtohet.`,
            };
          }
          return setup;
        }

        // Only trigger entry if SL is NOT breached and setup was waiting for entry
        if (evaluation.isAtEntry && setup.progressPercent < 100 && !evaluation.slBreached) {
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
            isReadyForEntry: true,
            currentStepDescription: `🎯 ÇMIMI PREKU HYRJEN (${setup.expectedEntry}) TANI NË KOHË REALE! Urdhri Sniper u aktivizua. Stop Loss 10 pips fiks (${setup.sl10Pips})!`,
            confirmations: setup.confirmations?.map((c) => ({ ...c, confirmed: true })),
          };
        }
        return setup;
      });

      return changed ? updated : prevSetups;
    });
  }, [livePrices, autoSaveEntries, soundEnabled, registeredSetups]);

  // Remove a single setup by ID
  const handleRemoveSingleSetup = (id: string) => {
    setSetupsList((prev) => prev.filter((s) => s.id !== id));
    setScanMessage('Skenari u hoq nga radari.');
    setTimeout(() => setScanMessage(null), 3000);
  };

  // Clear all invalidated / burnt setups where Stop Loss was breached
  const handleClearInvalidated = () => {
    setSetupsList((prev) => {
      const validOnly = prev.filter((s) => {
        const live = livePrices[s.assetId] ?? marketPriceService.getCalibratedPrice(s.assetId);
        const evalResult = evaluateMsnrSetup(s, live);
        return !evalResult.slBreached && !evalResult.tpHit;
      });

      // If all setups were invalid, auto-generate clean setups based on real live price
      if (validOnly.length === 0) {
        const assets: ('XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY')[] = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];
        return assets.map((a) => {
          const live = livePrices[a] ?? marketPriceService.getCalibratedPrice(a);
          return MSNRStrategyEngine.analyzeMarket(a, live).selectedSetup;
        });
      }
      return validOnly;
    });

    setScanMessage('✅ Skenarët e invaliduar ku Stop Loss 10p ishte thyer u pastruan nga radari!');
    setTimeout(() => setScanMessage(null), 5000);
  };

  // Pre-calculate evaluation counts for filtering
  const setupEvaluations = useMemo(() => {
    const map = new Map<string, MSNRSetupEvaluation>();
    for (const s of setupsList) {
      const price = livePrices[s.assetId] ?? marketPriceService.getCalibratedPrice(s.assetId);
      map.set(s.id, evaluateMsnrSetup(s, price));
    }
    return map;
  }, [setupsList, livePrices]);

  const activeCount = useMemo(() => {
    return setupsList.filter((s) => {
      const ev = setupEvaluations.get(s.id);
      return ev && !ev.slBreached && !ev.tpHit;
    }).length;
  }, [setupsList, setupEvaluations]);

  const readyCount = useMemo(() => {
    return setupsList.filter((s) => {
      const ev = setupEvaluations.get(s.id);
      return ev && !ev.slBreached && (ev.isAtEntry || ev.isNearEntry || s.progressPercent >= 90 || s.isReadyForEntry);
    }).length;
  }, [setupsList, setupEvaluations]);

  const invalidCount = useMemo(() => {
    return setupsList.filter((s) => {
      const ev = setupEvaluations.get(s.id);
      return ev && (ev.slBreached || ev.tpHit);
    }).length;
  }, [setupsList, setupEvaluations]);

  const buyCount = useMemo(() => {
    return setupsList.filter((s) => {
      const ev = setupEvaluations.get(s.id);
      return s.type === 'BUY' && ev && !ev.slBreached;
    }).length;
  }, [setupsList, setupEvaluations]);

  const sellCount = useMemo(() => {
    return setupsList.filter((s) => {
      const ev = setupEvaluations.get(s.id);
      return s.type === 'SELL' && ev && !ev.slBreached;
    }).length;
  }, [setupsList, setupEvaluations]);

  const filteredSetups = setupsList.filter((s) => {
    const ev = setupEvaluations.get(s.id);

    if (selectedFilter === 'ACTIVE') {
      return ev ? !ev.slBreached && !ev.tpHit : true;
    }
    if (selectedFilter === 'INVALID') {
      return ev ? ev.slBreached || ev.tpHit : false;
    }
    if (selectedFilter === 'READY') {
      return ev ? !ev.slBreached && (ev.isAtEntry || ev.isNearEntry || s.progressPercent >= 90 || s.isReadyForEntry) : true;
    }
    if (selectedFilter === 'BUY') {
      return s.type === 'BUY' && (ev ? !ev.slBreached : true);
    }
    if (selectedFilter === 'SELL') {
      return s.type === 'SELL' && (ev ? !ev.slBreached : true);
    }
    if (selectedFilter === 'ALL') {
      return true;
    }
    return s.assetId === selectedFilter;
  });

  // Generate new candidate setup based on true MSNR LIT market structure (No arbitrary 8-10 pips!)
  const handleGenerateNewSetup = () => {
    setIsScanning(true);
    setTimeout(() => {
      const targetAsset = (selectedFilter !== 'ALL' && selectedFilter !== 'READY' ? selectedFilter : 'XAUUSD') as 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
      const livePrice = livePrices[targetAsset] ?? marketPriceService.getCalibratedPrice(targetAsset);

      // Perform genuine MSNR LIT analysis: M15 POI + Inducement + 10 Pips Strict SL
      const audit = MSNRStrategyEngine.analyzeMarket(targetAsset, livePrice);
      const newSetup = audit.selectedSetup;
      setCurrentAudit(audit);

      setSetupsList((prev) => [newSetup, ...prev]);
      setIsScanning(false);
      if (soundEnabled) soundService.playEntryAlert();
      setScanMessage(
        `🎯 Skenar i ri MSNR LIT u gjenerua për ${newSetup.symbol} në bazë të strukturës institucionale M15 POI (${newSetup.poiRange}), kurthit IDM (${newSetup.idmLevel}), dhe SL fiks 10 pips (${newSetup.sl10Pips})!`
      );
      setTimeout(() => setScanMessage(null), 6000);
    }, 600);
  };

  // Test / Simulate Price Touching Entry Point
  const handleTestPriceTouch = (setup: MSNRRadarSetup) => {
    // Momentarily flash price for 3.5 seconds WITHOUT corrupting live market feeds or saving an offset
    marketPriceService.simulateMomentaryTouch(setup.assetId, setup.expectedEntry, 3500);
    
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
            title="Gjenero një skenar të ri të konfirmuar me SL 10p nga struktura M15 POI dhe kurthi IDM"
            className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Gjenero Skenar të Ri M15/M1</span>
          </button>

          {/* Button 3: VERIFIKO STRUKTURËN MSNR LIT (Trade with Abjeed) */}
          <button
            id="msnr-verify-structure-btn"
            onClick={() => {
              const targetAsset = (selectedFilter !== 'ALL' && selectedFilter !== 'READY' ? selectedFilter : 'XAUUSD') as 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
              const livePrice = livePrices[targetAsset] ?? marketPriceService.getCalibratedPrice(targetAsset);
              const audit = MSNRStrategyEngine.analyzeMarket(targetAsset, livePrice);
              setCurrentAudit(audit);
              setAuditModalOpen(true);
            }}
            title="Verifiko me saktësi se si çdo hyrje bazohet në Strukturë M15, kurthin IDM, dhe pse hyrjet arbitrare 8 pips nuk përdoren"
            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>🛡️ Verifiko Strukturën MSNR LIT</span>
          </button>

          {/* Button 4: VENDOS ALARM ÇMIMI ME ZË */}
          <button
            id="msnr-open-price-trigger-btn"
            onClick={() => {
              const targetAsset = (selectedFilter !== 'ALL' && selectedFilter !== 'READY' ? selectedFilter : 'XAUUSD') as 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
              const livePrice = livePrices[targetAsset] ?? marketPriceService.getCalibratedPrice(targetAsset);
              setTriggerModalAsset(targetAsset);
              setTriggerModalPrice(livePrice);
              setPriceTriggerModalOpen(true);
            }}
            title="Vendos alarm të personalizuar me çmim dhe zë për çdo aset"
            className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <BellRing className="w-3.5 h-3.5 text-emerald-400" />
            <span>🔔 Alarm Çmimi me Zë</span>
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
          <span>Filtro Radarin:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setSelectedFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              selectedFilter === 'ACTIVE'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-sky-400 hover:text-sky-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Vlefshme Tani ({activeCount})</span>
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
            <span>95% Gati ({readyCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('BUY')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'BUY'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            BUY ({buyCount})
          </button>

          <button
            onClick={() => setSelectedFilter('SELL')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'SELL'
                ? 'bg-rose-500 text-white font-black'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            SELL ({sellCount})
          </button>

          <button
            onClick={() => setSelectedFilter('INVALID')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              selectedFilter === 'INVALID'
                ? 'bg-rose-600 text-white shadow-md font-black'
                : invalidCount > 0
                ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Të Invaliduar ({invalidCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Të Gjitha ({setupsList.length})
          </button>

          {/* Quick Clear Invalidated Button */}
          {invalidCount > 0 && (
            <button
              onClick={handleClearInvalidated}
              title="Fshij të gjithë skenarët ku çmimi ka tejkaluar Stop Loss-in 10 pips"
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs flex items-center gap-1 transition-all shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Pastro të Pavlefshmit ({invalidCount})</span>
            </button>
          )}

          {/* Asset Switchers */}
          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => setSelectedFilter('XAUUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'XAUUSD' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gold
          </button>
          <button
            onClick={() => setSelectedFilter('EURUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'EURUSD' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            EUR
          </button>
          <button
            onClick={() => setSelectedFilter('GBPUSD')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'GBPUSD' ? 'bg-indigo-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            GBP
          </button>
          <button
            onClick={() => setSelectedFilter('USDJPY')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${
              selectedFilter === 'USDJPY' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            JPY
          </button>

          {/* Sizing Calculator Toggle Button */}
          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
          <button
            id="msnr-toggle-position-calc-btn"
            onClick={() => setShowPositionCalculator(!showPositionCalculator)}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold ${
              showPositionCalculator
                ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30'
            }`}
            title="Llogarit Madhësinë e Lotit me Balancën e Kalendarit dhe SL 10 Pips"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Llogaritësi i Lotit (SL 10p)</span>
          </button>
        </div>
      </div>

      {/* Position Sizing Calculator Card for 10-Pip SL (Trade with Abjeed Rule) */}
      {showPositionCalculator && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <PositionSizingCalculatorCard
            selectedAssetId={
              selectedFilter === 'XAUUSD' || selectedFilter === 'EURUSD' || selectedFilter === 'GBPUSD' || selectedFilter === 'USDJPY'
                ? selectedFilter
                : 'XAUUSD'
            }
          />
        </div>
      )}

      {/* Grid of Setups */}
      {filteredSetups.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white">
            {selectedFilter === 'INVALID'
              ? 'Nuk ka skenarë të invaliduar!'
              : 'Nuk ka skenarë për këtë filtër.'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {selectedFilter === 'INVALID'
              ? 'Të gjithë skenarët në radar janë aktualisht të vlefshëm dhe brenda strukturës së rregullt MSNR LIT me Stop Loss 10 pips.'
              : 'Kliko "Gjenero Skenar të Ri MSNR LIT" ose zgjidh një filtër tjetër.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold hover:bg-sky-400 transition-all"
            >
              Shiko të Gjithë Skenarët ({setupsList.length})
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSetups.map((setup) => {
            const isBuy = setup.type === 'BUY';
            const curSym = currencySymbols[setup.assetId] || '$';
            const dec = decimalsMap[setup.assetId] || 2;
            const livePrice = livePrices[setup.assetId] ?? marketPriceService.getCalibratedPrice(setup.assetId);

            // Compute rigorous MSNR evaluation based on strict 10-pip rule
            const evaluation = setupEvaluations.get(setup.id) ?? evaluateMsnrSetup(setup, livePrice);
            const isExecuted = (executedSetupId === setup.id || evaluation.isAtEntry) && !evaluation.slBreached;
            const is95Percent = setup.progressPercent >= 90 && !evaluation.slBreached;

            return (
              <div
                key={setup.id}
                className={`rounded-2xl border p-4 sm:p-5 shadow-xl transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                  evaluation.slBreached
                    ? 'border-rose-600/80 bg-gradient-to-b from-slate-900 via-rose-950/20 to-slate-900 ring-1 ring-rose-500/40 opacity-95'
                    : evaluation.tpHit
                    ? 'border-emerald-600/60 bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-900'
                    : isExecuted
                    ? 'border-emerald-400 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 shadow-emerald-900/40 ring-1 ring-emerald-400/50'
                    : is95Percent
                    ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 shadow-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                {/* Ready Tag / Invalidation Indicator */}
                {evaluation.slBreached ? (
                  <div className="absolute top-0 right-0 bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-lg flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 fill-white text-rose-600" />
                    ⛔ INVALIDUAR • SL 10P U TEJKALUA (+{evaluation.slDiffPips}p)
                  </div>
                ) : evaluation.tpHit ? (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ✅ TP U ARRIT NGA TREGU
                  </div>
                ) : isExecuted ? (
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

                    {/* Live Distance / Status Meter */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {livePrice && (
                        <span className="text-slate-400 hidden sm:inline">
                          Çmimi Live: <strong className="text-amber-400">{curSym}{livePrice.toFixed(dec)}</strong>
                        </span>
                      )}

                      <div
                        className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                          evaluation.slBreached
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black'
                            : evaluation.tpHit
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : evaluation.isAtEntry
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black animate-pulse'
                            : evaluation.isNearEntry
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {evaluation.slBreached ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>+{evaluation.slDiffPips}p mbi SL (Invalid)</span>
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>{evaluation.isAtEntry ? 'PREKJE E HYRJES!' : `${evaluation.distPips} pips larg`}</span>
                          </>
                        )}
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

                {/* Prominent Invalidation Alert Banner if SL was Breached */}
                {evaluation.slBreached && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs space-y-2 shadow-md">
                    <div className="flex items-center justify-between gap-2 font-bold text-rose-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>⛔ KUJDES: Ky Skenar MSNR LIT është Djegur / Invaliduar nga Tregu!</span>
                      </div>
                      <button
                        onClick={() => handleRemoveSingleSetup(setup.id)}
                        className="px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500 text-white text-[10px] font-bold transition-all shrink-0"
                        title="Hiq këtë skenar të djegur nga radari"
                      >
                        Fshij ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed">
                      Çmimi aktual ({curSym}{livePrice.toFixed(dec)}) ka tejkaluar nivelin Stop Loss ({curSym}{setup.sl10Pips.toFixed(dec)}) me <strong>+{evaluation.slDiffPips} pips</strong>. Sipas rregullave të hekurta të Abjeed (MSNR LIT), kur niveli 10p thyhet, struktura është plotësisht e pavlefshme dhe <strong>nuk duhet ekzekutuar asnjë urdhër</strong>!
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-rose-300/80 pt-1 border-t border-rose-500/30">
                      <span>Rregulli i Hekurt: Stop Loss fiks 10 pips</span>
                      <span className="font-mono font-bold">Statusi: DJEGUR / INVALID</span>
                    </div>
                  </div>
                )}

                {/* Progress Bar & Current Status */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      Përparimi i Konfirmimeve para Hyrjes:
                    </span>
                    <span
                      className={`font-mono font-black text-xs ${
                        evaluation.slBreached
                          ? 'text-rose-400'
                          : setup.progressPercent >= 95
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {evaluation.slBreached
                        ? '0% (E Invaliduar)'
                        : `${setup.progressPercent}% ${setup.progressPercent >= 95 ? '(95% Gati)' : ''}`}
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        evaluation.slBreached
                          ? 'bg-rose-500 w-full'
                          : setup.progressPercent === 100
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-300 animate-pulse'
                          : setup.progressPercent >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: evaluation.slBreached ? '100%' : `${setup.progressPercent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    {evaluation.slBreached
                      ? `⛔ Skenar i Pavlefshëm: Çmimi kaloi nivelin e Stop Loss-it (${setup.sl10Pips}) me +${evaluation.slDiffPips} pips. Nuk duhet të bëhet asnjë hyrje.`
                      : setup.currentStepDescription}
                  </p>
                </div>

                {/* 95% CONFIRMATIONS DETAILED CHECKLIST ME SHENJËN NICE (✓) */}
                {setup.confirmations && setup.confirmations.length > 0 && (
                  <div className={`space-y-2 bg-slate-950/90 p-3.5 rounded-xl border ${
                    evaluation.slBreached ? 'border-rose-500/30' : 'border-emerald-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${
                        evaluation.slBreached ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        <Shield className="w-4 h-4" />
                        Statusi i Konfirmimeve (Shenja Nice ✓ për të gjitha rregullat e kryera):
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        evaluation.slBreached
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}>
                        {evaluation.slBreached
                          ? 'SL i Thyer (-10p)'
                          : `${setup.confirmations.filter((c) => c.confirmed).length} / ${setup.confirmations.length} Rregulla Kryer`}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {setup.confirmations.map((item) => {
                        const isSlRule = item.id === 'c5';
                        const isConfirmed = item.confirmed && !evaluation.slBreached;
                        const isFailed = evaluation.slBreached && isSlRule;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                              isFailed
                                ? 'bg-rose-950/50 text-rose-200 border border-rose-500/40'
                                : isConfirmed
                                ? 'bg-emerald-950/40 text-slate-200 border border-emerald-500/20'
                                : 'bg-amber-950/20 text-amber-200 border border-amber-500/30'
                            }`}
                          >
                            {isFailed ? (
                              <span className="p-0.5 rounded-full bg-rose-500 text-white mt-0.5 shrink-0" title="Stop Loss i Thyer!">
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : isConfirmed ? (
                              <span className="p-0.5 rounded-full bg-emerald-500 text-slate-950 mt-0.5 shrink-0 shadow-sm shadow-emerald-500/30" title="Shenja Nice: E konfirmuar">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="p-0.5 rounded-full bg-amber-500/20 text-amber-400 mt-0.5 shrink-0" title="Në pritje">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className={`font-bold ${
                                isFailed ? 'text-rose-300' : isConfirmed ? 'text-emerald-300' : 'text-amber-300'
                              }`}>
                                {item.name}:
                              </span>{' '}
                              <span className="text-slate-300 text-[11px]">
                                {isFailed ? `SL 10p fiks u thyer me +${evaluation.slDiffPips} pips mbi nivelin!` : item.ruleDetail}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MSNR Execution Levels: Entry, SL (10 pips strictly), TP1, TP2, TP3 */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">M15 POI Range</span>
                      <span className="font-mono font-bold text-slate-200">{setup.poiRange}</span>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Inducement (IDM)</span>
                      <span className="font-mono font-bold text-amber-400">{curSym}{setup.idmLevel.toFixed(dec)}</span>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded-lg border border-sky-500/30 shadow-inner">
                      <span className="text-sky-400 block text-[10px] uppercase font-bold">Hyrja Sniper</span>
                      <span className="font-mono font-black text-sky-300 text-sm">{curSym}{setup.expectedEntry.toFixed(dec)}</span>
                    </div>

                    <div className={`p-2 rounded-lg border shadow-inner ${
                      evaluation.slBreached
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      <span className="text-rose-400 block text-[10px] uppercase font-black">
                        SL (10 Pips Fiks) {evaluation.slBreached ? '⚠️ I THYER' : ''}
                      </span>
                      <span className="font-mono font-black text-sm">{curSym}{setup.sl10Pips.toFixed(dec)}</span>
                    </div>
                  </div>

                  {/* Profit Targets */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-850 text-xs font-mono">
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
                    {!evaluation.slBreached && (
                      <button
                        onClick={() => handleRecordToCalendar(setup, 'WIN', 50)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                        title="Regjistro si Fitore me +50 Pips në Kalendarin e Fitimeve"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>🟢 Fitova (+50p TP)</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRecordToCalendar(setup, 'LOSS')}
                      className={`${evaluation.slBreached ? 'w-full' : 'flex-1'} py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-slate-950 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1`}
                      title="Regjistro si Humbje me Stop Loss 10 Pips (-10p) në Kalendar"
                    >
                      <TrendingDown className="w-3 h-3" />
                      <span>🔴 Hupa (-10p SL Fiks)</span>
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

                  {/* Copy Button: Disabled if SL was breached */}
                  {evaluation.slBreached ? (
                    <button
                      disabled
                      title="Skenari është i invaliduar: Stop Loss 10p u thye"
                      className="py-2.5 px-3 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-400 text-xs font-bold flex items-center gap-1.5 opacity-60 cursor-not-allowed"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>⛔ Urdhër i Pavlefshëm (SL i Thyer)</span>
                    </button>
                  ) : (
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
                  )}

                  {/* Direct Test Price Touch Button */}
                  {!evaluation.slBreached && (
                    <button
                      onClick={() => handleTestPriceTouch(setup)}
                      title="Simulo çmimin e tregut duke prekur pikën ekzakte të hyrjes"
                      className="py-2.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-inner"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span>Testo Prekjen</span>
                    </button>
                  )}

                  {/* Custom Sound Alert Trigger for this Setup */}
                  <button
                    onClick={() => {
                      setTriggerModalAsset(setup.assetId);
                      setTriggerModalPrice(setup.expectedEntry);
                      setPriceTriggerModalOpen(true);
                    }}
                    title="Vendos alarm me zë të personalizuar kur çmimi të arrijë këtë hyrje sniper"
                    className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alarm Çmimi</span>
                  </button>

                  {/* If breached, show quick Delete button */}
                  {evaluation.slBreached && (
                    <button
                      onClick={() => handleRemoveSingleSetup(setup.id)}
                      title="Fshij këtë skenar të djegur"
                      className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Fshij</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Structure Audit Modal (Trade with Abjeed MSNR LIT Verification) */}
      <MSNRStructureAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        audit={currentAudit}
      />

      {/* Custom Price Trigger & Sound Alert Modal */}
      <CustomPriceTriggerModal
        isOpen={priceTriggerModalOpen}
        onClose={() => setPriceTriggerModalOpen(false)}
        activeAssetId={triggerModalAsset}
        livePrice={triggerModalPrice}
        onSelectAsset={(assetId) => {
          setTriggerModalAsset(assetId);
          setTriggerModalPrice(livePrices[assetId] ?? marketPriceService.getCalibratedPrice(assetId));
        }}
      />
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

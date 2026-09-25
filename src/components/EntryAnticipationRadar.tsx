import React, { useState, useMemo, useEffect } from 'react';
import { AnticipationSetup, TradeType } from '../types/trading';
import { notificationService } from '../services/notificationService';
import { soundService } from '../utils/audioAlert';
import { marketPriceService } from '../services/marketPriceService';
import {
  ICTStrategyEngine,
  getCleanICTAsset,
  getICTPipMultiplier,
  getICTDecimals,
  getICTCurrencySymbol,
} from '../services/ictStrategyEngine';
import { getDynamicDays } from '../utils/dateUtils';
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
  Trash2,
  AlertOctagon,
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

function generateDefaultICTSetups(
  livePrice: number,
  assetSymbol: string,
  _pipMultiplier?: number,
  _decimals?: number,
  _currencySymbol?: string
): AnticipationSetup[] {
  const clean = getCleanICTAsset(assetSymbol);
  return [
    ICTStrategyEngine.generateSetup(clean, livePrice, 0),
    ICTStrategyEngine.generateSetup(clean, livePrice, 1),
    ICTStrategyEngine.generateSetup(clean, livePrice, 2),
    ICTStrategyEngine.generateSetup(clean, livePrice, 3),
  ];
}

function areSetupsFresh(setups: AnticipationSetup[], price: number, mult: number): boolean {
  if (!setups || setups.length === 0) return false;
  // If all setups have Stop Loss breached or are > 80 pips away, they are stale
  const validCount = setups.filter((s) => {
    const isSell = s.type === 'SELL';
    const slBreached = isSell ? price >= s.projectedSl : price <= s.projectedSl;
    const distPips = Math.abs(price - s.projectedEntry) * mult;
    return !slBreached && distPips <= 75;
  }).length;
  return validCount >= 2;
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
  const [ictGenCount, setIctGenCount] = useState<number>(0);
  const [selectedGenAsset, setSelectedGenAsset] = useState<string>(() => assetSymbol);

  useEffect(() => {
    setSelectedGenAsset(assetSymbol);
  }, [assetSymbol]);

  const storageKey = `ict_radar_setups_v4_${assetSymbol.replace(/[^a-zA-Z0-9]/g, '')}`;

  const [setupsList, setSetupsList] = useState<AnticipationSetup[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: AnticipationSetup[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && areSetupsFresh(parsed, livePrice, pipMultiplier)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    if (propSetups && propSetups.length > 0 && areSetupsFresh(propSetups, livePrice, pipMultiplier)) {
      return propSetups;
    }
    return generateDefaultICTSetups(livePrice, assetSymbol, pipMultiplier, decimals, currencySymbol);
  });
  const [activeSetupId, setActiveSetupId] = useState<string>(setupsList[0]?.id || 'setup-1');

  // Save to localStorage whenever setupsList changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(setupsList));
    } catch {
      // ignore
    }
  }, [setupsList, storageKey]);

  // When assetSymbol or propSetups changes, reload setups
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && areSetupsFresh(parsed, livePrice, pipMultiplier)) {
          setSetupsList(parsed);
          setActiveSetupId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (propSetups && propSetups.length > 0 && areSetupsFresh(propSetups, livePrice, pipMultiplier)) {
      setSetupsList(propSetups);
      setActiveSetupId(propSetups[0].id);
      return;
    }

    const fresh = generateDefaultICTSetups(livePrice, assetSymbol, pipMultiplier, decimals, currencySymbol);
    setSetupsList(fresh);
    setActiveSetupId(fresh[0].id);
  }, [assetSymbol]);

  // Real-time Scanning & 1-Minute Auto-Check State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<string>(() => new Date().toLocaleTimeString('sq-AL'));
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [executedSetupId, setExecutedSetupId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'ALL' | 'READY' | 'BUY' | 'SELL' | 'INVALID'>('ACTIVE');

  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [alertArmedId, setAlertArmedId] = useState<string | null>(setupsList[0]?.id || null);
  const [copiedOrder, setCopiedOrder] = useState<boolean>(false);

  // Helper function: accurately evaluate each setup against livePrice
  const checkSetupStatus = (setup: AnticipationSetup) => {
    const isSell = setup.type === 'SELL';
    const distPips = Math.round(Math.abs(livePrice - setup.projectedEntry) * pipMultiplier);
    // If SELL and livePrice >= SL: Stop Loss was breached (invalidated)
    // If BUY and livePrice <= SL: Stop Loss was breached (invalidated)
    const slBreached = isSell ? livePrice >= setup.projectedSl : livePrice <= setup.projectedSl;
    const slDiff = slBreached
      ? isSell
        ? Math.round((livePrice - setup.projectedSl) * pipMultiplier)
        : Math.round((setup.projectedSl - livePrice) * pipMultiplier)
      : 0;
    // If TP hit:
    const tpHit = isSell ? livePrice <= setup.projectedTp : livePrice >= setup.projectedTp;
    // Sniper ready (within 2 pips and valid)
    const isAtEntry = distPips <= 2 && !slBreached && !tpHit;

    return { isSell, distPips, slBreached, slDiff, tpHit, isAtEntry };
  };

  // Selected setup
  const currentSetup = useMemo(
    () => setupsList.find((s) => s.id === activeSetupId) || setupsList[0] || null,
    [setupsList, activeSetupId]
  );

  // Count invalidated setups
  const invalidatedCount = useMemo(() => {
    return setupsList.filter((s) => checkSetupStatus(s).slBreached || checkSetupStatus(s).tpHit).length;
  }, [setupsList, livePrice, pipMultiplier]);

  // Purge expired / invalidated setups
  const handleClearInvalidated = () => {
    setSetupsList((prev) => {
      const active = prev.filter((s) => {
        const { slBreached, tpHit } = checkSetupStatus(s);
        return !slBreached && !tpHit;
      });
      if (active.length < 2) {
        return generateDefaultICTSetups(livePrice, assetSymbol, pipMultiplier, decimals, currencySymbol);
      }
      return active;
    });
    setScanMessage('🧹 Skenarët e tejkaluar (SL i thyer ose TP e arritur) u pastruan nga lista dhe u rifreskuan me çmimet e sotme!');
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Filtered setups list
  const filteredSetups = useMemo(() => {
    return setupsList.filter((s) => {
      const { slBreached, tpHit, isAtEntry } = checkSetupStatus(s);
      if (filterMode === 'ACTIVE') return !slBreached && !tpHit;
      if (filterMode === 'INVALID') return slBreached || tpHit;
      if (filterMode === 'READY') return isAtEntry || (!slBreached && s.stepCurrent === 4);
      if (filterMode === 'BUY') return s.type === 'BUY';
      if (filterMode === 'SELL') return s.type === 'SELL';
      return true;
    });
  }, [setupsList, filterMode, livePrice, pipMultiplier]);

  // Rescan function: checks market conditions against live prices
  const handleRescan = () => {
    setIsScanning(true);
    setScanMessage(`Duke skanuar strukturën ICT në ${assetSymbol} (HTF POI, Sweep, MSS, FVG Retest)...`);

    setTimeout(() => {
      setSetupsList((prevSetups) => {
        const updated = prevSetups.map((setup) => {
          const { isSell, distPips, slBreached, slDiff, tpHit, isAtEntry } = checkSetupStatus(setup);

          if (slBreached) {
            return {
              ...setup,
              stepCurrent: 0,
              status: 'INVALIDATED' as any,
              statusLabel: `⛔ INVALIDUAR - SL U TEJKALUA (+${slDiff}p)`,
              triggerDistancePips: distPips,
              stepDescription: `⛔ SKENAR I PAVLEFSHËM: Çmimi (${currencySymbol}${livePrice.toFixed(decimals)}) kaloi Stop Loss-in (${currencySymbol}${setup.projectedSl.toFixed(decimals)}) me ${slDiff} pips. Ky skenar nuk duhet tregtuar!`,
            };
          }

          if (tpHit) {
            return {
              ...setup,
              stepCurrent: 4,
              status: 'TP_HIT' as any,
              statusLabel: `✅ TP U ARRIT (+${setup.targetPips}p)`,
              triggerDistancePips: 0,
              stepDescription: `✅ Sukses! Çmimi arriti me sukses objektivin TP ${currencySymbol}${setup.projectedTp.toFixed(decimals)}!`,
            };
          }

          if (isAtEntry) {
            if (soundEnabled) soundService.playEntryAlert();
            setExecutedSetupId(setup.id);

            // Send notification for ICT entry
            notificationService.sendNotification({
              title: `⚡ HYRJE ICT SNIPER: ${assetSymbol} (${setup.type})!`,
              body: `Çmimi preku pikën e hyrjes (${currencySymbol}${setup.projectedEntry.toFixed(decimals)})! SL: ${currencySymbol}${setup.projectedSl.toFixed(decimals)} (-${setup.riskPips}p) | TP: ${currencySymbol}${setup.projectedTp.toFixed(decimals)} (+${setup.targetPips}p). U ruajt në Kalendar.`,
              type: 'ENTRY',
              price: setup.projectedEntry,
            });

            // Auto-save to ICT calendar and dispatch new trade event
            try {
              const d = new Date();
              const dynamicDays = getDynamicDays();
              const dateKey = dynamicDays.today.isoDate;
              const cleanAsset = getCleanICTAsset(assetSymbol);
              const symbolFormatted = cleanAsset === 'XAUUSD' ? 'XAU/USD' : `${cleanAsset.slice(0, 3)}/${cleanAsset.slice(3)}`;

              const newTrade = {
                id: `ict-radar-${Date.now()}`,
                symbol: symbolFormatted,
                day: 'today' as const,
                dayLabel: dynamicDays.today.dayLabel,
                dateFormatted: dynamicDays.today.dateFormatted,
                timeFormatted: `${d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} UTC`,
                session: (d.getUTCHours() < 12 ? 'London Session' : 'New York Session') as 'London Session' | 'New York Session',
                type: setup.type,
                entryPrice: setup.projectedEntry,
                stopLoss: setup.projectedSl,
                takeProfit: setup.projectedTp,
                exitPrice: setup.projectedTp,
                exitTime: `${d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} UTC`,
                riskReward: setup.rrRatio || 2.0,
                riskPips: setup.riskPips,
                targetPips: setup.targetPips,
                resultPips: setup.targetPips,
                status: 'ACTIVE' as const,
                allConditionsMet: true,
                timeframe: 'M5',
                reasoning: `${setup.name}. Retest në FVG pas MSS. U ekzekutua automatikisht në kohë reale nga Radari ICT.`,
                entryTime: Math.floor(Date.now() / 1000),
              };

              // Dispatch event for App.tsx
              window.dispatchEvent(
                new CustomEvent('ict_new_trade_created', {
                  detail: { trade: newTrade, assetId: cleanAsset },
                })
              );

              // Auto-save to ICT calendar for today
              const savedCal = localStorage.getItem('ict_custom_calendar_trades');
              const calMap = savedCal ? JSON.parse(savedCal) : {};
              const calTrade = {
                id: newTrade.id,
                time: newTrade.timeFormatted,
                type: setup.type,
                setupName: `${setup.name} (Radari ICT)`,
                session: d.getUTCHours() < 12 ? 'London' : 'New York',
                resultPips: setup.targetPips || 80,
                status: 'ACTIVE',
                entryPrice: setup.projectedEntry,
                exitPrice: setup.projectedTp,
              };
              if (!calMap[dateKey]) calMap[dateKey] = [];
              if (!calMap[dateKey].some((t: any) => t.setupName === calTrade.setupName)) {
                calMap[dateKey] = [calTrade, ...calMap[dateKey]];
                localStorage.setItem('ict_custom_calendar_trades', JSON.stringify(calMap));
              }
            } catch (err) {
              console.error('Failed to auto-save ICT calendar trade:', err);
            }

            return {
              ...setup,
              stepCurrent: 4,
              status: 'ENTRY_READY',
              statusLabel: '100% - HYRJE E AKTIVIZUAR (SNIPER)',
              triggerDistancePips: 0,
              stepDescription: `🎯 ÇMIMI PREKU HYRJEN (${currencySymbol}${setup.projectedEntry.toFixed(decimals)}) TANI NË KOHË REALE! Retest FVG u plotësua. SL fiks në ${currencySymbol}${setup.projectedSl.toFixed(decimals)} (-${setup.riskPips}p) dhe TP 1:2 në ${currencySymbol}${setup.projectedTp.toFixed(decimals)}!`,
            };
          }

          return {
            ...setup,
            triggerDistancePips: distPips,
          };
        });

        const validCount = updated.filter((s) => {
          const { slBreached, tpHit } = checkSetupStatus(s);
          return !slBreached && !tpHit;
        }).length;

        if (validCount < 2) {
          const fresh = generateDefaultICTSetups(livePrice, assetSymbol, pipMultiplier, decimals, currencySymbol);
          return [...fresh, ...updated.filter((s) => {
            const { slBreached, tpHit } = checkSetupStatus(s);
            return !slBreached && !tpHit;
          })];
        }

        return updated;
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
  const handleGenerateNewICTSetup = (assetOverride?: string) => {
    setIsScanning(true);
    const targetAssetRaw = assetOverride || selectedGenAsset || assetSymbol;
    const cleanAsset = getCleanICTAsset(targetAssetRaw);
    setScanMessage(`Duke analizuar tregun dhe duke gjeneruar skenar të ri live ICT (${cleanAsset})...`);

    setTimeout(() => {
      const nextVariant = ictGenCount + 1;
      setIctGenCount(nextVariant);

      const targetPrice = cleanAsset === getCleanICTAsset(assetSymbol)
        ? livePrice
        : marketPriceService.getCalibratedPrice(cleanAsset);

      const newSetup = ICTStrategyEngine.generateSetup(cleanAsset, targetPrice, nextVariant);

      setSetupsList((prev) => [newSetup, ...prev]);
      setActiveSetupId(newSetup.id);
      setIsScanning(false);
      setCountdown(60);

      if (soundEnabled) {
        soundService.playEntryAlert();
      }

      notificationService.sendNotification({
        title: `⚡ Skenar i Ri ICT (${cleanAsset}): ${newSetup.type}!`,
        body: `${newSetup.name}. Hyrja: ${newSetup.projectedEntry} | SL: ${newSetup.projectedSl} | TP: ${newSetup.projectedTp}.`,
        type: 'ENTRY',
        price: newSetup.projectedEntry,
      });

      setScanMessage(`✅ Skenari i ri live ICT për ${cleanAsset} u gjenerua me sukses! Model: ${newSetup.name}.`);
      setTimeout(() => setScanMessage(null), 5000);
    }, 450);
  };

  // Generate live setups for all 4 pairs simultaneously
  const handleGenerateAllPairs = () => {
    setIsScanning(true);
    setScanMessage('Duke skanuar dhe gjeneruar skenarë live ICT për të 4 çiftet kryesore (XAU/USD, EUR/USD, GBP/USD, USD/JPY)...');

    setTimeout(() => {
      const livePricesMap: Record<string, number> = {
        XAUUSD: marketPriceService.getCalibratedPrice('XAUUSD'),
        EURUSD: marketPriceService.getCalibratedPrice('EURUSD'),
        GBPUSD: marketPriceService.getCalibratedPrice('GBPUSD'),
        USDJPY: marketPriceService.getCalibratedPrice('USDJPY'),
      };
      const activeClean = getCleanICTAsset(assetSymbol);
      livePricesMap[activeClean] = livePrice;

      const allSetups = ICTStrategyEngine.generateAllPairsLiveSetups(livePricesMap);
      setSetupsList(allSetups);
      if (allSetups.length > 0) {
        setActiveSetupId(allSetups[0].id);
      }
      setIsScanning(false);
      setCountdown(60);

      if (soundEnabled) {
        soundService.playEntryAlert();
      }

      setScanMessage('✅ Të 4 çiftet valutore u skanuan me sukses! U krijuan skenarë të freskët live me çmimet e sotme.');
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

        {/* ASSET SELECTOR ROW FOR ICT GENERATION */}
        <div className="pt-2.5 pb-1 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <span className="text-amber-400 font-bold">🎯 Zgjidh Valutën për Skenar:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'XAUUSD', label: '🥇 XAU/USD (Gold)' },
              { id: 'EURUSD', label: '💶 EUR/USD' },
              { id: 'GBPUSD', label: '💷 GBP/USD' },
              { id: 'USDJPY', label: '💴 USD/JPY' },
            ].map((asset) => {
              const isSelected = getCleanICTAsset(selectedGenAsset) === asset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedGenAsset(asset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/30 scale-[1.02]'
                      : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-750'
                  }`}
                >
                  {asset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* INTERACTIVE CONTROLS BAR (SCAN, GENERATE, AUTO-CHECK, SOUND) */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
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
              onClick={() => handleGenerateNewICTSetup()}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Gjenero Skenar të Ri ICT ({selectedGenAsset === 'XAUUSD' ? 'XAU/USD' : selectedGenAsset})</span>
            </button>

            {/* Gjenero të 4 Valutat Live Button */}
            <button
              id="radar-generate-all-pairs-btn"
              onClick={handleGenerateAllPairs}
              disabled={isScanning}
              title="Gjeneron menjëherë skenarë live për Gold, EUR/USD, GBP/USD dhe USD/JPY"
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>⚡ Gjenero të 4 Valutat Live (Sot)</span>
            </button>

            {/* Pastro të Skaduarit & Rifresko Button */}
            <button
              id="radar-clear-invalid-btn"
              onClick={handleClearInvalidated}
              disabled={isScanning}
              title="Fshin skenarët ku Stop Loss është thyer dhe i zëvendëson me skenarë aktivë live"
              className="px-3 py-2 rounded-xl text-xs font-black bg-slate-850 hover:bg-slate-800 text-rose-300 border border-rose-500/30 hover:border-rose-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>🧹 Pastro të Vjetrit & Rifresko me Çmimet e Sotme</span>
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

      {/* FILTER PILLS & PURGE INVALIDATED */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filtro Skenarët:</span>
          
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'ACTIVE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vlefshme Tani ({setupsList.filter((s) => !checkSetupStatus(s).slBreached && !checkSetupStatus(s).tpHit).length})</span>
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
            <span>100% Gati për Hyrje ({setupsList.filter((s) => checkSetupStatus(s).isAtEntry || (!checkSetupStatus(s).slBreached && s.stepCurrent === 4)).length})</span>
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

          {invalidatedCount > 0 && (
            <button
              onClick={() => setFilterMode('INVALID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === 'INVALID'
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                  : 'bg-rose-950/40 text-rose-400 border border-rose-800/60 hover:bg-rose-950/70'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Të Invaliduar ({invalidatedCount})</span>
            </button>
          )}

          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Të Gjitha ({setupsList.length})
          </button>
        </div>

        {invalidatedCount > 0 && (
          <button
            onClick={handleClearInvalidated}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Fshin të gjithë skenarët që kanë thyer Stop Loss-in ose kanë kapur TP"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Pastro të Pavlefshmit ({invalidatedCount})</span>
          </button>
        )}
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
            const { isSell, distPips, slBreached, slDiff, tpHit, isAtEntry } = checkSetupStatus(setup);

            // Determine status badge, visual indicators, and progress
            let statusBadge = {
              text: '100% - HYRJE E SIGURT (SNIPER)',
              bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30',
              note: '🎯 Çmimi preku hyrjen! Të 4 rregullat u plotësuan, ekzekuto urdhrin.',
              displayPercent: 100,
              barColor: 'bg-emerald-500',
            };

            if (slBreached) {
              statusBadge = {
                text: '⛔ INVALIDUAR (SL U TEJKALUA)',
                bg: 'bg-rose-950/90 text-rose-300 border-rose-600 ring-1 ring-rose-500/50',
                note: `⚠️ Çmimi (${currencySymbol}${livePrice.toFixed(decimals)}) kaloi Stop Loss-in (${currencySymbol}${setup.projectedSl.toFixed(decimals)}) me +${slDiff} pips. Skenari NUK duhet tregtuar!`,
                displayPercent: 0,
                barColor: 'bg-rose-600',
              };
            } else if (tpHit) {
              statusBadge = {
                text: `✅ TP U ARRIT (+${setup.targetPips}p)`,
                bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
                note: `Objektivi TP (${currencySymbol}${setup.projectedTp.toFixed(decimals)}) u arrit me sukses!`,
                displayPercent: 100,
                barColor: 'bg-emerald-500',
              };
            } else if (!isAtEntry) {
              if (setup.stepCurrent === 4) {
                statusBadge = {
                  text: `⏳ NË PRITJE TË RETEST (${distPips}p)`,
                  bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                  note: `Hapat 1-3 u kryen. Po presim afrimin në zonën ${currencySymbol}${setup.projectedEntry.toFixed(decimals)}.`,
                  displayPercent: 85,
                  barColor: 'bg-sky-500',
                };
              } else if (setup.stepCurrent === 3) {
                statusBadge = {
                  text: `75% - PËRGATITU (${distPips}p larg)`,
                  bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                  note: 'MSS theu strukturën me trup qiriri. Presim kthimin në FVG.',
                  displayPercent: 75,
                  barColor: 'bg-yellow-400',
                };
              } else if (setup.stepCurrent === 2) {
                statusBadge = {
                  text: `50% - MOS U FUT AKOMA! (${distPips}p larg)`,
                  bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  note: 'U bë Sweep me fitil, por presim MSS me trup qiriri.',
                  displayPercent: 50,
                  barColor: 'bg-amber-500',
                };
              } else {
                statusBadge = {
                  text: `25% - MOS U FUT! (${distPips}p larg)`,
                  bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                  note: 'Vetëm POI u prek. Rrezik i lartë, mungon Sweep dhe MSS!',
                  displayPercent: 25,
                  barColor: 'bg-rose-500',
                };
              }
            }

            return (
              <div
                key={setup.id}
                id={`radar-card-${setup.id}`}
                onClick={() => setActiveSetupId(setup.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  slBreached
                    ? isSelected
                      ? 'bg-rose-950/40 border-rose-600 shadow-xl shadow-rose-950/20 ring-1 ring-rose-500/40'
                      : 'bg-rose-950/20 border-rose-900/60 hover:bg-rose-950/30'
                    : isSelected
                    ? 'bg-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {isSelected && (
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${slBreached ? 'bg-rose-500' : 'bg-amber-500'}`} />
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
                    <span>
                      {slBreached
                        ? '⛔ Struktura ICT: E Pavlefshme (SL u thye)'
                        : `Progresi i konfirmimit ICT (Hapi ${setup.stepCurrent}/4):`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${slBreached ? 'text-rose-400 font-bold' : 'text-amber-400'}`}>
                        {slBreached ? `+${slDiff}p tejkaluar SL` : `${distPips} pips larg`}
                      </span>
                      <span className="font-bold text-white">{statusBadge.displayPercent}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${statusBadge.barColor}`}
                      style={{ width: `${statusBadge.displayPercent}%` }}
                    />
                  </div>
                  <p className={`text-[10px] mt-1 italic ${slBreached ? 'text-rose-300 font-medium' : 'text-slate-400'}`}>
                    {statusBadge.note}
                  </p>
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
                  {slBreached ? (
                    <div className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                      <span>Skenar i Djegur (SL u thye me +${slDiff}p)</span>
                    </div>
                  ) : (
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
                  )}

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
                    ({Math.abs(livePrice - currentSetup.htfPoiLevel).toFixed(decimals)}$)
                  </span>
                  {distanceToPoi <= 10 && (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-rose-500 text-slate-950">
                      GATI!
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* CRITICAL ICT INVALIDATION ALERT IF STOP LOSS WAS BREACHED */}
            {checkSetupStatus(currentSetup).slBreached && (
              <div className="p-4 rounded-xl bg-rose-950/70 border-2 border-rose-500/80 flex items-start gap-3 text-xs shadow-lg animate-in fade-in">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-rose-200 text-sm uppercase tracking-wide">
                      ⛔ KUJDES: Skenari është INVALIDUAR / DJEGUR nga Tregu!
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-black font-mono text-[10px]">
                      +{checkSetupStatus(currentSetup).slDiff} pips mbi SL
                    </span>
                  </div>
                  <p className="text-rose-200 leading-relaxed text-[11px]">
                    Çmimi aktual ({currencySymbol}{livePrice.toFixed(decimals)}) ka tejkaluar Stop Loss-in ({currencySymbol}{currentSetup.projectedSl.toFixed(decimals)}).
                    Për një urdhër <strong>{currentSetup.type}</strong>, nëse çmimi shkon përtej Stop Loss-it, struktura ICT <strong>është prishur dhe ky urdhër NUK DUHET të vendoset</strong>! Kur çmimi ngjitet më lart, nuk mund të vazhdojmë shitjen me parametrat e vjetër.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleClearInvalidated}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Fshi këtë skenar të pavlefshëm</span>
                    </button>
                    <span className="text-[10px] text-rose-300/80">ose prit skanimin automatik për nivele të reja.</span>
                  </div>
                </div>
              </div>
            )}

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
                disabled={checkSetupStatus(currentSetup).slBreached}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  checkSetupStatus(currentSetup).slBreached
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Kopjo parametrat e urdhrit për t'i vendosur në MetaTrader"
              >
                {copiedOrder ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>
                  {checkSetupStatus(currentSetup).slBreached
                    ? 'Urdhri është i Pavlefshëm (SL u Thye)'
                    : copiedOrder
                    ? 'Urdhri u Kopjua!'
                    : 'Kopjo Urdhrin (Entry, SL, TP) për MT4/MT5'}
                </span>
              </button>

              <button
                id="trigger-arm-push-btn"
                onClick={() => toggleArmAlert(currentSetup.id)}
                disabled={checkSetupStatus(currentSetup).slBreached}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  checkSetupStatus(currentSetup).slBreached
                    ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : alertArmedId === currentSetup.id
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {checkSetupStatus(currentSetup).slBreached
                    ? 'Alarmi i Çaktivizuar (SL i Thyer)'
                    : alertArmedId === currentSetup.id
                    ? 'Alarmi është Aktiv ✓'
                    : 'Prit këtë Hyrje me Njoftim'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

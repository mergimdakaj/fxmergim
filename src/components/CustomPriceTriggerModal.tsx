import React, { useState, useEffect } from 'react';
import { AssetId, ASSETS_REGISTRY } from '../data/multiAssetData';
import {
  customPriceTriggerService,
  CustomPriceTrigger,
  TriggerCondition,
  TriggerSoundType,
} from '../services/customPriceTriggerService';
import { soundService } from '../utils/audioAlert';
import {
  Bell,
  BellRing,
  X,
  Volume2,
  Check,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface CustomPriceTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAssetId: AssetId;
  livePrice: number;
  onSelectAsset?: (assetId: AssetId) => void;
}

const SOUND_OPTIONS: { id: TriggerSoundType; name: string; icon: string; desc: string }[] = [
  { id: 'chime', name: 'Zile Kristal (Chime)', icon: '🔔', desc: 'Tre-tone harmonike kristal' },
  { id: 'siren', name: 'Sirenë Alarmi (Siren)', icon: '🚨', desc: 'Puls i shpejtë paralajmërues' },
  { id: 'bell', name: 'Zile e Thellë (Bell)', icon: '🏛️', desc: 'Rezonancë e thellë tubolare' },
  { id: 'sonar', name: 'Sonar / Radar (Sonar)', icon: '📡', desc: 'Ping taktik me rënie frekuence' },
  { id: 'affirmative', name: 'Target Hit (Fanfare)', icon: '🎯', desc: 'Melodi ngjitëse suksesi' },
];

export const CustomPriceTriggerModal: React.FC<CustomPriceTriggerModalProps> = ({
  isOpen,
  onClose,
  activeAssetId,
  livePrice,
  onSelectAsset,
}) => {
  const assetConfig = ASSETS_REGISTRY[activeAssetId] || ASSETS_REGISTRY.XAUUSD;
  const decimals = assetConfig.decimals;

  // Form states
  const [selectedAsset, setSelectedAsset] = useState<AssetId>(activeAssetId);
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<TriggerCondition>('CROSS_ABOVE');
  const [soundType, setSoundType] = useState<TriggerSoundType>('chime');
  const [label, setLabel] = useState<string>('');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [triggers, setTriggers] = useState<CustomPriceTrigger[]>([]);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync with activeAssetId when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAsset(activeAssetId);
      setTargetPriceInput(livePrice.toFixed(decimals));
      setCondition('CROSS_ABOVE');
    }
  }, [isOpen, activeAssetId, livePrice, decimals]);

  // Subscribe to trigger service updates
  useEffect(() => {
    const unsub = customPriceTriggerService.subscribe((list) => {
      setTriggers(list);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const currentConfig = ASSETS_REGISTRY[selectedAsset];
  const targetNum = parseFloat(targetPriceInput);

  const handleTestSound = (type: TriggerSoundType) => {
    setPlayingSound(type);
    soundService.playCustomTriggerAlert(type);
    setTimeout(() => setPlayingSound(null), 1200);
  };

  const handleQuickOffset = (pips: number) => {
    let offset = 0;
    if (selectedAsset === 'XAUUSD') {
      offset = pips * 0.10; // 10 pips = $1.00
    } else if (selectedAsset === 'USDJPY') {
      offset = pips * 0.01; // 1 pip = 0.01 JPY
    } else {
      offset = pips * 0.0001; // 1 pip = 0.0001
    }

    const newTarget = livePrice + offset;
    setTargetPriceInput(newTarget.toFixed(currentConfig.decimals));
    if (newTarget >= livePrice) {
      setCondition('CROSS_ABOVE');
    } else {
      setCondition('CROSS_BELOW');
    }
  };

  const handleCreateTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(targetNum) || targetNum <= 0) return;

    const autoCondition: TriggerCondition =
      condition === 'EXACT_TOUCH'
        ? 'EXACT_TOUCH'
        : targetNum >= livePrice
        ? 'CROSS_ABOVE'
        : 'CROSS_BELOW';

    customPriceTriggerService.addTrigger({
      assetId: selectedAsset,
      targetPrice: targetNum,
      condition: autoCondition,
      soundType,
      label: label.trim() || `Nivel i synuar ${currentConfig.currencySymbol}${targetNum.toFixed(currentConfig.decimals)}`,
      currentPrice: livePrice,
    });

    // Play confirmation chirp
    soundService.playRadarPing();

    setSuccessBanner(`✅ Alarmi për ${selectedAsset} në ${currentConfig.currencySymbol}${targetNum.toFixed(currentConfig.decimals)} u aktivizua me sukses!`);
    setTimeout(() => setSuccessBanner(null), 4000);
    setActiveTab('list');
    setLabel('');
  };

  const assetTriggers = triggers.filter((t) => t.assetId === selectedAsset);
  const activeCount = assetTriggers.filter((t) => t.active && !t.triggered).length;

  return (
    <div
      id="custom-price-trigger-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BellRing className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Vendos Alarm Çmimi (Custom Trigger)</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 uppercase">
                  Live Sound Alert
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Përzgjidhni nivelin dhe zërin e personalizuar; luhet sapo çmimi të kapë pikën e synuar.
              </p>
            </div>
          </div>
          <button
            id="close-price-trigger-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successBanner && (
          <div className="px-4 py-2.5 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Tab Switcher: Shto Alarm të Ri vs Alarmet Ekzistuese */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-amber-500 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Krijo Alarm të Ri</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-amber-500 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alarmet Aktive ({activeCount})</span>
            {activeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateTrigger} className="space-y-4">
              {/* Asset Selection & Live Price Tracker */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Zgjidh Çiftin / Instrumentin:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'] as AssetId[]).map((aId) => (
                      <button
                        key={aId}
                        type="button"
                        onClick={() => {
                          setSelectedAsset(aId);
                          if (onSelectAsset) onSelectAsset(aId);
                          const cfg = ASSETS_REGISTRY[aId];
                          setTargetPriceInput(livePrice.toFixed(cfg.decimals));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                          selectedAsset === aId
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {aId}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold block flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TradingView Live
                  </span>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {currentConfig.currencySymbol}
                    {livePrice.toFixed(currentConfig.decimals)}
                  </div>
                </div>
              </div>

              {/* Target Price Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-target-price-input" className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>Niveli i Çmimit të Synuar (Trigger Price):</span>
                  </label>
                  {!isNaN(targetNum) && targetNum > 0 && (
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      Distanca: {Math.abs((targetNum - livePrice) / (selectedAsset === 'XAUUSD' ? 0.10 : selectedAsset === 'USDJPY' ? 0.01 : 0.0001)).toFixed(1)} pips
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-base font-bold">
                    {currentConfig.currencySymbol}
                  </span>
                  <input
                    id="custom-target-price-input"
                    type="number"
                    step={selectedAsset === 'XAUUSD' ? '0.01' : selectedAsset === 'USDJPY' ? '0.001' : '0.00001'}
                    value={targetPriceInput}
                    onChange={(e) => {
                      setTargetPriceInput(e.target.value);
                      const p = parseFloat(e.target.value);
                      if (!isNaN(p)) {
                        setCondition(p >= livePrice ? 'CROSS_ABOVE' : 'CROSS_BELOW');
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg font-black focus:border-amber-500 outline-none shadow-inner"
                    placeholder={livePrice.toFixed(currentConfig.decimals)}
                    required
                  />
                </div>

                {/* Quick Pip Offset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Rregullim i shpejtë:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(-50)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono text-xs border border-slate-700"
                  >
                    -50p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(-20)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono text-xs border border-slate-700"
                  >
                    -20p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(-10)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono text-xs border border-slate-700"
                  >
                    -10p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(10)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs border border-slate-700"
                  >
                    +10p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(20)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs border border-slate-700"
                  >
                    +20p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOffset(50)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs border border-slate-700"
                  >
                    +50p
                  </button>
                </div>
              </div>

              {/* Trigger Condition Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Kushti i Aktivizimit (Trigger Condition):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCondition('CROSS_ABOVE')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      condition === 'CROSS_ABOVE'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      <span>Shkon Mbi (≥)</span>
                    </div>
                    {condition === 'CROSS_ABOVE' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition('CROSS_BELOW')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      condition === 'CROSS_BELOW'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      <span>Zbret Nën (≤)</span>
                    </div>
                    {condition === 'CROSS_BELOW' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition('EXACT_TOUCH')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      condition === 'EXACT_TOUCH'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span>Prekje Ekzakte</span>
                    </div>
                    {condition === 'EXACT_TOUCH' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>

              {/* Sound Selection with Instant Audio Test */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Zëri i Alarimit (Sound Effect):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Kliko "Dëgjo" për ta testuar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {SOUND_OPTIONS.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setSoundType(opt.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        soundType === opt.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{opt.icon}</span>
                        <div>
                          <div className="font-bold text-white text-xs">{opt.name}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestSound(opt.id);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
                          playingSound === opt.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 scale-105'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title="Dëgjo tingullin"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{playingSound === opt.id ? 'Po luan' : 'Dëgjo'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note / Label */}
              <div className="space-y-1.5">
                <label htmlFor="custom-label-input" className="text-xs font-bold text-slate-300">
                  Shënim / Etiketë e Alarimit (Opsionale):
                </label>
                <input
                  id="custom-label-input"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="p.sh. Take Profit 1, M15 Order Block, Rezistenca Ditore..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-custom-price-trigger-btn"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <BellRing className="w-4 h-4" />
                <span>Aktivizo Alarmin e Çmimit Tani</span>
              </button>
            </form>
          ) : (
            /* Active & Past Triggers List */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-300">
                  Alarmet për {selectedAsset} ({assetTriggers.length}):
                </span>
                {assetTriggers.length > 0 && (
                  <button
                    onClick={() => customPriceTriggerService.clearAll(selectedAsset)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold"
                  >
                    Pastro të gjitha për {selectedAsset}
                  </button>
                )}
              </div>

              {assetTriggers.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Nuk keni asnjë alarm aktiv për {selectedAsset}.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/30"
                  >
                    + Vendos Alarmin e Parë
                  </button>
                </div>
              ) : (
                assetTriggers.map((t) => {
                  const distPips = Math.abs((t.targetPrice - livePrice) / (selectedAsset === 'XAUUSD' ? 0.10 : selectedAsset === 'USDJPY' ? 0.01 : 0.0001));
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        t.triggered
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : t.active
                          ? 'bg-slate-950 border-slate-800 text-white hover:border-slate-700'
                          : 'bg-slate-950/50 border-slate-900 opacity-60 text-slate-500'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-amber-400">
                            {currentConfig.currencySymbol}{t.targetPrice.toFixed(currentConfig.decimals)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                              t.triggered
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : t.active
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {t.triggered ? '🎯 E PREKUR' : t.active ? '📡 NË PRITJE' : '⏸️ JO AKTIV'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({t.condition === 'CROSS_ABOVE' ? '≥ Mbi' : t.condition === 'CROSS_BELOW' ? '≤ Nën' : 'Ekzakte'})
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 font-medium">
                          {t.label}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span>Distanca: <strong className="text-amber-300">{distPips.toFixed(1)} pips</strong></span>
                          <span>•</span>
                          <span>Zëri: <strong>{t.soundType}</strong></span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Test simulate hit */}
                        <button
                          onClick={() => {
                            customPriceTriggerService.evaluatePrice(t.assetId, t.targetPrice);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1"
                          title="Simulo prekjen për të testuar zërin dhe njoftimin"
                        >
                          <Play className="w-3 h-3 fill-current text-amber-400" />
                          <span>Test</span>
                        </button>

                        {/* Reset / Re-arm */}
                        {t.triggered && (
                          <button
                            onClick={() => customPriceTriggerService.resetTrigger(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold border border-sky-500/40 flex items-center gap-1"
                            title="Riaktivizo alarmin"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Riaktivizo</span>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => customPriceTriggerService.removeTrigger(t.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          title="Fshi alarmin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

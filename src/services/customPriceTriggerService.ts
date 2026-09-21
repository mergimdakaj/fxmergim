import { AssetId } from '../data/multiAssetData';
import { soundService } from '../utils/audioAlert';
import { notificationService } from './notificationService';

export type TriggerCondition = 'CROSS_ABOVE' | 'CROSS_BELOW' | 'EXACT_TOUCH';
export type TriggerSoundType = 'chime' | 'siren' | 'bell' | 'sonar' | 'affirmative';

export interface CustomPriceTrigger {
  id: string;
  assetId: AssetId;
  targetPrice: number;
  condition: TriggerCondition;
  soundType: TriggerSoundType;
  label: string;
  createdAt: number;
  initialPrice: number;
  triggered: boolean;
  triggeredAt?: number;
  active: boolean;
}

type TriggerListener = (triggers: CustomPriceTrigger[], lastHitTrigger?: CustomPriceTrigger) => void;

class CustomPriceTriggerService {
  private triggers: CustomPriceTrigger[] = [];
  private listeners: Set<TriggerListener> = new Set();
  private lastKnownPrices: Partial<Record<AssetId, number>> = {};
  private readonly STORAGE_KEY = 'custom_price_triggers_v1';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          this.triggers = JSON.parse(raw);
        }
      }
    } catch {
      this.triggers = [];
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.triggers));
      }
    } catch {
      // storage unavailable
    }
  }

  public subscribe(listener: TriggerListener): () => void {
    this.listeners.add(listener);
    listener(this.triggers);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(lastHitTrigger?: CustomPriceTrigger) {
    this.saveToStorage();
    this.listeners.forEach((l) => l(this.triggers, lastHitTrigger));
  }

  public getAllTriggers(): CustomPriceTrigger[] {
    return [...this.triggers];
  }

  public getActiveTriggers(): CustomPriceTrigger[] {
    return this.triggers.filter((t) => t.active && !t.triggered);
  }

  public getTriggersForAsset(assetId: AssetId): CustomPriceTrigger[] {
    return this.triggers.filter((t) => t.assetId === assetId);
  }

  public getActiveCount(assetId?: AssetId): number {
    if (assetId) {
      return this.triggers.filter((t) => t.assetId === assetId && t.active && !t.triggered).length;
    }
    return this.triggers.filter((t) => t.active && !t.triggered).length;
  }

  public addTrigger(params: {
    assetId: AssetId;
    targetPrice: number;
    condition?: TriggerCondition;
    soundType?: TriggerSoundType;
    label?: string;
    currentPrice: number;
  }): CustomPriceTrigger {
    const {
      assetId,
      targetPrice,
      condition = targetPrice >= params.currentPrice ? 'CROSS_ABOVE' : 'CROSS_BELOW',
      soundType = 'chime',
      label = '',
      currentPrice,
    } = params;

    const newTrigger: CustomPriceTrigger = {
      id: `trig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      assetId,
      targetPrice: Number(targetPrice.toFixed(assetId === 'XAUUSD' ? 2 : assetId === 'USDJPY' ? 3 : 5)),
      condition,
      soundType,
      label: label.trim() || `Alarm në ${targetPrice}`,
      createdAt: Date.now(),
      initialPrice: currentPrice,
      triggered: false,
      active: true,
    };

    this.triggers.unshift(newTrigger);
    this.notify();
    return newTrigger;
  }

  public removeTrigger(id: string) {
    this.triggers = this.triggers.filter((t) => t.id !== id);
    this.notify();
  }

  public toggleTrigger(id: string) {
    this.triggers = this.triggers.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          active: !t.active,
          triggered: false, // reset triggered state on re-enabling
        };
      }
      return t;
    });
    this.notify();
  }

  public resetTrigger(id: string) {
    this.triggers = this.triggers.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          triggered: false,
          active: true,
          triggeredAt: undefined,
        };
      }
      return t;
    });
    this.notify();
  }

  public clearAll(assetId?: AssetId) {
    if (assetId) {
      this.triggers = this.triggers.filter((t) => t.assetId !== assetId);
    } else {
      this.triggers = [];
    }
    this.notify();
  }

  /**
   * Called whenever live price updates for any asset.
   * Evaluates if any active trigger condition is satisfied.
   */
  public evaluatePrice(assetId: AssetId, currentPrice: number) {
    const prevPrice = this.lastKnownPrices[assetId] ?? currentPrice;
    this.lastKnownPrices[assetId] = currentPrice;

    let hitTrigger: CustomPriceTrigger | null = null;

    this.triggers = this.triggers.map((trigger) => {
      if (!trigger.active || trigger.triggered || trigger.assetId !== assetId) {
        return trigger;
      }

      const target = trigger.targetPrice;
      let isHit = false;

      // Small epsilon threshold depending on asset decimals
      const epsilon = assetId === 'XAUUSD' ? 0.08 : assetId === 'USDJPY' ? 0.015 : 0.00015;

      switch (trigger.condition) {
        case 'CROSS_ABOVE':
          // Price moved from below or at target to at/above target
          isHit = currentPrice >= target || (prevPrice <= target && currentPrice >= target);
          break;
        case 'CROSS_BELOW':
          // Price moved from above or at target to at/below target
          isHit = currentPrice <= target || (prevPrice >= target && currentPrice <= target);
          break;
        case 'EXACT_TOUCH':
        default:
          isHit = Math.abs(currentPrice - target) <= epsilon;
          break;
      }

      if (isHit) {
        hitTrigger = {
          ...trigger,
          triggered: true,
          triggeredAt: Date.now(),
          active: false,
        };
        return hitTrigger;
      }

      return trigger;
    });

    if (hitTrigger) {
      const hit = hitTrigger as CustomPriceTrigger;
      // 1. Play selected custom alert sound
      soundService.playCustomTriggerAlert(hit.soundType);

      // 2. Dispatch browser notification
      notificationService.sendNotification({
        title: `🔔 ALARM ÇMIMI I PREKUR: ${hit.assetId}!`,
        body: `Çmimi kapi nivelin tënd të synuar: ${hit.targetPrice}! (${hit.label})`,
        type: 'ENTRY',
        price: hit.targetPrice,
      });

      this.notify(hit);
    }
  }
}

export const customPriceTriggerService = new CustomPriceTriggerService();

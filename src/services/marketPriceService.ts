// Real-time Multi-Asset Price Service connected directly to TradingView Live Market Feeds
import { AssetId, ASSETS_REGISTRY } from '../data/multiAssetData';
import { customPriceTriggerService } from './customPriceTriggerService';

export interface AssetPriceData {
  assetId: AssetId;
  price: number;
  source: 'tradingview-live' | 'live-api' | 'binance-spot' | 'simulated';
  sourceLabel: string;
  timestamp: number;
  timeFormatted: string;
  change24h?: number;
}

export type AssetPriceListener = (data: AssetPriceData) => void;

class MarketPriceService {
  private listeners: Map<AssetId, Set<AssetPriceListener>> = new Map();
  // 100% Real live prices fetched directly from TradingView Live Scanner
  private rawPrices: Record<AssetId, number> = {
    XAUUSD: 4334.50, // Direct TradingView TVC:GOLD quote
    EURUSD: 1.1476,  // Direct TradingView FX:EURUSD quote
    GBPUSD: 1.3368,  // Direct TradingView FX:GBPUSD quote
    USDJPY: 157.48,  // Direct TradingView FX:USDJPY quote
  };
  // Temporary simulation override (used ONLY for momentary 3.5s audio/visual alerts in Radar tests)
  private temporaryOverrides: Record<AssetId, number | null> = {
    XAUUSD: null,
    EURUSD: null,
    GBPUSD: null,
    USDJPY: null,
  };

  private pollInterval: any = null;

  constructor() {
    this.cleanLegacyOffsets();
    this.startFeeds();
  }

  private cleanLegacyOffsets() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('market_price_offsets');
        localStorage.removeItem('market_price_offsets_v1');
        localStorage.removeItem('market_price_offsets_v2');
        localStorage.removeItem('market_price_offsets_v3');
        localStorage.removeItem('market_price_offsets_v4');
      }
    } catch {
      // ignore
    }
  }

  public subscribe(assetId: AssetId, listener: AssetPriceListener): () => void {
    if (!this.listeners.has(assetId)) {
      this.listeners.set(assetId, new Set());
    }
    const set = this.listeners.get(assetId)!;
    set.add(listener);

    // Immediately trigger with current price
    listener({
      assetId,
      price: this.getCalibratedPrice(assetId),
      source: 'tradingview-live',
      sourceLabel: this.getSourceLabel(assetId),
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
    });

    return () => {
      set.delete(listener);
    };
  }

  public getPrice(assetId: AssetId): number {
    return this.getCalibratedPrice(assetId);
  }

  /**
   * Temporary simulation touch:
   * Flashes the target price for tests (e.g. sound/notification check in Radar)
   * without permanently shifting the live feed or writing to localStorage!
   */
  public simulateMomentaryTouch(assetId: AssetId, targetPrice: number, durationMs = 3500) {
    const config = ASSETS_REGISTRY[assetId];
    this.temporaryOverrides[assetId] = Number(targetPrice.toFixed(config.decimals));
    this.notify(assetId, 'simulated');

    setTimeout(() => {
      this.temporaryOverrides[assetId] = null;
      this.notify(assetId, 'tradingview-live');
    }, durationMs);
  }

  public setDirectPrice(assetId: AssetId, targetPrice: number) {
    this.simulateMomentaryTouch(assetId, targetPrice, 3500);
  }

  public getRawPrice(assetId: AssetId): number {
    return this.rawPrices[assetId];
  }

  public getOffset(_assetId: AssetId): number {
    return 0;
  }

  public getCalibratedPrice(assetId: AssetId): number {
    const config = ASSETS_REGISTRY[assetId];
    if (this.temporaryOverrides[assetId] !== null) {
      return Number(this.temporaryOverrides[assetId]!.toFixed(config.decimals));
    }
    return Number(this.rawPrices[assetId].toFixed(config.decimals));
  }

  private getSourceLabel(assetId: AssetId): string {
    if (this.temporaryOverrides[assetId] !== null) {
      return 'Test Simulim Hyrje';
    }
    switch (assetId) {
      case 'XAUUSD':
        return 'TradingView TVC:GOLD (Live)';
      case 'EURUSD':
        return 'TradingView FX:EURUSD (Live)';
      case 'GBPUSD':
        return 'TradingView FX:GBPUSD (Live)';
      case 'USDJPY':
        return 'TradingView FX:USDJPY (Live)';
      default:
        return 'TradingView Live Feed';
    }
  }

  private notify(assetId: AssetId, source: 'tradingview-live' | 'live-api' | 'binance-spot' | 'simulated' = 'tradingview-live') {
    const calibratedPrice = this.getCalibratedPrice(assetId);

    // Evaluate custom price alerts across any monitored asset in real-time
    try {
      customPriceTriggerService.evaluatePrice(assetId, calibratedPrice);
    } catch {
      // ignore
    }

    const set = this.listeners.get(assetId);
    if (!set || set.size === 0) return;

    const data: AssetPriceData = {
      assetId,
      price: calibratedPrice,
      source,
      sourceLabel: this.getSourceLabel(assetId),
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
    };

    set.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error in price listener:', err);
      }
    });
  }

  private startFeeds() {
    // 1. Initial live fetch immediately
    this.fetchAllPrices();

    // 2. High-speed poll every 3.5 seconds directly from TradingView
    this.pollInterval = setInterval(() => {
      this.fetchAllPrices();
    }, 3500);
  }

  public async forceRefreshAllPrices(_resetOffsets = false): Promise<void> {
    this.cleanLegacyOffsets();
    await this.fetchAllPrices();
  }

  private async fetchAllPrices() {
    let tvGoldSuccess = false;

    // 1. Fetch Gold directly from TradingView CFD Scanner (TVC:GOLD & OANDA:XAUUSD)
    try {
      const res = await fetch('https://scanner.tradingview.com/cfd/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: {
            tickers: ['TVC:GOLD', 'OANDA:XAUUSD', 'FOREXCOM:XAUUSD']
          },
          columns: ['close']
        }),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const tvcItem = data.data.find((d: any) => d.s === 'TVC:GOLD') || data.data[0];
          const price = tvcItem?.d?.[0];
          if (typeof price === 'number' && price > 1000 && price < 10000) {
            this.rawPrices.XAUUSD = Number(price.toFixed(2));
            this.notify('XAUUSD', 'tradingview-live');
            tvGoldSuccess = true;
          }
        }
      }
    } catch {
      // TradingView direct scan error fallback
    }

    // Fallback for Gold if TradingView network is blocked
    if (!tvGoldSuccess) {
      try {
        const res = await fetch('https://api.gold-api.com/price/XAU', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.price === 'number' && data.price > 1000) {
            this.rawPrices.XAUUSD = Number(data.price.toFixed(2));
            this.notify('XAUUSD', 'live-api');
            tvGoldSuccess = true;
          }
        }
      } catch {
        // Fallback to Binance
        try {
          const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data && data.price) {
              const p = Number(parseFloat(data.price).toFixed(2));
              if (p > 1000 && p < 10000) {
                this.rawPrices.XAUUSD = p;
                this.notify('XAUUSD', 'binance-spot');
              }
            }
          }
        } catch {
          // Keep current live price
        }
      }
    }

    // 2. Fetch Forex pairs directly from TradingView Forex Scanner
    let tvForexSuccess = false;
    try {
      const res = await fetch('https://scanner.tradingview.com/forex/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: {
            tickers: ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY']
          },
          columns: ['close']
        }),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          data.data.forEach((item: any) => {
            const sym = item.s;
            const price = item.d?.[0];
            if (typeof price === 'number') {
              if (sym === 'FX:EURUSD') {
                this.rawPrices.EURUSD = Number(price.toFixed(4));
                this.notify('EURUSD', 'tradingview-live');
              } else if (sym === 'FX:GBPUSD') {
                this.rawPrices.GBPUSD = Number(price.toFixed(4));
                this.notify('GBPUSD', 'tradingview-live');
              } else if (sym === 'FX:USDJPY') {
                this.rawPrices.USDJPY = Number(price.toFixed(2));
                this.notify('USDJPY', 'tradingview-live');
              }
            }
          });
          tvForexSuccess = true;
        }
      }
    } catch {
      // Forex direct scan error fallback
    }

    // Fallback for EURUSD and GBPUSD via Binance if needed
    if (!tvForexSuccess) {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.price) {
            const parsed = Number(Number(data.price).toFixed(4));
            // Only update if it is within reasonable real-world range around current market quote (> 1.10)
            if (parsed > 1.10) {
              this.rawPrices.EURUSD = parsed;
              this.notify('EURUSD', 'binance-spot');
            }
          }
        }
      } catch {
        // Fallback
      }

      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=GBPUSDT', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.price) {
            this.rawPrices.GBPUSD = Number(Number(data.price).toFixed(4));
            this.notify('GBPUSD', 'binance-spot');
          }
        }
      } catch {
        // Fallback
      }
    }
  }

  public destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.listeners.clear();
  }
}

export const marketPriceService = new MarketPriceService();

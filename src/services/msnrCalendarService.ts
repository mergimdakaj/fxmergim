import { MSNRRadarSetup } from '../data/msnrData';
import { MSNRCalendarDayTrade } from '../components/msnr/MSNRProfitCalendar';

const STORAGE_KEY = 'msnr_custom_calendar_trades';

export const getTodayDateStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class MSNRCalendarService {
  private static listeners: Set<() => void> = new Set();

  public static getCustomTrades(): Record<string, MSNRCalendarDayTrade[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  public static saveCustomTrade(dateStr: string, trade: MSNRCalendarDayTrade): void {
    try {
      const all = this.getCustomTrades();
      if (!all[dateStr]) {
        all[dateStr] = [];
      }
      // Avoid duplicate by id
      all[dateStr] = [trade, ...all[dateStr].filter((t) => t.id !== trade.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      this.notify();
    } catch (err) {
      console.error('Failed to save MSNR calendar trade:', err);
    }
  }

  public static deleteCustomTrade(dateStr: string, tradeId: string): void {
    try {
      const all = this.getCustomTrades();
      if (all[dateStr]) {
        all[dateStr] = all[dateStr].filter((t) => t.id !== tradeId);
        if (all[dateStr].length === 0) {
          delete all[dateStr];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        this.notify();
      }
    } catch (err) {
      console.error('Failed to delete MSNR calendar trade:', err);
    }
  }

  public static recordRadarTradeToCalendar(
    setup: MSNRRadarSetup,
    outcome: 'WIN' | 'LOSS' | 'ACTIVE',
    customPips?: number
  ): MSNRCalendarDayTrade {
    const todayStr = getTodayDateStr();
    const timeStr = `${new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} UTC`;
    const tradeId = `msnr-radar-${Date.now()}`;

    // Target pips
    let resultPips10 = 0;
    let resultPips20 = 0;
    let status10: 'TP_HIT' | 'SL_HIT' | 'ACTIVE' = 'ACTIVE';
    let status20: 'TP_HIT' | 'SL_HIT' | 'ACTIVE' = 'ACTIVE';
    let note = '';

    if (outcome === 'WIN') {
      const winPips = customPips && customPips > 0 ? customPips : 50;
      resultPips10 = winPips;
      resultPips20 = winPips;
      status10 = 'TP_HIT';
      status20 = 'TP_HIT';
      note = `🎯 FITORE nga Radari i Pritjes! Hyrja Sniper @ ${setup.expectedEntry}. Rregulli SL 10p fiks dha raport të lartë R:R (+${winPips} pips)!`;
    } else if (outcome === 'LOSS') {
      // Iron Rule of Abjeed: Max 10 pips loss with 10p SL, or 20 pips with 20p SL
      resultPips10 = -10;
      resultPips20 = -20;
      status10 = 'SL_HIT';
      status20 = 'SL_HIT';
      note = `🔴 Humbje e kontrolluar me Stop Loss 10 pips (-10 pips) sipas rregullave të hekurta të Abjeed.`;
    } else {
      resultPips10 = 0;
      resultPips20 = 0;
      status10 = 'ACTIVE';
      status20 = 'ACTIVE';
      note = `⏳ Hyrje aktive e hapur nga Radari i Pritjes në ${timeStr} @ ${setup.expectedEntry}. Presim TP1/TP2.`;
    }

    const newTrade: MSNRCalendarDayTrade = {
      id: tradeId,
      assetId: setup.assetId,
      symbol: setup.symbol,
      time: timeStr,
      type: setup.type,
      setupName: `${setup.patternName} (Radari i Pritjes)`,
      session: 'London',
      entry: setup.expectedEntry,
      sl10: setup.sl10Pips,
      resultPips10,
      status10,
      sl20: Number((setup.type === 'BUY' ? setup.expectedEntry - (setup.assetId === 'XAUUSD' ? 2.0 : setup.assetId === 'USDJPY' ? 0.20 : 0.0020) : setup.expectedEntry + (setup.assetId === 'XAUUSD' ? 2.0 : setup.assetId === 'USDJPY' ? 0.20 : 0.0020)).toFixed(setup.assetId === 'XAUUSD' ? 2 : 5)),
      resultPips20,
      status20,
      tp1: setup.targetTp1 ?? setup.expectedEntry,
      tp2: setup.targetTp2 ?? (setup.targetTp1 ?? setup.expectedEntry),
      tp3: setup.targetTp3 ?? (setup.targetTp2 ?? setup.expectedEntry),
      maxFavorablePips: outcome === 'WIN' ? (customPips || 55) : 4,
      maxAdversePips: outcome === 'WIN' ? 2.5 : 10,
      note,
    };

    this.saveCustomTrade(todayStr, newTrade);
    return newTrade;
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('msnr_calendar_updated'));
    }
  }
}

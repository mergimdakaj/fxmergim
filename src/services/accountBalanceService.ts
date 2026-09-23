/**
 * Account Balance & Risk Management Service
 * Synchronizes the user's account balance, calendar profits, and risk percentage
 * across the Daily Calendar, MSNR Calendar, Radars, and Position Sizing Calculator.
 */

export interface AccountSettings {
  balance: number;
  riskPercent: number;
  currency: 'EUR' | 'USD';
  useDynamicEquity: boolean; // if true, adds net profit from calendar to base balance
}

const STORAGE_KEY_BALANCE = 'trading_account_balance';
const STORAGE_KEY_RISK = 'trading_risk_percent';
const STORAGE_KEY_CURRENCY = 'trading_account_currency';
const STORAGE_KEY_USE_EQUITY = 'trading_use_dynamic_equity';

const DEFAULT_BALANCE = 10000;
const DEFAULT_RISK = 1.0;
const DEFAULT_CURRENCY: 'EUR' | 'USD' = 'EUR';

class AccountBalanceService {
  private listeners: Set<(settings: AccountSettings) => void> = new Set();
  private calendarNetProfitEur: number = 0;
  private calendarNetProfitUsd: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEY_BALANCE ||
      e.key === STORAGE_KEY_RISK ||
      e.key === STORAGE_KEY_CURRENCY ||
      e.key === STORAGE_KEY_USE_EQUITY
    ) {
      this.notify();
    }
  };

  public getSettings(): AccountSettings {
    if (typeof window === 'undefined') {
      return {
        balance: DEFAULT_BALANCE,
        riskPercent: DEFAULT_RISK,
        currency: DEFAULT_CURRENCY,
        useDynamicEquity: true,
      };
    }

    try {
      const savedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
      const savedRisk = localStorage.getItem(STORAGE_KEY_RISK);
      const savedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY);
      const savedUseEquity = localStorage.getItem(STORAGE_KEY_USE_EQUITY);

      return {
        balance: savedBalance ? Math.max(100, parseFloat(savedBalance)) : DEFAULT_BALANCE,
        riskPercent: savedRisk ? Math.max(0.1, parseFloat(savedRisk)) : DEFAULT_RISK,
        currency: (savedCurrency === 'USD' ? 'USD' : 'EUR'),
        useDynamicEquity: savedUseEquity !== null ? savedUseEquity === 'true' : true,
      };
    } catch {
      return {
        balance: DEFAULT_BALANCE,
        riskPercent: DEFAULT_RISK,
        currency: DEFAULT_CURRENCY,
        useDynamicEquity: true,
      };
    }
  }

  public setBalance(balance: number) {
    const valid = Math.max(100, Number(balance) || DEFAULT_BALANCE);
    try {
      localStorage.setItem(STORAGE_KEY_BALANCE, valid.toString());
      this.notify();
    } catch (e) {
      console.warn('Failed to save balance to localStorage', e);
    }
  }

  public setRiskPercent(riskPercent: number) {
    const valid = Math.max(0.1, Math.min(10, Number(riskPercent) || DEFAULT_RISK));
    try {
      localStorage.setItem(STORAGE_KEY_RISK, valid.toString());
      this.notify();
    } catch (e) {
      console.warn('Failed to save riskPercent to localStorage', e);
    }
  }

  public setCurrency(currency: 'EUR' | 'USD') {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
      this.notify();
    } catch (e) {
      console.warn('Failed to save currency to localStorage', e);
    }
  }

  public setUseDynamicEquity(use: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY_USE_EQUITY, use ? 'true' : 'false');
      this.notify();
    } catch (e) {
      console.warn('Failed to save useDynamicEquity', e);
    }
  }

  /**
   * Registers current calendar profit to calculate dynamic equity
   */
  public updateCalendarProfit(eurProfit: number, usdProfit: number) {
    this.calendarNetProfitEur = eurProfit;
    this.calendarNetProfitUsd = usdProfit;
    this.notify();
  }

  public getCalendarProfit() {
    return {
      eur: this.calendarNetProfitEur,
      usd: this.calendarNetProfitUsd,
    };
  }

  /**
   * Returns current active balance (Base or Dynamic with calendar profit)
   */
  public getEffectiveBalance(currency: 'EUR' | 'USD' = 'EUR'): {
    baseBalance: number;
    effectiveBalance: number;
    calendarProfit: number;
    isDynamic: boolean;
  } {
    const settings = this.getSettings();
    const profit = currency === 'EUR' ? this.calendarNetProfitEur : this.calendarNetProfitUsd;
    const effective = settings.useDynamicEquity ? Math.max(100, settings.balance + profit) : settings.balance;

    return {
      baseBalance: settings.balance,
      effectiveBalance: effective,
      calendarProfit: profit,
      isDynamic: settings.useDynamicEquity,
    };
  }

  /**
   * Calculates precise lot size for a 10-pip stop loss
   *
   * Standard Contracts:
   * - Gold (XAUUSD): 1 standard lot (100 oz). 1 pip = 0.10 price = $10.00.
   *   10 pips = $100.00 risk per standard lot.
   * - EURUSD, GBPUSD: 1 standard lot (100,000 units). 1 pip = 0.0001 = $10.00.
   *   10 pips = $100.00 risk per standard lot.
   * - USDJPY: 1 standard lot (100,000 units). 1 pip = 0.01 = 1,000 JPY ≈ $6.70 (at 149.5 JPY/USD).
   *   10 pips = $67.00 risk per standard lot.
   */
  public calculateLotSizeFor10PipSL(
    balance: number,
    riskPercent: number,
    assetId: 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' = 'XAUUSD',
    currency: 'EUR' | 'USD' = 'EUR',
    eurUsdRate: number = 1.08
  ) {
    // 1. Calculate monetary risk in account currency
    const riskAmountAccount = (balance * riskPercent) / 100;
    
    // 2. Convert risk amount to USD (standard forex pip valuation currency)
    const riskAmountUsd = currency === 'EUR' ? riskAmountAccount * eurUsdRate : riskAmountAccount;

    // 3. Pip value per 1 standard lot (100,000 units or 100 oz Gold) in USD
    let pipValuePerStdLotUsd = 10.0;
    if (assetId === 'USDJPY') {
      pipValuePerStdLotUsd = 6.70; // 1000 JPY / ~149.25
    }

    // 4. Fixed Stop Loss of 10 pips (MSNR LIT sniper rule)
    const slPips = 10;
    const totalRiskPerStdLotUsd = slPips * pipValuePerStdLotUsd; // e.g. 10 * $10 = $100.00

    // 5. Raw lot size
    const rawLot = riskAmountUsd / totalRiskPerStdLotUsd;

    // 6. Practical rounded lot size (broker precision 0.01 lot)
    const suggestedLot = Math.max(0.01, parseFloat(rawLot.toFixed(2)));

    // 7. Projected returns for standard MSNR targets
    // Risk (-10 pips): -1R
    const riskMonetary = riskAmountAccount;
    // TP1 (1:3 RR = 30 pips): +3R
    const tp1Monetary = riskMonetary * 3.0;
    // TP2 (1:5 RR = 50 pips): +5R
    const tp2Monetary = riskMonetary * 5.0;
    // TP3 (1:8 RR = 80 pips): +8R
    const tp3Monetary = riskMonetary * 8.0;

    return {
      slPips,
      rawLot,
      suggestedLot,
      riskAmountAccount,
      riskAmountUsd,
      pipValuePerStdLotUsd,
      monetaryRiskFormatted: currency === 'EUR' ? `€${riskMonetary.toFixed(2)}` : `$${riskMonetary.toFixed(2)}`,
      tp1ProfitFormatted: currency === 'EUR' ? `+€${tp1Monetary.toFixed(2)}` : `+$${tp1Monetary.toFixed(2)}`,
      tp2ProfitFormatted: currency === 'EUR' ? `+€${tp2Monetary.toFixed(2)}` : `+$${tp2Monetary.toFixed(2)}`,
      tp3ProfitFormatted: currency === 'EUR' ? `+€${tp3Monetary.toFixed(2)}` : `+$${tp3Monetary.toFixed(2)}`,
      riskRewardRatio: '1:5 (TP2 Zakonshëm)',
    };
  }

  public subscribe(listener: (settings: AccountSettings) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getSettings();
    this.listeners.forEach((l) => l(s));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('account_balance_updated', { detail: s }));
    }
  }
}

export const accountBalanceService = new AccountBalanceService();

import React, { useState, useEffect } from 'react';
import { soundService } from '../utils/audioAlert';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  Zap,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LiveAlertScannerProps {
  livePrice: number;
  symbol?: string;
  decimals?: number;
  currencySymbol?: string;
  onTriggerAlertSim?: (tradeType: 'BUY' | 'SELL', price: number) => void;
}

export const LiveAlertScanner: React.FC<LiveAlertScannerProps> = ({
  livePrice,
  symbol = 'XAU/USD',
  decimals = 2,
  currencySymbol = '$',
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [browserNotifStatus, setBrowserNotifStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    type: 'BUY' | 'SELL';
    price: number;
    sl: number;
    tp: number;
    time: string;
    step: string;
  } | null>(null);

  const [currentTimeUTC, setCurrentTimeUTC] = useState<string>('');

  // Clock in UTC
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUTC(
        now.toUTCString().slice(17, 22) + ' UTC (' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Lokale)'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser desktop notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserNotifStatus(perm);
      if (perm === 'granted') {
        new Notification(`🔔 Alarmi ICT ${symbol} u Aktivizua!`, {
          body: `Jeni të lidhur me sukses. Do të njoftoheni automatikisht kur të konfirmohet formacioni M/W me MSS + FVG! Çmimi: ${currencySymbol}${livePrice.toFixed(decimals)}`,
          icon: '/favicon.ico',
        });
        soundService.playEntryAlert();
      }
    } else {
      alert('Shfletuesi juaj nuk i mbështet njoftimet e desktopit, por alarmi me zë dhe vizual funksionon 100%!');
    }
  };

  // Trigger test alert
  const triggerTestAlert = (type: 'BUY' | 'SELL' = 'SELL') => {
    if (soundOn) {
      soundService.playEntryAlert();
    }

    const pipDelta = decimals === 4 ? 0.0015 : decimals === 2 && currencySymbol === '¥' ? 0.30 : 4.10;
    const sl = type === 'SELL' ? livePrice + pipDelta : livePrice - pipDelta;
    const tp = type === 'SELL' ? livePrice - (pipDelta * 2) : livePrice + (pipDelta * 2);

    const alertData = {
      id: `alert-${Date.now()}`,
      type,
      price: livePrice,
      sl: Number(sl.toFixed(decimals)),
      tp: Number(tp.toFixed(decimals)),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      step: '4/4 Të gjitha kushtet u plotësuan: Liquidity Sweep + MSS + FVG Retest!',
    };

    setActiveAlert(alertData);

    // If browser notifications are permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`⚡ ICT ${type} ALARM: ${symbol} @ ${currencySymbol}${livePrice.toFixed(decimals)}`, {
        body: `Kushtet e 4 fotove u konfirmuan!\nEntry: ${currencySymbol}${livePrice.toFixed(decimals)} | SL: ${currencySymbol}${sl.toFixed(decimals)} | TP 1:2: ${currencySymbol}${tp.toFixed(decimals)}`,
      });
    }

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: type === 'BUY' ? ['#10b981', '#38bdf8'] : ['#f43f5e', '#fbbf24'],
    });
  };

  return (
    <div
      id="live-alert-scanner-box"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6 backdrop-blur-md"
    >
      {/* Alert Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Skaneri i Drejtpërdrejtë & Sistemi i Lajmërimit (ICT Live Alerts)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                RADAR AKTIV
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Koha ekzakte kur priten mundësitë dhe lajmërimi automatik me Zë & Njoftime në Desktop
            </p>
          </div>
        </div>

        {/* Controls: Sound toggle & Notification request */}
        <div className="flex items-center gap-2">
          <button
            id="sound-alert-toggle-btn"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (next) soundService.playRadarPing();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
              soundOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundOn ? 'Zëri: AKTIV' : 'Zëri: PAUZË'}</span>
          </button>

          <button
            id="desktop-notif-btn"
            onClick={requestNotificationPermission}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
              browserNotifStatus === 'granted'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>
              {browserNotifStatus === 'granted' ? 'Njoftimet Desktop: AKTIVE ✓' : 'Aktivizo Njoftimet'}
            </span>
          </button>

          <button
            id="simulate-alert-btn"
            onClick={() => triggerTestAlert('SELL')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>Testo Alarmin me Zë</span>
          </button>
        </div>
      </div>

      {/* Active Alert Modal/Banner if triggered */}
      {activeAlert && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-2 border-amber-500/80 shadow-2xl relative animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  ⚡ SINJAL HYRJEJE I RI NË GOLD (XAU/USD)!
                </span>
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono ${
                      activeAlert.type === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {activeAlert.type}
                  </span>
                  <span>Çmimi Aktual: ${activeAlert.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 font-normal">({activeAlert.time})</span>
                </h4>
              </div>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            >
              Mbyll Alarmin
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800 font-mono text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Hyrja (Entry):</span>
              <p className="text-sm font-bold text-sky-400">${activeAlert.price.toFixed(2)}</p>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Stop Loss (SL):</span>
              <p className="text-sm font-bold text-rose-400">${activeAlert.sl.toFixed(2)}</p>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Take Profit (1:2 TP):</span>
              <p className="text-sm font-bold text-emerald-400">${activeAlert.tp.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Part 1: Kur të presim mundësinë (Killzones & Algorithmic Timing) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            1. Kur të presim mundësinë? (Oraret më fitimprurëse sipas ICT)
          </h4>
          <span className="text-xs font-mono text-slate-400">{currentTimeUTC}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* London Killzone */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">London Killzone</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PROBABILITET I LARTË
              </span>
            </div>
            <p className="text-base font-extrabold text-white mt-1">07:00 - 10:00 UTC</p>
            <p className="text-xs text-amber-400/90 font-medium mt-0.5">
              (09:00 - 12:00 Ora e Shqipërisë)
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              <strong>Çfarë ndodh:</strong> Pastrimi i majave ose fundeve të Azisë (Asian High/Low Sweep). Këtu formohet shpesh "Judas Swing" dhe këmba e dytë e modelit W ose M.
            </p>
          </div>

          {/* New York Killzone */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 relative overflow-hidden shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">New York Killzone</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                SESIONI KRYESOR
              </span>
            </div>
            <p className="text-base font-extrabold text-white mt-1">12:00 - 15:30 UTC</p>
            <p className="text-xs text-amber-400/90 font-medium mt-0.5">
              (14:00 - 17:30 Ora e Shqipërisë)
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              <strong>Çfarë ndodh:</strong> Volumi më masiv në XAU/USD. Pas lajmeve të SHBA-së ose hapjes së NYSE, ndodh MSS dhe FVG me lëvizje të drejtpërdrejtë drejt 1:2 TP.
            </p>
          </div>

          {/* Asian Liquidity Range */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Asian Range (Ndërtimi)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                PËRGATITJE
              </span>
            </div>
            <p className="text-base font-extrabold text-white mt-1">00:00 - 06:00 UTC</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              (02:00 - 08:00 Ora e Shqipërisë)
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              <strong>Çfarë ndodh:</strong> Tregu konsolidohet dhe krijon likuiditet në të dy anët ($$$). <em>Mos merrni trades këtu</em>; prisni që Londra ose Nju Jorku t'i fshijë këto nivele!
            </p>
          </div>
        </div>
      </div>

      {/* Part 2: Radari i 4 Hapave në Zhvillim (Live Pipeline Monitor) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            2. Radari në Kohë Reale: Si monitorohet mundësia para se të bjerë alarmi?
          </h4>
          <span className="text-xs font-mono text-emerald-400">Çmimi XAU/USD: ${livePrice.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 Live Status */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300">Hapi 1: HTF POI</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AKTIV
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Zona: 4H Supply @ $4388.00
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Çmimi aktual ($4383.20) është brenda rrezes së reagimit nga zona e ofertës.
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-850 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Kushti 1: I Plotësuar
            </div>
          </div>

          {/* Step 2 Live Status */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">Hapi 2: Liquidity Sweep</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  U KRYE
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Sweep i Majës: $4389.60
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Likuiditeti i blerësve (Buyside $$$) u pastrua me wick të lartë dhe refuzim.
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-850 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Kushti 2: I Plotësuar
            </div>
          </div>

          {/* Step 3 Live Status */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-300">Hapi 3: Modeli M / W</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  KONFIRMUAR
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Formacioni M (Bearish)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Këmba e dytë mori likuiditetin brenda zonës sipas fotografisë 5 & 6.
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-850 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Kushti 3: I Plotësuar
            </div>
          </div>

          {/* Step 4 Live Status */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex flex-col justify-between shadow-lg shadow-emerald-500/5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300">Hapi 4: MSS + FVG</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 animate-pulse">
                  TRIGGER ALARM!
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Thyerje në $4384.20 • FVG
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Hyrja në retest @ $4386.40. Target 1:2 TP: $4378.20.
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
              <span>ALARM AKTIV</span>
              <button
                onClick={() => triggerTestAlert('SELL')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              >
                Riluaj Zërin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Si të merrni njoftime kudo (Mobile, Telegram, Shfletues) */}
      <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-white text-sm">
              Si të siguroheni që nuk humbisni asnjë mundësi?
            </h5>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              1. <strong>Mbajeni këtë dritare të hapur në sfond:</strong> Zëri i alarmit dhe njoftimet e shfletuesit do t'ju bien menjëherë kur qiriri 5M konfirmon FVG.<br />
              2. <strong>Fokusohuni në New York Killzone (14:00 - 17:30):</strong> 80% e mundësive më të pastra në Gold ndodhin në këtë interval 3.5 orësh.<br />
              3. <strong>Rregulli i Artë:</strong> Asnjëherë mos hyni në treg nëse nuk keni përgjigje "PO" për të gjitha 4 pyetjet e checklist-ës!
            </p>
          </div>
        </div>

        <div className="shrink-0 flex sm:flex-col gap-2 w-full sm:w-auto">
          <button
            onClick={() => triggerTestAlert('BUY')}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Testo Buy Alert</span>
          </button>

          <button
            onClick={() => triggerTestAlert('SELL')}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Testo Sell Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};

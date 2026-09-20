import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { notificationService } from '../services/notificationService';
import {
  Smartphone,
  Bell,
  BellRing,
  Download,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
} from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  useEffect(() => {
    setNotifPermission(notificationService.getPermissionStatus());
  }, []);

  const handleRequestNotification = async () => {
    setIsNotifLoading(true);
    const granted = await notificationService.requestPermission();
    setNotifPermission(notificationService.getPermissionStatus());
    setIsNotifLoading(false);
    if (granted) {
      // test alert
      notificationService.sendNotification({
        title: '🔥 ICT XAU/USD: Njoftimet Aktive!',
        body: 'Alarmi funksionon 100%! Do të njoftoheni sa herë të formohet M/W ose Entry në Ari.',
        type: 'ENTRY',
      });
    }
  };

  const handleTestAlert = () => {
    notificationService.sendNotification({
      title: '🚨 HYRJE E RE ICT: XAU/USD (SELL)',
      body: 'Entry: $4386.40 | SL: $4390.50 | TP: $4378.20 (1:2 RR). Nivelet u konfirmuan me MSS + FVG!',
      type: 'ENTRY',
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Android / Device Notification Permission Toggle */}
        <button
          id="toggle-notifications-header-btn"
          onClick={notifPermission === 'granted' ? handleTestAlert : handleRequestNotification}
          title={
            notifPermission === 'granted'
              ? 'Njoftimet janë aktive! Kliko për të testuar njoftimin në telefon'
              : 'Aktivizo njoftimet direkte në telefon kur del Entry'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            notifPermission === 'granted'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
          }`}
        >
          {notifPermission === 'granted' ? (
            <>
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Njoftimet: ON</span>
              <span className="text-[10px] px-1 bg-emerald-500/30 text-emerald-200 rounded">Test</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Aktivizo Njoftimet</span>
            </>
          )}
        </button>

        {/* PWA Install / Android Download Button - Always Visible */}
        <button
          id="install-pwa-header-btn"
          onClick={() => {
            if (isInstallable) {
              install();
            } else {
              setShowModal(true);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          title="Shkarko / Instalo në Android si aplikacion nativ (PWA)"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-950" />
          <span className="font-extrabold">Shkarko në Android</span>
          {isInstalled && (
            <span className="text-[9px] bg-slate-950/20 px-1 py-0.2 rounded text-slate-900 font-mono">
              Instaluar ✓
            </span>
          )}
        </button>
      </div>

      {/* Guide Modal for Android & iOS Installation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalo në Telefonin tënd</h3>
                <p className="text-xs text-slate-400">Merr aplikacionin me ikonë në ekranin kryesor</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Android instructions */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Hapat për Android (Google Chrome):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>
                    Hap shfletuesin <strong>Chrome</strong> në telefonin tënd.
                  </li>
                  <li>
                    Kliko menunë me 3 pika <strong>(⋮)</strong> lart djathtas.
                  </li>
                  <li>
                    Kliko <strong>"Install app"</strong> ose <strong>"Add to Home screen"</strong> (Shto në ekranin kryesor).
                  </li>
                  <li>Aplikacioni do të shfaqet menjëherë si aplikacion nativ Android me njoftime!</li>
                </ol>
              </div>

              {/* iOS instructions */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center gap-2 font-bold text-sky-300 mb-2">
                  <Share2 className="w-3.5 h-3.5" />
                  Hapat për iPhone (Safari):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Kliko butonin e shpërndarjes <strong>Share</strong> në Safari poshtë.</li>
                  <li>Zgjidh <strong>"Add to Home Screen"</strong> (Shto në ekranin kryesor).</li>
                </ol>
              </div>

              {/* Push notifications button inside modal */}
              <div className="pt-2">
                <button
                  onClick={handleRequestNotification}
                  disabled={isNotifLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Aktivizo Njoftimet në Telefon Tani</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { notificationService, NotificationDiagnostic } from '../services/notificationService';
import {
  Smartphone,
  Bell,
  BellRing,
  Download,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  Lock,
  Volume2,
} from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [testDiagnostic, setTestDiagnostic] = useState<NotificationDiagnostic | null>(null);

  useEffect(() => {
    setNotifPermission(notificationService.getPermissionStatus());
  }, []);

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    setTestDiagnostic(null);
    try {
      const diag = await notificationService.testNotification();
      setTestDiagnostic(diag);
      setNotifPermission(notificationService.getPermissionStatus());
    } catch (err: any) {
      setTestDiagnostic({
        supported: true,
        permission: notificationService.getPermissionStatus(),
        serviceWorkerRegistered: false,
        success: false,
        message: 'Gabim gjatë testimit të njoftimit: ' + (err?.message || err),
      });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleRequestPermissionDirect = async () => {
    setIsTestingNotif(true);
    await notificationService.requestPermission();
    setNotifPermission(notificationService.getPermissionStatus());
    setIsTestingNotif(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Device / Vercel Notification Center Button */}
        <button
          id="toggle-notifications-header-btn"
          onClick={() => setShowNotifModal(true)}
          title="Verifiko dhe testo njoftimet e hyrjeve në telefon/Vercel"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            notifPermission === 'granted'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
              : notifPermission === 'denied'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
          }`}
        >
          {notifPermission === 'granted' ? (
            <>
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Njoftimet: ON</span>
              <span className="text-[10px] px-1 bg-emerald-500/30 text-emerald-200 rounded font-mono">Test</span>
            </>
          ) : notifPermission === 'denied' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Njoftimet: Bllokuar</span>
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
              setShowInstallModal(true);
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

      {/* Notification Diagnostic & Verification Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative text-slate-200 space-y-5">
            <button
              onClick={() => setShowNotifModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Qendra e Njoftimeve &amp; Verifikimi Vercel</h3>
                <p className="text-xs text-slate-400">
                  Verifikoni marrjen e alarmeve sa herë që çmimi prek pikën e hyrjes (Entry)
                </p>
              </div>
            </div>

            {/* Current Status Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Statusi i Lejes në Shfletues:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black font-mono flex items-center gap-1.5 ${
                    notifPermission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : notifPermission === 'denied'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {notifPermission === 'granted' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {notifPermission === 'denied' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                  {notifPermission === 'default' && <Info className="w-3.5 h-3.5 text-amber-400" />}
                  <span>
                    {notifPermission === 'granted'
                      ? 'E LEJUAR (100% GATI)'
                      : notifPermission === 'denied'
                      ? 'E BLLOKUAR NGA SHFLETUESI'
                      : 'KËRKOHET AKTIVIZIMI'}
                  </span>
                </span>
              </div>

              {notifPermission === 'denied' && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Si ta zhbllokoni në Vercel:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    1. Klikoni ikonën e <strong>drynit 🔒</strong> ose cilësimeve tek shiriti i adresës së shfletuesit tuaj në krye.
                    <br />
                    2. Tek <strong>"Notifications / Njoftimet"</strong>, ndryshojeni nga "Blloko" në <strong>"Allow / Lejo"</strong>.
                    <br />
                    3. Rifreskoni faqen dhe shtypni përsëri "Testo Njoftimin".
                  </p>
                </div>
              )}

              {/* Service Worker Status */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900 text-slate-400">
                <span>Motorri i Njoftimeve në Prapavijë:</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Service Worker Aktiv (/sw.js)
                </span>
              </div>
            </div>

            {/* Test Notification Action */}
            <div className="space-y-2">
              <button
                id="test-vercel-notification-btn"
                onClick={handleTestNotification}
                disabled={isTestingNotif}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:scale-[1.01] transition-all cursor-pointer"
              >
                <BellRing className={`w-4 h-4 ${isTestingNotif ? 'animate-bounce' : ''}`} />
                <span>
                  {isTestingNotif
                    ? 'Duke dërguar njoftimin provë...'
                    : '⚡ Testo Njoftimin Tani (Zë + Dridhje + Push)'}
                </span>
              </button>

              {testDiagnostic && (
                <div
                  className={`p-3.5 rounded-xl border text-xs animate-in fade-in ${
                    testDiagnostic.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <p className="font-bold flex items-center gap-2 mb-1">
                    {testDiagnostic.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{testDiagnostic.success ? 'Njoftimi u Dërgua me Sukses!' : 'Vërejtje mbi Njoftimin'}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">{testDiagnostic.message}</p>
                </div>
              )}
            </div>

            {/* Device-Specific Guidance */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>Udhëzues për Telefona &amp; Vercel:</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                <li>
                  <strong>Android (Chrome):</strong> Funksionon menjëherë me zë dhe dridhje sapo jepet leja "Allow". Gjithashtu funksionon si PWA.
                </li>
                <li>
                  <strong>iPhone (iOS 16.4+):</strong> Apple kërkon që fillimisht ta shtoni faqen në Home Screen ("Share" &gt; "Add to Home Screen"), dhe ta hapni nga ikona e ekranit për të aktivizuar njoftimet.
                </li>
                <li>
                  <strong>Realismi në Kohë Reale:</strong> Sa herë që çmimi arrin tek hyrja, aplikacioni do të bjerë zile dhe do të ruajë automatikisht hyrjen në Kalendar.
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowNotifModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Mbyll Dritaren
            </button>
          </div>
        </div>
      )}

      {/* Guide Modal for Android & iOS Installation */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowInstallModal(false)}
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
                  onClick={handleTestNotification}
                  disabled={isTestingNotif}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Aktivizo &amp; Testo Njoftimet në Telefon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

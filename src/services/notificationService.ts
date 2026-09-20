// Web Notification and Android Vibration Alert Service
import { soundService } from '../utils/audioAlert';

export interface NotificationPayload {
  title: string;
  body: string;
  type?: 'ENTRY' | 'SWEEP' | 'MSS' | 'TP' | 'SL';
  price?: number;
}

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API is not supported in this browser environment.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      this.permission = perm;
      if (perm === 'granted') {
        this.sendNotification({
          title: '✅ Njoftimet u Aktivizuan me Sukses!',
          body: 'Do të njoftoheni menjëherë në telefon sa herë që shfaqet një Hyrje (Entry) ose Sweep Likuiditeti në XAU/USD.',
          type: 'ENTRY',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Notification permission request was cancelled or blocked:', err);
      return false;
    }
  }

  public sendNotification(payload: NotificationPayload) {
    try {
      // 1. Play auditory alert
      soundService.playEntryAlert();
    } catch (e) {
      console.warn('Audio alert skipped:', e);
    }

    // 2. Android Device Vibration (Hardware tactile feedback)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // ignore if not allowed without gesture
      }
    }

    // 3. Desktop / Android Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then((registration) => {
              const notifOptions: any = {
                body: payload.body,
                icon: '/pwa-192x192.png',
                badge: '/icon.svg',
                vibrate: [200, 100, 200, 100, 300],
                tag: 'ict-alert-' + Date.now(),
                data: { url: window.location.href },
              };
              registration.showNotification(payload.title, notifOptions);
            })
            .catch((swErr) => {
              console.warn('Service worker notification fallback:', swErr);
              this.fallbackNotification(payload);
            });
        } else {
          this.fallbackNotification(payload);
        }
      } catch (e) {
        console.warn('Native notification dispatch fallback', e);
      }
    }
  }

  private fallbackNotification(payload: NotificationPayload) {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
      });
    } catch {
      // Some mobile platforms (like Chrome on Android) disallow `new Notification()`
      // without a service worker registration; this catch prevents any crash
    }
  }
}

export const notificationService = new NotificationService();

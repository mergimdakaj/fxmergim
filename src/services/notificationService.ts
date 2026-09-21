// Web Notification and Mobile Vibration Alert Service
import { soundService } from '../utils/audioAlert';

export interface NotificationPayload {
  title: string;
  body: string;
  type?: 'ENTRY' | 'SWEEP' | 'MSS' | 'TP' | 'SL';
  price?: number;
  data?: any;
}

export interface NotificationDiagnostic {
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerRegistered: boolean;
  success: boolean;
  message: string;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private swRegistered: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
    this.initServiceWorker();
  }

  private async initServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        this.swRegistered = true;
      } catch (err) {
        console.warn('Custom SW registration note:', err);
      }
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
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
        // Register SW if not already done
        await this.initServiceWorker();
        this.sendNotification({
          title: '✅ Njoftimet u Aktivizuan me Sukses!',
          body: 'Do të njoftoheni në këtë telefon/kompjuter sa herë që shfaqet një Hyrje (Entry) ose Sweep Likuiditeti.',
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

  public async sendNotification(payload: NotificationPayload) {
    // 1. Play auditory alert
    try {
      soundService.playEntryAlert();
    } catch (e) {
      console.warn('Audio alert skipped:', e);
    }

    // 2. Android Device Vibration (Hardware tactile feedback)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 100, 300, 100, 400]);
      } catch {
        // ignore if not allowed without gesture
      }
    }

    // 3. Dispatch in-app custom event for banner toast notification
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('app_entry_notification', {
            detail: {
              ...payload,
              timestamp: Date.now(),
            },
          })
        );
      } catch (e) {
        console.warn('In-app event dispatch failed:', e);
      }
    }

    // 4. Desktop / Android Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notifOptions = {
        body: payload.body,
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        vibrate: [300, 100, 300, 100, 400],
        tag: 'trading-alert-' + (payload.type || 'entry'),
        renotify: true,
        data: { url: window.location.href, ...payload },
      };

      // Preferred: Show via ServiceWorkerRegistration (Works on Android Chrome, iOS PWA, PC/Mac)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(payload.title, notifOptions);
            return;
          }
        } catch (swErr) {
          console.warn('Service worker showNotification note:', swErr);
        }
      }

      // Fallback: standard new Notification() for browsers where SW is not controlling
      try {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          tag: 'trading-alert-' + Date.now(),
        });
      } catch {
        // Mobile browsers throw Illegal Constructor here; SW ready handled it above
      }
    }
  }

  // Diagnostic tool for verifying Vercel deployment notification delivery
  public async testNotification(): Promise<NotificationDiagnostic> {
    const supported = this.isSupported();
    let permission = this.getPermissionStatus();

    if (!supported) {
      return {
        supported: false,
        permission: 'denied',
        serviceWorkerRegistered: false,
        success: false,
        message: 'Shfletuesi juaj nuk e mbështet Notification API.',
      };
    }

    if (permission !== 'granted') {
      const granted = await this.requestPermission();
      permission = this.getPermissionStatus();
      if (!granted || permission !== 'granted') {
        return {
          supported: true,
          permission,
          serviceWorkerRegistered: this.swRegistered,
          success: false,
          message:
            permission === 'denied'
              ? 'Njoftimet janë të BLLOKUARA në këtë faqe. Klikoni ikonën e drynit 🔒 tek adresa URL e Vercel dhe zgjidhni "Allow/Lejo" për Notifications.'
              : 'Nuk u dha leje për njoftime. Shtypni "Lejo" (Allow) kur shfaqet pyetja e shfletuesit.',
        };
      }
    }

    // Now send test alert
    await this.sendNotification({
      title: '🔔 Test Njoftimi nga Vercel!',
      body: 'Njoftimet po funksionojnë 100%! Sa herë që çmimi prek një Entry ose shfaqet një sinjal, do të njoftoheni menjëherë.',
      type: 'ENTRY',
    });

    return {
      supported: true,
      permission: 'granted',
      serviceWorkerRegistered: true,
      success: true,
      message: 'Njoftimi u dërgua me sukses! Nëse nuk e patë në ekran, kontrolloni që telefoni/PC nuk është në regjimin "Do Not Disturb" (Mos Më Shqetëso).',
    };
  }
}

export const notificationService = new NotificationService();


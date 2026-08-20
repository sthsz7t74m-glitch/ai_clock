export class NotificationService {
  constructor(storage) { this.storage = storage; }

  supported() { return 'Notification' in window; }
  permission() { return this.supported() ? Notification.permission : 'unsupported'; }

  async requestPermission() {
    if (!this.supported()) return 'unsupported';
    if (Notification.permission !== 'default') return Notification.permission;
    try { return await Notification.requestPermission(); } catch { return Notification.permission; }
  }

  enabled() { return this.storage.get('notificationsEnabled', true); }
  setEnabled(value) { this.storage.set('notificationsEnabled', Boolean(value)); }

  async notify(title, body, options = {}) {
    if (!this.enabled() || !this.supported()) return false;
    if (Notification.permission === 'default') await this.requestPermission();
    if (Notification.permission !== 'granted') return false;
    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: './icon.svg',
          badge: './icon.svg',
          tag: options.tag,
          renotify: true,
          data: { url: options.url || './' }
        });
      } else {
        new Notification(title, { body, icon: './icon.svg', tag: options.tag });
      }
      return true;
    } catch { return false; }
  }
}

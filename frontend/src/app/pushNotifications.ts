import { notificationApi } from '../api/notificationApi';
import { isRunningStandalone, pwaRegistration } from './pwa';

export type PushSetupState = 'hidden' | 'prompt' | 'denied' | 'enabled' | 'error';
export type PushSetupResult = { state: PushSetupState; consentAgreed: boolean };

export async function inspectPushNotifications(): Promise<PushSetupResult> {
  if (!isRunningStandalone() || !supportsPush()) return { state: 'hidden', consentAgreed: false };
  const config = await notificationApi.pushConfig();
  if (!config.enabled || !config.publicKey) return { state: 'hidden', consentAgreed: config.consentAgreed };
  if (Notification.permission === 'denied') return { state: 'denied', consentAgreed: config.consentAgreed };
  const registration = await pwaRegistration();
  if (!registration) return { state: 'hidden', consentAgreed: config.consentAgreed };
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return { state: 'enabled', consentAgreed: true };
  }
  if (Notification.permission === 'granted') {
    await createSubscription(registration, config.publicKey);
    return { state: 'enabled', consentAgreed: true };
  }
  return { state: 'prompt', consentAgreed: config.consentAgreed };
}

export async function enablePushNotifications(): Promise<PushSetupResult> {
  if (!supportsPush()) return { state: 'hidden', consentAgreed: false };
  const config = await notificationApi.pushConfig();
  if (!config.enabled || !config.publicKey) return { state: 'hidden', consentAgreed: config.consentAgreed };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { state: permission === 'denied' ? 'denied' : 'prompt', consentAgreed: config.consentAgreed };
  }
  const registration = await pwaRegistration();
  if (!registration) return { state: 'error', consentAgreed: config.consentAgreed };
  const existing = await registration.pushManager.getSubscription();
  if (existing) await saveSubscription(existing);
  else await createSubscription(registration, config.publicKey);
  return { state: 'enabled', consentAgreed: true };
}

export async function disablePushForCurrentDevice() {
  if (!supportsPush()) return;
  const registration = await pwaRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try { await notificationApi.unsubscribePush(subscription.endpoint); }
  finally { await subscription.unsubscribe(); }
}

function supportsPush() {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

async function createSubscription(registration: ServiceWorkerRegistration, publicKey: string) {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey) as BufferSource,
  });
  await saveSubscription(subscription);
}

async function saveSubscription(subscription: PushSubscription) {
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) throw new Error('Invalid push subscription');
  await notificationApi.subscribePush({
    endpoint: value.endpoint,
    p256dh: value.keys.p256dh,
    auth: value.keys.auth,
  });
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const decoded = window.atob(padded);
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

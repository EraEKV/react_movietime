import { auth } from './firebase'

// Browser side of Web Push. The permission prompt appears only inside `enable()`, which the
// settings switch calls after a tap: browsers ignore (or punish) prompts on page load.
// The subscription itself is kept on the server (api/push) so a friend can be notified.

export type PushState =
  | 'unsupported'
  | 'needs-install' // iPhone/iPad: push works only in the app added to the Home Screen
  | 'unconfigured' // no VAPID key in this build
  | 'denied' // the browser permission is blocked: only the browser settings can change it
  | 'off'
  | 'on'

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** The worker is registered by the app in production only; without it there is no push. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function pushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!supported()) return 'unsupported'
  if (!publicKey) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await registration()
  if (!reg) return 'unsupported'
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

/** URL-safe base64 → bytes, the format `applicationServerKey` wants. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function call(method: 'POST' | 'DELETE', body: object): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('unauthenticated')
  const response = await fetch('/api/push', {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'push-failed')
  }
}

/** Asks for permission, subscribes this browser and saves the subscription. Returns the new state. */
export async function enablePush(locale: string): Promise<PushState> {
  const current = await pushState()
  if (current !== 'off' && current !== 'on') return current
  if ((await Notification.requestPermission()) !== 'granted') return pushState()
  const reg = await registration()
  if (!reg || !publicKey) return 'unsupported'
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }))
  try {
    await call('POST', { subscription: subscription.toJSON(), locale })
  } catch (error) {
    // Not saved on the server → it could never reach us, so don't keep a dangling one.
    await subscription.unsubscribe()
    throw error
  }
  return 'on'
}

/** Drops the subscription in the browser and on the server. */
export async function disablePush(): Promise<PushState> {
  const reg = await registration()
  const subscription = await reg?.pushManager.getSubscription()
  if (subscription) {
    // Best effort on the server: a leftover document is removed when a push to it fails.
    await call('DELETE', { endpoint: subscription.endpoint }).catch(() => undefined)
    await subscription.unsubscribe()
  }
  return pushState()
}

/** Keeps the saved language current when the user changes it while subscribed. */
export async function refreshPushLocale(locale: string): Promise<void> {
  const reg = await registration()
  const subscription = await reg?.pushManager.getSubscription()
  if (subscription) await call('POST', { subscription: subscription.toJSON(), locale })
}

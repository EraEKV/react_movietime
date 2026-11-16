// A deploy replaces the hashed files in /assets/ and removes the old ones. A page that was
// opened before it (or a service worker that still serves the old index.html) asks for a
// chunk that no longer exists, and the host answers with index.html instead, so the import
// fails. These helpers recognise that and fetch the new version of the app.

const CHUNK_ERROR =
  /dynamically imported module|importing a module script failed|error loading dynamically|unable to preload css|failed to fetch/i

/** True for the errors a lazy page throws when its file could not be loaded. */
export function isChunkError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(`${error.name} ${error.message}`)
}

const waitFor = (done: (resolve: () => void) => void, ms: number) =>
  new Promise<void>((resolve) => {
    done(resolve)
    setTimeout(resolve, ms)
  })

/**
 * Asks for the newest service worker, lets it take over and reloads the page. The reload is
 * not enough on its own: the waiting worker would go on serving the old index.html.
 */
export async function refreshApp(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.update()
      const installing = registration.installing
      if (installing) {
        await waitFor((resolve) => {
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' || installing.state === 'redundant') resolve()
          })
        }, 5000)
      }
      const waiting = registration.waiting
      if (waiting) {
        const taken = waitFor(
          (resolve) =>
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
              once: true,
            }),
          3000,
        )
        waiting.postMessage({ type: 'SKIP_WAITING' })
        await taken
      }
    }
  } catch {
    // No worker (private mode, first visit) or no network: a plain reload is all that is left.
  }
  window.location.reload()
}

const KEY = 'movietime.staleReload'
const WINDOW_MS = 60_000

/**
 * Starts refreshing the app, at most once a minute, so a file that is really missing cannot
 * cause a reload loop. Returns false when it did not start (offline, or tried a moment ago):
 * the caller then shows the error instead.
 */
export function recoverOnce(): boolean {
  if (!navigator.onLine) return false
  try {
    const last = Number(sessionStorage.getItem(KEY))
    if (last && Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Storage is blocked: refresh anyway, the page cannot loop without a stored mark only
    // if the reload fixes it, which is the normal case.
  }
  void refreshApp()
  return true
}

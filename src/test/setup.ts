import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, vi } from 'vitest'
import { initI18n } from '../shared/i18n'

// jsdom has no matchMedia; "no match" means the dark default.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList

// jsdom has no modal <dialog> API; a plain `open` attribute is enough for the tests.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}

const LOCALES = join(process.cwd(), 'public', 'locales')

// Dictionaries are fetched over HTTP in the app; tests read the same files from disk.
beforeAll(async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const [, language, file] = /locales\/(\w+)\/(\w+)\.json/.exec(url) ?? []
    const body = readFileSync(join(LOCALES, language ?? '', `${file}.json`), 'utf8')
    return Promise.resolve(new Response(body))
  })
  const namespaces = readdirSync(join(LOCALES, 'en')).map((f) => f.replace('.json', ''))
  await initI18n('en', namespaces)
  vi.unstubAllGlobals()
})

afterEach(cleanup)

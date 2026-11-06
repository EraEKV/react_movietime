import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import App from './App'
import { initI18n } from './shared/i18n'
import { registerLibraryListeners } from './store/libraryListeners'
import { registerPreferenceListeners, startAuthSync } from './store/listeners'
import { store } from './store/store'
import './shared/styles/global.css'

// Listeners are registered once, before the first render, and live as long as the store.
registerPreferenceListeners(store.getState)
// Before startAuthSync: the library listener must already be listening for the first auth result.
registerLibraryListeners(store.getState, store.dispatch)
// Not awaited: the auth SDK arrives as its own chunk; until then auth.status is 'loading'.
void startAuthSync(store.dispatch)

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

// The first render waits for the `common` dictionary (a few kB) so no raw keys flash.
await initI18n(
  store.getState().preferences.language,
  window.location.pathname === '/' ? ['home'] : [],
)

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)

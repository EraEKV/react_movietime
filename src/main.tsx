import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import App from './App'
import { registerLibraryListeners } from './store/libraryListeners'
import { registerPreferenceListeners, startAuthSync } from './store/listeners'
import { store } from './store/store'
import './styles/global.css'

// Listeners are registered once, before the first render, and live as long as the store.
registerPreferenceListeners(store.getState)
// Before startAuthSync: the library listener must already be listening for the first auth result.
registerLibraryListeners(store.getState, store.dispatch)
startAuthSync(store.dispatch)

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)

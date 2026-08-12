import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// The default injected registerSW.js only calls navigator.serviceWorker.register()
// — it never reloads the page once a new service worker takes over, so an
// updated deploy can sit installed-but-invisible indefinitely (confirmed
// directly: a fresh navigation still ran a JS bundle from a prior deploy).
// registerSW() from the virtual module reloads automatically on activation
// when passed no onNeedRefresh callback, matching registerType: 'autoUpdate'.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

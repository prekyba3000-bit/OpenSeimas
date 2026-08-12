import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// Self-hosted Inter. Bundled by Vite so the packaged app makes no font request
// to Google — it talks only to our API. latin-ext carries the Lithuanian glyphs
// (ą č ę ė į š ų ū ž); the weights match what index.css previously imported.
import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-ext-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-ext-700.css'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { createQueryClient } from './lib/createQueryClient'
import { initNativeApp } from './native/initNativeApp'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)

// Native app-shell setup (status bar, splash). No-op on the web.
void initNativeApp()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// Self-hosted type, bundled by Vite so the packaged app makes no font request
// to Google — it talks only to our API. latin-ext carries the Lithuanian
// glyphs (ą č ę ė į š ų ū ž); verified against „Ąčęėįšųūž ąčęėįšųūž“.
//
// Literata (serif) for headings, Source Sans 3 for body: the „Jaukumas“ pairing
// — a reading-room register rather than the ops-console one Inter carried.
import '@fontsource/literata/latin-600.css'
import '@fontsource/literata/latin-ext-600.css'
import '@fontsource/literata/latin-700.css'
import '@fontsource/literata/latin-ext-700.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import '@fontsource/source-sans-3/latin-ext-700.css'
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

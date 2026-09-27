import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { discoverabilityPlugin } from './scripts/discoverability.mjs'

export default defineConfig(({ command }) => ({
  plugins: [react(), discoverabilityPlugin()],
  build: { rollupOptions: { input: { landing: 'index.html', translate: 'translate/index.html' } } },
  // Development keeps existing local demo files; publication uses an explicit allowlist.
  publicDir: command === 'build' ? false : 'public',
}))

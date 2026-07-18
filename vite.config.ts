import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  server: {
    port: 5174,
    host: '127.0.0.1',
    open: true,
    watch: {
      ignored: ['**/.hermes/**', '**/node_modules/**', '**/rugby-manager-pro/**', '**/PeriMeter-Trainer/**', '**/rugbycoach_platform/**', '**/TraceHome/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})

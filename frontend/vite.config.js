import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // design-system se resuelve por alias a fuentes fuera de frontend/;
    // sin dedupe, el build (p. ej. Docker) no encuentra react desde /design-system.
    dedupe: ['react', 'react-dom', 'react-router-dom', 'recharts', 'clsx'],
    alias: [
      {
        find: /^@slep\/ui$/,
        replacement: path.resolve(__dirname, '../design-system/src/index.js'),
      },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['clsx'],
  },
})

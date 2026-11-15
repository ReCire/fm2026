import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0',
    hmr: {
      protocol: 'http',
      host: '192.0.2.2',
      port: 5174,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

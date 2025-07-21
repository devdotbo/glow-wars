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
  optimizeDeps: {
    include: ['pixi.js', '@pixi/react'],
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    port: 3001, // Different port from TanStack frontend
  },
})
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : l'application peut être servie depuis un sous-dossier (ex. /pharmapilot/).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    host: '0.0.0.0',
    hmr: {
      overlay: false
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: []
  },
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled']
  }
})

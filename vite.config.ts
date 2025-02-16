import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/synthgen/',
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})
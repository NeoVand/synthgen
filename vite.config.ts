import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'pdf-worker-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('pdf.worker.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          next();
        });
      },
      buildStart: async () => {
        const fs = await import('fs/promises');
        
        // Ensure public directory exists
        try {
          await fs.access('public');
        } catch {
          await fs.mkdir('public');
        }
        
        // Copy worker file to public directory
        const workerPath = 'node_modules/pdfjs-dist/build/pdf.worker.mjs';
        const destPath = 'public/pdf.worker.mjs';
        
        try {
          await fs.copyFile(workerPath, destPath);
          console.log('PDF worker file copied successfully');
        } catch (error) {
          console.error('Error copying PDF worker file:', error);
        }
      }
    }
  ],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'pdf.worker': resolve(__dirname, 'public/pdf.worker.mjs')
      },
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'pdf.worker.mjs') {
            return 'pdf.worker.mjs';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Content-Type': 'application/javascript'
    }
  }
})
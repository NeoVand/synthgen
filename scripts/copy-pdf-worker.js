import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure public directory exists
const publicDir = join(dirname(__dirname), 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir);
}

// Copy worker file
const workerSrc = join(dirname(__dirname), 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
const workerDest = join(publicDir, 'pdf.worker.mjs');

try {
  copyFileSync(workerSrc, workerDest);
  console.log('PDF worker file copied successfully');
} catch (error) {
  console.error('Error copying PDF worker file:', error);
  process.exit(1);
} 
import { promises as fs } from 'fs';
import path from 'path';

async function copyPdfWorker() {
  try {
    // Ensure public directory exists
    try {
      await fs.access('public');
    } catch {
      await fs.mkdir('public');
    }

    // Copy worker file
    const workerPath = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs');
    const destPath = path.resolve('public/pdf.worker.mjs');

    await fs.copyFile(workerPath, destPath);
    console.log('PDF worker file copied successfully');
  } catch (error) {
    console.error('Error copying PDF worker file:', error);
    process.exit(1);
  }
}

copyPdfWorker(); 
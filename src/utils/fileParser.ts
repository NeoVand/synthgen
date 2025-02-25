import * as PDFJS from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';

const { getDocument } = PDFJS;

// Make sure PDFJS worker is set up in the main application

/**
 * Parse a PDF file and extract its text content
 */
export const parsePdfFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument(arrayBuffer).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str);
      fullText += textItems.join(' ') + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse a DOCX file and extract its text content
 */
export const parseDocxFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a container element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    // Render the DOCX content to extract text
    await renderAsync(arrayBuffer, container);
    
    // Extract the text
    const text = container.innerText;
    
    // Clean up
    document.body.removeChild(container);
    
    return text;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse a text file
 */
export const parseTextFile = async (file: File): Promise<string> => {
  try {
    return await file.text();
  } catch (error) {
    console.error('Error parsing text file:', error);
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse a CSV file and return its content as a 2D array
 */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes (double quotes)
        currentCell += '"';
        i++; // Skip the next quote
      } else {
        // Toggle inside quotes
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      // End of row
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      
      if (char === '\r') {
        i++; // Skip the next \n
      }
    } else {
      currentCell += char;
    }
  }
  
  // Handle the last cell/row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  
  return rows;
};

/**
 * Parse a JSON Lines (jsonl) file and return an array of objects
 */
export const parseJSONL = async (file: File): Promise<Record<string, any>[]> => {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error('Error parsing JSONL line:', error);
        return { error: `Failed to parse line: ${error instanceof Error ? error.message : String(error)}` };
      }
    });
  } catch (error) {
    console.error('Error parsing JSONL file:', error);
    throw new Error(`Failed to parse JSONL file: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 
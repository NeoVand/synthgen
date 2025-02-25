import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SentenceSplitter, MarkdownNodeParser, SentenceWindowNodeParser, Document } from "llamaindex";

export type ChunkingAlgorithm = 
  | 'recursive' 
  | 'line' 
  | 'csv-tsv' 
  | 'jsonl' 
  | 'sentence-chunks' 
  | 'markdown-chunks' 
  | 'rolling-sentence-chunks';

interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  windowSize?: number;
}

/**
 * Chunk text using RecursiveCharacterTextSplitter
 */
export const chunkTextRecursive = async (
  text: string, 
  options: ChunkOptions
): Promise<string[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
  });
  
  const chunks = await splitter.splitText(text);
  return chunks;
};

/**
 * Chunk text by lines
 */
export const chunkTextByLine = (
  text: string, 
  options: ChunkOptions
): string[] => {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const line of lines) {
    if (currentChunk.length + line.length > options.chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      
      // Handle overlap
      const overlapLines = currentChunk
        .split('\n')
        .slice(-(options.chunkOverlap / 20) || -1); // Rough estimate of lines for overlap
        
      currentChunk = overlapLines.join('\n');
      
      if (currentChunk.length + line.length <= options.chunkSize) {
        currentChunk += '\n' + line;
      } else {
        currentChunk = line;
      }
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n';
      }
      currentChunk += line;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Chunk CSV/TSV data with headers
 */
export const chunkCSVTSV = (data: string[][], options: ChunkOptions): string[] => {
  if (data.length === 0) {
    return [];
  }
  
  const headers = data[0];
  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkRows = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(',');
    
    if (
      currentChunkRows >= options.chunkSize / 50 || // Rough estimate
      (currentChunk.length + rowStr.length > options.chunkSize && currentChunk.length > 0)
    ) {
      chunks.push(currentChunk);
      
      // Start new chunk with headers
      currentChunk = headers.join(',') + '\n' + rowStr;
      currentChunkRows = 1;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n';
      } else {
        // First row in a new chunk should include headers
        currentChunk = headers.join(',') + '\n';
      }
      currentChunk += rowStr;
      currentChunkRows++;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Chunk JSONL data
 */
export const chunkJSONL = (data: Record<string, any>[], options: ChunkOptions): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const item of data) {
    const itemStr = JSON.stringify(item);
    
    if (currentChunk.length + itemStr.length > options.chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = itemStr;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n';
      }
      currentChunk += itemStr;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Chunk using SentenceSplitter from LlamaIndex
 */
export const chunkSentences = async (text: string, options: ChunkOptions): Promise<string[]> => {
  try {
    const splitter = new SentenceSplitter({ 
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });
    
    const document = new Document({ text });
    const nodes = await splitter.getNodesFromDocuments([document]);
    
    return nodes.map((node: any) => node.getText());
  } catch (error) {
    console.error('Error in sentence chunking:', error);
    // Fallback to recursive chunking if LlamaIndex chunking fails
    return chunkTextRecursive(text, options);
  }
};

/**
 * Chunk using MarkdownNodeParser from LlamaIndex
 */
export const chunkMarkdown = async (text: string, options: ChunkOptions): Promise<string[]> => {
  try {
    const parser = new MarkdownNodeParser();
    const document = new Document({ text });
    const nodes = await parser.getNodesFromDocuments([document]);
    
    // Apply chunk size constraints
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const node of nodes) {
      const nodeText = node.getText();
      
      if (currentChunk.length + nodeText.length > options.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = nodeText;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += nodeText;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  } catch (error) {
    console.error('Error in markdown chunking:', error);
    // Fallback to recursive chunking if LlamaIndex chunking fails
    return chunkTextRecursive(text, options);
  }
};

/**
 * Chunk using SentenceWindowNodeParser from LlamaIndex
 */
export const chunkRollingSentences = async (text: string, options: ChunkOptions): Promise<string[]> => {
  try {
    if (!options.windowSize) {
      throw new Error('Window size is required for rolling sentence chunks');
    }
    
    // Create a simpler version that only uses the available properties
    const windowNodeParser = new SentenceWindowNodeParser({
      windowSize: options.windowSize,
      // Removed the unsupported property
    });
    
    const document = new Document({ text });
    const nodes = await windowNodeParser.getNodesFromDocuments([document]);
    
    return nodes.map((node: any) => node.getText());
  } catch (error) {
    console.error('Error in rolling sentence chunking:', error);
    // Fallback to recursive chunking if LlamaIndex chunking fails
    return chunkTextRecursive(text, options);
  }
};

/**
 * Main chunking function that selects the appropriate algorithm
 */
export const chunkText = async (
  text: string,
  algorithm: ChunkingAlgorithm,
  options: ChunkOptions,
  csvData?: string[][],
  jsonlData?: Record<string, any>[]
): Promise<string[]> => {
  switch (algorithm) {
    case 'recursive':
      return chunkTextRecursive(text, options);
    case 'line':
      return chunkTextByLine(text, options);
    case 'csv-tsv':
      if (!csvData) {
        throw new Error('CSV data is required for csv-tsv chunking algorithm');
      }
      return chunkCSVTSV(csvData, options);
    case 'jsonl':
      if (!jsonlData) {
        throw new Error('JSONL data is required for jsonl chunking algorithm');
      }
      return chunkJSONL(jsonlData, options);
    case 'sentence-chunks':
      return chunkSentences(text, options);
    case 'markdown-chunks':
      return chunkMarkdown(text, options);
    case 'rolling-sentence-chunks':
      return chunkRollingSentences(text, options);
    default:
      return chunkTextRecursive(text, options);
  }
}; 
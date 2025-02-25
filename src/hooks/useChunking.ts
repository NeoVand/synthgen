import { useState, useCallback } from 'react';
import { chunkText } from '../utils/chunker';
import { useAppContext } from '../context/AppContext';

interface UseChunkingResult {
  handleChunkDocument: () => Promise<void>;
  estimateTokenCount: (text: string) => number;
  isChunking: boolean;
  chunkingError: string | null;
}

export const useChunking = (): UseChunkingResult => {
  const [isChunking, setIsChunking] = useState<boolean>(false);
  const [chunkingError, setChunkingError] = useState<string | null>(null);
  
  const {
    rawText,
    chunkOptions,
    setPendingChunks,
    csvData,
    jsonlData,
    setShowChunkingDialog
  } = useAppContext();

  // Rough token count estimator - 1 token ~= 4 chars in English
  const estimateTokenCount = useCallback((text: string): number => {
    return Math.ceil(text.length / 4);
  }, []);

  const handleChunkDocument = useCallback(async () => {
    try {
      setIsChunking(true);
      setChunkingError(null);
      
      if (!rawText) {
        setChunkingError('No text to chunk');
        return;
      }
      
      // Chunk the document using the selected algorithm
      const chunks = await chunkText(
        rawText,
        chunkOptions.algorithm,
        {
          chunkSize: chunkOptions.chunkSize,
          chunkOverlap: chunkOptions.chunkOverlap,
          windowSize: chunkOptions.windowSize
        },
        csvData,
        jsonlData
      );
      
      setPendingChunks(chunks);
      
      // Show confirmation dialog
      setShowChunkingDialog(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setChunkingError(`Error chunking document: ${errorMessage}`);
      console.error('Chunking error:', err);
    } finally {
      setIsChunking(false);
    }
  }, [
    rawText, 
    chunkOptions, 
    setPendingChunks,
    csvData,
    jsonlData,
    setShowChunkingDialog
  ]);

  return {
    handleChunkDocument,
    estimateTokenCount,
    isChunking,
    chunkingError
  };
}; 
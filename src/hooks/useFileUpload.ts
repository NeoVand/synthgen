import { useState, useCallback } from 'react';
import { parsePdfFile, parseDocxFile, parseTextFile, parseCSV, parseJSONL } from '../utils/fileParser';
import { useAppContext } from '../context/AppContext';

interface UseFileUploadResult {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useFileUpload = (): UseFileUploadResult => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    setRawText,
    setFileName,
    setCsvData,
    setCsvColumns,
    setJsonlData,
    setJsonlKeys
  } = useAppContext();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const files = e.target.files;
      if (!files || files.length === 0) {
        setError('No file selected');
        return;
      }
      
      const file = files[0];
      setFileName(file.name);
      
      // Process file based on type
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const text = await parsePdfFile(file);
        setRawText(text);
      } 
      else if (file.name.toLowerCase().endsWith('.docx')) {
        const text = await parseDocxFile(file);
        setRawText(text);
      } 
      else if (file.name.toLowerCase().endsWith('.txt') || 
                file.name.toLowerCase().endsWith('.md')) {
        const text = await parseTextFile(file);
        setRawText(text);
      } 
      else if (file.name.toLowerCase().endsWith('.csv') || 
                file.name.toLowerCase().endsWith('.tsv')) {
        const text = await parseTextFile(file);
        setRawText(text);
        
        // Parse CSV data
        const data = parseCSV(text);
        setCsvData(data);
        
        // Extract columns
        if (data.length > 0) {
          const headers = data[0];
          setCsvColumns(headers.map(name => ({ name, selected: true })));
        }
      } 
      else if (file.name.toLowerCase().endsWith('.jsonl')) {
        const text = await parseTextFile(file);
        setRawText(text);
        
        // Parse JSONL data
        const jsonData = await parseJSONL(file);
        setJsonlData(jsonData);
        
        // Extract keys (simplified for now)
        if (jsonData.length > 0) {
          const firstItem = jsonData[0];
          const keys = Object.keys(firstItem).map(key => ({
            name: key,
            path: key,
            selected: true,
            isLeaf: true,
            level: 0,
            hasChildren: false
          }));
          setJsonlKeys(keys);
        }
      } 
      else {
        setError(`Unsupported file type: ${file.name}`);
        return;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error uploading file: ${errorMessage}`);
      console.error('File upload error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setRawText, setFileName, setCsvData, setCsvColumns, setJsonlData, setJsonlKeys]);

  return {
    handleFileUpload,
    isLoading,
    error
  };
}; 
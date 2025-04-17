import React, { useState, useCallback, useEffect, createContext, useMemo, useRef } from 'react'
import {
  Typography,
  Paper,
  Button,
  Checkbox,
  TextField,
  Box,
  IconButton,
  Collapse,
  useTheme,
  alpha,
  Tooltip,
  MenuItem,
  FormControlLabel,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ScienceIcon from '@mui/icons-material/Science'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PsychologyIcon from '@mui/icons-material/Psychology'
import SummarizeIcon from '@mui/icons-material/Summarize'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import ExtensionIcon from '@mui/icons-material/Extension'
import StopIcon from '@mui/icons-material/Stop'
import FirstPageIcon from '@mui/icons-material/FirstPage'
import LastPageIcon from '@mui/icons-material/LastPage'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import StyleIcon from '@mui/icons-material/Style'
import AddIcon from '@mui/icons-material/Add'
import { saveAs } from 'file-saver'
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { debounce } from 'lodash'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadIcon from '@mui/icons-material/Upload'
import WarningIcon from '@mui/icons-material/Warning'
import CardNavigation from './components/CardNavigation'

// Import LlamaIndex components
import { SentenceSplitter, MarkdownNodeParser, SentenceWindowNodeParser, Document } from "llamaindex";

// PDFJS
import * as PDFJS from 'pdfjs-dist'
const { getDocument, GlobalWorkerOptions } = PDFJS;
// Update worker path to use the correct path in both dev and prod
GlobalWorkerOptions.workerSrc = `${window.location.origin}${import.meta.env.BASE_URL}pdf.worker.mjs`;
// DOCX
import { renderAsync } from 'docx-preview'

import OllamaSettings from './components/OllamaSettings'
import FlashcardView from './components/FlashcardView'
import OllamaConnectionModal from './components/OllamaConnectionModal'
import PromptTemplates from './components/PromptTemplates'  // Add this import
import { default as CustomAboutDialog } from './components/dialogs/AboutDialog'  // Updated import location
import ImportConfirmationDialog from './components/dialogs/ImportConfirmationDialog'  // Import the ImportConfirmationDialog component
import ChunkingConfirmationDialog from './components/dialogs/ChunkingConfirmationDialog'  // Import the ChunkingConfirmationDialog component
import TableView from './components/TableView'  // Add this import
import ExportOptionsDialog from './components/dialogs/ExportOptionsDialog'

// --- Types ---
type Edge = 'top' | 'bottom' | 'left' | 'right';

// Import QAPair and other types from types/index.ts, removing conflicting ones
import { QAPair, OllamaSettings as OllamaSettingsType, OllamaError, ViewMode, Section, SectionEntry, GenerationProgress, ExportOptions } from './types';
// Keep this import as is
import { defaultTemplates, replacePlaceholders } from './config/promptTemplates';

interface AppProps {
  onThemeChange: () => void;
}

type ListContextValue = {
  getListLength: () => number;
  registerSection: (entry: SectionEntry) => () => void;
  reorderSection: (args: {
    startIndex: number;
    indexOfTarget: number;
    closestEdgeOfTarget: Edge | null;
  }) => void;
  instanceId: symbol;
};

interface ListState {
  sections: Section[];
  lastSectionMoved: {
    section: Section;
    previousIndex: number;
    currentIndex: number;
    numberOfSections: number;
  } | null;
}

const ListContext = createContext<ListContextValue | null>(null);

function getSectionRegistry() {
  const registry = new Map<string, HTMLElement>();

  function register({ sectionId, element }: SectionEntry) {
    registry.set(sectionId, element);
    return function unregister() {
      registry.delete(sectionId);
    };
  }

  function getElement(sectionId: string): HTMLElement | null {
    return registry.get(sectionId) ?? null;
  }

  return { register, getElement };
}


// Add type for chunking algorithms
type ChunkingAlgorithm = 'recursive' | 'line' | 'csv-tsv' | 'jsonl' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

// Add a helper function to check Ollama connection
const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Update the isTableView and isFlashcardView functions
const isTableView = (mode: ViewMode): boolean => mode === 'table';
const isFlashcardView = (mode: ViewMode): boolean => mode === 'flashcard';

// Remove the redundant import
// import { replacePlaceholders } from './config/promptTemplates';

const App: React.FC<AppProps> = ({ onThemeChange }): React.ReactElement => {
  const theme = useTheme();
  
  // Add state for modal
  const [showConnectionModal, setShowConnectionModal] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<OllamaError | null>(null);
  const [isOllamaConnected, setIsOllamaConnected] = useState<boolean>(false);
  const [showAboutDialog, setShowAboutDialog] = useState<boolean>(false);
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showChunkingDialog, setShowChunkingDialog] = useState<boolean>(false);
  const [pendingChunks, setPendingChunks] = useState<string[]>([]);
  const [, setModels] = useState<any[]>([]);
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettingsType>({
    model: '',
    temperature: 0.7,
    topP: 0.9,
    useFixedSeed: false,
    seed: 42,
    numCtx: 4096
  });
  // Commented out unused state variables
  // const [showAdvancedExport, setShowAdvancedExport] = useState(false);
  // const [batchSize, setBatchSize] = useState(4);

  // Add About dialog component that uses our imported component

  // Add useEffect to check Ollama connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkOllamaConnection();
      setIsOllamaConnected(isConnected);
      if (!isConnected) {
        setOllamaError({
          message: "Unable to connect to Ollama. Please make sure it's running and accessible at " + OLLAMA_BASE_URL,
          isOllamaError: true
        });
        setShowConnectionModal(true);
      } else {
        // If connected, get models
        try {
          const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
          if (response.ok) {
            const data = await response.json();
            setModels(data.models);
            
            // If settings had a model that exists, keep it, otherwise use the first available model
            if (ollamaSettings.model && data.models.some((m: any) => m.name === ollamaSettings.model)) {
              // Keep current model
            } else if (data.models.length > 0) {
              setOllamaSettings(prev => ({
                ...prev,
                model: data.models[0].name
              }));
            }
          }
        } catch (err) {
          console.error('Error fetching models:', err);
        }
      }
    };
    
    checkConnection();
  }, []);

  // Add handler for help button
  const handleConnectionHelp = () => {
    setShowConnectionModal(true);
  };

  // Pagination state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [availableRowsPerPage] = useState<number[]>([5, 10, 25, 50]);

  // Document text + file name
  const [rawText, setRawText] = useState<string>('')
  const [fileName, setFileName] = useState<string | null>(null)

  // Summarization
  const [summaryPrompt, setSummaryPrompt] = useState<string>(
    "Create a focused, factual summary of the following text. The summary should capture key points and main ideas without adding external information. Output only the raw summary text without any greetings, markdown, or formatting."
  )
  const [docSummary, setDocSummary] = useState<string>('')

  // Q&A prompts
  const [promptQuestion, setPromptQuestion] = useState<string>(
    "Please read the following text (and summary) and create a single  and short and relevant question related to the text. Don't add any markdown or greetings. Only the question."
  )
  const [promptAnswer, setPromptAnswer] = useState<string>(
    "Based on the text (and summary) plus the question, provide a concise answer. Don't add any markdown or greetings. Only the Answer."
  )
  
  // Image Q&A prompts
  const [imagePromptQuestion, setImagePromptQuestion] = useState<string>(() => {
    // Initialize with the Image Analysis QA template from defaultTemplates
    const imageTemplate = defaultTemplates.find(t => t.name === 'Image Analysis QA');
    return imageTemplate?.questionPrompt || '';
  })
  const [imagePromptAnswer, setImagePromptAnswer] = useState<string>(() => {
    // Initialize with the Image Analysis QA template from defaultTemplates
    const imageTemplate = defaultTemplates.find(t => t.name === 'Image Analysis QA');
    return imageTemplate?.answerPrompt || '';
  })

  // Q&A table
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])

  // States for chunking
  const [chunkSize, setChunkSize] = useState<number>(500)
  const [chunkOverlap, setChunkOverlap] = useState<number>(0)
  const [windowSize, setWindowSize] = useState<number>(3)
  const [chunkingAlgorithm, setChunkingAlgorithm] = useState<ChunkingAlgorithm>('recursive')

  // Add state for CSV columns
  const [csvColumns, setCsvColumns] = useState<{name: string; selected: boolean}[]>([])
  const [csvData, setCsvData] = useState<string[][]>([])

  // Add state for JSONL keys
  const [jsonlKeys, setJsonlKeys] = useState<{
    name: string; 
    path: string; 
    selected: boolean;
    isLeaf: boolean;
    level: number;
    hasChildren: boolean;
    isArray?: boolean;
  }[]>([])
  const [jsonlData, setJsonlData] = useState<Record<string, any>[]>([])

  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  // Add state for expanded cells and sections
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [sections] = useState<Section[]>([
    { 
      id: 'section-upload', 
      title: 'Document Upload', 
      icon: <UploadFileIcon />,
      description: 'Upload your document (PDF, DOCX, TXT, CSV) to generate Q&A pairs from.'
    },
    { 
      id: 'section-chunking', 
      title: 'Chunking', 
      icon: <ExtensionIcon />,
      description: 'Split your document into smaller chunks for better processing. Adjust chunk size and overlap to control how the text is divided.'
    },
    { 
      id: 'section-modelSettings', 
      title: 'Model Settings', 
      icon: <PsychologyIcon />,
      description: 'Configure the AI model parameters to control the generation behavior.'
    },
    { 
      id: 'section-summarization', 
      title: 'Summarization', 
      icon: <SummarizeIcon />,
      description: 'Generate and edit a summary of your document to provide context for Q&A generation.'
    },
    { 
      id: 'section-prompts', 
      title: 'Q&A Prompts', 
      icon: <QuestionAnswerIcon />,
      description: 'Customize the prompts used to generate questions and answers from your document.'
    },
  ]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'section-upload': true,
    'section-modelSettings': true,
    'section-summarization': true,
    'section-prompts': true,
    'section-chunking': true,
  });

  // Add state for generation control
  const [shouldStopGeneration, setShouldStopGeneration] = useState<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Add a state for tracking what type of generation is happening
  const [generationType, setGenerationType] = useState<'summary' | 'qa' | 'question' | 'answer' | null>(null);

  // Add state for tracking generation progress
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ completed: 0, total: 0 });

  // Add state for sidebar
  const [sidebarWidth, setSidebarWidth] = useState<number>(400);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Add this with other state declarations
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Update the viewMode state declaration
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Add state for processImages near the top of the component with other state declarations
  const [processImages, setProcessImages] = useState<boolean>(false);
  const [originalFileData, setOriginalFileData] = useState<ArrayBuffer | null>(null);
  // Store extracted images
  const [extractedImages, setExtractedImages] = useState<Array<{name: string, dataUrl: string}>>([]);

  // Add resize handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      const preventDefault = (e: Event) => e.preventDefault();
      document.addEventListener('selectstart', preventDefault);
      
      return () => {
        document.body.style.userSelect = '';
        document.removeEventListener('selectstart', preventDefault);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  //------------------------------------------------------------------------------------
  // 1. Load Model Settings
  //------------------------------------------------------------------------------------
  const handleSettingsSave = (newSettings: OllamaSettingsType) => {
    if (JSON.stringify(newSettings) !== JSON.stringify(ollamaSettings)) {
      setOllamaSettings(newSettings)
    }
  }

  //------------------------------------------------------------------------------------
  // 2. File Upload
  //------------------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      let textContent = ''
      if (ext === 'pdf') {
        // Store the file data for later use
        const arrayBuffer = await file.arrayBuffer()
        setOriginalFileData(arrayBuffer)
        textContent = await parsePdfFile(file)
      } else if (ext === 'docx') {
        textContent = await parseDocxFile(file)
      } else if (ext === 'md') {
        // For markdown files, we'll read them as plain text
        // The markdown structure will be preserved and can be used by the markdown chunker
        textContent = await file.text()
      } else if (ext === 'csv' || ext === 'tsv') {
        // For CSV/TSV files, we'll store the raw content and parse columns
        textContent = await file.text()
        const delimiter = textContent.includes('\t') ? '\t' : ','
        
        // Parse the first row to get column names
        const firstRow = textContent.split('\n')[0]
        const columnNames = firstRow.split(delimiter).map(col => col.trim().replace(/^["']|["']$/g, ''))
        
        // Set initial column selection state (all selected by default)
        setCsvColumns(columnNames.map(name => ({ name, selected: true })))
        
        // Store the raw data for later processing
        const rows = textContent.split('\n').map(row => 
          row.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
        )
        setCsvData(rows)
        
        // Set chunking algorithm to CSV/TSV
        setChunkingAlgorithm('csv-tsv')
      } else if (ext === 'jsonl' || ext === 'json') {
        // For JSONL/JSON files, we'll store the raw content and parse keys
        textContent = await file.text()
        
        // Parse the content based on file type
        const jsonObjects: Record<string, any>[] = []
        
        try {
          if (ext === 'jsonl') {
            // For JSONL, parse each line as a separate JSON object
            const lines = textContent.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const jsonObj = JSON.parse(line)
                jsonObjects.push(jsonObj)
              } catch (err) {
                console.error('Error parsing JSONL line:', err)
                // Skip invalid lines
              }
            }
          } else {
            // For JSON, parse the entire file as a single JSON object or array
            try {
              const parsed = JSON.parse(textContent)
              
              if (Array.isArray(parsed)) {
                // If it's an array, add each item as a separate object
                jsonObjects.push(...parsed)
              } else {
                // If it's a single object, add it
                jsonObjects.push(parsed)
              }
            } catch (err) {
              console.error('Error parsing JSON:', err)
              throw new Error('Invalid JSON format')
            }
          }
          
          if (jsonObjects.length === 0) {
            throw new Error('No valid JSON objects found in the file')
          }
          
          // Create a hierarchical structure of keys
          interface KeyNode {
            name: string;
            path: string;
            selected: boolean;
            children: KeyNode[];
            isLeaf: boolean;
            parent?: string;
            level: number;
            isArray?: boolean;
          }
          
          // First, collect all unique paths
          const allPaths = new Set<string>();
          const arrayPaths = new Set<string>();
          
          const collectPaths = (obj: any, prefix = '') => {
            if (typeof obj !== 'object' || obj === null) return;
            
            if (Array.isArray(obj)) {
              // Mark this path as an array
              if (prefix) {
                arrayPaths.add(prefix);
              }
              
              // For arrays, we don't add indices as separate paths
              // Instead, we just process the first item to get the structure
              if (obj.length > 0) {
                if (typeof obj[0] === 'object' && obj[0] !== null) {
                  // For arrays of objects, process the first item to get structure
                  collectPaths(obj[0], prefix);
                } else {
                  // For arrays of primitives, just mark the path
                  allPaths.add(prefix);
                }
              } else {
                // Empty array, just add the path
                allPaths.add(prefix);
              }
            } else {
              // For objects, process each key
              Object.keys(obj).forEach(key => {
                const path = prefix ? `${prefix}.${key}` : key;
                allPaths.add(path);
                
                // Recursively collect nested paths
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                  collectPaths(obj[key], path);
                }
              });
            }
          };
          
          // Collect paths from all objects
          jsonObjects.forEach(obj => collectPaths(obj));
          
          // Convert paths to a flat array of key nodes with parent-child relationships
          const keyNodes: KeyNode[] = Array.from(allPaths).map(path => {
            const parts = path.split('.');
            const name = parts[parts.length - 1];
            const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;
            const level = parts.length - 1;
            
            // Check if this is an array or has an array parent
            const isArray = arrayPaths.has(path);
            
            return {
              name,
              path,
              selected: true,
              children: [],
              isLeaf: true, // Will be updated later
              parent,
              level,
              isArray
            };
          });
          
          // Sort by path to ensure parents come before children
          keyNodes.sort((a, b) => a.path.localeCompare(b.path));
          
          // Build parent-child relationships
          keyNodes.forEach(node => {
            if (node.parent) {
              const parentNode = keyNodes.find(n => n.path === node.parent);
              if (parentNode) {
                parentNode.isLeaf = false;
                parentNode.children.push(node);
              }
            }
          });
          
          // Flatten the hierarchy for the UI, but keep the level information
          const flattenedKeys = keyNodes.map(node => ({
            name: node.name,
            path: node.path,
            selected: true,
            isLeaf: node.isLeaf,
            level: node.level,
            hasChildren: !node.isLeaf,
            isArray: node.isArray
          }));
          
          // Set the keys in state
          setJsonlKeys(flattenedKeys);
          
          // Store the parsed data for later processing
          setJsonlData(jsonObjects);
          
          // Set chunking algorithm to JSONL
          setChunkingAlgorithm('jsonl');
        } catch (err) {
          console.error('Error parsing JSONL:', err);
          alert('Failed to parse JSONL. Please check the file format.');
          return;
        }
      } else {
        // CSV, TXT or other text files
        textContent = await file.text()
      }
      setRawText(textContent)

      // If it's a markdown file, automatically set the chunking algorithm to markdown-chunks
      if (ext === 'md') {
        setChunkingAlgorithm('markdown-chunks')
      }
    } catch (err) {
      console.error('Error reading file:', err)
      alert('Could not read the uploaded file.')
    } finally {
      e.target.value = '' // reset so user can re-upload if needed
    }
  }

  // PDF & DOCX parsing
  const parsePdfFile = async (file: File): Promise<string> => {
    const pdfData = new Uint8Array(await file.arrayBuffer())
    const pdfDoc = await getDocument({ data: pdfData }).promise
    let fullText = ''
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    return fullText
  }
  const parseDocxFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const container = document.createElement('div')
    await renderAsync(arrayBuffer, container, container)
    
    // Get the raw text by finding the actual content elements and excluding style elements
    const contentElements = container.querySelectorAll('article p, article h1, article h2, article h3, article h4, article h5, article h6, article ul, article ol, article li')
    let text = Array.from(contentElements)
      .map(el => el.textContent?.trim())
      .filter(text => text) // Remove empty strings
      .join('\n\n')
    
    // Clean up the text:
    // 1. Remove any remaining HTML/XML tags
    text = text.replace(/<[^>]*>/g, '')
    
    // 2. Remove multiple consecutive whitespace/newlines
    text = text.replace(/\s*\n\s*\n\s*/g, '\n\n')
    
    // 3. Remove any non-printable characters
    text = text.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    
    // 4. Trim any leading/trailing whitespace
    text = text.trim()
    
    return text
  }

  // Add this helper function before handleSummarize
  const estimateTokenCount = (text: string): number => {
    return Math.floor(text.length / 4);
  };

  // Add this helper function before handleSummarize
  const getConcatenatedChunks = () => {
    return qaPairs.map(qa => qa.context).join('\n\n');
  };

  //------------------------------------------------------------------------------------
  // 3. Summarize
  //------------------------------------------------------------------------------------
  const handleSummarize = async () => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      return;
    }

    if (qaPairs.length === 0) {
      alert('No chunks available. Please chunk your document or import Q&A pairs first.')
      return
    }
    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.')
      return
    }

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('summary');

    try {
      let summaryText = '';
      const concatenatedChunks = getConcatenatedChunks();
      // Use the current value of summaryPrompt from state
      const prompt = `${summaryPrompt.trim()}\n\nText to summarize:\n${concatenatedChunks}`;

      // Create new AbortController for this generation
      abortControllerRef.current = new AbortController();

      try {
        for await (const chunk of doStreamCall(prompt)) {
          if (shouldStopGeneration) break;
          summaryText += chunk;
          setDocSummary(summaryText);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Summary generation stopped by user');
          return; // Exit cleanly on abort
        }
        throw err; // Re-throw other errors
      }
    } catch (err) {
      console.error('Error summarizing doc:', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('Failed to summarize document.');
      }
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
    }
  };

  //------------------------------------------------------------------------------------
  // 4. Chunking Document
  //------------------------------------------------------------------------------------
  const handleChunkDoc = async () => {
    if (!rawText.trim()) {
      alert('No document text found. Please upload a file first.')
      return
    }

    try {
      // Helper functions for JSONL processing
      const getNestedValue = (obj: any, path: string): any => {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
          if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
          }
          current = current[part];
        }
        
        return current;
      };
      
      // Helper function to format values based on their type
      const formatValue = (value: any): string => {
        if (value === undefined || value === null) {
          return '';
        } else if (Array.isArray(value)) {
          // For arrays, join items as comma-separated list
          return value.join(', ');
        } else if (typeof value === 'object') {
          // For objects, convert to string representation
          return JSON.stringify(value);
        } else {
          // For primitive values, convert to string
          return String(value);
        }
      };

      // Create a variable to store page image data
      let pageImageDataList: { pageNum: number; dataUrl: string }[] = [];
      
      // If it's a PDF and processImages is enabled, extract images first
      if (fileName?.toLowerCase().endsWith('.pdf') && processImages && originalFileData) {
        try {
          // Initialize PDF.js 
          const pdfDoc = await getDocument({ data: originalFileData }).promise
          let totalImages = 0
          let totalVectorGraphics = 0
          let totalFormXObjects = 0
          let pageImageDetails: {page: number, count: number, sizes: string[]}[] = []
          
          // Track pages with visual elements to render later
          const pagesWithVisuals: number[] = []
          
          console.log(`Processing PDF with ${pdfDoc.numPages} pages for images`);
          
          // Enhanced approach to detect more types of images and graphics
          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            try {
              const page = await pdfDoc.getPage(pageNum)
              const operatorList = await page.getOperatorList()
              const commonObjs = page.commonObjs
              
              // Count various types of visual elements
              let pageImageCount = 0
              let pageSvgCount = 0
              let pageFormXObjectCount = 0
              const imageSizes: string[] = []
              
              // Track XObject names to avoid double counting
              const processedXObjects = new Set<string>()
              
              for (let i = 0; i < operatorList.fnArray.length; i++) {
                const op = operatorList.fnArray[i]
                const args = operatorList.argsArray[i]
                
                // Direct image operations
                if (op === PDFJS.OPS.paintImageXObject) {
                  const imageRef = args[0]
                  
                  // Skip if we've already processed this XObject
                  if (processedXObjects.has(imageRef)) {
                    continue
                  }
                  
                  processedXObjects.add(imageRef)
                  pageImageCount++
                  
                  // Try to get image size if available
                  try {
                    const img = commonObjs.get(imageRef)
                    if (img && img.width && img.height) {
                      imageSizes.push(`${img.width}x${img.height}`)
                    }
                  } catch (e) {
                    // Ignore errors when trying to get image details
                  }
                } 
                // Form XObjects might contain embedded images
                else if (op === PDFJS.OPS.paintFormXObjectBegin) {
                  pageFormXObjectCount++
                  totalFormXObjects++
                }
                // Check for vector graphics operations
                else if ([
                  PDFJS.OPS.constructPath,
                  PDFJS.OPS.stroke,
                  PDFJS.OPS.fill,
                  PDFJS.OPS.shadingFill,
                  PDFJS.OPS.eoFill
                ].includes(op)) {
                  pageSvgCount++
                }
                // Check for masked images
                else if (op === PDFJS.OPS.setGState) {
                  try {
                    const gStateId = args[0]
                    const gState = commonObjs.get(gStateId)
                    
                    // Check if this graphics state has a soft mask (transparent image)
                    if (gState && gState.smask) {
                      pageImageCount++
                    }
                  } catch (e) {
                    // Ignore errors when trying to get graphics state details
                  }
                }
              }
              
              if (pageImageCount > 0 || pageSvgCount > 0 || pageFormXObjectCount > 0) {
                totalImages += pageImageCount
                totalVectorGraphics += pageSvgCount
                
                // Add this page to the list of pages with visual elements
                pagesWithVisuals.push(pageNum)
                
                // Record details for this page
                pageImageDetails.push({
                  page: pageNum,
                  count: pageImageCount,
                  sizes: imageSizes
                })
                
                console.log(`Page ${pageNum}: ${pageImageCount} images, ${pageSvgCount} vector graphics elements, ${pageFormXObjectCount} form XObjects`)
                if (imageSizes.length > 0) {
                  console.log(`  Image sizes: ${imageSizes.join(', ')}`)
                }
              }
              
              // Check for annotations that might contain images
              const annotations = await page.getAnnotations()
              for (const annotation of annotations) {
                if (annotation.subtype === 'Widget' || annotation.subtype === 'Stamp') {
                  console.log(`Page ${pageNum}: Contains ${annotation.subtype} annotation that may include images`)
                  if (!pagesWithVisuals.includes(pageNum)) {
                    pagesWithVisuals.push(pageNum)
                  }
                }
              }
              
            } catch (pageError) {
              console.warn(`Error processing page ${pageNum} for images:`, pageError)
            }
          }
          
          // Render pages with visual elements to canvas and convert to data URLs
          if (pagesWithVisuals.length > 0) {
            console.log(`Rendering ${pagesWithVisuals.length} pages containing visual elements`)
            
            for (const pageNum of pagesWithVisuals) {
              try {
                const page = await pdfDoc.getPage(pageNum)
                
                // Create a new canvas for this page
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                
                if (!ctx) {
                  console.error(`Failed to get canvas context for page ${pageNum}`)
                  continue
                }
                
                // Set scale and viewport - adjust scale as needed for quality vs file size
                const scale = 3 // Higher value for better quality (Increased from 1.5)
                const viewport = page.getViewport({ scale })
                
                // Set canvas dimensions to match the page
                canvas.width = viewport.width
                canvas.height = viewport.height
                
                // Render the page to canvas
                const renderContext = {
                  canvasContext: ctx,
                  viewport: viewport
                }
                
                await page.render(renderContext).promise
                
                // Convert canvas to data URL (image)
                // Changed to PNG for lossless quality, removed quality param (not applicable for PNG)
                const dataUrl = canvas.toDataURL('image/png')
                
                // Store the rendered page image
                pageImageDataList.push({ pageNum, dataUrl })
                
                console.log(`Rendered page ${pageNum} as image (${Math.round(dataUrl.length / 1024)} KB)`)
              } catch (renderError) {
                console.error(`Error rendering page ${pageNum}:`, renderError)
              }
            }
          }
          
          if (totalImages > 0 || totalVectorGraphics > 0 || totalFormXObjects > 0) {
            console.log(`PDF Summary:`)
            console.log(`- ${totalImages} raster images detected`)
            console.log(`- ${totalVectorGraphics} vector graphic elements detected`)
            console.log(`- ${totalFormXObjects} form XObjects detected (may contain additional images)`)
            console.log(`- ${pageImageDataList.length} pages rendered as images`)
            
            // Detailed report for pages with images
            if (pageImageDetails.length > 0) {
              console.log(`Detailed image report:`)
              pageImageDetails.forEach(detail => {
                console.log(`Page ${detail.page}: ${detail.count} images`)
                if (detail.sizes.length > 0) {
                  console.log(`  Sizes: ${detail.sizes.join(', ')}`)
                }
              })
            }
          } else {
            console.log(`No images or graphics detected in the PDF document`)
          }
        } catch (pdfError) {
          console.error(`Error processing PDF for images:`, pdfError);
        }
      }
      
      // Process text chunks (regardless of whether we processed images)
      let chunks: string[] = [];
      
      switch (chunkingAlgorithm) {
        case 'recursive':
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize,
            chunkOverlap,
          })
          chunks = await splitter.splitText(rawText)
          break;

        case 'line':
          // Split by newlines and filter out empty lines
          chunks = rawText.split('\n').filter(line => line.trim())
          break;

        case 'sentence-chunks':
          const sentenceSplitter = new SentenceSplitter({
            chunkSize: Math.floor(chunkSize / 4), // Convert characters to tokens (approx. 4 chars per token)
            chunkOverlap: Math.floor(chunkOverlap / 4),
          });
          chunks = await sentenceSplitter.splitText(rawText);
          break;

        case 'markdown-chunks':
          const markdownSplitter = new MarkdownNodeParser();
          const mdNodes = markdownSplitter.getNodesFromDocuments([new Document({ text: rawText })]);
          chunks = mdNodes.map(node => node.text);
          break;

        case 'rolling-sentence-chunks':
          const windowSplitter = new SentenceWindowNodeParser({ windowSize });
          const windowNodes = windowSplitter.getNodesFromDocuments([new Document({ text: rawText })]);
          chunks = windowNodes.map(node => node.text);
          break;
          
        case 'csv-tsv':
          chunks = csvData.slice(1).map(row => {
            return csvColumns
              .filter(col => col.selected)
              .map(col => {
                const colIndex = csvData[0].indexOf(col.name);
                return colIndex >= 0 ? row[colIndex] : '';
              })
              .join(' ');
          }).filter(text => text.trim());
          break;
          
        case 'jsonl':
          chunks = jsonlData.map(obj => {
            return jsonlKeys
              .filter(key => key.selected)
              .map(key => {
                const value = getNestedValue(obj, key.path);
                return formatValue(value);
              })
              .join(' ');
          }).filter(text => text.trim());
          break;
      }
      
      // If we have rendered page images from PDF processing, add them to the chunks
      if (fileName?.toLowerCase().endsWith('.pdf') && processImages && pageImageDataList.length > 0) {
        const imageChunks: string[] = [];
        
        // Sort page images by page number
        pageImageDataList.sort((a, b) => a.pageNum - b.pageNum);
        
        // Add each page image as a separate chunk at the beginning
        pageImageDataList.forEach(({ pageNum, dataUrl }) => {
          const imageChunk = `<div class="pdf-page-image">
            <img src="${dataUrl}" alt="PDF Page ${pageNum}" style="max-width: 100%; height: auto;" />
          </div>`;
          imageChunks.push(imageChunk);
        });
        
        // Prepend image chunks to the text chunks
        chunks = [...imageChunks, ...chunks];
      }

      // If no existing Q&A pairs, proceed with creating new pairs
      const pairs: QAPair[] = chunks.map((ck, idx) => ({
        id: idx + 1,
        context: ck,
        question: '',
        answer: '',
        selected: false,
        generating: {
          question: false,
          answer: false
        }
      }))
      setQaPairs(pairs)
      
      // Auto-expand cells with images
      const newExpandedCells: Record<string, boolean> = { ...expandedCells };
      pairs.forEach((pair) => {
        if (pair.context.includes('<div class="pdf-page-image">')) {
          newExpandedCells[`${pair.id}-context`] = true;
        }
      });
      setExpandedCells(newExpandedCells);
      
      // If there are existing Q&A pairs, show the confirmation dialog
      if (qaPairs.length > 0) {
        setPendingChunks(chunks);
        setShowChunkingDialog(true);
        return;
      }
    } catch (err) {
      console.error('Error chunking doc:', err)
      alert('Failed to chunk document.')
    }
  }

  //------------------------------------------------------------------------------------
  // 5. Generate Q&A (Streaming)
  //------------------------------------------------------------------------------------

  // Add a debounced update function using useCallback
  const debouncedUpdateQaPairs = useCallback(
    debounce((id: string | number, updates: Partial<QAPair>) => {
      setQaPairs(prev =>
        prev.map(qa =>
          qa.id === id ? { ...qa, ...updates } : qa
        )
      );
    }, 100),
    []
  );

  // Helper to extract base64 image data from context HTML
  const extractBase64ImageFromHTML = (html: string): string | null => {
    // Check if the HTML contains image
    if (!html.includes('<div class="pdf-page-image">')) return null;
    
    try {
      // Extract the base64 data from the src attribute with better regex pattern
      // This pattern will capture the MIME type and the base64 data separately
      const imgSrcMatch = html.match(/src="data:image\/([^;]+);base64,([^"]+)"/);
      
      if (!imgSrcMatch || imgSrcMatch.length < 3) {
        console.log('[DEBUG-APP] Failed to extract base64 image data from HTML');
        return null;
      }
      
      const mimeType = imgSrcMatch[1];
      const base64Data = imgSrcMatch[2];
      
      // Perform basic validation on the base64 data
      if (!base64Data || base64Data.length < 100) { // Arbitrary minimum length to ensure we have actual data
        console.log('[DEBUG-APP] Extracted base64 data is too short or invalid');
        return null;
      }
      
      // Only log the length to avoid huge console output
      console.log(`[DEBUG-APP] Successfully extracted base64 image data (${mimeType}), length: ${base64Data.length}`);
      
      return base64Data;
    } catch (error) {
      console.error('[DEBUG-APP] Error extracting base64 image data:', error);
      return null;
    }
  };
  
  // Modify the doStreamCall function to use a buffer
  const doStreamCall = async function* (prompt: string) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let response: Response | null = null;
    let buffer = '';
    
    try {
      if (shouldStopGeneration) {
        throw new Error('AbortError');
      }

      // Check Ollama connection first
      const isConnected = await checkOllamaConnection();
      if (!isConnected) {
        throw new Error('OllamaConnectionError');
      }

      // Create new AbortController if none exists
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      // Check if the prompt includes image HTML
      const containsImageHtml = prompt.includes('<div class="pdf-page-image">');
      if (containsImageHtml) {
        console.log('[DEBUG-APP] Detected image HTML in prompt');
      }
      
      // Extract image data and clean prompt if needed
      let imageBase64 = null;
      let cleanPrompt = prompt;
      
      if (containsImageHtml) {
        // Extract the base64 image data
        imageBase64 = extractBase64ImageFromHTML(prompt);
        
        // More thoroughly remove all HTML from the prompt
        // First capture the main text outside the HTML
        const beforeHtml = prompt.split('<div class="pdf-page-image">')[0];
        const afterHtml = prompt.split('</div>').pop() || '';
        
        // Combine the text parts with a simple indicator
        cleanPrompt = `You are an expert at analyzing images and extracting information from them. 
                       Please analyze the provided image and respond to the following: ${beforeHtml} ${afterHtml}`;
        
        console.log('[DEBUG-APP] Cleaned prompt:', cleanPrompt.substring(0, 200) + '...');
      }
      
      // Prepare request body based on whether we have an image
      const requestBody: any = {
        model: ollamaSettings.model,
        prompt: cleanPrompt,
        stream: true,
        options: {
          temperature: ollamaSettings.temperature,
          top_p: ollamaSettings.topP,
          seed: ollamaSettings.useFixedSeed ? ollamaSettings.seed : undefined,
          num_ctx: ollamaSettings.numCtx,
        }
      };
      
      // Add images array if we have an image
      if (imageBase64) {
        requestBody.images = [imageBase64];
        console.log('[DEBUG-APP] Added image data to request. Request structure:', 
          JSON.stringify({
            ...requestBody,
            images: ['[BASE64_DATA_PRESENT]'] // Don't log the actual base64 data
          }, null, 2)
        );
      } else if (containsImageHtml) {
        console.error('[DEBUG-APP] Image HTML detected but failed to extract base64 data');
      } else {
        // Log the request structure for text-only requests
        console.log('[DEBUG-APP] Sending text-only request. Request structure:', 
          JSON.stringify(requestBody, null, 2)
        );
      }
      
      console.log('[DEBUG-APP] Sending request to Ollama API with model:', ollamaSettings.model);
      
      response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG-APP] Ollama API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body available');
      reader = response.body.getReader();
      
      const decoder = new TextDecoder();

      try {
        while (true) {
          if (shouldStopGeneration) {
            throw new Error('AbortError');
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line) continue;
            if (shouldStopGeneration) {
              throw new Error('AbortError');
            }
            
            try {
              const response = JSON.parse(line);
              if (response.response) {
                buffer += response.response;
                // Only yield when buffer reaches threshold or contains newline
                if (buffer.length >= 50 || buffer.includes('\n')) {
                  yield buffer;
                  buffer = '';
                }
              }
              if (response.done && buffer.length > 0) {
                yield buffer;
                return;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              continue;
            }
          }
        }
      } finally {
        if (reader) {
          try {
            await reader.cancel();
          } catch (e) {
            console.error('Error canceling reader:', e);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
        throw error;
      }
      console.error('Streaming error:', error);
      throw error;
    } finally {
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          console.error('Error canceling reader:', e);
        }
      }
      if (response && !response.bodyUsed) {
        try {
          await response.body?.cancel();
        } catch (e) {
          console.error('Error canceling response body:', e);
        }
      }
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  };

  // Add these new functions before the generateQA function
  const generateQuestion = async (row: QAPair): Promise<string> => {
    let questionText = '';

    // Set initial generating state
    setQaPairs(prev =>
      prev.map(r =>
        r.id === row.id ? { ...r, generating: { question: true, answer: r.generating?.answer || false } } : r
      )
    );

    try {
      // Determine if the context is an image
      const isImageContext = row.context.includes('<div class="pdf-page-image">');
      
      // Select the appropriate prompt template based on context type
      const currentQuestionPrompt = isImageContext ? imagePromptQuestion : promptQuestion;
      
      // Generate question using the selected prompt template
      const processedPrompt = replacePlaceholders(currentQuestionPrompt, {
        summary: docSummary,
        chunk: row.context
      });
      
      // Call doStreamCall with the processed prompt (it handles image extraction internally)
      for await (const chunk of doStreamCall(processedPrompt)) {
        if (shouldStopGeneration) break;
        questionText += chunk;
        debouncedUpdateQaPairs(row.id, { question: questionText });
      }

      // Final update
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? {
            ...r,
            question: questionText,
            generating: { question: false, answer: r.generating?.answer || false }
          } : r
        )
      );

      return questionText; // Ensure return value
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        throw err;
      }
      console.error('Error generating question:', err);
      // Final update on error
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? {
            ...r,
            generating: { question: false, answer: r.generating?.answer || false }
          } : r
        )
      );
      return ''; // Return empty string on error
    }
  };

  const generateAnswer = async (row: QAPair): Promise<string> => {
    if (!row.question.trim()) {
      console.warn('Skipping answer generation - no question provided');
      return '';
    }

    let answerText = '';

    // Set generating state for answer
    setQaPairs(prev =>
      prev.map(r =>
        r.id === row.id ? { ...r, generating: { question: r.generating?.question || false, answer: true } } : r
      )
    );

    try {
      // Determine if the context is an image
      const isImageContext = row.context.includes('<div class="pdf-page-image">');
      
      // Select the appropriate prompt template based on context type
      const currentAnswerPrompt = isImageContext ? imagePromptAnswer : promptAnswer;
      
      // Generate answer using the selected prompt template
      const processedPrompt = replacePlaceholders(currentAnswerPrompt, {
        summary: docSummary,
        chunk: row.context,
        question: row.question
      });
      
      // Call doStreamCall with the processed prompt (it handles image extraction internally)
      for await (const chunk of doStreamCall(processedPrompt)) {
        if (shouldStopGeneration) break;
        answerText += chunk;
        debouncedUpdateQaPairs(row.id, { answer: answerText });
      }

      // Final update
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? {
            ...r,
            answer: answerText,
            generating: { question: r.generating?.question || false, answer: false }
          } : r
        )
      );

      return answerText; // Ensure return value
    } catch (err) {
     if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        throw err;
      }
      console.error('Error generating answer:', err);
      // Final update on error
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? {
            ...r,
            generating: { question: r.generating?.question || false, answer: false }
          } : r
        )
      );
      return ''; // Return empty string on error
    }
  };

  // Fix the generateQA function to properly handle error cases
  const generateQA = async (row: QAPair): Promise<{ question: string, answer: string }> => {
    try {
      const question = await generateQuestion(row);
      if (shouldStopGeneration || !question) return { question: '', answer: '' };
      
      const answer = await generateAnswer({ ...row, question });
      return { question, answer };
    } catch (err) {
      console.error("Error generating QA pair:", err);
      return { question: '', answer: '' };
    }
  };

  // Add new handlers for the new generation types
  const handleGenerateQuestion = async () => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    if (isFlashcardView(viewMode)) {
      return;
    }

    const rowsToProcess = qaPairs.filter(q => q.selected).length > 0 
      ? qaPairs.filter(q => q.selected)
      : qaPairs;

    if (rowsToProcess.length === 0) {
      alert('No rows to process.');
      return;
    }

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('question');
    setGenerationProgress({ completed: 0, total: rowsToProcess.length });

    try {
      for (let i = 0; i < rowsToProcess.length; i++) {
        if (shouldStopGeneration) break;
        await generateQuestion(rowsToProcess[i]);
        setGenerationProgress(prev => ({ ...prev, completed: i + 1 }));
      }
    } catch (err) {
      console.error('Error in generation process:', err);
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      setGenerationProgress({ completed: 0, total: 0 });
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  const handleGenerateAnswer = async () => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    if (isFlashcardView(viewMode)) {
      return;
    }

    const rowsToProcess = qaPairs.filter(q => q.selected).length > 0 
      ? qaPairs.filter(q => q.selected)
      : qaPairs;

    if (rowsToProcess.length === 0) {
      alert('No rows to process.');
      return;
    }

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('answer');
    setGenerationProgress({ completed: 0, total: rowsToProcess.length });

    try {
      for (let i = 0; i < rowsToProcess.length; i++) {
        if (shouldStopGeneration) break;
        const row = rowsToProcess[i];
        if (!row.question.trim()) {
          console.warn(`Skipping row ${row.id} - no question provided`);
          continue;
        }
        await generateAnswer(row);
        setGenerationProgress(prev => ({ ...prev, completed: i + 1 }));
      }
    } catch (err) {
      console.error('Error in generation process:', err);
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      setGenerationProgress({ completed: 0, total: 0 });
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  // Add handleGenerateQA function
  const handleGenerateQA = async () => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    if (isFlashcardView(viewMode)) {
      return;
    }

    const rowsToProcess = qaPairs.filter(q => q.selected).length > 0 
      ? qaPairs.filter(q => q.selected)
      : qaPairs;

    if (rowsToProcess.length === 0) {
      alert('No rows to process.');
      return;
    }

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('qa');
    setGenerationProgress({ completed: 0, total: rowsToProcess.length });

    try {
      for (let i = 0; i < rowsToProcess.length; i++) {
        if (shouldStopGeneration) break;
        const row = rowsToProcess[i];
        await generateQA(row);
        setGenerationProgress(prev => ({ ...prev, completed: i + 1 }));
      }
    } catch (err) {
      console.error('Error in generation process:', err);
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      setGenerationProgress({ completed: 0, total: 0 });
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  //------------------------------------------------------------------------------------
  // 6. Delete / Generate
  //------------------------------------------------------------------------------------
  const handleDeleteSelected = () => {
    if (isFlashcardView(viewMode)) {
      const currentQA = qaPairs[currentIndex];
      if (currentQA) {
        setQaPairs(prev => prev.filter(qa => qa.id !== currentQA.id));
        if (currentIndex >= qaPairs.length - 1) {
          setCurrentIndex(Math.max(0, qaPairs.length - 2));
        }
      }
    } else {
      const remaining = qaPairs.filter((q) => !q.selected);
      setQaPairs(remaining);
    }
  };

  //------------------------------------------------------------------------------------
  // 7. Import/Export CSV
  //------------------------------------------------------------------------------------
  const handleImportCSV = async (
    fileOrEvent: File | React.ChangeEvent<HTMLInputElement>,
    mode: 'replace' | 'append' = 'replace',
    fromDialog: boolean = false // Add parameter to know if we're coming from dialog
  ) => {
    let file: File | null = null;
    
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0] || null;
      fileOrEvent.target.value = ''; // Reset input
    }

    if (!file) {
      return;
    }

    // If there's existing data and we haven't specified a mode, show dialog
    // Only show dialog if we're not already coming from the dialog
    if (qaPairs.length > 0 && mode === 'replace' && !fromDialog) {
      setPendingImportFile(file);
      setShowImportDialog(true);
      return;
    }

    try {
      const text = await file.text();
      
      // Parse CSV
      const parseCSV = (text: string): string[][] => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let insideQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];
          
          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              currentField += '"';
              i++; // Skip next quote
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentField.replace(/[\r\n]+/g, ' ').trim());
            currentField = '';
          } else if ((char === '\n' || char === '\r\n' || char === '\r') && !insideQuotes) {
            currentRow.push(currentField.replace(/[\r\n]+/g, ' ').trim());
            if (currentRow.some(field => field.length > 0)) {
              rows.push([...currentRow]); // Create a new array to avoid reference issues
            }
            currentRow = [];
            currentField = '';
          } else {
            currentField += char;
          }
        }
        
        // Handle the last row if there's no final newline
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.replace(/[\r\n]+/g, ' ').trim());
          if (currentRow.some(field => field.length > 0)) {
            rows.push([...currentRow]); // Create a new array to avoid reference issues
          }
        }
        
        return rows;
      };

      const rows = parseCSV(text);
      
      // Validate CSV format
      if (rows.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());

      if (!headers.includes('context') || !headers.includes('question') || !headers.includes('answer')) {
        throw new Error('CSV must have "context", "question", and "answer" columns');
      }

      const contextIndex = headers.indexOf('context');
      const questionIndex = headers.indexOf('question');
      const answerIndex = headers.indexOf('answer');

      // If we're appending, get the highest existing ID
      const startId = mode === 'append' 
        ? Math.max(...qaPairs.map(qa => typeof qa.id === 'string' ? parseInt(qa.id, 10) : Number(qa.id))) + 1 
        : 1;

      // Convert rows to QAPairs
      const newPairs: QAPair[] = rows.slice(1).map((row, idx) => ({
        id: startId + idx,
        context: row[contextIndex] || '',
        question: row[questionIndex] || '',
        answer: row[answerIndex] || '',
        selected: false,
        generating: {
          question: false,
          answer: false
        }
      }));

      // Update state based on mode
      if (mode === 'append') {
        setQaPairs(prev => [...prev, ...newPairs]);
      } else {
        setQaPairs(newPairs);
      }
      setPage(0);

    } catch (err) {
      alert(`Error importing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (qaPairs.length === 0) {
      alert('No Q&A to export!')
      return
    }
    
    // Show export options dialog instead of directly exporting
    setShowExportDialog(true);
  }
  
  // Add a new state for the default image description header
  const defaultImageDescriptionHeader = `

### GUIDELINES:
- Output only the result of your task, no other text or comments (No "Here is the description of the image:" or anything like that) 

### YOUR TASK:
`;

  const generateImageDescription = async (imageHtml: string, prompt: string): Promise<string> => {
    try {
      // Extract the base64 image data
      const imageBase64 = extractBase64ImageFromHTML(imageHtml);
      
      if (!imageBase64) {
        console.error('[DEBUG-APP] Failed to extract base64 data from image HTML');
        return '[Failed to process image]';
      }
      
      // Extract page number if available
      const pageMatch = imageHtml.match(/Page (\d+)/);
      const pageNumber = pageMatch ? pageMatch[1] : 'unknown';
      
      // Create a new AbortController if none exists
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      // Combine the default header with the user's prompt
      const fullPrompt = `${defaultImageDescriptionHeader}\n${prompt}`;
      
      // Prepare request body
      const requestBody: any = {
        model: ollamaSettings.model,
        prompt: fullPrompt,
        stream: false, // Use non-streaming for simplicity in this case
        options: {
          temperature: ollamaSettings.temperature,
          top_p: ollamaSettings.topP,
          seed: ollamaSettings.useFixedSeed ? ollamaSettings.seed : undefined,
          num_ctx: ollamaSettings.numCtx,
        },
        images: [imageBase64]
      };
      
      // Log the request details (without the full base64 image data for brevity)
      console.log('[DEBUG-APP] Image description request details:');
      console.log('[DEBUG-APP] Model:', ollamaSettings.model);
      console.log('[DEBUG-APP] Page:', pageNumber);
      console.log('[DEBUG-APP] Full prompt:', fullPrompt);
      console.log('[DEBUG-APP] Temperature:', ollamaSettings.temperature);
      console.log('[DEBUG-APP] Top P:', ollamaSettings.topP);
      console.log('[DEBUG-APP] Seed:', ollamaSettings.useFixedSeed ? ollamaSettings.seed : 'not fixed');
      console.log('[DEBUG-APP] Context window:', ollamaSettings.numCtx);
      console.log('[DEBUG-APP] Image data length:', imageBase64.length);
      console.log('[DEBUG-APP] Full request structure:', 
        JSON.stringify({
          ...requestBody,
          images: ['[BASE64_DATA_LENGTH: ' + imageBase64.length + ']'] // Don't log the actual base64 data
        }, null, 2)
      );
      
      // Make the request to the Ollama API
      console.log(`[DEBUG-APP] Sending image description request to ${OLLAMA_BASE_URL}/api/generate for Page ${pageNumber}`);
      
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG-APP] Ollama API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[DEBUG-APP] Received response for Page', pageNumber, ':', data.response?.substring(0, 100) + '...');
      return data.response || `[Image description for Page ${pageNumber}]`;
    } catch (error) {
      console.error('Error generating image description:', error);
      return '[Error generating image description]';
    }
  };

  const handleExportWithOptions = (options: ExportOptions) => {
    if (qaPairs.length === 0) {
      alert('No Q&A to export!')
      return
    }
    
    // Get selected columns and their custom names
    const selectedColumns = options.columns.filter(col => col.selected);
    
    // Create a copy of the data that we can shuffle if needed
    // If options.data exists (from MNRL filtering), use that instead of qaPairs
    let dataToExport = options.data ? [...options.data] : [...qaPairs];
    
    // Process images in context if needed
    const contextColumnSelected = selectedColumns.some(col => col.field === 'context');
    if (contextColumnSelected && options.imageExportType) {
      // Check if we need to handle images
      const hasImages = dataToExport.some(qa => 
        typeof qa.context === 'string' && qa.context.includes('<div class="pdf-page-image">')
      );

      if (hasImages) {
        if (options.imageExportType === 'description') {
          // Check if the model is available
          checkOllamaConnection().then(async (isConnected) => {
            if (!isConnected) {
              alert('Cannot connect to Ollama. Please check your connection and try again.');
              return;
            }
            
            // Reset the abort controller to ensure previous cancelled operations don't affect us
            if (abortControllerRef.current) {
              abortControllerRef.current = null;
            }
            
            const prompt = options.imageDescriptionPrompt || 'Describe this image in 3-5 sentences. Focus on the main elements, their relationships, and any text visible in the image.';
            
            // Create a processing indicator
            let processingText = document.createElement('div');
            processingText.style.position = 'fixed';
            processingText.style.top = '50%';
            processingText.style.left = '50%';
            processingText.style.transform = 'translate(-50%, -50%)';
            processingText.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            processingText.style.color = 'white';
            processingText.style.padding = '20px';
            processingText.style.borderRadius = '10px';
            processingText.style.zIndex = '9999';
            processingText.style.textAlign = 'center';
            
            // Find all QA pairs with images
            const qaWithImages = dataToExport.filter(qa => 
              typeof qa.context === 'string' && qa.context.includes('<div class="pdf-page-image">')
            );
            
            // Add processing text to the document
            document.body.appendChild(processingText);
            
            // Set up shouldStop flag
            let shouldStop = false;
            let wasCancelled = false;
            
            // Add a cancel button
            let cancelButton = document.createElement('button');
            cancelButton.innerText = 'Cancel';
            cancelButton.style.marginTop = '10px';
            cancelButton.style.padding = '5px 10px';
            cancelButton.style.backgroundColor = '#e53935';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '4px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.onclick = () => {
              shouldStop = true;
              wasCancelled = true;
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                // Create a new abort controller for subsequent operations
                abortControllerRef.current = new AbortController();
              }
              // Remove the processing indicator
              try {
                document.body.removeChild(processingText);
              } catch (e) {
                console.error('Error removing processing indicator:', e);
              }
            };
            processingText.appendChild(document.createElement('br'));
            processingText.appendChild(cancelButton);
            
            try {
              // Process each image one by one
              const processedData = [...dataToExport];
              for (let i = 0; i < qaWithImages.length; i++) {
                if (shouldStop) break;
                
                const qa = qaWithImages[i];
                if (typeof qa.context === 'string' && qa.context.includes('<div class="pdf-page-image">')) {
                  // Update processing text
                  processingText.innerHTML = `Processing image ${i + 1} of ${qaWithImages.length}...<br>`;
                  processingText.appendChild(cancelButton);
                  
                  try {
                    // Generate description for this image
                    const description = await generateImageDescription(qa.context, prompt);
                    
                    // Update the QA pair with the description
                    const qaIndex = processedData.findIndex(item => item.id === qa.id);
                    if (qaIndex !== -1) {
                      processedData[qaIndex] = {
                        ...qa,
                        context: description
                      };
                    }
                  } catch (error) {
                    // Check if this was caused by cancellation
                    if (shouldStop) {
                      console.log('Image processing was cancelled');
                      break;
                    }
                    
                    console.error('Error processing image:', error);
                    // If there's an error, use a placeholder
                    const pageMatch = qa.context.match(/Page (\d+)/);
                    const pageNumber = pageMatch ? pageMatch[1] : 'unknown';
                    
                    const qaIndex = processedData.findIndex(item => item.id === qa.id);
                    if (qaIndex !== -1) {
                      processedData[qaIndex] = {
                        ...qa,
                        context: `[Image description failed for Page ${pageNumber}]`
                      };
                    }
                  }
                }
              }
              
              // Check if the operation was cancelled
              if (!wasCancelled) {
                // Remove processing indicator
                try {
                  document.body.removeChild(processingText);
                } catch (e) {
                  console.error('Error removing processing indicator:', e);
                }
                
                // Continue with export process
                processExport(processedData, options, selectedColumns);
              }
            } catch (error) {
              console.error('Error in image description generation:', error);
              
              // Remove processing indicator if still present
              try {
                document.body.removeChild(processingText);
              } catch (e) {
                console.error('Error removing processing indicator:', e);
              }
              
              // Show error to user
              alert('An error occurred while generating image descriptions. Please try again.');
            }
          }).catch(error => {
            console.error('Error checking Ollama connection:', error);
            alert('Error connecting to Ollama. Please check your connection and try again.');
          });
          
          // Return early as we'll handle the export in the Promise chain
          return;
        } else if (options.imageExportType === 'fullImage') {
          // Extract images for zip file
          const images: { id: string; base64Data: string; fileName: string; pageNumber: string }[] = [];
          let imageIndex = 1;
          
          // First pass: collect all images
          dataToExport.forEach((qa, index) => {
            if (typeof qa.context === 'string' && qa.context.includes('<div class="pdf-page-image">')) {
              // Extract the base64 data
              const imgMatch = qa.context.match(/src="data:image\/([^;]+);base64,([^"]+)"/);
              
              if (imgMatch) {
                const imageType = imgMatch[1]; // e.g., "jpeg", "png"
                const base64Data = imgMatch[2];
                
                // Extract page number if available
                const pageMatch = qa.context.match(/Page (\d+)/);
                const pageNumber = pageMatch ? pageMatch[1] : index.toString();
                
                // Create a filename for the image
                const fileName = `image_${imageIndex}_page_${pageNumber}.${imageType}`;
                
                // Add to the images array with a unique identifier
                const id = `img_${qa.id}_${imageIndex}`;
                images.push({
                  id,
                  base64Data,
                  fileName,
                  pageNumber
                });
                
                // Store the reference to this image in the qa pair for easy lookup later
                (qa as any).tempImageId = id;
                
                imageIndex++;
              }
            }
          });
          
          // Check if we found any images
          if (images.length > 0) {
            // Import the necessary libraries
            import('jszip').then(async ({ default: JSZip }) => {
              // Create a new zip file
              const zip = new JSZip();
              
              // Add each image to the zip
              images.forEach(img => {
                zip.file(img.fileName, img.base64Data, { base64: true });
              });
              
              // Generate the zip file
              const zipBlob = await zip.generateAsync({ type: 'blob' });
              
              // Save the zip file
              saveAs(zipBlob, 'images.zip');
              
              // Now second pass: replace images in the data with placeholders
              dataToExport = dataToExport.map((qa) => {
                if (typeof qa.context === 'string' && qa.context.includes('<div class="pdf-page-image">')) {
                  // Use the temporary image ID we stored earlier
                  const imageId = (qa as any).tempImageId;
                  
                  if (imageId) {
                    // Find the corresponding image in our images array
                    const imageMatch = images.find(img => img.id === imageId);
                    
                    if (imageMatch) {
                      // Replace with a reference to the image in the zip file
                      return {
                        ...qa,
                        context: `[Image ${imageMatch.fileName} from zip file]`
                      };
                    }
                  }
                  
                  // Fallback if we couldn't find the image
                  return {
                    ...qa,
                    context: `[Image from Q&A pair ${qa.id}]`
                  };
                }
                return qa;
              });
              
              // Clean up temporary properties
              dataToExport.forEach(qa => {
                delete (qa as any).tempImageId;
              });
              
              // Continue with the export process
              processExport(dataToExport, options, selectedColumns);
            }).catch(error => {
              console.error('Error creating zip file:', error);
              alert('Error creating zip file. Please try again or choose a different export option.');
            });
            
            // Return early as we'll handle the export in the Promise chain
            return;
          }
        }
      }
    }
    
    // If we're not handling images as a zip file, or there are no images, proceed with normal export
    processExport(dataToExport, options, selectedColumns);
  }
  
  // Helper function to process the actual export
  const processExport = (dataToExport: QAPair[], options: ExportOptions, selectedColumns: any[]) => {
    // Shuffle the data if requested in advanced options
    if (options.shuffle) {
      // Fisher-Yates shuffle algorithm
      for (let i = dataToExport.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dataToExport[i], dataToExport[j]] = [dataToExport[j], dataToExport[i]];
      }
    }
    
    if (options.format === 'csv') {
      // Generate CSV header with custom column names
      let csv = selectedColumns.map(col => col.customName).join(',') + '\n';
      
      // Generate CSV data
      dataToExport.forEach((qa) => {
        const rowValues = selectedColumns.map(col => {
          const value = qa[col.field as keyof typeof qa] || '';
          // Escape quotes for CSV format
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += rowValues.join(',') + '\n';
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'qa_dataset.csv');
    } else {
      // JSONL format
      let jsonl = '';
      
      dataToExport.forEach((qa) => {
        const jsonObject: Record<string, any> = {};
        
        // Use custom names as keys
        selectedColumns.forEach(col => {
          jsonObject[col.customName] = qa[col.field as keyof typeof qa] || '';
        });
        
        jsonl += JSON.stringify(jsonObject) + '\n';
      });
      
      const blob = new Blob([jsonl], { type: 'application/x-jsonlines;charset=utf-8;' });
      saveAs(blob, 'qa_dataset.jsonl');
    }
  }

  // Add this function to App.tsx
  const shuffleQAPairs = () => {
    // Create a copy of the data
    const shuffledPairs = [...qaPairs];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffledPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPairs[i], shuffledPairs[j]] = [shuffledPairs[j], shuffledPairs[i]];
    }
    
    // Update the state with shuffled data
    setQaPairs(shuffledPairs);
  };

  // Helper to toggle cell expansion
  const toggleCellExpansion = useCallback((rowId: string | number, columnType: string) => {
    setExpandedCells(prev => {
      const newState = { ...prev };
      const cellKey = `${rowId}-${columnType}`;
      const isCurrentlyExpanded = !!prev[cellKey];

      // Find the QA pair to check if it's an image context
      const qaPair = qaPairs.find(qa => qa.id === rowId);
      const isImageContextCell = qaPair?.context.includes('<div class="pdf-page-image">') && columnType === 'context';

      if (isCurrentlyExpanded) {
        // If currently expanded, collapse it, UNLESS it's an image cell
        if (!isImageContextCell) {
          delete newState[cellKey];
        } 
        // If it IS an image cell, leave it expanded (clicking opens viewer, doesn't collapse)
      } else {
        // If currently collapsed, expand it
        newState[cellKey] = true;
      }
      return newState;
    });
  }, [qaPairs]); // Add qaPairs dependency


  // Add this helper for auto-scrolling
  const scrollToBottom = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  // Helper to check if a cell is generating
  const isCellGenerating = useCallback((qa: QAPair, columnType: string): boolean => {
    if (!qa.generating) return false;
    if (columnType === 'question') return qa.generating.question;
    if (columnType === 'answer') return qa.generating.answer;
    return false;
  }, []);

  // Helper to toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Replace the DragDropContext section with:
  const [{ sections: currentSections, lastSectionMoved }, setListState] = useState<ListState>({
    sections,
    lastSectionMoved: null,
  });

  const [registry] = useState(getSectionRegistry);
  const [instanceId] = useState(() => Symbol('instance-id'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reorderSection = useCallback(
    ({
      startIndex,
      indexOfTarget,
      closestEdgeOfTarget,
    }: {
      startIndex: number;
      indexOfTarget: number;
      closestEdgeOfTarget: Edge | null;
    }): void => {
      const finishIndex = getReorderDestinationIndex({
        startIndex,
        indexOfTarget,
        closestEdgeOfTarget,
        axis: 'vertical',
      });

      if (startIndex === finishIndex) {
        return;
      }

      setListState((prevState: ListState) => {
        const section = prevState.sections[startIndex];
        const newSections = [...prevState.sections];
        newSections.splice(startIndex, 1);
        newSections.splice(finishIndex, 0, section);

        return {
          sections: newSections,
          lastSectionMoved: {
            section,
            previousIndex: startIndex,
            currentIndex: finishIndex,
            numberOfSections: prevState.sections.length,
          },
        };
      });
    },
    []
  );

  useEffect(() => {
    if (lastSectionMoved === null) {
      return;
    }

    const { section} = lastSectionMoved;
    const element = registry.getElement(section.id);
    if (element) {
      // Simple flash effect on drop
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = 'rgba(0, 120, 255, 0.1)';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 300);
    }
  }, [lastSectionMoved, registry]);

  const getListLength = useCallback(() => currentSections.length, [currentSections.length]);

  const contextValue: ListContextValue = useMemo(() => {
    return {
      registerSection: registry.register,
      reorderSection,
      instanceId,
      getListLength,
    };
  }, [registry.register, reorderSection, instanceId, getListLength]);

  // Add monitor effect to handle drops
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        
        if (!sourceData || !targetData) {
          return;
        }

        const sourceIndex = currentSections.findIndex(section => section.id === sourceData.id);
        const targetIndex = currentSections.findIndex(section => section.id === targetData.id);
        
        if (sourceIndex < 0 || targetIndex < 0) {
          return;
        }

        const closestEdge = extractClosestEdge(targetData);

        reorderSection({
          startIndex: sourceIndex,
          indexOfTarget: targetIndex,
          closestEdgeOfTarget: closestEdge,
        });
      },
    });
  }, [currentSections, reorderSection]);

  // Add a new effect to handle cell expansion during generation
  useEffect(() => {
    // Update expanded cells based on generating state of each cell
    setExpandedCells(prev => {
      const newState = { ...prev };
      qaPairs.forEach(qa => {
        // Only set cells that are actually generating to expanded
        newState[`${qa.id}-question`] = qa.generating?.question || false;
        newState[`${qa.id}-answer`] = qa.generating?.answer || false;
      });
      return newState;
    });
  }, [qaPairs]); // Only depend on qaPairs changes

  // Keep the reset effect for when generation completely stops
  useEffect(() => {
    if (!isGenerating) {
      // Reset generating flags in qaPairs
      setQaPairs(prev => prev.map(qa => ({
        ...qa,
        generating: {
          question: false,
          answer: false
        }
      })));
    }
  }, [isGenerating]);

  // Effect to handle currentIndex changes
  useEffect(() => {
    if (currentIndex >= qaPairs.length) {
      setCurrentIndex(Math.max(0, qaPairs.length - 1));
    }
  }, [qaPairs.length, currentIndex]);

  // Effect to handle keyboard navigation for flashcards
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation if we're in flashcard view and no text field is focused
      if (isFlashcardView(viewMode) && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        if (event.key === 'ArrowLeft') {
          if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
          }
        } else if (event.key === 'ArrowRight') {
          if (currentIndex < qaPairs.length - 1) {
            setCurrentIndex(prev => prev + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode, currentIndex, qaPairs.length]);

  const handleViewModeToggle = () => {
    const newMode = isTableView(viewMode) ? 'flashcard' : 'table';
    
    if (newMode === 'flashcard') {
      const selectedQaPairs = qaPairs.filter(qa => qa.selected);
      if (selectedQaPairs.length > 0) {
        const selectedIndex = qaPairs.findIndex(qa => qa.id === selectedQaPairs[0].id);
        setCurrentIndex(selectedIndex);
      }
    }
    
    setViewMode(newMode);
  };

  const handleUpdateQA = (updatedQA: QAPair | QAPair[]) => {
    // Check if this is a single QA pair update
    if (!Array.isArray(updatedQA)) {
      setQaPairs(prev => prev.map(qa => qa.id === updatedQA.id ? updatedQA : qa));
    } else {
      // This is a bulk update from image cropping in FlashcardView
      // Add new QA pairs and replace the existing one if needed
      setQaPairs(prev => {
        const newQAPairs = [...prev];
        
        // Find the QA pair to update (should be first in the array)
        const firstQA = updatedQA[0];
        const existingIndex = newQAPairs.findIndex(qa => qa.id === firstQA.id);
        
        if (existingIndex !== -1) {
          // Replace the existing QA
          newQAPairs[existingIndex] = firstQA;
          
          // Add the rest of the QA pairs after this one
          if (updatedQA.length > 1) {
            newQAPairs.splice(existingIndex + 1, 0, ...updatedQA.slice(1));
          }
        } else {
          // If not found (shouldn't happen), just append all
          newQAPairs.push(...updatedQA);
        }
        
        return newQAPairs;
      });
      
      // If we're in flashcard view, move to the first new card
      if (isFlashcardView(viewMode) && updatedQA.length > 0) {
        const firstNewQA = updatedQA[0];
        const newIndex = qaPairs.findIndex(qa => qa.id === firstNewQA.id);
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
        }
      }
    }
  };

  const handleSingleCardGenerate = async (cardId: string | number) => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    const qa = qaPairs.find(q => q.id === cardId);
    if (!qa) return;

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('qa');

    try {
      // Generate question
      let questionText = '';
      const questionPrompt = `${promptQuestion}\n\nSummary:\n${docSummary}\n\nChunk:\n${qa.context}`;

      try {
        setQaPairs(prev =>
          prev.map(r =>
            r.id === cardId ? { ...r, generating: { question: true, answer: false } } : r
          )
        );

        for await (const chunk of doStreamCall(questionPrompt)) {
          if (shouldStopGeneration) {
            throw new Error('AbortError');
          }
          questionText += chunk;
          // Update state with accumulated text
          setQaPairs(prev =>
            prev.map(r =>
              r.id === cardId ? { ...r, question: questionText } : r
            )
          );
        }

        // Reset generating flag for question after completion
        setQaPairs(prev =>
          prev.map(r =>
            r.id === cardId ? { ...r, generating: { question: false, answer: false }, question: questionText } : r
          )
        );
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
          throw err;
        }
        console.error('Error generating question:', err);
        return;
      }

      if (shouldStopGeneration) {
        throw new Error('AbortError');
      }

      // Generate answer
      let answerText = '';
      const answerPrompt = `${promptAnswer}\nSummary:\n${docSummary}\nChunk:\n${qa.context}\nQuestion:\n${questionText}`;

      try {
        setQaPairs(prev =>
          prev.map(r =>
            r.id === cardId ? { ...r, generating: { question: false, answer: true } } : r
          )
        );

        for await (const chunk of doStreamCall(answerPrompt)) {
          if (shouldStopGeneration) break;
          answerText += chunk;
          // Update state with accumulated text
          setQaPairs(prev =>
            prev.map(r =>
              r.id === cardId ? { ...r, answer: answerText } : r
            )
          );
        }

        // Reset generating flag for answer after completion
        setQaPairs(prev =>
          prev.map(r =>
            r.id === cardId ? { ...r, generating: { question: false, answer: false }, answer: answerText } : r
          )
        );
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
          throw err;
        }
        console.error('Error generating answer:', err);
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        console.log('Generation process stopped by user');
      } else {
        console.error('Error in generation process:', err);
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  const handleCardChange = (index: number) => {
    setCurrentIndex(index);
  };

  // Add this new function to handle creating empty rows/cards
  const handleAddEmpty = () => {
    const newId = qaPairs.length > 0 
      ? Math.max(...qaPairs.map(qa => typeof qa.id === 'string' ? parseInt(qa.id, 10) : Number(qa.id))) + 1 
      : 1;
    const newQA: QAPair = {
      id: newId,
      context: '',
      question: '',
      answer: '',
      selected: false,
      generating: {
        question: false,
        answer: false
      }
    };

    if (viewMode === 'flashcard') {
      // In flashcard view, add after current card
      const newQAPairs = [...qaPairs];
      newQAPairs.splice(currentIndex + 1, 0, newQA);
      setQaPairs(newQAPairs);
      setCurrentIndex(currentIndex + 1); // Move to the new card
    } else {
      // In table view, add after selected rows or at the end if none selected
      const selectedQAs = qaPairs.filter(qa => qa.selected);
      if (selectedQAs.length === 0) {
        // No rows selected, add to the end
        setQaPairs(prev => [...prev, newQA]);
      } else {
        // Add after each selected row
        const newQAPairs = [...qaPairs];
        const insertions = selectedQAs
          .sort((a, b) => {
            // Get indices of the selected rows and sort in descending order
            const indexA = newQAPairs.findIndex(pair => pair.id === a.id);
            const indexB = newQAPairs.findIndex(pair => pair.id === b.id);
            return indexB - indexA; // Sort in descending order
          })
          .map((selectedQA, index) => ({
            index: newQAPairs.findIndex(pair => pair.id === selectedQA.id),
            newQA: {
              ...newQA,
              id: newId + index
            }
          }));

        // Insert new rows starting from the end
        insertions.forEach(({ index, newQA }) => {
          newQAPairs.splice(index + 1, 0, newQA);
        });

        setQaPairs(newQAPairs);
      }
    }
  };

  const handleDuplicate = () => {
    if (viewMode === 'flashcard') {
      // In flashcard view, duplicate current card
      const currentQA = qaPairs[currentIndex];
      if (!currentQA) return;

      const newId = Math.max(...qaPairs.map(qa => typeof qa.id === 'string' ? parseInt(qa.id, 10) : Number(qa.id))) + 1;
      const duplicatedQA: QAPair = {
        ...currentQA,
        id: newId,
        selected: false
      };

      // Insert after current card
      const newQAPairs = [...qaPairs];
      newQAPairs.splice(currentIndex + 1, 0, duplicatedQA);
      setQaPairs(newQAPairs);
      setCurrentIndex(currentIndex + 1); // Move to the duplicated card
    } else {
      // In table view, duplicate all selected cards
      const selectedQAs = qaPairs.filter(qa => qa.selected);
      if (selectedQAs.length === 0) return;

      let nextId = Math.max(...qaPairs.map(qa => typeof qa.id === 'string' ? parseInt(qa.id, 10) : Number(qa.id))) + 1;
      const newQAPairs = [...qaPairs];

      // Sort selected QAs by their position in descending order
      const insertions = selectedQAs
        .sort((a, b) => {
          const indexA = newQAPairs.findIndex(pair => pair.id === a.id);
          const indexB = newQAPairs.findIndex(pair => pair.id === b.id);
          return indexB - indexA; // Sort in descending order
        })
        .map((selectedQA, index) => ({
          index: newQAPairs.findIndex(pair => pair.id === selectedQA.id),
          duplicatedQA: {
            ...selectedQA,
            id: nextId + index,
            selected: false
          }
        }));

      // Insert duplicates starting from the end
      insertions.forEach(({ index, duplicatedQA }) => {
        newQAPairs.splice(index + 1, 0, duplicatedQA);
      });

      setQaPairs(newQAPairs);
    }
  };

  // Add new handlers for single card generation
  const handleSingleCardGenerateQuestion = async (cardId: string | number) => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    const qa = qaPairs.find(q => q.id === cardId);
    if (!qa) return;

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('question');

    try {
      await generateQuestion(qa);
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        console.log('Generation process stopped by user');
      } else {
        console.error('Error in generation process:', err);
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  const handleSingleCardGenerateAnswer = async (cardId: string | number) => {
    if (isGenerating) {
      setShouldStopGeneration(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      setGenerationType(null);
      return;
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.');
      return;
    }

    const qa = qaPairs.find(q => q.id === cardId);
    if (!qa) return;

    if (!qa.question.trim()) {
      alert('No question provided. Please generate or enter a question first.');
      return;
    }

    setShouldStopGeneration(false);
    setIsGenerating(true);
    setGenerationType('answer');

    try {
      await generateAnswer(qa);
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        console.log('Generation process stopped by user');
      } else {
        console.error('Error in generation process:', err);
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setShouldStopGeneration(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };
  //------------------------------------------------------------------------------------
  //  Render UI
  //------------------------------------------------------------------------------------
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#F5F2ED',
      backgroundImage: 'none',
    }}>
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box 
          sx={(theme) => ({ 
            width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            minWidth: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            maxWidth: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : theme.transitions.create(
              ['width', 'min-width', 'max-width', 'opacity'],
              { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
            ),
            position: 'relative',
            backgroundColor: theme.palette.mode === 'dark' ? '#1D1F21' : '#ECEAE5',
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            opacity: isSidebarCollapsed ? 0 : 1,
            overflow: 'hidden',
            flexShrink: 0,
            pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
          })}
        >
          {/* Sidebar Header */}
          <Box sx={(theme) => ({ 
            p: 1,
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 53,
            borderBottom: 1, 
            borderColor: theme.palette.divider,
            bgcolor: theme.palette.mode === 'dark'
              ? '#1A1C1E'
              : '#F5F2ED',
          })}>
            <IconButton
              onClick={() => setShowAboutDialog(true)}
              sx={{ 
                p: 0.5,
                mr: 1,
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              <ScienceIcon sx={{ 
                color: theme.palette.primary.main,
                fontSize: '1.5rem' 
              }} />
            </IconButton>
            <Typography 
              variant="h6" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '0.01em'
              }}
            >
              Q&A Generator
            </Typography>
          </Box>

          {/* Sidebar Content */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 2,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
            },
          }}>
            <ListContext.Provider value={contextValue}>
              {currentSections.map((section, index) => (
                <Box
                  key={section.id}
                  sx={{ 
                    mb: 2,
                  }}
                >
                  <Paper 
                    elevation={0}
                    sx={{ 
                      bgcolor: theme.palette.background.paper,
                      transition: 'all 0.2s ease',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: 'none',
                      boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <Box 
                      ref={(element: HTMLDivElement | null) => {
                        if (element) {
                          const cleanup = combine(
                            registry.register({ sectionId: section.id, element }),
                            draggable({
                              element,
                              getInitialData: () => ({ type: 'section', id: section.id, index }),
                            }),
                            dropTargetForElements({
                              element,
                              canDrop: ({ source }) => source.data.type === 'section',
                              getData: ({ input }) => attachClosestEdge(
                                { type: 'section', id: section.id, index },
                                {
                                  element,
                                  input,
                                  allowedEdges: ['top', 'bottom'],
                                }
                              ),
                            })
                          );
                          return cleanup;
                        }
                      }}
                      sx={{ 
                        py: 0.75,
                        px: 1.5,
                        display: 'flex', 
                        alignItems: 'center',
                        cursor: 'grab',
                        position: 'relative',
                        color: theme.palette.primary.main,
                        minHeight: 32,
                        transition: 'all 0.2s ease',
                        '&:active': {
                          cursor: 'grabbing',
                        },
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.04)' 
                            : 'rgba(255, 255, 255, 0.2)',  // Reduced opacity from 0.6 to 0.2
                          boxShadow: 'none'
                        }
                      }} 
                      onClick={() => toggleSection(section.id)}
                    >
                      {section.icon && (
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mr: 1.5,
                          color: 'inherit',
                          '& svg': {
                            fontSize: '1.1rem',
                          }
                        }}>
                          {section.icon}
                        </Box>
                      )}
                      <Typography variant="subtitle1" sx={{ 
                        flexGrow: 1, 
                        fontWeight: 500,
                        color: theme.palette.mode === 'dark' ? '#fff' : 'text.primary',
                        fontSize: '0.85rem',
                        letterSpacing: '0.01em'
                      }}>
                        {section.title}
                      </Typography>
                      <Tooltip 
                        title={section.description} 
                        placement="right"
                        sx={{ mr: 1 }}
                      >
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          sx={{
                            color: 'inherit',
                            opacity: 0.7,
                            mr: 1
                          }}
                        >
                          <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.id);
                        }}
                        sx={{
                          color: 'inherit',
                          transition: 'transform 0.3s ease',
                          transform: expandedSections[section.id] ? 'rotate(180deg)' : 'none'
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                    <Collapse in={expandedSections[section.id]}>
                      <Box sx={{ 
                        p: 2, 
                        pt: 1,
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.01)',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.04)' 
                            : 'rgba(255, 255, 255, 0.2)',  // Reduced opacity from 0.6 to 0.2
                          boxShadow: 'none'
                        }
                      }}>
                        {/* Render section content based on section.id */}
                        {section.id === 'section-upload' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1 
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                    Document
                                  </Typography>
                                  <Tooltip title="Upload a document (PDF, DOCX, TXT, CSV, JSONL) to generate Q&A pairs from." placement="right">
                                    <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                      <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              
                              {/* Add file selection display with checkbox when a file is uploaded */}
                              {fileName && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: 1.5,
                                  p: 1,
                                  borderRadius: '6px',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.875rem',
                                      color: theme.palette.text.primary,
                                      flexGrow: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {fileName}
                                  </Typography>
                                </Box>
                              )}
                              
                              <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                startIcon={<UploadFileIcon />}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 500,
                                  borderRadius: '8px',
                                  py: 1,
                                  borderColor: theme.palette.mode === 'dark' 
                                    ? alpha(theme.palette.primary.main, 0.5)
                                    : alpha(theme.palette.primary.main, 0.3),
                                  color: theme.palette.primary.main,
                                  '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                  }
                                }}
                              >
                                Upload Document
                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.docx,.txt,.md,.csv,.tsv,.jsonl,.json"
                                  onChange={handleFileUpload}
                                />
                              </Button>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                              Accepts .txt, .csv, .pdf, .docx, .md, .jsonl, .json
                            </Typography>
                            
                            {/* Add Process Images checkbox at the bottom of the document upload section */}
                            {fileName && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={processImages}
                                      onChange={(e) => setProcessImages(e.target.checked)}
                                      sx={{
                                        '&.Mui-checked': {
                                          color: theme.palette.primary.main,
                                        }
                                      }}
                                    />
                                  }
                                  label={
                                    <Typography sx={{ 
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                      color: theme.palette.text.secondary
                                    }}>
                                      Process Images
                                    </Typography>
                                  }
                                />
                                <Tooltip title="Extract images from your document. The tool will identify and process as many images as possible, though some might be missed. Pages containing images will be fully extracted, allowing you to select specific regions to keep. You may need to remove some extra content after extraction." placement="right">
                                  <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        )}
                        {section.id === 'section-modelSettings' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <OllamaSettings 
                              onSettingsSave={handleSettingsSave} 
                              autoApply 
                              hideTitle
                              initialSettings={ollamaSettings}
                              onHelp={handleConnectionHelp}
                            />
                          </Box>
                        )}
                        {section.id === 'section-summarization' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                  Summarization Prompt
                                </Typography>
                                <Tooltip title="The prompt used to generate a summary of your document. The summary will be used as context for Q&A generation." placement="right">
                                  <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <TextField
                                multiline
                                fullWidth
                                value={summaryPrompt}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setSummaryPrompt(newValue);
                                }}
                                onBlur={(e) => {
                                  // Ensure the value is updated on blur
                                  setSummaryPrompt(e.target.value.trim());
                                }}
                                minRows={2}
                                maxRows={6}
                                className="no-drag"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6,
                                    '& textarea': {
                                      paddingRight: '16px',
                                      '&::-webkit-scrollbar': {
                                        width: '8px',
                                        height: '8px'
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        background: 'transparent'
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        background: theme.palette.mode === 'dark' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '100px',
                                        border: '2px solid transparent',
                                        backgroundClip: 'padding-box',
                                        '&:hover': {
                                          background: theme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.2)' 
                                            : 'rgba(0, 0, 0, 0.2)',
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </Box>
                            {qaPairs.length > 0 && (() => {
                              const concatenatedChunks = getConcatenatedChunks();
                              const prompt = `${summaryPrompt.trim()}\n\nText to summarize:\n${concatenatedChunks}`;
                              const estimatedTokens = estimateTokenCount(prompt);
                              if (estimatedTokens > ollamaSettings.numCtx) {
                                return (
                                  <Box sx={{ 
                                    mb: 2, 
                                    p: 1.5, 
                                    borderRadius: 1,
                                    bgcolor: theme.palette.mode === 'dark' 
                                      ? alpha(theme.palette.warning.main, 0.1)
                                      : alpha(theme.palette.warning.main, 0.05),
                                    border: '1px solid',
                                    borderColor: theme.palette.mode === 'dark'
                                      ? alpha(theme.palette.warning.main, 0.2)
                                      : alpha(theme.palette.warning.main, 0.1),
                                  }}>
                                    <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <WarningIcon sx={{ fontSize: '1.1rem' }} />
                                      The prompt and content will likely exceed the context length. Consider increasing the context length to at least {estimatedTokens} tokens or remove unnecessary chunks.
                                    </Typography>
                                  </Box>
                                );
                              }
                              return null;
                            })()}
                            <Button
                              variant="contained"
                              color={isGenerating && generationType === 'summary' ? "error" : "primary"}
                              onClick={handleSummarize}
                              fullWidth
                              sx={{ mt: 1, mb: 2 }}
                              startIcon={isGenerating && generationType === 'summary' ? <StopIcon /> : <AutoAwesomeIcon />}
                              disabled={qaPairs.length === 0 || !ollamaSettings.model || (isGenerating && generationType !== 'summary')}
                            >
                              {isGenerating && generationType === 'summary' ? "Stop" : "Generate Summary"}
                            </Button>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                  Summary (editable)
                                </Typography>
                                <Tooltip title="Edit this summary to refine it before generating Q&A pairs. A good summary helps generate better questions and answers." placement="right">
                                  <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <TextField
                                multiline
                                fullWidth
                                value={docSummary}
                                onChange={(e) => setDocSummary(e.target.value)}
                                placeholder="(Optional) Provide or edit a summary here..."
                                minRows={6}
                                maxRows={12}
                                className="no-drag"
                                ref={(el) => {
                                  if (el) {
                                    const textarea = el.querySelector('textarea');
                                    if (isGenerating) {
                                      scrollToBottom(textarea);
                                    }
                                  }
                                }}
                                sx={{
                                  '& .MuiInputBase-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6,
                                    '& textarea': {
                                      paddingRight: '16px',
                                      '&::-webkit-scrollbar': {
                                        width: '8px',
                                        height: '8px'
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        background: 'transparent'
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        background: theme.palette.mode === 'dark' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '100px',
                                        border: '2px solid transparent',
                                        backgroundClip: 'padding-box',
                                        '&:hover': {
                                          background: theme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.2)' 
                                            : 'rgba(0, 0, 0, 0.2)',
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        {section.id === 'section-prompts' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <PromptTemplates
                              onPromptChange={(questionPrompt, answerPrompt) => {
                                setPromptQuestion(questionPrompt);
                                setPromptAnswer(answerPrompt);
                              }}
                              initialQuestionPrompt={promptQuestion}
                              initialAnswerPrompt={promptAnswer}
                              isProcessingImages={processImages}
                              onImagePromptChange={(questionPrompt, answerPrompt) => {
                                setImagePromptQuestion(questionPrompt);
                                setImagePromptAnswer(answerPrompt);
                              }}
                              initialImageQuestionPrompt={imagePromptQuestion}
                              initialImageAnswerPrompt={imagePromptAnswer}
                            />
                          </Box>
                        )}
                        {section.id === 'section-chunking' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1 
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                    Chunking Algorithm
                                  </Typography>
                                  <Tooltip title="Choose how to split your document into chunks. 'Sentence Chunks' splits by sentences and combines them into token-sized chunks. 'Markdown Chunks' splits by markdown headers. 'Rolling Sentence Chunks' creates overlapping chunks with surrounding context." placement="right">
                                    <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                      <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              <TextField
                                select
                                fullWidth
                                value={chunkingAlgorithm}
                                onChange={(e) => setChunkingAlgorithm(e.target.value as ChunkingAlgorithm)}
                                className="no-drag"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem'
                                  }
                                }}
                              >
                                <MenuItem value="recursive">Recursive Character Splitter</MenuItem>
                                <MenuItem value="line">Line by Line</MenuItem>
                                <MenuItem value="csv-tsv">CSV/TSV Parser</MenuItem>
                                <MenuItem value="jsonl">JSONL Parser</MenuItem>
                                <MenuItem value="sentence-chunks">Sentence Chunks</MenuItem>
                                <MenuItem value="markdown-chunks">Markdown Chunks</MenuItem>
                                <MenuItem value="rolling-sentence-chunks">Rolling Sentence Chunks</MenuItem>
                              </TextField>
                            </Box>

                            {(chunkingAlgorithm === 'recursive' || chunkingAlgorithm === 'sentence-chunks') && (
                              <>
                                <Box sx={{ mb: 2 }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1 
                                  }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                        {chunkingAlgorithm === 'recursive' ? 'Chunk Size (characters)' : 'Chunk Size (tokens)'}
                                      </Typography>
                                      <Tooltip title={chunkingAlgorithm === 'recursive' 
                                        ? "The size of each text chunk in characters. Larger chunks provide more context but may be harder to process. Recommended range: 200-1000." 
                                        : "The size of each text chunk in tokens (approx. 4 characters per token). Recommended range: 50-250."} 
                                        placement="right">
                                        <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                          <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>
                                  <TextField
                                    type="number"
                                    fullWidth
                                    value={chunkSize}
                                    onChange={(e) => setChunkSize(Number(e.target.value))}
                                    className="no-drag"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        fontSize: '0.875rem'
                                      }
                                    }}
                                  />
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1 
                                  }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                        {chunkingAlgorithm === 'recursive' ? 'Overlap (characters)' : 'Overlap (tokens)'}
                                      </Typography>
                                      <Tooltip title={chunkingAlgorithm === 'recursive'
                                        ? "The number of characters that overlap between consecutive chunks. This helps maintain context across chunk boundaries. Recommended: 10-20% of chunk size."
                                        : "The number of tokens that overlap between consecutive chunks. This helps maintain context across chunk boundaries. Recommended: 10-20% of chunk size."} 
                                        placement="right">
                                        <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                          <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>
                                  <TextField
                                    type="number"
                                    fullWidth
                                    value={chunkOverlap}
                                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                                    className="no-drag"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        fontSize: '0.875rem'
                                      }
                                    }}
                                  />
                                </Box>
                              </>
                            )}

                            {chunkingAlgorithm === 'rolling-sentence-chunks' && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  mb: 1 
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                      Window Size
                                    </Typography>
                                    <Tooltip title="The number of sentences to include before and after each sentence. A window size of 1 produces chunks with 3 sentences (1 before, current, 1 after). A window size of 2 produces chunks with 5 sentences (2 before, current, 2 after)." placement="right">
                                      <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                        <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                <TextField
                                  type="number"
                                  fullWidth
                                  value={windowSize}
                                  onChange={(e) => setWindowSize(Number(e.target.value))}
                                  className="no-drag"
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: '8px',
                                      fontSize: '0.875rem'
                                    }
                                  }}
                                />
                              </Box>
                            )}

                            {chunkingAlgorithm === 'csv-tsv' && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  mb: 1 
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                      CSV/TSV Columns
                                    </Typography>
                                    <Tooltip title="Select which columns to include in the chunks. Each chunk will contain the selected columns from one row." placement="right">
                                      <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                        <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                <Paper variant="outlined" sx={{ 
                                  p: 1.5,
                                  borderRadius: '8px',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                                  border: '1px solid',
                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                }}>
                                  {csvColumns.length > 0 ? (
                                    <Box sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 1,
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      '&::-webkit-scrollbar': {
                                        width: '8px',
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        background: theme.palette.mode === 'dark' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '4px',
                                      },
                                    }}>
                                      {csvColumns.map((column, index) => (
                                        <Box 
                                          key={column.name} 
                                          sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            p: 0.5,
                                            borderRadius: '4px',
                                            '&:hover': {
                                              bgcolor: theme.palette.mode === 'dark' 
                                                ? 'rgba(255, 255, 255, 0.05)' 
                                                : 'rgba(0, 0, 0, 0.05)',
                                            }
                                          }}
                                        >
                                          <Checkbox
                                            size="small"
                                            checked={column.selected}
                                            onChange={(e) => {
                                              const newColumns = [...csvColumns];
                                              newColumns[index] = { ...column, selected: e.target.checked };
                                              setCsvColumns(newColumns);
                                            }}
                                            sx={{
                                              p: 0.5,
                                              color: theme.palette.mode === 'dark' 
                                                ? alpha(theme.palette.common.white, 0.3)
                                                : alpha(theme.palette.common.black, 0.2),
                                              '&.Mui-checked': {
                                                color: theme.palette.primary.main,
                                              },
                                            }}
                                          />
                                          <Typography 
                                            variant="body2" 
                                            sx={{ 
                                              ml: 1,
                                              fontSize: '0.875rem',
                                              color: theme.palette.text.primary,
                                              flexGrow: 1,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}
                                          >
                                            {column.name}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                      Upload a CSV/TSV file to see columns
                                    </Typography>
                                  )}
                                </Paper>
                              </Box>
                            )}
                            
                            {chunkingAlgorithm === 'jsonl' && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  mb: 1 
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                      JSONL Keys
                                    </Typography>
                                    <Tooltip title="Select which keys to include in the chunks. Each chunk will contain the selected keys from one JSON object. Nested keys are shown in a tree structure." placement="right">
                                      <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                        <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                <Paper variant="outlined" sx={{ 
                                  p: 1.5,
                                  borderRadius: '8px',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                                  border: '1px solid',
                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                }}>
                                  {jsonlKeys.length > 0 ? (
                                    <Box sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.5,
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      '&::-webkit-scrollbar': {
                                        width: '8px',
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        background: theme.palette.mode === 'dark' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : 'rgba(0, 0, 0, 0.1)',
                                        borderRadius: '4px',
                                      },
                                    }}>
                                      {jsonlKeys.map((key) => (
                                        <Box 
                                          key={key.path} 
                                          sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            p: 0.5,
                                            pl: key.level * 1.5 + 0.5, // Indent based on level
                                            borderRadius: '4px',
                                            '&:hover': {
                                              bgcolor: theme.palette.mode === 'dark' 
                                                ? 'rgba(255, 255, 255, 0.05)' 
                                                : 'rgba(0, 0, 0, 0.05)',
                                            }
                                          }}
                                        >
                                          <Checkbox
                                            size="small"
                                            checked={key.selected}
                                            onChange={(e) => {
                                              const isSelected = e.target.checked;
                                              
                                              // Create a new array with the updated selection
                                              const updatedKeys = jsonlKeys.map(k => {
                                                // If this is the key being changed, update its selection
                                                if (k.path === key.path) {
                                                  return { ...k, selected: isSelected };
                                                }
                                                
                                                // For parent keys, if we're selecting a child, make sure the parent is selected
                                                if (key.path.startsWith(k.path + '.') && isSelected && k.path !== key.path) {
                                                  return { ...k, selected: true };
                                                }
                                                
                                                // For child keys, if we're deselecting a parent, deselect all children
                                                if (k.path.startsWith(key.path + '.') && !isSelected) {
                                                  return { ...k, selected: false };
                                                }
                                                
                                                // Otherwise, keep the key as is
                                                return k;
                                              });
                                              
                                              setJsonlKeys(updatedKeys);
                                            }}
                                            sx={{
                                              color: theme.palette.mode === 'dark' 
                                                ? 'rgba(255, 255, 255, 0.7)' 
                                                : 'rgba(0, 0, 0, 0.6)',
                                              '&.Mui-checked': {
                                                color: theme.palette.primary.main,
                                              },
                                            }}
                                          />
                                          {key.hasChildren && (
                                            <Box 
                                              component="span" 
                                              sx={{ 
                                                mr: 0.5, 
                                                color: theme.palette.text.secondary,
                                                fontSize: '0.75rem',
                                                width: '16px',
                                                display: 'inline-flex',
                                                justifyContent: 'center'
                                              }}
                                            >
                                              {key.selected ? '▼' : '▶'}
                                            </Box>
                                          )}
                                          {!key.hasChildren && (
                                            <Box 
                                              component="span" 
                                              sx={{ 
                                                mr: 0.5, 
                                                width: '16px' 
                                              }}
                                            />
                                          )}
                                          <Typography 
                                            variant="body2" 
                                            sx={{ 
                                              ml: 0.5,
                                              fontSize: '0.875rem',
                                              color: key.hasChildren 
                                                ? theme.palette.primary.main
                                                : theme.palette.text.primary,
                                              fontWeight: key.hasChildren ? 600 : 400,
                                              flexGrow: 1,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              display: 'flex',
                                              alignItems: 'center'
                                            }}
                                          >
                                            {key.name}
                                            {key.isArray && (
                                              <Box 
                                                component="span" 
                                                sx={{ 
                                                  ml: 1,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '0.7rem',
                                                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                                                  border: '1px solid',
                                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                                                  borderRadius: '4px',
                                                  padding: '0px 4px',
                                                  height: '16px'
                                                }}
                                              >
                                                [ ]
                                              </Box>
                                            )}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                      Upload a JSONL file to see keys
                                    </Typography>
                                  )}
                                </Paper>
                              </Box>
                            )}

                            <Button
                              variant="contained"
                              fullWidth
                              color="primary"
                              startIcon={<ExtensionIcon />}
                              onClick={handleChunkDoc}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 500,
                                boxShadow: 'none',
                                '&:hover': {
                                  boxShadow: 'none'
                                }
                              }}
                            >
                              Chunk Document
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                </Box>
              ))}
            </ListContext.Provider>
          </Box>

          {/* Resize Handle */}
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            right: -3,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 2,
            visibility: isSidebarCollapsed ? 'hidden' : 'visible',
            userSelect: 'none',
            '&:hover': {
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 2,
                height: '100%',
                backgroundColor: theme.palette.primary.main,
                opacity: 0.3,
                transform: 'translateX(-50%)',
                transition: 'opacity 0.2s ease'
              }
            },
            '&:active': {
              '&::after': {
                opacity: 0.5,
              }
            }
          }}
          onMouseDown={() => setIsResizing(true)}
          />
        </Box>

        {/* Main Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          bgcolor: 'transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <Paper sx={(theme) => ({ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: theme.palette.background.paper,
            overflow: 'hidden',
            borderRadius: 0,
          })}>
            <Box sx={(theme) => ({ 
              p: 1.5,
              borderBottom: 1, 
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.mode === 'dark'
                ? '#1A1C1E'
                : '#F5F2ED',
            })}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 28,  // Reduced from 40
                gap: 2
              }}>
                {/* Left section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    sx={{
                      width: 28,  // Reduced from 34
                      height: 28,  // Reduced from 34
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.08)',
                      }
                    }}
                  >
                    {isSidebarCollapsed ? <LastPageIcon /> : <FirstPageIcon />}
                  </IconButton>

                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.15)',
                  }}>
                    <Tooltip title={isTableView(viewMode) ? 
                      "Switch to card view. If items are selected, the first selected card will be shown." : 
                      "Switch to table view to see all items in a list"}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleViewModeToggle}
                        startIcon={isTableView(viewMode) ? <StyleIcon /> : <ViewColumnIcon />}
                        sx={{
                          height: 26,
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                          minWidth: 0,
                          px: 1.5,
                          color: theme.palette.text.primary,
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.05)',
                          }
                        }}
                      >
                        {isTableView(viewMode) ? 'Cards' : 'Table'}
                      </Button>
                    </Tooltip>
                  </Box>

                  {/* Generation actions group */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.15)',
                  }}>
                    <Tooltip title={isGenerating && generationType === 'qa' ? 
                      "Stop the current Q&A generation" :
                      isFlashcardView(viewMode) ? 
                        "Generate both question and answer for the current card" :
                        "Generate questions and answers for all selected items"}>
                      <span>
                        <Button
                          variant={isGenerating && generationType === 'qa' ? "contained" : "text"}
                          color={isGenerating && generationType === 'qa' ? "error" : "primary"}
                          startIcon={isGenerating && generationType === 'qa' ? <StopIcon /> : <AutoAwesomeIcon />}
                          onClick={isFlashcardView(viewMode) ? () => handleSingleCardGenerate(qaPairs[currentIndex].id) : handleGenerateQA}
                          disabled={!ollamaSettings.model || qaPairs.length === 0 || (isGenerating && generationType !== 'qa')}
                          sx={{
                            height: 26,  // Reduced from 32
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: isGenerating && generationType === 'qa' ? '0.75rem' : '0.875rem',
                            borderRadius: '4px',
                            minWidth: isGenerating && generationType === 'qa' ? 130 : 0,
                            px: 1.5,
                            color: isGenerating && generationType === 'qa' 
                              ? theme.palette.mode === 'dark' ? '#fff' : '#000'  // Keep stop state colors
                              : theme.palette.mode === 'dark' 
                                ? '#90CAF9'  // Bright blue for dark mode
                                : '#2196F3',  // Bright blue for light mode
                            bgcolor: isGenerating && generationType === 'qa'
                              ? undefined  // Keep stop state background
                              : 'transparent',  // No initial background
                            '&:hover': {
                              bgcolor: isGenerating && generationType === 'qa'
                                ? theme.palette.error.dark  // Keep stop state hover
                                : theme.palette.mode === 'dark' 
                                  ? alpha('#90CAF9', 0.2)  // Brighter blue hover in dark mode
                                  : alpha('#2196F3', 0.15),  // Brighter blue hover in light mode
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'inherit'
                            }
                          }}
                        >
                          {isGenerating && generationType === 'qa' 
                            ? `Stop (${generationProgress.completed}/${generationProgress.total})`
                            : 'Q&A'}
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip title={isGenerating && generationType === 'question' ? 
                      "Stop the current question generation" :
                      isFlashcardView(viewMode) ? 
                        "Generate a question for the current card" :
                        "Generate questions for all selected items"}>
                      <span>
                        <Button
                          variant={isGenerating && generationType === 'question' ? "contained" : "text"}
                          color={isGenerating && generationType === 'question' ? "error" : "secondary"}
                          startIcon={isGenerating && generationType === 'question' ? <StopIcon /> : <HelpOutlineIcon />}
                          onClick={isFlashcardView(viewMode) 
                            ? () => handleSingleCardGenerateQuestion(qaPairs[currentIndex].id) 
                            : handleGenerateQuestion}
                          disabled={!ollamaSettings.model || qaPairs.length === 0 || (isGenerating && generationType !== 'question')}
                          sx={{
                            height: 26,  // Reduced from 32
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: isGenerating && generationType === 'question' ? '0.75rem' : '0.875rem',
                            borderRadius: '4px',
                            minWidth: isGenerating && generationType === 'question' ? 130 : 0,
                            px: 1.5,
                            color: isGenerating && generationType === 'question'
                              ? theme.palette.mode === 'dark' ? '#fff' : '#000'  // White in dark mode, black in light mode for stop state
                              : theme.palette.mode === 'dark' 
                                ? theme.palette.secondary.light
                                : theme.palette.secondary.dark,
                            '&:hover': {
                              bgcolor: isGenerating && generationType === 'question'
                                ? theme.palette.error.dark  // Darker red when hovering in stop state
                                : theme.palette.mode === 'dark' 
                                  ? alpha(theme.palette.secondary.main, 0.15)
                                  : alpha(theme.palette.secondary.main, 0.12),
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'inherit'
                            }
                          }}
                        >
                          {isGenerating && generationType === 'question' 
                            ? `Stop (${generationProgress.completed}/${generationProgress.total})`
                            : 'Question'}
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip title={isGenerating && generationType === 'answer' ? 
                      "Stop the current answer generation" :
                      isFlashcardView(viewMode) ? 
                        "Generate an answer for the current card" :
                        "Generate answers for all selected items"}>
                      <span>
                        <Button
                          variant={isGenerating && generationType === 'answer' ? "contained" : "text"}
                          color={isGenerating && generationType === 'answer' ? "error" : "success"}
                          startIcon={isGenerating && generationType === 'answer' ? <StopIcon /> : <LightbulbOutlinedIcon />}
                          onClick={isFlashcardView(viewMode) 
                            ? () => handleSingleCardGenerateAnswer(qaPairs[currentIndex].id) 
                            : handleGenerateAnswer}
                          disabled={!ollamaSettings.model || qaPairs.length === 0 || (isGenerating && generationType !== 'answer')}
                          sx={{
                            height: 26,  // Reduced from 32
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: isGenerating && generationType === 'answer' ? '0.75rem' : '0.875rem',
                            borderRadius: '4px',
                            minWidth: isGenerating && generationType === 'answer' ? 130 : 0,
                            px: 1.5,
                            color: isGenerating && generationType === 'answer'
                              ? theme.palette.mode === 'dark' ? '#fff' : '#000'  // White in dark mode, black in light mode for stop state
                              : theme.palette.mode === 'dark' 
                                ? theme.palette.success.light
                                : theme.palette.success.dark,
                            '&:hover': {
                              bgcolor: isGenerating && generationType === 'answer'
                                ? theme.palette.error.dark  // Darker red when hovering in stop state
                                : theme.palette.mode === 'dark' 
                                  ? alpha(theme.palette.success.main, 0.15)
                                  : alpha(theme.palette.success.main, 0.12),
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'inherit'
                            }
                          }}
                        >
                          {isGenerating && generationType === 'answer' 
                            ? `Stop (${generationProgress.completed}/${generationProgress.total})`
                            : 'Answer'}
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>

                  {/* Row editing actions group */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.15)',
                  }}>
                    <Tooltip title="Add a new empty row. If items are selected, adds after the last selected item">
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleAddEmpty}
                        startIcon={<AddIcon />}
                        sx={{
                          height: 26,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                          minWidth: 0,
                          px: 1.5,
                          color: theme.palette.mode === 'dark' 
                            ? '#90CAF9'  // Bright blue for dark mode
                            : '#2196F3',  // Bright blue for light mode
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? alpha('#90CAF9', 0.15)
                              : alpha('#2196F3', 0.08)
                          }
                        }}
                      >
                        Add
                      </Button>
                    </Tooltip>

                    <Tooltip title={isTableView(viewMode) ? 
                      "Duplicate selected items" : 
                      "Duplicate current card"}>
                      <span>
                        <Button
                          size="small"
                          variant="text"
                          onClick={handleDuplicate}
                          disabled={isTableView(viewMode) ? !qaPairs.some(qa => qa.selected) : qaPairs.length === 0}
                          startIcon={<ContentCopyIcon />}
                          sx={{
                            height: 26,
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                            minWidth: 0,
                            px: 1.5,
                            color: theme.palette.mode === 'dark' 
                              ? theme.palette.warning.light
                              : theme.palette.warning.main,
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(theme.palette.warning.main, 0.08)
                            },
                            '&.Mui-disabled': {
                              color: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.warning.light, 0.3)
                                : alpha(theme.palette.warning.main, 0.3)
                            }
                          }}
                        >
                          Duplicate
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip title={isTableView(viewMode) ? 
                      "Delete selected items" : 
                      "Delete current card"}>
                      <span>
                        <Button
                          size="small"
                          variant="text"
                          onClick={handleDeleteSelected}
                          disabled={viewMode === 'table' ? !qaPairs.some(qa => qa.selected) : qaPairs.length === 0}
                          startIcon={<DeleteIcon />}
                          sx={{
                            height: 26,
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                            minWidth: 0,
                            px: 1.5,
                            color: theme.palette.mode === 'dark' 
                              ? theme.palette.error.light
                              : theme.palette.error.main,
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.error.main, 0.15)
                                : alpha(theme.palette.error.main, 0.08)
                            },
                            '&.Mui-disabled': {
                              color: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.error.light, 0.3)
                                : alpha(theme.palette.error.main, 0.3)
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'inherit'
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Right section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.15)',
                  }}>
                    <Tooltip title="Import a CSV file. You can choose to replace all existing items or append to them">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        startIcon={<UploadIcon />}
                        sx={{
                          height: 26,
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                          minWidth: 0,
                          px: 1.5,
                          color: theme.palette.text.primary,
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.05)',
                          }
                        }}
                      >
                        Import
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          style={{ display: 'none' }}
                          onChange={handleImportCSV}
                        />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Export all Q&A pairs with custom format options (CSV or JSONL)">
                      <span>
                        <Button
                          size="small"
                          variant="text"
                          onClick={handleExportCSV}
                          disabled={qaPairs.length === 0}
                          startIcon={<SaveAltIcon />}
                          sx={{
                            height: 26,
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                            minWidth: 0,
                            px: 1.5,
                            color: theme.palette.text.primary,
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.05)',
                            }
                          }}
                        >
                          Export
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                  <Tooltip title={`Switch to ${theme.palette.mode === 'dark' ? 'light' : 'dark'} mode`}>
                    <IconButton
                      size="small"
                      onClick={onThemeChange}
                      sx={{
                        width: 34,
                        height: 34,
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.08)',
                        }
                      }}
                    >
                      {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>

            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0 // This is important for flex child scrolling
            }}>
              {isTableView(viewMode) ? (
                <TableView
                  qaPairs={qaPairs}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  availableRowsPerPage={availableRowsPerPage}
                  expandedCells={expandedCells}
                  isGenerating={isGenerating}
                  generationType={generationType}
                  generationProgress={generationProgress}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                  }}
                  onRowsPerPageChange={(newRowsPerPage) => {
                    setRowsPerPage(newRowsPerPage);
                    setPage(0);
                  }}
                  onToggleCellExpansion={toggleCellExpansion}
                  onQAPairChange={setQaPairs}
                  onSelectRow={(rowId, selected) => {
                    setQaPairs((prev) =>
                      prev.map((row) =>
                        row.id === rowId ? { ...row, selected } : row
                      )
                    );
                  }}
                  onSelectAllRows={(selected) => {
                    setQaPairs(prev => prev.map(row => ({ ...row, selected })));
                  }}
                  isCellGenerating={isCellGenerating}
                />
              ) : (
                <>
                  {/* Add navigation controls above the flashcard view */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    py: 1.5,  // Reduced from py: 2
                    borderBottom: 1,
                    borderColor: theme.palette.divider,
                    mx: 'auto',  // Center the box horizontally
                    width: '100%',  // Take full width to ensure proper centering
                  }}>
                    <CardNavigation 
                      currentIndex={currentIndex}
                      totalCards={qaPairs.length}
                      onCardChange={handleCardChange}
                    />
                  </Box>
                  <FlashcardView
                    qaPairs={qaPairs}
                    onUpdateQA={handleUpdateQA}
                    currentIndex={currentIndex}
                    chunkingAlgorithm={chunkingAlgorithm}
                  />
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
      {/* Add back the OllamaConnectionModal */}
      <OllamaConnectionModal
        open={showConnectionModal}
        onClose={() => isOllamaConnected && setShowConnectionModal(false)}
        isConnected={isOllamaConnected}
        error={ollamaError?.message}
      />
      <CustomAboutDialog 
        open={showAboutDialog} 
        onClose={() => setShowAboutDialog(false)} 
      />
      <ImportConfirmationDialog 
        open={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setPendingImportFile(null);
        }}
        onExport={handleExportCSV}
        onReplace={(file: File | null) => {
          // First process the file, then close dialog
          if (file) {
            // Use a copy to ensure we don't lose the file reference
            const fileCopy = file;
            // Pass true for fromDialog parameter to prevent showing dialog again
            handleImportCSV(fileCopy, 'replace', true);
          }
          // Close dialog after processing
          setShowImportDialog(false);
          setPendingImportFile(null);
        }}
        onAppend={(file: File | null) => {
          // First process the file, then close dialog
          if (file) {
            // Use a copy to ensure we don't lose the file reference
            const fileCopy = file;
            // Pass true for fromDialog parameter to prevent showing dialog again
            handleImportCSV(fileCopy, 'append', true);
          }
          // Close dialog after processing
          setShowImportDialog(false);
          setPendingImportFile(null);
        }}
        pendingImportFile={pendingImportFile}
      />
      <ChunkingConfirmationDialog 
        open={showChunkingDialog}
        onClose={() => {
          setShowChunkingDialog(false);
          setPendingChunks([]);
        }}
        onReplace={(chunks: string[]) => {
          // Replace existing chunks with new ones
          const newPairs = chunks.map((chunk, idx) => ({
            id: idx + 1,
            context: chunk,
            question: '',
            answer: '',
            selected: false,
            generating: {
              question: false,
              answer: false
            }
          }));
          setQaPairs(newPairs);
          
          // Auto-expand cells with images
          const newExpandedCells: Record<string, boolean> = {};
          newPairs.forEach((pair) => {
            if (pair.context.includes('<div class="pdf-page-image">')) {
              newExpandedCells[`${pair.id}-context`] = true;
            }
          });
          setExpandedCells(newExpandedCells);
          
          setShowChunkingDialog(false);
          setPendingChunks([]);
        }}
        onAppend={(chunks: string[]) => {
          // Append new chunks to existing ones
          const lastId = Math.max(...qaPairs.map(qa => typeof qa.id === 'string' ? parseInt(qa.id, 10) : Number(qa.id)));
          const newPairs = chunks.map((chunk, idx) => ({
            id: lastId + idx + 1,
            context: chunk,
            question: '',
            answer: '',
            selected: false,
            generating: {
              question: false,
              answer: false
            }
          }));
          setQaPairs(prev => [...prev, ...newPairs]);
          
          // Auto-expand cells with images
          const newExpandedCells: Record<string, boolean> = { ...expandedCells };
          newPairs.forEach((pair) => {
            if (pair.context.includes('<div class="pdf-page-image">')) {
              newExpandedCells[`${pair.id}-context`] = true;
            }
          });
          setExpandedCells(newExpandedCells);
          
          setShowChunkingDialog(false);
          setPendingChunks([]);
        }}
        pendingChunks={pendingChunks}
      />
      {/* Export options dialog */}
      <ExportOptionsDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportWithOptions}
        onShuffle={shuffleQAPairs}
        qaPairs={qaPairs}
        ollamaSettings={ollamaSettings}
      />

      {/* Extracted Images Display */}
      {extractedImages.length > 0 && (
        <Paper 
          elevation={2} 
          sx={{ 
            mt: 4, 
            p: 3, 
            borderRadius: '12px',
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Extracted Images ({extractedImages.length})
            </Typography>
            <Button 
              onClick={() => setExtractedImages([])} 
              color="error" 
              size="small" 
              startIcon={<DeleteIcon />}
            >
              Clear Images
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {extractedImages.map((img, index) => (
              <Box 
                key={index} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  width: 200,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <img 
                  src={img.dataUrl} 
                  alt={img.name} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: 200,
                    objectFit: 'contain' 
                  }} 
                />
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                    {img.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      fullWidth
                      onClick={() => {
                        // Create a temporary link and trigger download
                        const link = document.createElement('a');
                        link.href = img.dataUrl;
                        link.download = img.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Main Content Sections */}
      <Box sx={{ mt: 4 }}>
        {/* Add your existing content here */}
      </Box>
    </Box>
  );
};

export default App

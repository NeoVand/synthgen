import React, { useState, useCallback, useEffect, createContext, useMemo, useRef } from 'react'
import {
  Typography,
  Paper,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Box,
  IconButton,
  Collapse,
  useTheme,
  alpha,
  Tooltip,
  MenuItem,
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
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ErrorIcon from '@mui/icons-material/Error';

// PDFJS
import * as PDFJS from 'pdfjs-dist'
const { getDocument, GlobalWorkerOptions } = PDFJS;
// Update worker path to use the correct path in both dev and prod
GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.mjs`
// DOCX
import { renderAsync } from 'docx-preview'

import OllamaSettings from './components/OllamaSettings'
import FlashcardView from './components/FlashcardView'

// --- Types ---
type Edge = 'top' | 'bottom' | 'left' | 'right';

interface QAPair {
  id: number
  context: string
  question: string
  answer: string
  selected?: boolean
  generating?: {
    question: boolean
    answer: boolean
  }
}

interface OllamaSettingsType {
  model: string
  temperature: number
  topP: number
  useFixedSeed: boolean
  seed: number
  numCtx: number
}

interface AppProps {
  onThemeChange: () => void;
}

interface Section {
  id: string;
  title: string;
  icon?: React.ReactNode;
  description: string;
}

type SectionEntry = { sectionId: string; element: HTMLElement };

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

// Add these style constants at the top of the file
const GLASS_EFFECT_LIGHT = {
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(20px)',
  border: 'none',
  boxShadow: 'none',
};

const GLASS_EFFECT_DARK = {
  backgroundColor: 'rgba(20, 24, 33, 0.6)',
  backdropFilter: 'blur(20px)',
  border: 'none',
  boxShadow: 'none',
};

// Add type for chunking algorithms
type ChunkingAlgorithm = 'recursive' | 'line' | 'line-with-header';

// Add these new types and constants
interface OllamaError {
  message: string;
  isOllamaError: boolean;
}

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Add a helper function to check Ollama connection
const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

const App: React.FC<AppProps> = ({ onThemeChange }: AppProps) => {
  // Add error state
  const [ollamaError, setOllamaError] = useState<OllamaError | null>(null);

  // Add useEffect to check Ollama connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkOllamaConnection();
      if (!isConnected) {
        setOllamaError({
          message: "Cannot connect to Ollama. Please make sure Ollama is running on your machine.",
          isOllamaError: true
        });
      } else {
        setOllamaError(null);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // 1. Model Settings
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettingsType>({
    model: '',
    temperature: 0.7,
    topP: 0.9,
    useFixedSeed: false,
    seed: 42,
    numCtx: 2048,
  })

  // Pagination state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [availableRowsPerPage] = useState<number[]>([5, 10, 25, 50]);

  // Document text + file name
  const [rawText, setRawText] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  // Summarization
  const [summaryPrompt, setSummaryPrompt] = useState<string>(
    'Please provide a concise summary of the following content:'
  )
  const [docSummary, setDocSummary] = useState<string>('')

  // Q&A prompts
  const [promptQuestion, setPromptQuestion] = useState<string>(
    "Please read the following text (and summary) and create a single  and short and relevant question related to the text. Don't add any markdown or greetings. Only the question."
  )
  const [promptAnswer, setPromptAnswer] = useState<string>(
    "Based on the text (and summary) plus the question, provide a concise answer. Don't add any markdown or greetings. Only the Answer."
  )

  // Q&A table
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])

  // States for chunking
  const [chunkSize, setChunkSize] = useState<number>(500)
  const [chunkOverlap, setChunkOverlap] = useState<number>(0)
  const [chunkingAlgorithm, setChunkingAlgorithm] = useState<ChunkingAlgorithm>('recursive')

  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const theme = useTheme();

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
  const [generationType, setGenerationType] = useState<'summary' | 'qa' | null>(null)

  // Add state for sidebar
  const [sidebarWidth, setSidebarWidth] = useState<number>(400);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Add this with other state declarations
  const [currentIndex, setCurrentIndex] = useState<number>(0);

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
        textContent = await parsePdfFile(file)
      } else if (ext === 'docx') {
        textContent = await parseDocxFile(file)
      } else {
        // CSV or TXT
        textContent = await file.text()
      }
      setRawText(textContent)
      // Clear existing summary & Q&A
      setDocSummary('')
      setQaPairs([])
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
    return container.innerText || ''
  }

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

    if (!rawText.trim()) {
      alert('No document text found. Please upload a file first.')
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
      const prompt = `${summaryPrompt}\n\n${rawText}`;

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
    setQaPairs([]) // reset
    try {
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

        case 'line-with-header':
          const lines = rawText.split('\n').filter(line => line.trim());
          if (lines.length === 0) break;
          
          // First line is the header
          const header = lines[0];
          // Rest are content lines
          const contentLines = lines.slice(1);
          
          // For each content line, combine with header
          chunks = contentLines.map(line => `${header}\n${line}`);
          break;
      }

      const pairs: QAPair[] = chunks.map((ck, idx) => ({
        id: idx + 1,
        context: ck,
        question: '',
        answer: '',
      }))
      setQaPairs(pairs)
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
    debounce((id: number, updates: Partial<QAPair>) => {
      setQaPairs(prev =>
        prev.map(qa =>
          qa.id === id ? { ...qa, ...updates } : qa
        )
      );
    }, 100),
    []
  );

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
      
      response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaSettings.model,
          prompt: prompt,
          stream: true,
          options: {
            temperature: ollamaSettings.temperature,
            top_p: ollamaSettings.topP,
            seed: ollamaSettings.useFixedSeed ? ollamaSettings.seed : undefined,
            num_ctx: ollamaSettings.numCtx,
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
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

  const generateQA = async (row: QAPair) => {
    let questionText = '';
    let answerText = '';

    // Set initial generating state
    setQaPairs(prev =>
      prev.map(r =>
        r.id === row.id ? { ...r, generating: { question: true, answer: false } } : r
      )
    );

    try {
      // Generate question
      const questionPrompt = `${promptQuestion}\n\nSummary:\n${docSummary}\n\nChunk:\n${row.context}`;
      for await (const chunk of doStreamCall(questionPrompt)) {
        if (shouldStopGeneration) break;
        questionText += chunk;
        debouncedUpdateQaPairs(row.id, { question: questionText });
      }

      if (shouldStopGeneration) return;

      // Update question and set answer generating state
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? { ...r, question: questionText, generating: { question: false, answer: true } } : r
        )
      );

      // Generate answer
      const answerPrompt = `${promptAnswer}\nSummary:\n${docSummary}\nChunk:\n${row.context}\nQuestion:\n${questionText}`;
      for await (const chunk of doStreamCall(answerPrompt)) {
        if (shouldStopGeneration) break;
        answerText += chunk;
        debouncedUpdateQaPairs(row.id, { answer: answerText });
      }

      // Final update
      setQaPairs(prev =>
        prev.map(r =>
          r.id === row.id ? {
            ...r,
            question: questionText,
            answer: answerText,
            generating: { question: false, answer: false }
          } : r
        )
      );
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        throw err;
      }
      console.error('Error generating Q&A:', err);
    }
  };

  const handleGenerate = async () => {
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

    if (viewMode === 'flashcard') {
      const currentQA = qaPairs[currentIndex];
      if (currentQA) {
        await generateQA(currentQA);
      }
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

    try {
      for (let i = 0; i < rowsToProcess.length; i++) {
        if (shouldStopGeneration) break;
        const row = rowsToProcess[i];
        await generateQA(row);
      }
    } catch (err) {
      console.error('Error in generation process:', err);
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
  // 6. Delete / Generate
  //------------------------------------------------------------------------------------
  const handleDeleteSelected = () => {
    if (viewMode === 'flashcard') {
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
  // 7. Export CSV
  //------------------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (qaPairs.length === 0) {
      alert('No Q&A to export!')
      return
    }
    let csv = 'context,question,answer\n'
    qaPairs.forEach((qa) => {
      const c = qa.context.replace(/"/g, '""')
      const q = qa.question.replace(/"/g, '""')
      const a = qa.answer.replace(/"/g, '""')
      csv += `"${c}","${q}","${a}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'qa_dataset.csv')
  }

  // Helper to toggle cell expansion
  const toggleCellExpansion = useCallback((rowId: number, columnType: string) => {
    setExpandedCells(prev => {
      const newState = { ...prev };
      const key = `${rowId}-${columnType}`;
      newState[key] = !prev[key];
      return newState;
    });
  }, []);


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

  // Add this new state for view mode
  const [viewMode, setViewMode] = useState<'table' | 'flashcard'>('table');

  // Effect to handle currentIndex changes
  useEffect(() => {
    if (currentIndex >= qaPairs.length) {
      setCurrentIndex(Math.max(0, qaPairs.length - 1));
    }
  }, [qaPairs.length, currentIndex]);

  const handleViewModeToggle = () => {
    const newMode = viewMode === 'table' ? 'flashcard' : 'table';
    
    if (newMode === 'flashcard') {
      const selectedQaPairs = qaPairs.filter(qa => qa.selected);
      if (selectedQaPairs.length > 0) {
        const selectedIndex = qaPairs.findIndex(qa => qa.id === selectedQaPairs[0].id);
        setCurrentIndex(selectedIndex);
      }
    }
    
    setViewMode(newMode);
  };

  const handleUpdateQA = (updatedQA: QAPair) => {
    setQaPairs(prev => prev.map(qa => qa.id === updatedQA.id ? updatedQA : qa));
  };

  const handleSingleCardGenerate = async (cardId: number) => {
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
          if (shouldStopGeneration) {
            throw new Error('AbortError');
          }
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

  // Add this component for the card navigation
  const CardNavigation: React.FC<{
    currentIndex: number;
    totalCards: number;
    onCardChange: (index: number) => void;
  }> = ({ currentIndex, totalCards, onCardChange }) => {
    const theme = useTheme();
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
      }}>
        <Tooltip title={currentIndex > 0 ? "Previous card" : "No previous card"}>
          <span>
            <IconButton 
              onClick={() => onCardChange(currentIndex - 1)} 
              disabled={currentIndex <= 0}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>
          </span>
        </Tooltip>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1,
        }}>
          <TextField
            size="small"
            value={currentIndex + 1}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 1 && value <= totalCards) {
                onCardChange(value - 1);
              }
            }}
            inputProps={{
              style: { 
                textAlign: 'center',
                padding: '4px 8px',
                width: '40px'
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                fontSize: '0.875rem',
              }
            }}
          />
          <Typography variant="body2" color="text.secondary">
            / {totalCards}
          </Typography>
        </Box>

        <Tooltip title={currentIndex < totalCards - 1 ? "Next card" : "No more cards"}>
          <span>
            <IconButton 
              onClick={() => onCardChange(currentIndex + 1)} 
              disabled={currentIndex >= totalCards - 1}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <NavigateNextIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  // Add this new function to handle creating empty rows/cards
  const handleAddEmpty = () => {
    const newId = qaPairs.length > 0 ? Math.max(...qaPairs.map(qa => qa.id)) + 1 : 1;
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
    setQaPairs(prev => [...prev, newQA]);
    if (viewMode === 'flashcard') {
      setCurrentIndex(qaPairs.length); // Move to the new card
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
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#F0F4F8',
      backgroundImage: theme.palette.mode === 'dark' 
        ? 'none'
        : 'linear-gradient(120deg, #F0F4F8 0%, #E8F0FE 100%)',
    }}>
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box 
          sx={(theme) => ({ 
            width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            minWidth: isSidebarCollapsed ? 0 : undefined,
            maxWidth: isSidebarCollapsed ? 0 : undefined,
            transition: isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            ...(theme.palette.mode === 'light' ? GLASS_EFFECT_LIGHT : GLASS_EFFECT_DARK),
            borderRight: 'none',
            display: 'flex',
            flexDirection: 'column',
            visibility: isSidebarCollapsed ? 'hidden' : 'visible',
            opacity: isSidebarCollapsed ? 0 : 1,
          })}
        >
          {/* Sidebar Header */}
          <Box sx={(theme) => ({ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            borderBottom: 'none',
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.4)
              : alpha('#FFFFFF', 0.5),
            backdropFilter: 'blur(20px)',
          })}>
            <ScienceIcon sx={{ 
              mr: 1.5, 
              color: theme.palette.primary.main,
              fontSize: '1.5rem' 
            }} />
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', p: 1 }}>
              <Tooltip title={`Switch to ${viewMode === 'table' ? 'flashcard' : 'table'} view`}>
                <IconButton
                  onClick={handleViewModeToggle}
                  size="small"
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main'
                  }}
                >
                  {viewMode === 'table' ? <StyleIcon /> : <ViewColumnIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <IconButton
                  onClick={onThemeChange} 
                  size="small"
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main'
                  }}
                >
                  {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Box>
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
                            : 'rgba(0, 0, 0, 0.03)',
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
                            : 'rgba(0, 0, 0, 0.03)',
                          boxShadow: 'none'
                        }
                      }}>
                        {/* Render section content based on section.id */}
                        {section.id === 'section-upload' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                              Accepts .txt, .csv, .pdf, .docx
                            </Typography>
                            <Button 
                              variant="contained" 
                              component="label" 
                              fullWidth
                              startIcon={<UploadFileIcon />}
                              color="primary"
                            >
                              Choose File
                              <input
                                type="file"
                                accept=".pdf,.docx,.csv,.txt"
                                hidden
                                onChange={handleFileUpload}
                              />
                            </Button>
                            {fileName && (
                              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                Selected: {fileName}
                              </Typography>
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
                                onChange={(e) => setSummaryPrompt(e.target.value)}
                                minRows={2}
                                maxRows={6}
                                className="no-drag"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6
                                  }
                                }}
                              />
                            </Box>
                            <Button
                              variant="contained"
                              color={isGenerating && generationType === 'summary' ? "error" : "primary"}
                              onClick={handleSummarize}
                              fullWidth
                              sx={{ mt: 1, mb: 2 }}
                              startIcon={isGenerating && generationType === 'summary' ? <StopIcon /> : <AutoAwesomeIcon />}
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
                                    lineHeight: 1.6
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        {section.id === 'section-prompts' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                  Question Generation Prompt
                                </Typography>
                                <Tooltip title="This prompt instructs the AI how to generate questions from the document chunks. The prompt should encourage clear, focused questions." placement="right">
                                  <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <TextField
                                multiline
                                fullWidth
                                value={promptQuestion}
                                onChange={(e) => setPromptQuestion(e.target.value)}
                                minRows={3}
                                maxRows={8}
                                className="no-drag"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6
                                  }
                                }}
                              />
                            </Box>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                  Answer Generation Prompt
                                </Typography>
                                <Tooltip title="This prompt instructs the AI how to generate answers to the questions. The prompt should encourage accurate, concise answers based on the document content." placement="right">
                                  <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <TextField
                                multiline
                                fullWidth
                                value={promptAnswer}
                                onChange={(e) => setPromptAnswer(e.target.value)}
                                minRows={3}
                                maxRows={8}
                                className="no-drag"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6
                                  }
                                }}
                              />
                            </Box>
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
                                  <Tooltip title="Choose how to split your document into chunks. 'Recursive' splits by character count, 'Line' splits by newlines, and 'Line+Header' treats the first line as a header and includes it with each chunk." placement="right">
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
                                <MenuItem value="line-with-header">Line + Header</MenuItem>
                              </TextField>
                            </Box>

                            {chunkingAlgorithm === 'recursive' && (
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
                                        Chunk Size
                                      </Typography>
                                      <Tooltip title="The size of each text chunk in characters. Larger chunks provide more context but may be harder to process. Recommended range: 200-1000." placement="right">
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
                                        Overlap
                                      </Typography>
                                      <Tooltip title="The number of characters that overlap between consecutive chunks. This helps maintain context across chunk boundaries. Recommended: 10-20% of chunk size." placement="right">
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
          p: 3,
          bgcolor: 'transparent',
        }}>
          <Paper sx={(theme) => ({ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            ...(theme.palette.mode === 'light' ? GLASS_EFFECT_LIGHT : GLASS_EFFECT_DARK),
            borderRadius: '16px',
            overflow: 'hidden',
          })}>
            <Box sx={(theme) => ({ 
              p: 1.5,
              borderBottom: 1, 
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.4)
                : alpha('#FFFFFF', 0.5),
              backdropFilter: 'blur(20px)',
            })}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 40
              }}>
                {/* Left section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    size="small"
                    sx={{ 
                      color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    {isSidebarCollapsed ? <LastPageIcon /> : <FirstPageIcon />}
                  </IconButton>

                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    <Button
                      variant="contained"
                      color={isGenerating && generationType === 'qa' ? "error" : "primary"}
                      size="small"
                      disableElevation
                      startIcon={isGenerating && generationType === 'qa' ? <StopIcon /> : <AutoAwesomeIcon />}
                      onClick={viewMode === 'flashcard' ? () => handleSingleCardGenerate(qaPairs[currentIndex].id) : handleGenerate}
                      disabled={!ollamaSettings.model || qaPairs.length === 0}
                      sx={{
                        minWidth: '120px',
                        height: 32,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        px: 2,
                        bgcolor: isGenerating && generationType === 'qa' 
                          ? theme.palette.error.main 
                          : theme.palette.primary.main,
                        '&:hover': {
                          bgcolor: isGenerating && generationType === 'qa'
                            ? theme.palette.error.dark
                            : theme.palette.primary.dark,
                        }
                      }}
                    >
                      {isGenerating && generationType === 'qa' 
                        ? "Stop" 
                        : viewMode === 'flashcard' 
                          ? "Generate Card" 
                          : "Generate Q&A"}
                    </Button>

                    <Button
                      color="primary"
                      size="small"
                      onClick={handleAddEmpty}
                      startIcon={<AddIcon fontSize="small" />}
                      sx={{
                        ml: 1,
                        height: 32,
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        color: theme.palette.primary.main,
                        px: {
                          xs: 1,
                          sm: 2
                        },
                        '& .MuiButton-startIcon': {
                          mr: {
                            xs: 0,
                            sm: 1
                          }
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        }
                      }}
                    >
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Add Empty
                      </Box>
                    </Button>

                    <Button
                      color="error"
                      size="small"
                      onClick={handleDeleteSelected}
                      disabled={qaPairs.length === 0}
                      startIcon={<DeleteIcon fontSize="small" />}
                      sx={{
                        ml: 1,
                        height: 32,
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        color: theme.palette.error.main,
                        px: {
                          xs: 1,
                          sm: 2
                        },
                        '& .MuiButton-startIcon': {
                          mr: {
                            xs: 0,
                            sm: 1
                          }
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                        },
                        '&.Mui-disabled': {
                          color: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.3)' 
                            : 'rgba(0, 0, 0, 0.26)'
                        }
                      }}
                    >
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Delete
                      </Box>
                    </Button>
                  </Box>
                </Box>

                {/* Right section */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {viewMode === 'table' ? (
                    <Button
                      color="primary"
                      size="small"
                      onClick={handleExportCSV}
                      disabled={qaPairs.length === 0}
                      startIcon={<SaveAltIcon fontSize="small" />}
                      sx={{
                        height: 32,
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        color: theme.palette.primary.main,
                        px: {
                          xs: 1,
                          sm: 2
                        },
                        '& .MuiButton-startIcon': {
                          mr: {
                            xs: 0,
                            sm: 1
                          }
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                        '&.Mui-disabled': {
                          color: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.3)' 
                            : 'rgba(0, 0, 0, 0.26)'
                        }
                      }}
                    >
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Export
                      </Box>
                    </Button>
                  ) : (
                    <CardNavigation 
                      currentIndex={currentIndex}
                      totalCards={qaPairs.length}
                      onCardChange={handleCardChange}
                    />
                  )}
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
              {viewMode === 'table' ? (
                <TableContainer sx={{ 
                  height: '100%',
                  overflow: 'auto',
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
                }}>
                  <Table size="small" stickyHeader sx={{
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid',
                      borderColor: theme.palette.divider,
                      padding: '12px 16px',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.2s ease',
                    },
                    '& .MuiTableHead-root .MuiTableCell-root': {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.background.paper, 0.9)
                        : alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(8px)',
                      borderBottom: '2px solid',
                      borderColor: theme.palette.divider,
                      fontSize: '0.8125rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      height: '40px', // Match toolbar height
                      padding: '0 16px', // Adjust padding
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiTableHead-root .MuiTableCell-root:first-of-type': {
                      paddingLeft: '12px', // Adjust checkbox padding
                    },
                    '& .MuiTableBody-root .MuiTableRow-root': {
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.primary.main, 0.04)
                          : alpha(theme.palette.primary.main, 0.04),
                      },
                    },
                    '& .MuiCheckbox-root': {
                      padding: '4px',
                      borderRadius: '6px',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      },
                    },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          padding="checkbox"
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.02)',
                            fontWeight: 600,
                          }}
                        >
                          <Checkbox
                            checked={qaPairs.length > 0 && qaPairs.every(qa => qa.selected)}
                            indeterminate={qaPairs.some(qa => qa.selected) && !qaPairs.every(qa => qa.selected)}
                            onChange={(e) => {
                              setQaPairs(prev => prev.map(row => ({ ...row, selected: e.target.checked })))
                            }}
                          />
                        </TableCell>
                        <TableCell 
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.02)',
                            fontWeight: 600
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: theme.palette.primary.main
                          }}>
                            <ExtensionIcon sx={{ fontSize: '1.1rem' }} />
                            Context
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.02)',
                            fontWeight: 600
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: theme.palette.secondary.main
                          }}>
                            <HelpOutlineIcon sx={{ fontSize: '1.1rem' }} />
                            Question
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.02)',
                            fontWeight: 600
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: theme.palette.success.main
                          }}>
                            <LightbulbOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                            Answer
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {qaPairs
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((qa, rowIndex) => {
                          // Get the maximum height for this row based on expanded cells
                          const isAnyExpanded = ['context', 'question', 'answer'].some(
                            columnType => expandedCells[`${qa.id}-${columnType}`] || isCellGenerating(qa, columnType)
                          );

                          return (
                          <TableRow 
                            key={qa.id}
                            sx={{
                              bgcolor: theme.palette.mode === 'dark'
                                ? rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                                : rowIndex % 2 === 0 ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                              '&:hover': {
                                bgcolor: theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
                              borderBottom: '1px solid',
                              borderColor: theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={!!qa.selected}
                                onChange={(e) => {
                                  setQaPairs((prev) =>
                                    prev.map((row) =>
                                      row.id === qa.id ? { ...row, selected: e.target.checked } : row
                                    ),
                                  );
                                }}
                              />
                            </TableCell>
                            {['context', 'question', 'answer'].map((columnType) => {
                              const isGenerating = isCellGenerating(qa, columnType);
                              const isExpanded = expandedCells[`${qa.id}-${columnType}`] || isGenerating;
                              const content = qa[columnType as keyof typeof qa] as string;
                              
                              return (
                                <TableCell 
                                  key={columnType}
                                  onClick={() => toggleCellExpansion(qa.id, columnType)}
                                  sx={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    padding: '4px 8px',
                                    minWidth: '200px',
                                    maxWidth: '400px',
                                    position: 'relative',
                                    height: isAnyExpanded ? 'auto' : undefined,
                                    '&:hover': {
                                      backgroundColor: theme.palette.mode === 'dark' 
                                        ? 'rgba(255, 255, 255, 0.04)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                    },
                                  }}
                                >
                                  <Box sx={{ 
                                    position: 'relative',
                                    maxHeight: isAnyExpanded ? (isExpanded ? 'none' : '100%') : '4.5em',
                                    overflow: isExpanded ? 'visible' : 'auto',
                                    transition: 'all 0.2s ease',
                                    '&::-webkit-scrollbar': {
                                      width: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                      backgroundColor: 'rgba(0,0,0,0.1)',
                                      borderRadius: '2px',
                                    },
                                    // Force height reset when not expanded
                                    height: isAnyExpanded ? (isExpanded ? 'auto' : '100%') : '4.5em',
                                  }}>
                                    <TextField
                                      multiline
                                      fullWidth
                                      variant="standard"
                                      value={content}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setQaPairs((prev) =>
                                          prev.map((row) =>
                                            row.id === qa.id ? { ...row, [columnType]: e.target.value } : row
                                          )
                                        )
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      InputProps={{
                                        disableUnderline: true,
                                        sx: {
                                          alignItems: 'flex-start',
                                          padding: 0,
                                          fontSize: '0.875rem',
                                          lineHeight: 1.5,
                                          minHeight: isExpanded ? 'auto' : '4.5em',
                                          '& textarea': {
                                            padding: 0,
                                          }
                                        }
                                      }}
                                      sx={{
                                        width: '100%',
                                        '& .MuiInputBase-root': {
                                          padding: 0,
                                        },
                                      }}
                                    />
                                    {!isExpanded && content.split('\n').length > 3 && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          height: '2em',
                                          background: `linear-gradient(transparent, ${
                                            theme.palette.mode === 'dark' 
                                              ? 'rgba(0, 0, 0, 0.8)' 
                                              : 'rgb(248, 249, 251)'
                                          } 80%)`,
                                          pointerEvents: 'none',
                                          display: 'flex',
                                          alignItems: 'flex-end',
                                          justifyContent: 'center',
                                          pb: 0.5,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: theme.palette.text.disabled,
                                            fontSize: '0.75rem',
                                          }}
                                        >
                                          •••
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                          );
                        })}
                      {qaPairs.length === 0 && !isGenerating && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" align="center">
                              No chunks/Q&A yet. Upload &amp; chunk, then generate Q&A.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Add pagination controls */}
                  <TablePagination
                    component="div"
                    count={qaPairs.length}
                    page={page}
                    onPageChange={(_, newPage) => {
                      setPage(newPage);
                      // Reset expanded cells when changing pages
                      setExpandedCells({});
                    }}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setRowsPerPage(parseInt(event.target.value, 10));
                      setPage(0);
                      // Reset expanded cells when changing rows per page
                      setExpandedCells({});
                    }}
                    rowsPerPageOptions={availableRowsPerPage}
                    sx={{
                      borderTop: 1,
                      borderColor: theme.palette.divider,
                      bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.6)
                        : alpha(theme.palette.background.paper, 0.6),
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                </TableContainer>
              ) : (
                <FlashcardView
                  qaPairs={qaPairs}
                  onUpdateQA={handleUpdateQA}
                  currentIndex={currentIndex}
                  chunkingAlgorithm={chunkingAlgorithm}
                />
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
      {ollamaError && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: theme.palette.error.main,
            color: '#fff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <ErrorIcon />
          <Typography variant="body2">
            {ollamaError.message}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default App

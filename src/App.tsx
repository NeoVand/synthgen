import React, { useState, useCallback, useEffect, createContext, useMemo, useRef } from 'react'
import {
  Typography,
  Paper,
  Button,
  CircularProgress,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Box,
  IconButton,
  Collapse,
  useTheme,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ScienceIcon from '@mui/icons-material/Science'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SettingsIcon from '@mui/icons-material/Settings'
import PsychologyIcon from '@mui/icons-material/Psychology'
import SummarizeIcon from '@mui/icons-material/Summarize'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import ExtensionIcon from '@mui/icons-material/Extension'
import StopIcon from '@mui/icons-material/Stop'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { saveAs } from 'file-saver'
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

// PDFJS
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs'
// DOCX
import { renderAsync } from 'docx-preview'

import OllamaSettings from './components/OllamaSettings'

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

const App: React.FC<AppProps> = ({ onThemeChange }: AppProps) => {
  // 1. Model Settings
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettingsType>({
    model: '',
    temperature: 0.7,
    topP: 0.9,
    useFixedSeed: false,
    seed: 42,
    numCtx: 2048,
  })

  // Document text + file name
  const [rawText, setRawText] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  // Summarization
  const [summaryPrompt, setSummaryPrompt] = useState<string>(
    'Please provide a concise summary of the following content:\n'
  )
  const [docSummary, setDocSummary] = useState<string>('')

  // Q&A prompts
  const [promptQuestion, setPromptQuestion] = useState<string>(
    "Please read the following text (and summary) and create a single  and short and relevant question related to the text. Don't add any markdown or greetings. Only the question.:\n"
  )
  const [promptAnswer, setPromptAnswer] = useState<string>(
    "Based on the text (and summary) plus the question, provide a concise answer. Don't add any markdown or greetings. Only the Answer."
  )

  // Q&A table
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])

  // States for chunking
  const [chunkSize, setChunkSize] = useState<number>(500)
  const [chunkOverlap, setChunkOverlap] = useState<number>(0)

  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<string>('')
  const theme = useTheme();

  // Add state for expanded cells and sections
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<Section[]>([
    { id: 'section-upload', title: 'Document Upload', icon: <UploadFileIcon /> },
    { id: 'section-chunking', title: 'Chunking', icon: <ExtensionIcon /> },
    { id: 'section-modelSettings', title: 'Model Settings', icon: <PsychologyIcon /> },
    { id: 'section-summarization', title: 'Summarization', icon: <SummarizeIcon /> },
    { id: 'section-prompts', title: 'Q&A Prompts', icon: <QuestionAnswerIcon /> },
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
  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

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
    setOllamaSettings(newSettings)
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
      setShouldStopGeneration(true)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    if (!rawText.trim()) {
      alert('No document text found. Please upload a file first.')
      return
    }
    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.')
      return
    }

    setShouldStopGeneration(false)
    setIsGenerating(true)
    setGenerationType('summary')
    setGenerationProgress('Generating summary...')

    try {
      let summaryText = ''
      const prompt = `${summaryPrompt}\n\n${rawText}`
      for await (const chunk of doStreamCall(prompt)) {
        if (shouldStopGeneration) break
        summaryText += chunk
        setDocSummary(summaryText)
      }
    } catch (err) {
      console.error('Error summarizing doc:', err)
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('Failed to summarize document.')
      }
    } finally {
      setIsGenerating(false)
      setGenerationType(null)
      setGenerationProgress(shouldStopGeneration ? 'Summary generation stopped.' : 'Summary generation complete.')
      setShouldStopGeneration(false)
    }
  }

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
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
      })
      const splitted = await splitter.splitText(rawText)
      const pairs: QAPair[] = splitted.map((ck, idx) => ({
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

  // A helper for streaming calls
  const doStreamCall = async function* (prompt: string) {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    try {
      if (shouldStopGeneration) {
        throw new Error('AbortError')
      }

      const response = await fetch('http://localhost:11434/api/generate', {
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
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')
      const decoder = new TextDecoder()

      try {
        while (true) {
          if (shouldStopGeneration) {
            throw new Error('AbortError')
          }

          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (!line) continue
            if (shouldStopGeneration) {
              throw new Error('AbortError')
            }
            
            try {
              const response = JSON.parse(line)
              if (response.response) {
                yield response.response
              }
              if (response.done) {
                return
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              continue
            }
          }
        }
      } finally {
        reader.cancel()
      }
    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
        console.log('Generation stopped by user')
        throw error // Re-throw to break out of all loops
      }
      console.error('Streaming error:', error)
      throw error
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }

  //------------------------------------------------------------------------------------
  // 6. Delete / Generate
  //------------------------------------------------------------------------------------
  const handleDeleteSelected = () => {
    const remaining = qaPairs.filter((q) => !q.selected)
    setQaPairs(remaining)
  }

  const handleGenerate = async () => {
    if (isGenerating) {
      setShouldStopGeneration(true)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setIsGenerating(false)
      setGenerationType(null)
      setGenerationProgress('Generation stopped.')
      return
    }

    if (!ollamaSettings.model) {
      alert('No model selected! Please check Ollama settings.')
      return
    }
    
    const rowsToProcess = qaPairs.filter(q => q.selected).length > 0 
      ? qaPairs.filter(q => q.selected)
      : qaPairs

    if (rowsToProcess.length === 0) {
      alert('No rows to process.')
      return
    }

    setShouldStopGeneration(false)
    setIsGenerating(true)
    setGenerationType('qa')

    try {
      for (let i = 0; i < rowsToProcess.length; i++) {
        if (shouldStopGeneration) {
          throw new Error('AbortError')
        }

        const row = rowsToProcess[i]
        
        // Generate question
        setGenerationProgress(`Generating row ${row.id}... (question)`)
        let questionText = ''
        const questionPrompt = `${promptQuestion}\n\nSummary:\n${docSummary}\n\nChunk:\n${row.context}`
        
        try {
          for await (const chunk of doStreamCall(questionPrompt)) {
            if (shouldStopGeneration) {
              throw new Error('AbortError')
            }
            questionText += chunk
            setQaPairs((prev) =>
              prev.map((r) =>
                r.id === row.id ? { ...r, question: questionText, generating: { question: true, answer: false } } : r
              )
            )
          }
        } catch (err) {
          if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
            throw err // Re-throw to break out of everything
          }
          console.error('Error generating question:', err)
          continue
        }

        if (shouldStopGeneration) {
          throw new Error('AbortError')
        }
        
        // Generate answer
        setGenerationProgress(`Generating row ${row.id}... (answer)`)
        let answerText = ''
        const answerPrompt = `${promptAnswer}\nSummary:\n${docSummary}\nChunk:\n${row.context}\nQuestion:\n${row.question}`
        
        try {
          for await (const chunk of doStreamCall(answerPrompt)) {
            if (shouldStopGeneration) {
              throw new Error('AbortError')
            }
            answerText += chunk
            setQaPairs((prev) =>
              prev.map((r) =>
                r.id === row.id ? { ...r, answer: answerText, generating: { question: false, answer: true } } : r
              )
            )
          }
        } catch (err) {
          if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
            throw err // Re-throw to break out of everything
          }
          console.error('Error generating answer:', err)
        }
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        console.log('Generation process stopped by user')
      } else {
        console.error('Error in generation process:', err)
      }
    } finally {
      setIsGenerating(false)
      setGenerationType(null)
      setGenerationProgress(shouldStopGeneration ? 'Generation stopped.' : 'Generation complete.')
      setShouldStopGeneration(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }

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
    setExpandedCells(prev => ({
      ...prev,
      [`${rowId}-${columnType}`]: !prev[`${rowId}-${columnType}`]
    }));
  }, []);

  // Helper to calculate TextField rows based on content
  const calculateRows = (content: string, isExpanded: boolean, isGenerating: boolean) => {
    if (!isExpanded && !isGenerating) return 2;
    const lineCount = (content.match(/\n/g) || []).length + 1;
    return Math.max(4, lineCount + 2); // No maximum, just ensure minimum height
  };

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
    }) => {
      const finishIndex = getReorderDestinationIndex({
        startIndex,
        indexOfTarget,
        closestEdgeOfTarget,
        axis: 'vertical',
      });

      if (finishIndex === startIndex) {
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
    [],
  );

  useEffect(() => {
    if (lastSectionMoved === null) {
      return;
    }

    const { section, previousIndex, currentIndex, numberOfSections } = lastSectionMoved;
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

  // Add this effect to reset expansion state after generation
  useEffect(() => {
    if (!isGenerating && generationType === 'qa') {
      // Reset all expanded cells
      setExpandedCells({});
    }
  }, [isGenerating, generationType]);

  //------------------------------------------------------------------------------------
  //  Render UI
  //------------------------------------------------------------------------------------
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#F8F9FB'
    }}>
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box 
          sx={{ 
            width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            minWidth: isSidebarCollapsed ? 0 : undefined,
            maxWidth: isSidebarCollapsed ? 0 : undefined,
            transition: isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderRight: isSidebarCollapsed ? 0 : `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            visibility: isSidebarCollapsed ? 'hidden' : 'visible',
            opacity: isSidebarCollapsed ? 0 : 1,
            boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          }}
        >
          {/* Sidebar Header */}
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
          }}>
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
            <IconButton 
              onClick={handleExportCSV} 
              size="small"
              disabled={qaPairs.length === 0}
              sx={{ 
                mr: 1,
                color: theme.palette.primary.main,
                '&:disabled': {
                  color: theme.palette.action.disabled
                }
              }}
            >
              <SaveAltIcon />
            </IconButton>
            <IconButton 
              onClick={onThemeChange} 
              size="small"
              sx={{ 
                color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main'
              }}
            >
              {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
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
                    mb: 2,
                    cursor: 'grab',
                    '&:active': {
                      cursor: 'grabbing',
                    },
                    '&:hover': {
                      '& .MuiPaper-root': {
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2]
                      }
                    }
                  }}
                >
                  <Paper 
                    elevation={1}
                    sx={{ 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      transition: 'all 0.2s ease',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        py: 1.5,
                        px: 2,
                        display: 'flex', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        color: theme.palette.primary.main,
                        minHeight: 48,
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.03)' 
                            : 'rgba(0, 0, 0, 0.02)'
                        }
                      }} 
                      onClick={() => toggleSection(section.id)}
                    >
                      {section.icon && (
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mr: 2,
                          color: 'inherit',
                          '& svg': {
                            fontSize: '1.25rem',
                          }
                        }}>
                          {section.icon}
                        </Box>
                      )}
                      <Typography variant="subtitle1" sx={{ 
                        flexGrow: 1, 
                        fontWeight: 500,
                        color: theme.palette.mode === 'dark' ? '#fff' : 'text.primary',
                        fontSize: '0.9rem',
                        letterSpacing: '0.01em'
                      }}>
                        {section.title}
                      </Typography>
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
                          : 'rgba(0, 0, 0, 0.01)'
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
                            />
                          </Box>
                        )}
                        {section.id === 'section-summarization' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <TextField
                              label="Summarization Prompt"
                              multiline
                              rows={3}
                              fullWidth
                              margin="normal"
                              value={summaryPrompt}
                              onChange={(e) => setSummaryPrompt(e.target.value)}
                            />
                            <Button
                              variant="contained"
                              color={isGenerating && generationType === 'summary' ? "error" : "primary"}
                              onClick={handleSummarize}
                              fullWidth
                              sx={{ mt: 1 }}
                              startIcon={isGenerating && generationType === 'summary' ? <StopIcon /> : <StarIcon />}
                            >
                              {isGenerating && generationType === 'summary' ? "Stop" : "Generate Summary"}
                            </Button>
                            <Box mt={2}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                Summary (editable):
                              </Typography>
                              <TextField
                                multiline
                                rows={4}
                                fullWidth
                                value={docSummary}
                                onChange={(e) => setDocSummary(e.target.value)}
                                placeholder="(Optional) Provide or edit a summary here..."
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
                                    maxHeight: '300px',
                                    overflow: 'auto',
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        {section.id === 'section-prompts' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <TextField
                              label="Question Prompt"
                              multiline
                              rows={2}
                              fullWidth
                              margin="normal"
                              value={promptQuestion}
                              onChange={(e) => setPromptQuestion(e.target.value)}
                            />
                            <TextField
                              label="Answer Prompt"
                              multiline
                              rows={2}
                              fullWidth
                              margin="normal"
                              value={promptAnswer}
                              onChange={(e) => setPromptAnswer(e.target.value)}
                            />
                          </Box>
                        )}
                        {section.id === 'section-chunking' && (
                          <Box sx={{ p: 1.5, pt: 1 }}>
                            <TextField
                              label="Chunk Size"
                              type="number"
                              fullWidth
                              margin="normal"
                              value={chunkSize}
                              onChange={(e) => setChunkSize(Number(e.target.value))}
                            />
                            <TextField
                              label="Overlap"
                              type="number"
                              fullWidth
                              margin="normal"
                              value={chunkOverlap}
                              onChange={(e) => setChunkOverlap(Number(e.target.value))}
                            />
                            <Button
                              variant="contained"
                              fullWidth
                              color="primary"
                              startIcon={<ExtensionIcon />}
                              onClick={handleChunkDoc}
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
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#F8F9FB'
        }}>
          <Paper sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: theme.palette.mode === 'dark' 
              ? 'none'
              : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
          }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF'
            }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <IconButton
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  size="small"
                  sx={{ 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteSelected}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="contained"
                  color={isGenerating && generationType === 'qa' ? "error" : "primary"}
                  size="small"
                  startIcon={isGenerating && generationType === 'qa' ? <StopIcon /> : <StarIcon />}
                  onClick={handleGenerate}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'none'
                    }
                  }}
                >
                  {isGenerating && generationType === 'qa' ? "Stop Generation" : "Generate Q&A"}
                </Button>
              </Box>
            </Box>

            {isGenerating && (
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.02)' 
                  : 'rgba(0, 0, 0, 0.02)',
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <CircularProgress size={16} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 500
                  }}
                >
                  {generationProgress}
                </Typography>
              </Box>
            )}

            <TableContainer sx={{ 
              flex: 1, 
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
                borderRadius: '4px',
                '&:hover': {
                  background: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.2)'
                }
              }
            }}>
              <Table size="small" stickyHeader sx={{
                '& .MuiTableCell-root': {
                  borderBottom: '1px solid',
                  borderRight: '1px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)',
                  '&:last-child': {
                    borderRight: 'none',
                  },
                  padding: '12px 16px'
                },
                '& .MuiTableHead-root .MuiTableCell-root': {
                  borderBottom: '2px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: theme.palette.text.primary,
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.03)'
                    : '#F8F9FB'
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
                    {['Context', 'Question', 'Answer'].map(header => (
                      <TableCell 
                        key={header}
                        sx={{
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                          fontWeight: 600,
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qaPairs.map((qa, rowIndex) => (
                    <TableRow 
                      key={qa.id}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark'
                          ? rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                          : rowIndex % 2 === 0 ? 'rgba(0, 0, 0, 0.01)' : 'transparent',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)',
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
                              )
                            )
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
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(255, 255, 255, 0.04)'
                                  : 'rgba(0, 0, 0, 0.02)',
                              },
                            }}
                          >
                            <Box sx={{ 
                              position: 'relative',
                              maxHeight: isExpanded ? 'none' : '4.5em',
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
                              height: isExpanded ? 'auto' : '4.5em',
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
                  ))}
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
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}

export default App

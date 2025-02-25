import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { 
  QAPair, 
  OllamaSettings, 
  OllamaError, 
  ViewMode, 
  GenerationProgress, 
  GenerationType,
  Section,
  CSVColumn,
  JSONLKey,
  ChunkOptions
} from '../types';
import { ChunkingAlgorithm } from '../utils/chunker';

interface AppContextProps {
  // Document state
  rawText: string;
  setRawText: (text: string) => void;
  fileName: string;
  setFileName: (name: string) => void;
  docSummary: string;
  setDocSummary: (summary: string) => void;

  // Ollama state
  ollamaSettings: OllamaSettings;
  setOllamaSettings: (settings: OllamaSettings) => void;
  isOllamaConnected: boolean;
  setIsOllamaConnected: (connected: boolean) => void;
  ollamaError: OllamaError | null;
  setOllamaError: (error: OllamaError | null) => void;

  // QA pairs and generation
  qaPairs: QAPair[];
  setQaPairs: (pairs: QAPair[]) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  generationType: GenerationType;
  setGenerationType: (type: GenerationType) => void;
  generationProgress: GenerationProgress;
  setGenerationProgress: (progress: GenerationProgress) => void;
  shouldStopGeneration: boolean;
  setShouldStopGeneration: (stop: boolean) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;

  // Prompts
  summaryPrompt: string;
  setSummaryPrompt: (prompt: string) => void;
  promptQuestion: string;
  setPromptQuestion: (prompt: string) => void;
  promptAnswer: string;
  setPromptAnswer: (prompt: string) => void;

  // Chunking
  chunkOptions: ChunkOptions;
  setChunkOptions: (options: ChunkOptions) => void;
  pendingChunks: string[];
  setPendingChunks: (chunks: string[]) => void;
  showChunkingDialog: boolean;
  setShowChunkingDialog: (show: boolean) => void;

  // UI state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  page: number;
  setPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  expandedSections: Record<string, boolean>;
  setExpandedSections: (sections: Record<string, boolean>) => void;
  expandedCells: Record<string, boolean>;
  setExpandedCells: (cells: Record<string, boolean>) => void;

  // CSV and JSONL
  csvColumns: CSVColumn[];
  setCsvColumns: (columns: CSVColumn[]) => void;
  csvData: string[][];
  setCsvData: (data: string[][]) => void;
  jsonlKeys: JSONLKey[];
  setJsonlKeys: (keys: JSONLKey[]) => void;
  jsonlData: Record<string, any>[];
  setJsonlData: (data: Record<string, any>[]) => void;
}

export const AppContext = createContext<AppContextProps | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
  defaultSections: Section[];
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, defaultSections }) => {
  // Document state
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [docSummary, setDocSummary] = useState<string>('');

  // Ollama state
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>({
    model: '',
    temperature: 0.7,
    topP: 0.9,
    useFixedSeed: false,
    seed: 42,
    numCtx: 4096
  });
  const [isOllamaConnected, setIsOllamaConnected] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<OllamaError | null>(null);

  // QA pairs and generation
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationType, setGenerationType] = useState<GenerationType>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ completed: 0, total: 0 });
  const [shouldStopGeneration, setShouldStopGeneration] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Prompts
  const [summaryPrompt, setSummaryPrompt] = useState<string>(
    "Create a focused, factual summary of the following text. The summary should capture key points and main ideas without adding external information. Output only the raw summary text without any greetings, markdown, or formatting."
  );
  const [promptQuestion, setPromptQuestion] = useState<string>(
    "Please read the following text (and summary) and create a single and short and relevant question related to the text. Don't add any markdown or greetings. Only the question."
  );
  const [promptAnswer, setPromptAnswer] = useState<string>(
    "Based on the text (and summary) plus the question, provide a concise answer. Don't add any markdown or greetings. Only the Answer."
  );

  // Chunking
  const [chunkOptions, setChunkOptions] = useState<ChunkOptions>({
    chunkSize: 500,
    chunkOverlap: 0,
    windowSize: 3,
    algorithm: 'recursive' as ChunkingAlgorithm
  });
  const [pendingChunks, setPendingChunks] = useState<string[]>([]);
  const [showChunkingDialog, setShowChunkingDialog] = useState<boolean>(false);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [sidebarWidth, setSidebarWidth] = useState<number>(400);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  
  // Initialize expanded sections
  const initialExpandedSections = defaultSections.reduce((acc, section) => {
    acc[section.id] = true;
    return acc;
  }, {} as Record<string, boolean>);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(initialExpandedSections);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  // CSV and JSONL
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [jsonlKeys, setJsonlKeys] = useState<JSONLKey[]>([]);
  const [jsonlData, setJsonlData] = useState<Record<string, any>[]>([]);

  return (
    <AppContext.Provider
      value={{
        // Document state
        rawText,
        setRawText,
        fileName,
        setFileName,
        docSummary,
        setDocSummary,

        // Ollama state
        ollamaSettings,
        setOllamaSettings,
        isOllamaConnected,
        setIsOllamaConnected,
        ollamaError,
        setOllamaError,

        // QA pairs and generation
        qaPairs,
        setQaPairs,
        isGenerating,
        setIsGenerating,
        generationType,
        setGenerationType,
        generationProgress,
        setGenerationProgress,
        shouldStopGeneration,
        setShouldStopGeneration,
        abortControllerRef,

        // Prompts
        summaryPrompt,
        setSummaryPrompt,
        promptQuestion,
        setPromptQuestion,
        promptAnswer,
        setPromptAnswer,

        // Chunking
        chunkOptions,
        setChunkOptions,
        pendingChunks,
        setPendingChunks,
        showChunkingDialog,
        setShowChunkingDialog,

        // UI state
        viewMode,
        setViewMode,
        currentIndex,
        setCurrentIndex,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        sidebarWidth,
        setSidebarWidth,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        expandedSections,
        setExpandedSections,
        expandedCells,
        setExpandedCells,

        // CSV and JSONL
        csvColumns,
        setCsvColumns,
        csvData,
        setCsvData,
        jsonlKeys,
        setJsonlKeys,
        jsonlData,
        setJsonlData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}; 
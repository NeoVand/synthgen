import { ReactNode } from 'react';

// QA Pair for the main application data
export interface QAPair {
  id: number | string;
  context: string;
  question: string;
  answer: string;
  sources?: string;
  selected?: boolean;
  generating?: {
    question: boolean;
    answer: boolean;
  };
}

// Export options interface for the ExportOptionsDialog
export interface ExportOptions {
  format: 'csv' | 'jsonl';
  columns: {
    field: string;
    originalName: string;
    customName: string;
    selected: boolean;
  }[];
  batchSize?: number;
  shuffle?: boolean;
  data?: QAPair[];
  imageExportType?: 'description' | 'fullImage';
  imageDescriptionPrompt?: string;
}

// Ollama settings types
export interface OllamaSettings {
  model: string;
  temperature: number;
  topP: number;
  useFixedSeed: boolean;
  seed: number;
  numCtx: number;
}

// Error type for Ollama
export interface OllamaError {
  message: string;
  isOllamaError: boolean;
}

// View mode type
export type ViewMode = 'table' | 'flashcard';

// Generation progress type
export interface GenerationProgress {
  completed: number;
  total: number;
}

// Generation type
export type GenerationType = 'summary' | 'qa' | 'question' | 'answer' | null;

// Section type for sidebar
export interface Section {
  id: string;
  title: string;
  icon?: ReactNode;
  description: string;
}

// Types for drag and drop
export type Edge = 'top' | 'bottom' | 'left' | 'right';
export type SectionEntry = { sectionId: string; element: HTMLElement };

// Prompts
export interface PromptTemplate {
  name: string;
  questionPrompt: string;
  answerPrompt: string;
}

// CSV column configuration
export interface CSVColumn {
  name: string;
  selected: boolean;
}

// JSONL key configuration
export interface JSONLKey {
  name: string;
  path: string;
  selected: boolean;
  isLeaf: boolean;
  level: number;
  hasChildren: boolean;
  isArray?: boolean;
}

// Chunking options
export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  windowSize: number;
  algorithm: 'recursive' | 'line' | 'csv-tsv' | 'jsonl' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';
} 
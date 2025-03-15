import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useOllamaGeneration } from './useOllamaGeneration';
import { useAzureOpenAIGeneration } from './useAzureOpenAIGeneration';
import { QAPair } from '../types';

interface GenerateTextOptions {
  prompt: string;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
}

export const useLLMGeneration = () => {
  const { modelProvider } = useAppContext();
  const ollama = useOllamaGeneration();
  const azure = useAzureOpenAIGeneration();

  // Core generate text function that routes to the appropriate provider
  const generateText = useCallback(async (options: GenerateTextOptions): Promise<string> => {
    if (modelProvider === 'azure') {
      return azure.generateAzureText(options);
    } else {
      // Default to Ollama
      return ollama.generateText(options);
    }
  }, [modelProvider, ollama, azure]);

  // Generate summary function
  const generateSummary = useCallback(async (text: string, prompt: string): Promise<string> => {
    if (modelProvider === 'azure') {
      return azure.generateAzureSummary(text, prompt);
    } else {
      // Default to Ollama
      return ollama.generateSummary(text, prompt);
    }
  }, [modelProvider, ollama, azure]);

  // Generate QA function
  const generateQA = useCallback(async (
    chunkList: string[],
    summaryText: string,
    questionPrompt: string,
    answerPrompt: string,
    onProgress: (progress: { completed: number; total: number }) => void
  ): Promise<QAPair[]> => {
    if (modelProvider === 'azure') {
      return azure.generateAzureQA(chunkList, summaryText, questionPrompt, answerPrompt, onProgress);
    } else {
      // Default to Ollama
      return ollama.generateQA(chunkList, summaryText, questionPrompt, answerPrompt, onProgress);
    }
  }, [modelProvider, ollama, azure]);

  // Generate question function
  const generateQuestion = useCallback(async (
    context: string,
    summaryText: string,
    prompt: string,
  ): Promise<string> => {
    if (modelProvider === 'azure') {
      const questionPrompt = `${prompt}\n\nText: ${context}\n\nSummary: ${summaryText}\n\nQuestion:`;
      return azure.generateAzureText({ prompt: questionPrompt });
    } else {
      // Use the Ollama implementation
      return ollama.generateQuestion(context, summaryText, prompt);
    }
  }, [modelProvider, ollama, azure]);

  // Generate answer function
  const generateAnswer = useCallback(async (
    context: string,
    summaryText: string,
    question: string,
    prompt: string,
  ): Promise<string> => {
    if (modelProvider === 'azure') {
      const answerPrompt = `${prompt}\n\nText: ${context}\n\nSummary: ${summaryText}\n\nQuestion: ${question}\n\nAnswer:`;
      return azure.generateAzureText({ prompt: answerPrompt });
    } else {
      // Use the Ollama implementation
      return ollama.generateAnswer(context, summaryText, question, prompt);
    }
  }, [modelProvider, ollama, azure]);

  return {
    generateText,
    generateSummary,
    generateQA,
    generateQuestion,
    generateAnswer,
  };
}; 
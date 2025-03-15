import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { OLLAMA_API_BASE } from '../utils/api';
import { QAPair } from '../types';
import { replacePlaceholders } from '../utils/promptUtils';

interface GenerateTextOptions {
  prompt: string;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
}

export const useOllamaGeneration = () => {
  const {
    ollamaSettings,
    abortControllerRef,
    shouldStopGeneration,
    setIsGenerating,
    setGenerationType,
    setGenerationProgress,
    qaPairs,
    setQaPairs,
    docSummary
  } = useAppContext();

  // Core generate text function
  const generateText = useCallback(async ({ prompt, onToken, onComplete }: GenerateTextOptions): Promise<string> => {
    try {
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const response = await fetch(`${OLLAMA_API_BASE}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaSettings.model,
          prompt: prompt,
          options: {
            temperature: ollamaSettings.temperature,
            top_p: ollamaSettings.topP,
            seed: ollamaSettings.useFixedSeed ? ollamaSettings.seed : undefined,
            num_ctx: ollamaSettings.numCtx,
          },
          stream: true,
        }),
        signal,
      });

      // Handle errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullText = '';
      const decoder = new TextDecoder();
      
      while (true) {
        if (shouldStopGeneration) {
          break;
        }
        
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsedLine = JSON.parse(line);
            const token = parsedLine.response || '';
            
            if (token) {
              fullText += token;
              if (onToken) {
                onToken(token);
              }
            }
            
            // If done is true, we've reached the end of the stream
            if (parsedLine.done) {
              if (onComplete) {
                onComplete(fullText);
              }
              return fullText;
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }

      if (onComplete) {
        onComplete(fullText);
      }
      
      return fullText;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Ollama generation error:', error);
      }
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [ollamaSettings, abortControllerRef, shouldStopGeneration]);

  // Generate summary function
  const generateSummary = useCallback(async (text: string, prompt: string): Promise<string> => {
    setIsGenerating(true);
    setGenerationType('summary');

    try {
      const fullPrompt = `${prompt}\n\n${text}`;
      const summary = await generateText({
        prompt: fullPrompt,
        onToken: () => {
          // Update progress incrementally
          setGenerationProgress({ completed: 1, total: 1 });
        },
      });
      return summary;
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  }, [generateText, setIsGenerating, setGenerationType, setGenerationProgress]);

  // Generate question function
  const generateQuestion = useCallback(async (context: string, summaryText: string, prompt: string): Promise<string> => {
    const fullPrompt = `${prompt}\n\nText: ${context}\n\nSummary: ${summaryText}\n\nQuestion:`;
    return generateText({ prompt: fullPrompt });
  }, [generateText]);

  // Generate answer function
  const generateAnswer = useCallback(async (context: string, summaryText: string, question: string, prompt: string): Promise<string> => {
    const fullPrompt = `${prompt}\n\nText: ${context}\n\nSummary: ${summaryText}\n\nQuestion: ${question}\n\nAnswer:`;
    return generateText({ prompt: fullPrompt });
  }, [generateText]);

  // Generate QA pairs function
  const generateQA = useCallback(async (
    chunkList: string[],
    summaryText: string,
    questionPrompt: string,
    answerPrompt: string,
    onProgress: (progress: { completed: number; total: number }) => void
  ): Promise<QAPair[]> => {
    setIsGenerating(true);
    setGenerationType('qa');
    
    const results: QAPair[] = [];
    try {
      for (let i = 0; i < chunkList.length; i++) {
        if (shouldStopGeneration) {
          break;
        }
        
        const chunk = chunkList[i];
        
        // Generate question
        const question = await generateQuestion(chunk, summaryText, questionPrompt);
        
        // Generate answer
        const answer = await generateAnswer(chunk, summaryText, question, answerPrompt);
        
        results.push({
          id: i,
          context: chunk,
          question,
          answer,
        });
        
        onProgress({ completed: i + 1, total: chunkList.length });
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
    
    return results;
  }, [generateQuestion, generateAnswer, setIsGenerating, setGenerationType, shouldStopGeneration]);

  return {
    generateText,
    generateSummary,
    generateQuestion,
    generateAnswer,
    generateQA,
  };
}; 
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
        throw new Error('Response body is null');
      }

      let fullText = '';
      let decoder = new TextDecoder();

      while (true) {
        // Check if generation should be stopped
        if (shouldStopGeneration) {
          abortControllerRef.current?.abort();
          break;
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // Decode and parse the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.response) {
              const token = parsed.response;
              fullText += token;
              
              // Call the token callback if provided
              onToken?.(token);
            }
            
            // If we received the "done" flag, break the loop
            if (parsed.done) {
              break;
            }
          } catch (err) {
            console.error('Error parsing streaming response:', err);
          }
        }
      }

      // Call the complete callback
      onComplete?.(fullText);
      
      return fullText;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Generation aborted');
        return '';
      }
      console.error('Error generating text:', err);
      throw err;
    } finally {
      abortControllerRef.current = null;
    }
  }, [ollamaSettings, abortControllerRef, shouldStopGeneration]);

  // Generate summary
  const generateSummary = useCallback(async (summaryPrompt: string, text: string): Promise<string> => {
    setIsGenerating(true);
    setGenerationType('summary');
    
    try {
      const fullPrompt = `${summaryPrompt}\n\n${text}`;
      let summary = '';
      
      await generateText({
        prompt: fullPrompt,
        onToken: (token) => {
          summary += token;
        },
      });
      
      return summary;
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  }, [generateText, setIsGenerating, setGenerationType]);

  // Generate a single question
  const generateQuestion = useCallback(async (row: QAPair, promptTemplate: string): Promise<string> => {
    try {
      // Skip if already generating
      if (row.generating?.question) return '';
      
      // Update the row to indicate generation is in progress
      const updatedQA: QAPair[] = qaPairs.map(qa => 
        qa.id === row.id 
          ? { 
              ...qa, 
              generating: { 
                question: true, 
                answer: qa.generating?.answer || false 
              } 
            } 
          : qa
      );
      setQaPairs(updatedQA);
      
      // Process the prompt template
      const processedPrompt = replacePlaceholders(
        promptTemplate, 
        { summary: docSummary, chunk: row.context, question: '' }
      );
      
      // Generate the question
      let question = '';
      await generateText({
        prompt: processedPrompt,
        onToken: (token) => {
          question += token;
        },
        onComplete: (fullText) => {
          // Update the QA pair with the generated question
          const finalUpdatedQA: QAPair[] = qaPairs.map(qa => 
            qa.id === row.id 
              ? { 
                  ...qa, 
                  question: fullText, 
                  generating: { 
                    question: false, 
                    answer: qa.generating?.answer || false 
                  } 
                } 
              : qa
          );
          setQaPairs(finalUpdatedQA);
        }
      });
      
      return question;
    } catch (err) {
      console.error('Error generating question:', err);
      
      // Update the QA pair to indicate generation has stopped
      const finalUpdatedQA: QAPair[] = qaPairs.map(qa => 
        qa.id === row.id 
          ? { 
              ...qa, 
              generating: { 
                question: false, 
                answer: qa.generating?.answer || false 
              } 
            } 
          : qa
      );
      setQaPairs(finalUpdatedQA);
      
      throw err;
    }
  }, [qaPairs, setQaPairs, generateText, docSummary]);

  // Generate a single answer
  const generateAnswer = useCallback(async (row: QAPair, promptTemplate: string): Promise<string> => {
    try {
      // Skip if already generating or no question
      if (row.generating?.answer || !row.question) return '';
      
      // Update the row to indicate generation is in progress
      const updatedQA: QAPair[] = qaPairs.map(qa => 
        qa.id === row.id 
          ? { 
              ...qa, 
              generating: { 
                answer: true, 
                question: qa.generating?.question || false 
              } 
            } 
          : qa
      );
      setQaPairs(updatedQA);
      
      // Process the prompt template
      const processedPrompt = replacePlaceholders(
        promptTemplate, 
        { summary: docSummary, chunk: row.context, question: row.question }
      );
      
      // Generate the answer
      let answer = '';
      await generateText({
        prompt: processedPrompt,
        onToken: (token) => {
          answer += token;
        },
        onComplete: (fullText) => {
          // Update the QA pair with the generated answer
          const finalUpdatedQA: QAPair[] = qaPairs.map(qa => 
            qa.id === row.id 
              ? { 
                  ...qa, 
                  answer: fullText, 
                  generating: { 
                    answer: false, 
                    question: qa.generating?.question || false 
                  } 
                } 
              : qa
          );
          setQaPairs(finalUpdatedQA);
        }
      });
      
      return answer;
    } catch (err) {
      console.error('Error generating answer:', err);
      
      // Update the QA pair to indicate generation has stopped
      const finalUpdatedQA: QAPair[] = qaPairs.map(qa => 
        qa.id === row.id 
          ? { 
              ...qa, 
              generating: { 
                answer: false, 
                question: qa.generating?.question || false 
              } 
            } 
          : qa
      );
      setQaPairs(finalUpdatedQA);
      
      throw err;
    }
  }, [qaPairs, setQaPairs, generateText, docSummary]);

  // Generate both question and answer for a QA pair
  const generateQA = useCallback(async (row: QAPair, questionPrompt: string, answerPrompt: string): Promise<{ question: string; answer: string }> => {
    try {
      // Generate question first
      const question = await generateQuestion(row, questionPrompt);
      
      // If question generation succeeded, generate answer
      if (question) {
        const updatedRow = { ...row, question };
        const answer = await generateAnswer(updatedRow, answerPrompt);
        return { question, answer };
      }
      
      return { question: '', answer: '' };
    } catch (err) {
      console.error('Error in generateQA:', err);
      return { question: '', answer: '' };
    }
  }, [generateQuestion, generateAnswer]);

  // Generate multiple QA pairs
  const generateMultipleQA = useCallback(async (
    rows: QAPair[], 
    questionPrompt: string, 
    answerPrompt: string
  ): Promise<void> => {
    setIsGenerating(true);
    setGenerationType('qa');
    setGenerationProgress({ completed: 0, total: rows.length });
    
    try {
      let completed = 0;
      
      for (const row of rows) {
        // Check if generation should be stopped
        if (shouldStopGeneration) {
          break;
        }
        
        await generateQA(row, questionPrompt, answerPrompt);
        
        // Update progress
        completed++;
        setGenerationProgress({ completed, total: rows.length });
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
    }
  }, [generateQA, setIsGenerating, setGenerationType, setGenerationProgress, shouldStopGeneration]);

  // Generate multiple questions only
  const generateMultipleQuestions = useCallback(async (
    rows: QAPair[], 
    questionPrompt: string
  ): Promise<void> => {
    setIsGenerating(true);
    setGenerationType('question');
    setGenerationProgress({ completed: 0, total: rows.length });
    
    try {
      let completed = 0;
      
      for (const row of rows) {
        // Check if generation should be stopped
        if (shouldStopGeneration) {
          break;
        }
        
        await generateQuestion(row, questionPrompt);
        
        // Update progress
        completed++;
        setGenerationProgress({ completed, total: rows.length });
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
    }
  }, [generateQuestion, setIsGenerating, setGenerationType, setGenerationProgress, shouldStopGeneration]);

  // Generate multiple answers only
  const generateMultipleAnswers = useCallback(async (
    rows: QAPair[], 
    answerPrompt: string
  ): Promise<void> => {
    setIsGenerating(true);
    setGenerationType('answer');
    setGenerationProgress({ completed: 0, total: rows.length });
    
    try {
      let completed = 0;
      
      for (const row of rows) {
        // Check if generation should be stopped
        if (shouldStopGeneration) {
          break;
        }
        
        // Only generate answer if there's a question
        if (row.question) {
          await generateAnswer(row, answerPrompt);
        }
        
        // Update progress
        completed++;
        setGenerationProgress({ completed, total: rows.length });
      }
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setGenerationProgress({ completed: 0, total: 0 });
    }
  }, [generateAnswer, setIsGenerating, setGenerationType, setGenerationProgress, shouldStopGeneration]);

  return {
    generateText,
    generateSummary,
    generateQuestion,
    generateAnswer,
    generateQA,
    generateMultipleQA,
    generateMultipleQuestions,
    generateMultipleAnswers,
  };
}; 
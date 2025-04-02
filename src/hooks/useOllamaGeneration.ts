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

// Helper to extract base64 image data from context HTML
const extractBase64ImageFromHTML = (html: string): string | null => {
  // Check if the HTML contains image
  if (!html.includes('<div class="pdf-page-image">')) return null;
  
  try {
    // Extract the base64 data from the src attribute with better regex pattern
    // This pattern will capture the MIME type and the base64 data separately
    const imgSrcMatch = html.match(/src="data:image\/([^;]+);base64,([^"]+)"/);
    
    if (!imgSrcMatch || imgSrcMatch.length < 3) {
      console.log('[DEBUG] Failed to extract base64 image data from HTML');
      return null;
    }
    
    const mimeType = imgSrcMatch[1];
    const base64Data = imgSrcMatch[2];
    
    // Perform basic validation on the base64 data
    if (!base64Data || base64Data.length < 100) { // Arbitrary minimum length to ensure we have actual data
      console.log('[DEBUG] Extracted base64 data is too short or invalid');
      return null;
    }
    
    // Only log the length to avoid huge console output
    console.log(`[DEBUG] Successfully extracted base64 image data (${mimeType}), length: ${base64Data.length}`);
    
    return base64Data;
  } catch (error) {
    console.error('[DEBUG] Error extracting base64 image data:', error);
    return null;
  }
};

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
      
      // Check if the prompt includes image HTML
      const containsImageHtml = prompt.includes('<div class="pdf-page-image">');
      if (containsImageHtml) {
        console.log('[DEBUG] Detected image HTML in prompt');
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
        cleanPrompt = beforeHtml + 'I have provided an image for analysis.' + afterHtml;
        
        console.log('[DEBUG] Cleaned prompt:', cleanPrompt.substring(0, 200) + '...');
      }
      
      // Prepare request body based on whether we have an image
      const requestBody: any = {
        model: ollamaSettings.model,
        prompt: cleanPrompt,
        options: {
          temperature: ollamaSettings.temperature,
          top_p: ollamaSettings.topP,
          seed: ollamaSettings.useFixedSeed ? ollamaSettings.seed : undefined,
          num_ctx: ollamaSettings.numCtx,
        },
        stream: true,
      };
      
      // Add images array if we have an image
      if (imageBase64) {
        requestBody.images = [imageBase64];
        console.log('[DEBUG] Added image data to request. Request structure:', 
          JSON.stringify({
            ...requestBody,
            images: ['[BASE64_DATA_PRESENT]'] // Don't log the actual base64 data
          }, null, 2)
        );
      }
      
      console.log('[DEBUG] Sending request to Ollama API with model:', ollamaSettings.model);
      
      const response = await fetch(`${OLLAMA_API_BASE}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      // Handle errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Ollama API error:', response.status, errorText);
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
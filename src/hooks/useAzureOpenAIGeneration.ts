import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { QAPair } from '../types';

interface GenerateTextOptions {
  prompt: string;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
}

export const useAzureOpenAIGeneration = () => {
  const {
    azureSettings,
    abortControllerRef,
    shouldStopGeneration,
    setIsGenerating,
    setGenerationType,
    setGenerationProgress,
  } = useAppContext();

  // Core generate text function
  const generateText = useCallback(async ({ prompt, onToken, onComplete }: GenerateTextOptions): Promise<string> => {
    try {
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Build the endpoint URL
      const url = `${azureSettings.endpoint}/openai/deployments/${azureSettings.deploymentName}/completions?api-version=${azureSettings.apiVersion}`;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (azureSettings.authMethod === 'apiKey') {
        headers['api-key'] = azureSettings.apiKey ?? '';
      } else {
        // For AAD auth, we rely on the browser's auth session
        // Azure REST API will use the browser's auth token automatically
        // This works when hosted in a domain where AAD SSO is set up
      }

      const body = {
        prompt,
        temperature: azureSettings.temperature,
        top_p: azureSettings.topP,
        max_tokens: azureSettings.maxTokens,
        stream: Boolean(onToken), // Stream only if we have an onToken handler
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      // Handle errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} ${errorText}`);
      }

      // If streaming is enabled
      if (onToken) {
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

          // Parse the chunk - Azure OpenAI returns Server-Sent Events (SSE)
          const chunk = decoder.decode(value);
          const lines = chunk
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.replace(/^data: /, ''));

          for (const line of lines) {
            if (line === '[DONE]') {
              break;
            }

            try {
              const parsedLine = JSON.parse(line);
              const token = parsedLine.choices?.[0]?.text || '';
              
              if (token) {
                fullText += token;
                onToken(token);
              }
            } catch (e) {
              console.error('Error parsing SSE chunk:', line, e);
            }
          }
        }

        if (onComplete) {
          onComplete(fullText);
        }
        
        return fullText;
      } else {
        // Non-streaming response
        const json = await response.json();
        const text = json?.choices?.[0]?.text ?? '';

        if (onComplete) {
          onComplete(text);
        }

        return text;
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Azure OpenAI generation error:', error);
      }
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [azureSettings, abortControllerRef, shouldStopGeneration, setGenerationProgress]);

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

  // For consistency with useOllamaGeneration, we'll provide similar methods
  const generateQA = useCallback(async (
    chunkList: string[],
    summaryText: string,
    questionPrompt: string,
    answerPrompt: string,
    onProgress: (progress: { completed: number; total: number }) => void
  ): Promise<QAPair[]> => {
    // Implementation similar to useOllamaGeneration's generateQA
    
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
        const questionFullPrompt = `${questionPrompt}\n\nText: ${chunk}\n\nSummary: ${summaryText}\n\nQuestion:`;
        const question = await generateText({ prompt: questionFullPrompt });
        
        // Generate answer
        const answerFullPrompt = `${answerPrompt}\n\nText: ${chunk}\n\nSummary: ${summaryText}\n\nQuestion: ${question}\n\nAnswer:`;
        const answer = await generateText({ prompt: answerFullPrompt });
        
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
  }, [generateText, setIsGenerating, setGenerationType, shouldStopGeneration]);

  return {
    generateAzureText: generateText,
    generateAzureSummary: generateSummary,
    generateAzureQA: generateQA,
  };
}; 
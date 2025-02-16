export const OLLAMA_API_BASE = 'http://localhost:11434'

interface OllamaResponse {
  error?: string;
  models?: Array<{ name: string }>;
}

// Helper to determine if we're running on a local network
const isLocalNetwork = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' 
    || hostname === '127.0.0.1'
    || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
    || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
};

export const fetchWithCORS = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${OLLAMA_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('CORS') ||
          error.message.includes('NetworkError')) {
        throw new Error('CORS_ERROR');
      }
    }
    throw error;
  }
};

export const getOllamaStartCommand = () => {
  const origin = window.location.origin;
  if (isLocalNetwork()) {
    return `OLLAMA_ORIGINS="${origin}" ollama serve`;
  }
  return `OLLAMA_ORIGINS="${origin}" ollama serve`;
};

export const checkOllamaConnection = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    const response = await fetchWithCORS('/api/tags');
    const data: OllamaResponse = await response.json();
    
    if (data.error) {
      return { connected: false, error: data.error };
    }
    
    return { connected: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CORS_ERROR') {
        const startCommand = getOllamaStartCommand();
        return { 
          connected: false, 
          error: `Cannot connect to Ollama. Please start Ollama with:\n\n${startCommand}` 
        };
      }
    }
    return { 
      connected: false, 
      error: 'Cannot connect to Ollama. Please make sure it is running with CORS enabled.' 
    };
  }
}; 
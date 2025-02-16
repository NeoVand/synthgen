import React from 'react'

export const OllamaConnectionError: React.FC = () => {
  const isLocalhost = window.location.hostname === 'localhost'
  
  return (
    <div className="error-message p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-xl font-bold text-red-800 mb-3">Cannot connect to Ollama</h3>
      <p className="mb-2">To use this application, you need to:</p>
      <ol className="list-decimal list-inside space-y-2 mb-4">
        <li>Install Ollama on your local machine from <a 
          href="https://ollama.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          ollama.ai
        </a></li>
        
        <li>Start Ollama with CORS enabled:
          <pre className="bg-gray-100 p-2 mt-1 rounded">
            {isLocalhost 
              ? 'ollama serve'
              : 'OLLAMA_ORIGINS=https://neovand.github.io ollama serve'}
          </pre>
        </li>
        
        {!isLocalhost && (
          <li>
            Allow your browser to connect to localhost:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Chrome/Edge users: Enable "Insecure origins treated as secure" in chrome://flags/</li>
              <li>Firefox users: Set "security.fileuri.strict_origin_policy" to false in about:config</li>
            </ul>
          </li>
        )}
      </ol>
      
      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> This application runs entirely in your browser and requires a local Ollama installation.
          No data is sent to any external servers - all AI processing happens on your machine.
        </p>
      </div>
    </div>
  )
} 
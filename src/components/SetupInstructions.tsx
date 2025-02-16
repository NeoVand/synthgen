import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { getOllamaStartCommand } from '../config/api';

export const SetupInstructions: React.FC = () => {
  const startCommand = getOllamaStartCommand();
  const isLocalhost = window.location.hostname === 'localhost';
  
  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Setup Instructions
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Alert severity="info">
          This application requires Ollama to be running locally on your machine with CORS enabled.
        </Alert>
      </Box>
      
      <Box component="ol" sx={{ pl: 2 }}>
        <li>
          <Typography>
            Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a>
          </Typography>
        </li>
        
        <li>
          <Typography>
            Start Ollama with CORS enabled:
            <Box component="code" sx={{ 
              display: 'block',
              bgcolor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              my: 1,
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
              {startCommand}
            </Box>
          </Typography>
        </li>
        
        {!isLocalhost && (
          <li>
            <Typography paragraph>
              Configure your browser to allow localhost connections:
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <strong>Chrome/Edge:</strong> Enable "Insecure origins treated as secure" in chrome://flags/
                </li>
                <li>
                  <strong>Firefox:</strong> Set "security.fileuri.strict_origin_policy" to false in about:config
                </li>
              </Box>
            </Typography>
          </li>
        )}
      </Box>
    </Paper>
  );
}; 
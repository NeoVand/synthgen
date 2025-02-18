import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
  IconButton,
  Link,
  Divider,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpIcon from '@mui/icons-material/Help';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface OllamaConnectionModalProps {
  open: boolean;
  onClose?: () => void;
  isConnected: boolean;
  error?: string;
}

const OllamaConnectionModal: React.FC<OllamaConnectionModalProps> = ({
  open,
  onClose,
  isConnected,
  error,
}) => {
  const theme = useTheme();
  const isWindows = navigator.platform.toLowerCase().includes('win');
  const isLocalNetwork = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname);

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const renderOllamaSetup = () => {
    if (isConnected) return null;
    
    return (
      <>
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
          First Time Setup:
        </Typography>
        <Box component="ol" sx={{ mt: 0, pl: 2 }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              Install Ollama from <Link href="https://ollama.com" target="_blank" rel="noopener">ollama.com</Link>
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Pull a model (e.g., Mistral) by running:
            </Typography>
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
              p: 2,
              my: 1,
              borderRadius: 1,
              position: 'relative'
            }}>
              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                ollama pull mistral
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopyCommand('ollama pull mistral')}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Start Ollama:
            </Typography>
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
              p: 2,
              my: 1,
              borderRadius: 1,
              position: 'relative'
            }}>
              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                {isLocalNetwork ? 'ollama serve' : `OLLAMA_ORIGINS="${window.location.origin}" ollama serve`}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopyCommand(isLocalNetwork ? 'ollama serve' : `OLLAMA_ORIGINS="${window.location.origin}" ollama serve`)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </li>
        </Box>
      </>
    );
  };

  const renderCORSInstructions = () => {
    // If we're on a local network and connected, just show how to stop Ollama
    if (isLocalNetwork && isConnected) {
      return (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
            To stop Ollama:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Simply close the terminal window running Ollama.
          </Typography>
        </>
      );
    }
    
    // If we're on a local network and not connected, don't show CORS instructions
    if (isLocalNetwork && !isConnected) {
      return null;
    }

    if (isWindows) {
      return (
        <>
          {!isConnected && <Divider sx={{ my: 2 }} />}
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
            {isConnected ? 'To deactivate CORS and stop Ollama:' : 'To enable CORS on Windows:'}
          </Typography>
          {!isConnected ? (
            <>
              <Box sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
                p: 2,
                borderRadius: 1,
                position: 'relative'
              }}>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  setx OLLAMA_ORIGINS "{window.location.origin}"
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyCommand(`setx OLLAMA_ORIGINS "${window.location.origin}"`)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                After running this command, restart Ollama for the changes to take effect.
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
                p: 2,
                borderRadius: 1,
                position: 'relative'
              }}>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  reg delete HKCU\Environment /F /V OLLAMA_ORIGINS
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyCommand('reg delete HKCU\\Environment /F /V OLLAMA_ORIGINS')}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                1. Run this command in a terminal
                <br />
                2. Close all terminal windows running Ollama
                <br />
                3. Start Ollama normally again with <code>ollama serve</code>
              </Typography>
            </>
          )}
        </>
      );
    }

    return (
      <>
        {!isConnected && <Divider sx={{ my: 2 }} />}
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
          {isConnected ? 'To deactivate CORS and stop Ollama:' : 'To enable CORS on Mac/Linux:'}
        </Typography>
        {!isConnected ? (
          <>
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
              p: 2,
              borderRadius: 1,
              position: 'relative'
            }}>
              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                OLLAMA_ORIGINS="{window.location.origin}" ollama serve
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopyCommand(`OLLAMA_ORIGINS="${window.location.origin}" ollama serve`)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Run this command in a terminal to start Ollama with CORS enabled.
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            1. Close the terminal window running Ollama
            <br />
            2. Start Ollama normally again with <code>ollama serve</code>
          </Typography>
        )}
      </>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.8)
            : alpha('#FFFFFF', 0.8),
          backdropFilter: 'blur(20px)',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: isConnected ? theme.palette.success.main : theme.palette.error.main
      }}>
        {isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {isConnected ? 'Connected to Ollama' : 'Cannot Connect to Ollama'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        {renderOllamaSetup()}
        {renderCORSInstructions()}

        <Box sx={{ 
          mt: 3,
          p: 2,
          bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <HelpIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          <Typography variant="body2" color="text.secondary">
            You can find these instructions again by clicking the help button in the model settings section.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            px: 3
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OllamaConnectionModal; 
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

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const renderInstructions = () => {
    if (isWindows) {
      return (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
            To activate CORS on Windows:
          </Typography>
          <Box sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
            p: 2,
            borderRadius: 1,
            position: 'relative'
          }}>
            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
              setx OLLAMA_ORIGINS "https://neovand.github.io"
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => handleCopyCommand('setx OLLAMA_ORIGINS "https://neovand.github.io"')}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            After running this command, restart Ollama for the changes to take effect.
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
            To deactivate CORS on Windows:
          </Typography>
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
        </>
      );
    }

    return (
      <>
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
          On Mac/Linux, quit Ollama and run:
        </Typography>
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha('#000', 0.03),
          p: 2,
          borderRadius: 1,
          position: 'relative'
        }}>
          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
            OLLAMA_ORIGINS="https://neovand.github.io" ollama serve
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => handleCopyCommand('OLLAMA_ORIGINS="https://neovand.github.io" ollama serve')}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Box>
      </>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={isConnected ? onClose : undefined}
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
        
        {!isConnected && renderInstructions()}

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
      {isConnected && (
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
      )}
    </Dialog>
  );
};

export default OllamaConnectionModal; 
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  useTheme,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { QAPair } from '../types';

// Define ChunkingAlgorithm locally if it's not exported
type ChunkingAlgorithm = 'recursive' | 'line' | 'csv-tsv' | 'jsonl' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';

interface FlashcardViewProps {
  qaPairs: QAPair[];
  onUpdateQA: (updatedQA: QAPair) => void;
  currentIndex: number;
  chunkingAlgorithm: ChunkingAlgorithm;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({
  qaPairs,
  onUpdateQA,
  currentIndex,
}) => {
  const theme = useTheme();
  const currentQA = qaPairs[currentIndex];

  // Common text field styles
  const commonTextFieldStyles = {
    width: '100%',
    '& .MuiInputBase-root': {
      padding: 0,
      '& textarea': {
        padding: '12px',
        minHeight: '100px',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          borderRadius: '100px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(0, 0, 0, 0.2)',
          }
        }
      }
    }
  };

  // Common paper styles for all sections
  const commonPaperStyles = {
    p: 2,
    bgcolor: theme.palette.background.paper,
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
    transition: 'background-color 0.2s ease',
    '&:focus-within': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(0, 0, 0, 0.3)'
        : 'rgba(255, 255, 255, 0.6)',
    },
  };

  // Common text container styles

  // Context text styles
  const contextTextStyles = {
    '& textarea': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '0.9rem',
      lineHeight: 1.6,
    }
  };

  // Question and answer text styles
  const qaTextStyles = {
    '& textarea': {
      fontSize: '1.25rem',
      lineHeight: 1.4,
      fontFamily: 'var(--font-primary)',
    }
  };

  // Common section header styles
  const sectionHeaderStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 0.5,
    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem',
    }
  };

  // Section-specific color styles
  const contextHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.mode === 'dark'
      ? theme.palette.primary.light
      : theme.palette.primary.dark,
  };

  const questionHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.mode === 'dark'
      ? theme.palette.secondary.light
      : theme.palette.secondary.dark,
  };

  const answerHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.mode === 'dark'
      ? theme.palette.success.light
      : theme.palette.success.dark,
  };

  if (qaPairs.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%' 
      }}>
        <Typography variant="body1" color="text.secondary">
          No chunks/Q&A yet. Upload & chunk, then generate Q&A.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Flashcard Content */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        p: 2,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          borderRadius: '100px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(0, 0, 0, 0.2)',
          }
        }
      }}>
        {/* Context Section */}
        <Paper elevation={0} sx={commonPaperStyles}>
          <Box sx={contextHeaderStyles}>
            <ExtensionIcon />
            <Typography variant="overline" sx={{ 
              letterSpacing: '0.1em',
              fontWeight: 500
            }}>
              Context
            </Typography>
          </Box>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.context}
            onChange={(e) => onUpdateQA({ ...currentQA, context: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                ...commonTextFieldStyles,
                ...contextTextStyles,
              }
            }}
          />
        </Paper>

        {/* Question Section */}
        <Paper elevation={0} sx={commonPaperStyles}>
          <Box sx={questionHeaderStyles}>
            <HelpOutlineIcon />
            <Typography variant="overline" sx={{ 
              letterSpacing: '0.1em',
              fontWeight: 500
            }}>
              Question
            </Typography>
          </Box>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.question}
            onChange={(e) => onUpdateQA({ ...currentQA, question: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                ...commonTextFieldStyles,
                ...qaTextStyles,
              }
            }}
          />
        </Paper>

        {/* Answer Section */}
        <Paper elevation={0} sx={commonPaperStyles}>
          <Box sx={answerHeaderStyles}>
            <LightbulbOutlinedIcon />
            <Typography variant="overline" sx={{ 
              letterSpacing: '0.1em',
              fontWeight: 500
            }}>
              Answer
            </Typography>
          </Box>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.answer}
            onChange={(e) => onUpdateQA({ ...currentQA, answer: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                ...commonTextFieldStyles,
                ...qaTextStyles,
              }
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default FlashcardView; 
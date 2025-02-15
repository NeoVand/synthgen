import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';

interface QAPair {
  id: number;
  context: string;
  question: string;
  answer: string;
  selected?: boolean;
  generating?: {
    question: boolean;
    answer: boolean;
  };
}

interface FlashcardViewProps {
  qaPairs: QAPair[];
  isGenerating: boolean;
  onUpdateQA: (updatedQA: QAPair) => void;
  currentIndex: number;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({
  qaPairs,
  isGenerating,
  onUpdateQA,
  currentIndex,
}) => {
  const theme = useTheme();
  const currentQA = qaPairs[currentIndex];

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
      gap: 2,
      p: 2 
    }}>
      {/* Flashcard Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
        {/* Context Section */}
        <Paper elevation={0} sx={{ 
          p: 3,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.4)
            : alpha('#FFFFFF', 0.5),
          backdropFilter: 'blur(20px)',
          borderRadius: 2,
        }}>
          <Typography variant="overline" sx={{ 
            display: 'block', 
            mb: 1,
            color: theme.palette.text.secondary,
            letterSpacing: '0.1em',
            fontWeight: 500
          }}>
            Context
          </Typography>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.context}
            onChange={(e) => onUpdateQA({ ...currentQA, context: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.1rem',
                lineHeight: 1.6,
                '& textarea': {
                  padding: 0,
                }
              }
            }}
          />
        </Paper>

        {/* Question Section */}
        <Paper elevation={0} sx={{ 
          p: 3,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.4)
            : alpha('#FFFFFF', 0.5),
          backdropFilter: 'blur(20px)',
          borderRadius: 2,
        }}>
          <Typography variant="overline" sx={{ 
            display: 'block', 
            mb: 1,
            color: theme.palette.text.secondary,
            letterSpacing: '0.1em',
            fontWeight: 500
          }}>
            Question
          </Typography>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.question}
            onChange={(e) => onUpdateQA({ ...currentQA, question: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.25rem',
                lineHeight: 1.6,
                fontWeight: 500,
                '& textarea': {
                  padding: 0,
                }
              }
            }}
          />
        </Paper>

        {/* Answer Section */}
        <Paper elevation={0} sx={{ 
          p: 3,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.4)
            : alpha('#FFFFFF', 0.5),
          backdropFilter: 'blur(20px)',
          borderRadius: 2,
        }}>
          <Typography variant="overline" sx={{ 
            display: 'block', 
            mb: 1,
            color: theme.palette.text.secondary,
            letterSpacing: '0.1em',
            fontWeight: 500
          }}>
            Answer
          </Typography>
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={currentQA.answer}
            onChange={(e) => onUpdateQA({ ...currentQA, answer: e.target.value })}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.1rem',
                lineHeight: 1.6,
                '& textarea': {
                  padding: 0,
                }
              }
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default FlashcardView; 
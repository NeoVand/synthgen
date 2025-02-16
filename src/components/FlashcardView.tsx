import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

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
  onUpdateQA: (updatedQA: QAPair) => void;
  currentIndex: number;
  chunkingAlgorithm: 'recursive' | 'line' | 'line-with-header';
}

const FlashcardView: React.FC<FlashcardViewProps> = ({
  qaPairs,
  onUpdateQA,
  currentIndex,
  chunkingAlgorithm,
}) => {
  const theme = useTheme();
  const currentQA = qaPairs[currentIndex];

  // Common text field styles
  const commonTextFieldStyles = {
    lineHeight: 1.6,
    '& textarea': {
      padding: 0,
    }
  };

  // Question and answer text styles
  const qaTextStyles = {
    ...commonTextFieldStyles,
    fontSize: '1.1rem',
  };

  // Context text styles
  const contextTextStyles = {
    ...commonTextFieldStyles,
    fontSize: '0.9rem',
  };

  // Common section header styles
  const sectionHeaderStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem',
    }
  };

  // Section-specific color styles
  const contextHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.primary.main,
  };

  const questionHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.secondary.main,
  };

  const answerHeaderStyles = {
    ...sectionHeaderStyles,
    color: theme.palette.success.main,
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
          <Box sx={contextHeaderStyles}>
            <ExtensionIcon />
            <Typography variant="overline" sx={{ 
              letterSpacing: '0.1em',
              fontWeight: 500
            }}>
              Context
            </Typography>
          </Box>
          {chunkingAlgorithm === 'line-with-header' ? (
            <Box sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              mt: 1
            }}>
              {currentQA.context.split('\n').map((line, index) => (
                <Box 
                  key={index}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 2,
                    p: 1,
                    borderBottom: index === 0 ? `2px solid ${theme.palette.divider}` : `1px solid ${theme.palette.divider}`,
                    bgcolor: index === 0 ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                  }}
                >
                  {line.split(/[,\t]/).map((cell, cellIndex) => (
                    <TextField
                      key={cellIndex}
                      value={cell.trim()}
                      onChange={(e) => {
                        const lines = currentQA.context.split('\n');
                        const cells = lines[index].split(/[,\t]/);
                        cells[cellIndex] = e.target.value;
                        lines[index] = cells.join(',');
                        onUpdateQA({
                          ...currentQA,
                          context: lines.join('\n')
                        });
                      }}
                      variant="standard"
                      multiline
                      fullWidth
                      InputProps={{
                        disableUnderline: true,
                        sx: {
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          padding: '4px 8px',
                          '& textarea': {
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          },
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                          },
                          borderRadius: 1
                        }
                      }}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          ) : (
            <TextField
              multiline
              fullWidth
              variant="standard"
              value={currentQA.context}
              onChange={(e) => onUpdateQA({ ...currentQA, context: e.target.value })}
              InputProps={{
                disableUnderline: true,
                sx: {
                  ...contextTextStyles,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }
              }}
            />
          )}
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
                ...qaTextStyles,
                fontWeight: 500,
                fontFamily: 'var(--font-primary)',
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
                ...qaTextStyles,
                fontFamily: 'var(--font-primary)',
              }
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default FlashcardView; 
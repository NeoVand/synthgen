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
  chunkingAlgorithm: 'recursive' | 'line' | 'csv-tsv' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';
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
          {chunkingAlgorithm === 'csv-tsv' ? (
            <Box sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              mt: 1,
              overflow: 'auto'
            }}>
              {(() => {
                // Parse the context into key-value pairs
                const pairs = currentQA.context.split('\n').map(line => {
                  const colonIndex = line.indexOf(':');
                  if (colonIndex === -1) return null;
                  return {
                    key: line.substring(0, colonIndex).trim(),
                    value: line.substring(colonIndex + 1).trim()
                  };
                }).filter(Boolean) as { key: string; value: string }[];

                return pairs.map(({ key, value }, index) => (
                  <Box 
                    key={index}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 1,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.04)
                      },
                    }}
                  >
                    <Box sx={{
                      minWidth: '150px',
                      maxWidth: '200px',
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      opacity: 0.8,
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {key}
                    </Box>
                    <TextField
                      value={value}
                      onChange={(e) => {
                        const newPairs = [...pairs];
                        newPairs[index] = { key, value: e.target.value };
                        const newContext = newPairs
                          .map(p => `${p.key}: ${p.value}`)
                          .join('\n');
                        onUpdateQA({
                          ...currentQA,
                          context: newContext
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
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s ease',
                          borderRadius: 1,
                          '&:focus-within': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(0, 0, 0, 0.3)'
                              : 'rgba(255, 255, 255, 0.6)',
                          },
                          '& textarea': {
                            padding: '4px 8px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          }
                        }
                      }}
                    />
                  </Box>
                ));
              })()}
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
                  ...commonTextFieldStyles,
                  ...contextTextStyles,
                }
              }}
            />
          )}
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
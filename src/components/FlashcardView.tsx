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
  chunkingAlgorithm: 'recursive' | 'line' | 'csv-tsv';
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
          {chunkingAlgorithm === 'csv-tsv' ? (
            <Box sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              mt: 1
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
                          padding: '4px 8px',
                          '& textarea': {
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          },
                          borderRadius: 1,
                          minHeight: '24px'
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
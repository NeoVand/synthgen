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
  chunkingAlgorithm: 'recursive' | 'line' | 'csv-tsv' | 'jsonl' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';
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
          {(chunkingAlgorithm === 'csv-tsv' || chunkingAlgorithm === 'jsonl') ? (
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

                // Group consecutive lines with the same key (for handling multi-line lists)
                const groupedPairs: { key: string; values: string[]; isArray: boolean }[] = [];
                
                // First pass: identify all unique keys
                const uniqueKeys = new Set<string>();
                pairs.forEach(pair => uniqueKeys.add(pair.key));
                
                // Second pass: group values by key
                uniqueKeys.forEach(key => {
                  const keyValues = pairs
                    .filter(pair => pair.key === key)
                    .map(pair => pair.value);
                  
                  // Check if this is an array (multiple values with same key or numbered list format)
                  const isArray = keyValues.length > 1 || 
                                 (keyValues.length === 1 && /^\s*\d+\.\s/.test(keyValues[0]));
                  
                  // For arrays with a single value that contains multiple lines with numbers
                  let processedValues = keyValues;
                  if (keyValues.length === 1 && keyValues[0].includes('\n')) {
                    // Split the multi-line value into separate lines
                    processedValues = keyValues[0].split('\n').filter(line => line.trim() !== '');
                  }
                  
                  groupedPairs.push({
                    key,
                    values: processedValues,
                    isArray
                  });
                });

                return groupedPairs.map(({ key, values, isArray }, index) => {
                  // For arrays, join all values with newlines
                  const value = values.join('\n');
                  
                  // Check if the value is a JSON object or array
                  const isJsonObject = value.trim().startsWith('{') && value.trim().endsWith('}');
                  const isJsonArray = value.trim().startsWith('[') && value.trim().endsWith(']');
                  const isNumberedList = isArray || /^\s*\d+\.\s/.test(value);
                  
                  // For JSONL data, try to format complex values nicely
                  let formattedValue = value;
                  let isComplex = false;
                  
                  if (chunkingAlgorithm === 'jsonl' || chunkingAlgorithm === 'csv-tsv') {
                    if (isJsonObject || isJsonArray) {
                      try {
                        // Try to parse and pretty-print JSON
                        const parsedValue = JSON.parse(value);
                        formattedValue = JSON.stringify(parsedValue, null, 2);
                        isComplex = true;
                      } catch (e) {
                        // If parsing fails, use the original value
                        console.log('Failed to parse JSON value:', e);
                      }
                    } else if (isNumberedList) {
                      // Already formatted as a numbered list, keep as is
                      isComplex = true;
                      
                      // Make sure each line starts with a number if this is an array
                      if (isArray && values.length > 1) {
                        // Check if the values already have numbers
                        const allHaveNumbers = values.every(v => /^\s*\d+\.\s/.test(v));
                        
                        if (!allHaveNumbers) {
                          // Add numbers to the values
                          formattedValue = values.map((v, i) => `${i + 1}. ${v}`).join('\n');
                        }
                      }
                    }
                  }
                  
                  return (
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
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {key}
                        {isNumberedList && (
                          <Box 
                            component="span" 
                            sx={{ 
                              ml: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                              border: '1px solid',
                              borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                              borderRadius: '4px',
                              padding: '0px 4px',
                              height: '16px'
                            }}
                          >
                            [ ]
                          </Box>
                        )}
                      </Box>
                      <TextField
                        value={formattedValue}
                        onChange={(e) => {
                          // For arrays, we need to handle each item separately
                          if (isArray) {
                            const newLines = e.target.value.split('\n');
                            
                            // Create new pairs array with updated values
                            const newPairs = [...pairs];
                            
                            // Remove all existing pairs with this key
                            const filteredPairs = newPairs.filter(p => p.key !== key);
                            
                            // Add new pairs for each line
                            const newPairsForKey = newLines.map(line => ({
                              key,
                              value: line.trim()
                            })).filter(p => p.value !== ''); // Filter out empty lines
                            
                            // Combine filtered pairs with new pairs
                            const combinedPairs = [...filteredPairs, ...newPairsForKey];
                            
                            // Update the context
                            const newContext = combinedPairs
                              .map(p => `${p.key}: ${p.value}`)
                              .join('\n');
                            
                            onUpdateQA({
                              ...currentQA,
                              context: newContext
                            });
                          } else {
                            // Simple case - just update this pair
                            const newPairs = [...pairs];
                            const pairIndex = newPairs.findIndex(p => 
                              p.key === key && p.value === values[0]
                            );
                            
                            if (pairIndex !== -1) {
                              newPairs[pairIndex] = { key, value: e.target.value };
                              const newContext = newPairs
                                .map(p => `${p.key}: ${p.value}`)
                                .join('\n');
                              
                              onUpdateQA({
                                ...currentQA,
                                context: newContext
                              });
                            }
                          }
                        }}
                        fullWidth
                        variant="standard"
                        multiline={isComplex || isArray}
                        minRows={isComplex || isArray ? 3 : 1}
                        maxRows={isComplex || isArray ? 15 : 1}
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            fontSize: '0.9rem',
                            fontFamily: isComplex || isArray ? 
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : 
                              'inherit',
                            whiteSpace: isComplex || isArray ? 'pre-wrap' : 'normal',
                          }
                        }}
                      />
                    </Box>
                  );
                });
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
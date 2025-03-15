import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Grid,
  SelectChangeEvent,
  IconButton,
  Tooltip,
  Collapse,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import TuneIcon from '@mui/icons-material/Tune';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export interface ColumnConfig {
  field: string;
  originalName: string;
  customName: string;
  selected: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'jsonl';
  columns: ColumnConfig[];
  batchSize?: number;
  shuffle?: boolean;
  data?: Array<{id: number, question: string, answer: string, context: string}>;
}

interface ExportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  onShuffle?: () => void;
  qaPairs: Array<{id: number, question: string, answer: string, context: string}>;
  ollamaSettings?: {
    model: string;
    temperature: number;
  };
}

// Define the OLLAMA_BASE_URL
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  open,
  onClose,
  onExport,
  onShuffle,
  qaPairs = [],
  ollamaSettings = { model: 'llama3', temperature: 0.1 }
}) => {
  const theme = useTheme();
  
  // Default export options
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    columns: [
      { field: 'context', originalName: 'context', customName: 'context', selected: true },
      { field: 'question', originalName: 'question', customName: 'question', selected: true },
      { field: 'answer', originalName: 'answer', customName: 'answer', selected: true }
    ]
  });

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [batchSize, setBatchSize] = useState(4);
  const [shuffleData, setShuffleData] = useState(false);
  
  // Add states for MNRL processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [processResult, setProcessResult] = useState<{
    success: boolean;
    message: string;
    filteredCount?: number;
  } | null>(null);
  
  // Add state for filtered pairs
  const [filteredPairs, setFilteredPairs] = useState<typeof qaPairs>([]);

  // Add a new state for detailed logs
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // Reset options when dialog opens
  useEffect(() => {
    if (open) {
      setOptions({
        format: 'csv',
        columns: [
          { field: 'context', originalName: 'context', customName: 'context', selected: true },
          { field: 'question', originalName: 'question', customName: 'question', selected: true },
          { field: 'answer', originalName: 'answer', customName: 'answer', selected: true }
        ]
      });
      setShowAdvancedOptions(false);
      setBatchSize(4);
      setShuffleData(false);
      setProcessResult(null);
      setFilteredPairs([]);
      setProcessingLogs([]);
    }
  }, [open]);

  const handleFormatChange = (event: SelectChangeEvent) => {
    setOptions({
      ...options,
      format: event.target.value as 'csv' | 'jsonl'
    });
  };

  const handleColumnSelection = (field: string, checked: boolean) => {
    setOptions({
      ...options,
      columns: options.columns.map(col => 
        col.field === field ? { ...col, selected: checked } : col
      )
    });
  };

  const handleColumnNameChange = (field: string, newName: string) => {
    setOptions({
      ...options,
      columns: options.columns.map(col => 
        col.field === field ? { ...col, customName: newName } : col
      )
    });
  };

  const handleShuffle = () => {
    if (onShuffle) {
      onShuffle();
      setShuffleData(true);
    }
  };
  
  // Function to process data through Ollama for MNRL validation
  const processMNRL = async () => {
    if (qaPairs.length === 0) {
      setProcessResult({
        success: false,
        message: "No data available to process."
      });
      return;
    }
    
    if (batchSize < 2) {
      setProcessResult({
        success: false,
        message: "Batch size must be at least 2 for MNRL validation."
      });
      return;
    }
    
    setIsProcessing(true);
    setProcessResult(null);
    setProcessedCount(0);
    setProcessingLogs([]); // Clear logs
    
    try {
      // Create a copy of the data to process
      const dataToProcess = [...qaPairs];
      setTotalToProcess(dataToProcess.length);
      
      // Add initial log
      addLog(`Starting MNRL validation with batch size ${batchSize}`);
      addLog(`Total pairs to process: ${dataToProcess.length}`);
      
      // Process with the sliding window approach
      const validPairs: typeof qaPairs = [];
      let currentBatch = [];
      let index = 0;
      let batchNumber = 1;
      
      // Keep track of which pairs we've already processed
      const processedIds = new Set();
      
      // Initialize the first batch
      currentBatch = dataToProcess.slice(0, Math.min(batchSize, dataToProcess.length));
      index = currentBatch.length;
      
      // Mark initial batch as processed
      currentBatch.forEach(pair => processedIds.add(pair.id));
      
      addLog(`Batch #${batchNumber}: Processing initial batch with ${currentBatch.length} pairs (IDs: ${currentBatch.map(p => p.id).join(', ')})`);
      
      while (currentBatch.length >= 2) {
        // Validate the current batch
        const validBatchPairs = await validateBatch(currentBatch);
        
        // Log validation results
        const validIds = validBatchPairs.map(p => p.id);
        const invalidIds = currentBatch.filter(p => !validIds.includes(p.id)).map(p => p.id);
        
        addLog(`Batch #${batchNumber} results: ${validIds.length} valid pairs (IDs: ${validIds.join(', ')})`);
        if (invalidIds.length > 0) {
          addLog(`Batch #${batchNumber}: ${invalidIds.length} invalid pairs (IDs: ${invalidIds.join(', ')}) will be replaced`);
        }
        
        // Add valid pairs to our result (only if not already added)
        for (const pair of validBatchPairs) {
          if (!validPairs.some(p => p.id === pair.id)) {
            validPairs.push(pair);
          }
        }
        
        // Update progress - show how many pairs we've processed out of total
        setProcessedCount(processedIds.size);
        
        // Calculate how many pairs were invalid
        const invalidCount = currentBatch.length - validBatchPairs.length;
        
        // If all pairs were valid or we've processed all data, move to a new batch
        if (invalidCount === 0 || index >= dataToProcess.length) {
          // Start a new batch with the next set of pairs
          currentBatch = dataToProcess.slice(index, index + batchSize);
          
          // Mark new pairs as processed
          currentBatch.forEach(pair => processedIds.add(pair.id));
          
          index += batchSize;
          batchNumber++;
          
          if (currentBatch.length >= 2) {
            addLog(`Batch #${batchNumber}: Processing new batch with ${currentBatch.length} pairs (IDs: ${currentBatch.map(p => p.id).join(', ')})`);
          }
        } else {
          // Replace invalid pairs with new ones
          // Keep only the valid pairs in the current batch
          currentBatch = currentBatch.filter(pair => validIds.includes(pair.id));
          
          // Add new pairs to replace the invalid ones
          const newPairsNeeded = Math.min(invalidCount, dataToProcess.length - index);
          if (newPairsNeeded > 0) {
            const newPairs = dataToProcess.slice(index, index + newPairsNeeded);
            
            // Mark new pairs as processed
            newPairs.forEach(pair => processedIds.add(pair.id));
            
            addLog(`Batch #${batchNumber}: Adding ${newPairs.length} new pairs (IDs: ${newPairs.map(p => p.id).join(', ')}) to replace invalid ones`);
            
            currentBatch = [...currentBatch, ...newPairs];
            index += newPairsNeeded;
          } else if (newPairsNeeded === 0 && index < dataToProcess.length) {
            addLog(`Batch #${batchNumber}: No more pairs available to replace invalid ones`);
          }
          
          batchNumber++;
          addLog(`Batch #${batchNumber}: Continuing with ${currentBatch.length} pairs (IDs: ${currentBatch.map(p => p.id).join(', ')})`);
        }
        
        // If we can't form a batch of at least 2 pairs, we're done
        if (currentBatch.length < 2) {
          addLog(`Insufficient pairs remaining for a valid batch (need at least 2)`);
          break;
        }
      }
      
      // Add any remaining single pair if it exists
      if (currentBatch.length === 1) {
        addLog(`Adding final remaining pair (ID: ${currentBatch[0].id})`);
        if (!validPairs.some(p => p.id === currentBatch[0].id)) {
          validPairs.push(currentBatch[0]);
        }
        processedIds.add(currentBatch[0].id);
        setProcessedCount(processedIds.size);
      }
      
      // Set the filtered pairs
      setFilteredPairs(validPairs);
      
      // Final log
      addLog(`MNRL processing complete. ${validPairs.length} valid pairs from ${processedIds.size} processed pairs (out of ${dataToProcess.length} total).`);
      
      // Set success result
      setProcessResult({
        success: true,
        message: `MNRL processing complete. ${validPairs.length} valid pairs from ${processedIds.size} processed pairs.`,
        filteredCount: validPairs.length
      });
    } catch (error) {
      console.error("Error processing MNRL data:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setProcessResult({
        success: false,
        message: `Error processing data: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to validate a batch of pairs
  const validateBatch = async (batch: typeof qaPairs): Promise<typeof qaPairs> => {
    // Get the first two selected columns to use as anchor and positive
    const selectedColumns = options.columns
      .filter(col => col.selected)
      .slice(0, 2)
      .map(col => col.field);
    
    if (selectedColumns.length < 2) {
      throw new Error("At least two columns must be selected for MNRL processing");
    }
    
    const [anchorField, positiveField] = selectedColumns;
    
    // Prepare the prompt for Ollama
    const prompt = `
You are validating data consisting of anchor-positive pairs according to the following rule:
Each (anchor, positive) pair should follow this rule:
- For a given anchor, its paired positive is an example that has positive correlation with the anchor
- All other positives in different pairs should be negative examples for that anchor
If a pair violates this rule, it should be removed.
Consider the following examples:
you are passed 4 pairs:
pair 1:
anchor: "Where was I born?"
positive: "I was born in New York City"
pair 2:
anchor: "what is the most expensive city in the world?"
positive: "New York City is"
pair 3:
anchor: "What is my favorite dish"
positive: "I love pizza"
pair 4:
anchor: "How are you?"
positive: "I am good"

In this case, you would have to remove either pair 1 or pair 2 because their positive parts are positive to not only the anchor from that pair but are also positive to the anchor's of one another.
Note that although pair 1 and pair 2 violite the given rule, only one of them should be removed, because by removing one, the other fits within the rule.




Please analyze the following batch of ${batch.length} anchor-positive pairs and identify any pairs that violate this rule.
Return only the IDs of valid pairs that follow MNRL requirements and are to not be removed.

${batch.map(pair => `ID: ${pair.id}
Anchor: ${pair[anchorField as keyof typeof pair]}
Positive: ${pair[positiveField as keyof typeof pair]}
---`).join('\n')}

Return only a JSON array containing only the IDs of valid pairs, like this: [1, 3, 5]. No other text or formatting.
`;

    try {
      // Call Ollama API
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaSettings.model,
          prompt: prompt,
          temperature: ollamaSettings.temperature,
          stream: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      const responseText = data.response;
      
      // Extract JSON array from response
      let validIds: number[] = [];
      try {
        // Find anything that looks like a JSON array in the response
        const match = responseText.match(/\[.*?\]/s);
        if (match) {
          validIds = JSON.parse(match[0]);
        } else {
          throw new Error("Could not find valid JSON array in response");
        }
      } catch (error) {
        console.error("Error parsing Ollama response:", error);
        throw new Error(`Failed to parse valid IDs from model response: ${responseText}`);
      }
      
      // Return only the pairs with valid IDs
      return batch.filter(pair => validIds.includes(pair.id));
    } catch (error) {
      console.error("Error calling Ollama:", error);
      throw error;
    }
  };

  const handleExport = () => {
    // Only proceed if at least one column is selected
    if (options.columns.some(col => col.selected)) {
      // If we have filtered pairs from MNRL processing, use those instead
      const dataToExport = filteredPairs.length > 0 ? filteredPairs : undefined;
      
      onExport({
        format: options.format,
        columns: options.columns,
        batchSize: showAdvancedOptions ? batchSize : undefined,
        shuffle: showAdvancedOptions ? shuffleData : undefined,
        // Pass the filtered data if available
        ...(dataToExport && { data: dataToExport })
      });
      onClose();
    } else {
      alert('Please select at least one column to export.');
    }
  };

  // Update this function to check if at least two columns are selected
  const canProcessMNRL = () => {
    // Count how many columns are selected

    const selectedColumnCount = options.columns.filter(col => col.selected).length;
    // Need at least two columns for MNRL (anchor and positive)
    return selectedColumnCount == 2;
  };

  // Helper function to add a log entry
  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          width: '500px',
          maxWidth: '90vw',
          bgcolor: theme.palette.mode === 'dark' ? '#1D1F21' : '#FFFFFF',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        color: theme.palette.primary.main,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <DownloadIcon />
        Export Options
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
          Customize your export format and select which columns to include.
        </DialogContentText>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="export-format-label">Export Format</InputLabel>
          <Select
            labelId="export-format-label"
            value={options.format}
            label="Export Format"
            onChange={handleFormatChange}
          >
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="jsonl">JSONL</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Column Selection
        </Typography>
        
        {options.columns.map((column) => (
          <Box key={column.field} sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={column.selected}
                      onChange={(e) => handleColumnSelection(column.field, e.target.checked)}
                    />
                  }
                  label={column.originalName}
                />
              </Grid>
              <Grid item xs={9}>
                <TextField
                  label={`Custom name for ${column.originalName}`}
                  value={column.customName}
                  onChange={(e) => handleColumnNameChange(column.field, e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!column.selected}
                />
              </Grid>
            </Grid>
          </Box>
        ))}

        <Box sx={{ mt: 3 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mb: 1
            }}
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Advanced Options
            </Typography>
            <Tooltip title="Advanced export functionality (primarily for data being used for fine-tuning models)">
              <IconButton size="small" sx={{ ml: 1 }}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small">
              {showAdvancedOptions ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={showAdvancedOptions}>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These options are for configuring data prepared for fine-tuning models.
              </Typography>
              
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<ShuffleIcon />}
                  onClick={handleShuffle}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: '4px',
                    mr: 1
                  }}
                >
                  Shuffle Data
                </Button>
                <Tooltip title="Randomly shuffle the data in the application. This is recommended for training to prevent the model from learning the order of examples.">
                  <IconButton size="small">
                    <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                  </IconButton>
                </Tooltip>
                {shuffleData && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      ml: 1, 
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    ✓ Data shuffled
                  </Typography>
                )}
              </Box>

              <Accordion 
                sx={{ 
                  mt: 2, 
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    minHeight: '48px',
                    '& .MuiAccordionSummary-content': {
                      margin: '8px 0'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TuneIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      MNRL Dataset Filtering
                    </Typography>
                    <Tooltip title="Multiple Negatives Ranking Loss (MNRL) is a training technique that requires specific data formatting. These settings help prepare your data to align with this training loss function.">
                      <IconButton size="small" sx={{ ml: 0.5 }}>
                        <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2">Training Batch Size</Typography>
                      <Tooltip title="Batch size determines how many examples are processed together during training. Smaller batch sizes require less memory but may result in noisier gradients.">
                        <IconButton size="small" sx={{ ml: 0.5 }}>
                          <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      InputProps={{ inputProps: { min: 2 } }}
                      size="small"
                      sx={{ width: 120 }}
                    />
                  </Box>
                  
                  {/* Process button and status */}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                      onClick={processMNRL}
                      disabled={isProcessing || qaPairs.length === 0 || !canProcessMNRL()}
                      sx={{ textTransform: 'none' }}
                    >
                      {isProcessing ? 'Processing...' : 'Process MNRL Validation'}
                    </Button>
                    
                    {isProcessing && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Processing {processedCount} of {totalToProcess} pairs...
                        </Typography>
                      </Box>
                    )}
                    
                    {processResult && (
                      <Alert 
                        severity={processResult.success ? "success" : "error"}
                        sx={{ mt: 2, fontSize: '0.8rem' }}
                      >
                        {processResult.message}
                      </Alert>
                    )}
                    
                    {processResult?.success && processResult.filteredCount && processResult.filteredCount > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                        The export will use the {processResult.filteredCount} filtered pairs that passed MNRL validation.
                      </Typography>
                    )}
                  </Box>

                  {!canProcessMNRL() && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'error.main' }}>
                      Two columns must be selected for MNRL processing.
                      
                    </Typography>
                  )}

                  {/* Processing logs display */}
                  {processingLogs.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Processing Logs:
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          mt: 1, 
                          p: 1, 
                          maxHeight: '200px', 
                          overflow: 'auto',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)'
                        }}
                      >
                        {processingLogs.map((log, index) => (
                          <Typography 
                            key={index} 
                            variant="caption" 
                            component="div"
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              mb: 0.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {log}
                          </Typography>
                        ))}
                      </Paper>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        px: 3, 
        pb: 2, 
        pt: 1,
        display: 'flex',
        gap: 1,
        '& > button': {
          flex: '1 0 auto', // Make buttons take equal width
          minWidth: '120px', // Ensure minimum width
        }
      }}>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          sx={{ 
            color: theme.palette.text.secondary,
            borderColor: theme.palette.text.secondary,
            border: '1px solid',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.05)',
              borderColor: theme.palette.text.primary,
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          startIcon={<DownloadIcon />}
          variant="contained"
          sx={{
            bgcolor: theme.palette.primary.main,
            color: '#fff',
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            }
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportOptionsDialog; 
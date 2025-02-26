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
  SelectChangeEvent
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';

export interface ColumnConfig {
  field: string;
  originalName: string;
  customName: string;
  selected: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'jsonl';
  columns: ColumnConfig[];
}

interface ExportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  open,
  onClose,
  onExport
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

  const handleExport = () => {
    // Only proceed if at least one column is selected
    if (options.columns.some(col => col.selected)) {
      onExport(options);
      onClose();
    } else {
      alert('Please select at least one column to export.');
    }
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
import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  useTheme,
  Box,
  Typography,
  Tooltip,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FolderIcon from '@mui/icons-material/Folder';

interface ImportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (options: ImportOptions) => void;
}

export interface ImportOptions {
  importType: 'fileOnly' | 'fileAndImages';
  file: File | null;
  imageFolder: FileSystemDirectoryHandle | null;
}

const ImportOptionsDialog: React.FC<ImportOptionsDialogProps> = ({
  open,
  onClose,
  onImport
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<ImportOptions>({
    importType: 'fileOnly',
    file: null,
    imageFolder: null
  });
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');

  const handleImportTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptions({
      ...options,
      importType: event.target.value as 'fileOnly' | 'fileAndImages'
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setSelectedFileName(file.name);
      setOptions({
        ...options,
        file
      });
    }
  };

  const handleFolderSelect = async () => {
    try {
      // Check if showDirectoryPicker is available
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker();
        setSelectedFolderName(directoryHandle.name);
        setOptions({
          ...options,
          imageFolder: directoryHandle
        });
      } else {
        alert('Folder selection is not supported in your browser.');
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleImport = () => {
    if (!options.file) {
      alert('Please select a file to import.');
      return;
    }

    if (options.importType === 'fileAndImages' && !options.imageFolder) {
      alert('Please select an image folder.');
      return;
    }

    onImport(options);
    onClose();
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
          bgcolor: theme.palette.background.paper,
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        color: theme.palette.primary.main,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}>
        <UploadIcon />
        Import Options
      </DialogTitle>
      <DialogContent sx={{ 
        '& .MuiFormControlLabel-root': {
          '&:hover': {
            bgcolor: 'transparent'
          }
        },
        '& .MuiRadio-root': {
          '&:hover': {
            bgcolor: 'transparent'
          }
        }
      }}>
        <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
          Select how you would like to import your data.
        </DialogContentText>

        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
            Import Type
          </FormLabel>
          <RadioGroup
            name="import-type"
            value={options.importType}
            onChange={handleImportTypeChange}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mb: 1
            }}>
              <FormControlLabel 
                value="fileOnly" 
                control={
                  <Radio 
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      },
                      '&.Mui-checked': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  />
                } 
                label="Import a single JSON/CSV file with text data"
              />
              <Tooltip title="Import just a data file containing your Q&A pairs.">
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'help',
                  }}
                >
                  <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                </Box>
              </Tooltip>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
            }}>
              <FormControlLabel 
                value="fileAndImages" 
                control={
                  <Radio 
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      },
                      '&.Mui-checked': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  />
                } 
                label="Import both data file and image folder"
              />
              <Tooltip title="Import a data file containing your Q&A pairs along with a folder containing the images referenced in the data.">
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'help',
                  }}
                >
                  <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
                </Box>
              </Tooltip>
            </Box>
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            File Selection
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2 
          }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              sx={{ 
                color: theme.palette.text.primary,
                borderColor: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: theme.palette.text.primary,
                }
              }}
            >
              Select File
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.jsonl"
                hidden
                onChange={handleFileSelect}
              />
            </Button>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {selectedFileName || 'No file selected'}
            </Typography>
          </Box>
        </Box>

        {options.importType === 'fileAndImages' && (
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Image Folder Selection
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2 
            }}>
              <Button
                variant="outlined"
                onClick={handleFolderSelect}
                startIcon={<FolderIcon />}
                sx={{ 
                  color: theme.palette.text.primary,
                  borderColor: theme.palette.text.secondary,
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                  }
                }}
              >
                Select Folder
              </Button>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedFolderName || 'No folder selected'}
              </Typography>
            </Box>
          </Box>
        )}
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
              borderColor: theme.palette.text.primary,
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          startIcon={<UploadIcon />}
          variant="contained"
          sx={{
            bgcolor: theme.palette.primary.main,
            color: '#fff',
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            }
          }}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportOptionsDialog; 
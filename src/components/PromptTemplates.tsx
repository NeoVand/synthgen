import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Typography,
  Tooltip,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { PromptTemplate, defaultTemplates, createCustomTemplate } from '../config/promptTemplates';

interface PromptTemplatesProps {
  onPromptChange: (questionPrompt: string, answerPrompt: string) => void;
  initialQuestionPrompt: string;
  initialAnswerPrompt: string;
}

type DialogMode = 'switch' | 'save' | null;

const PromptTemplates: React.FC<PromptTemplatesProps> = ({
  onPromptChange,
  initialQuestionPrompt,
  initialAnswerPrompt,
}) => {
  const theme = useTheme();
  const [templates, setTemplates] = useState<PromptTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<PromptTemplate | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  const [isEdited, setIsEdited] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [pendingTemplate, setPendingTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Initialize with the first template or current prompts
  useEffect(() => {
    const initialTemplate = templates.find(t => 
      t.questionPrompt === initialQuestionPrompt && 
      t.answerPrompt === initialAnswerPrompt
    ) || templates[0];
    
    setSelectedTemplate(initialTemplate);
    setEditedTemplate(initialTemplate);
    setOriginalName(initialTemplate.name);
  }, []);

  // Update prompts whenever editedTemplate changes
  useEffect(() => {
    if (editedTemplate) {
      onPromptChange(editedTemplate.questionPrompt, editedTemplate.answerPrompt);
    }
  }, [editedTemplate, onPromptChange]);

  // Generate a new template name with increment
  const generateNewName = (baseName: string) => {
    const match = baseName.match(/(.*?)(?:\s*\(edited\s*(\d+)\))?$/);
    const base = match?.[1]?.trim() || baseName;
    const currentNum = match?.[2] ? parseInt(match[2]) : 0;
    
    let newName = `${base} (edited ${currentNum + 1})`;
    let num = currentNum + 1;
    
    while (templates.some(t => t.name === newName)) {
      num++;
      newName = `${base} (edited ${num})`;
    }
    
    return newName;
  };

  const handleTemplateChange = (template: PromptTemplate) => {
    if (isEdited && editedTemplate) {
      setPendingTemplate(template);
      setNewTemplateName(generateNewName(editedTemplate.name));
      setDialogMode('switch');
      setDialogOpen(true);
      return;
    }

    setSelectedTemplate(template);
    setEditedTemplate(template);
    setOriginalName(template.name);
    setIsEdited(false);
  };

  const handlePromptEdit = (field: 'questionPrompt' | 'answerPrompt', value: string) => {
    if (!editedTemplate) return;

    const newTemplate = { ...editedTemplate, [field]: value };
    setEditedTemplate(newTemplate);
    setIsEdited(
      newTemplate.questionPrompt !== selectedTemplate?.questionPrompt ||
      newTemplate.answerPrompt !== selectedTemplate?.answerPrompt
    );
  };

  const handleNameEdit = (newName: string) => {
    if (!editedTemplate) return;
    setEditedTemplate({ ...editedTemplate, name: newName });
  };

  const handleSaveTemplate = () => {
    if (!editedTemplate || !isEdited) return;

    // If name is different from original, save directly as new template
    if (editedTemplate.name !== originalName) {
      setTemplates(prev => [...prev, editedTemplate]);
      setSelectedTemplate(editedTemplate);
      setOriginalName(editedTemplate.name);
      setIsEdited(false);
      return;
    }

    // If only prompts are edited, show save dialog
    setNewTemplateName(generateNewName(editedTemplate.name));
    setDialogMode('save');
    setDialogOpen(true);
  };

  const handleDialogAction = (action: 'discard' | 'overwrite' | 'saveAs') => {
    if (!editedTemplate) return;

    if (action === 'saveAs') {
      setShowNameInput(true);
      return;
    }

    switch (action) {
      case 'discard':
        // Reset to selected template
        setEditedTemplate(selectedTemplate);
        setIsEdited(false);
        if (pendingTemplate) {
          setSelectedTemplate(pendingTemplate);
          setEditedTemplate(pendingTemplate);
          setOriginalName(pendingTemplate.name);
          setPendingTemplate(null);
        }
        break;

      case 'overwrite':
        // Update existing template
        setTemplates(prev => prev.map(t => 
          t.name === originalName ? editedTemplate : t
        ));
        setSelectedTemplate(editedTemplate);
        setIsEdited(false);
        if (pendingTemplate) {
          setSelectedTemplate(pendingTemplate);
          setEditedTemplate(pendingTemplate);
          setOriginalName(pendingTemplate.name);
          setPendingTemplate(null);
        }
        break;
    }

    setDialogOpen(false);
    setDialogMode(null);
    setNewTemplateName('');
    setShowNameInput(false);
  };

  const handleSaveAsConfirm = () => {
    if (!editedTemplate || !newTemplateName.trim()) return;
    
    // Save as new template with the name from dialog
    const newTemplate = { ...editedTemplate, name: newTemplateName.trim() };
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
    setEditedTemplate(newTemplate);
    setOriginalName(newTemplate.name);
    setIsEdited(false);

    if (pendingTemplate) {
      setSelectedTemplate(pendingTemplate);
      setEditedTemplate(pendingTemplate);
      setOriginalName(pendingTemplate.name);
      setPendingTemplate(null);
    }

    setDialogOpen(false);
    setDialogMode(null);
    setNewTemplateName('');
    setShowNameInput(false);
  };

  const handleAddCustomTemplate = () => {
    // Find a unique name
    let baseName = "Custom Template";
    let counter = 1;
    let newName = baseName;
    while (templates.some(t => t.name === newName)) {
      newName = `${baseName} ${counter}`;
      counter++;
    }

    const newTemplate = createCustomTemplate(newName);
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
    setEditedTemplate(newTemplate);
    setOriginalName(newTemplate.name);
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;
    if (defaultTemplates.some(t => t.name === selectedTemplate.name)) {
      alert('Cannot delete default templates');
      return;
    }

    const newTemplates = templates.filter(t => t.name !== selectedTemplate.name);
    setTemplates(newTemplates);
    
    // Select the first template after deletion
    const nextTemplate = newTemplates[0];
    setSelectedTemplate(nextTemplate);
    setEditedTemplate(nextTemplate);
    setOriginalName(nextTemplate.name);
  };

  const handleExportTemplates = () => {
    const exportTemplates = templates.map(({ name, questionPrompt, answerPrompt }) => ({
      name,
      questionPrompt,
      answerPrompt
    }));
    
    const dataStr = JSON.stringify(exportTemplates, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompt_templates.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplates = JSON.parse(e.target?.result as string);
        
        // Validate imported templates
        if (!Array.isArray(importedTemplates) || !importedTemplates.every(template => 
          template.name && 
          template.questionPrompt && 
          template.answerPrompt
        )) {
          throw new Error('Invalid template format');
        }

        // Handle name conflicts
        const newTemplates = [...defaultTemplates];
        importedTemplates.forEach(importedTemplate => {
          const existingIndex = newTemplates.findIndex(t => t.name === importedTemplate.name);
          if (existingIndex >= 0) {
            // Override existing template
            newTemplates[existingIndex] = importedTemplate;
          } else {
            // Add new template
            newTemplates.push(importedTemplate);
          }
        });

        setTemplates(newTemplates);
        const firstTemplate = newTemplates[0];
        setSelectedTemplate(firstTemplate);
        setEditedTemplate(firstTemplate);
        setOriginalName(firstTemplate.name);
        onPromptChange(firstTemplate.questionPrompt, firstTemplate.answerPrompt);
      } catch (error) {
        console.error('Error importing templates:', error);
        alert('Invalid template file format. Please ensure the file contains valid templates with name, questionPrompt, and answerPrompt fields.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  if (!selectedTemplate || !editedTemplate) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Template Selection */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          select
          fullWidth
          size="small"
          value={selectedTemplate.name}
          onChange={(e) => {
            const template = templates.find(t => t.name === e.target.value);
            if (template) handleTemplateChange(template);
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '6px',
              fontSize: '0.875rem',
              height: 32
            }
          }}
        >
          {templates.map((template) => (
            <MenuItem key={template.name} value={template.name}>
              {template.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          size="small"
          variant="contained"
          onClick={handleAddCustomTemplate}
          sx={{
            minWidth: 32,
            width: 32,
            height: 32,
            p: 0,
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.primary.main, 0.2)
              : alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.mode === 'dark' 
              ? theme.palette.primary.light
              : theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.primary.main, 0.3)
                : alpha(theme.palette.primary.main, 0.2),
              boxShadow: 'none',
            },
            boxShadow: 'none',
          }}
        >
          <AddIcon sx={{ fontSize: '1.25rem' }} />
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleDeleteTemplate}
          sx={{
            minWidth: 32,
            width: 32,
            height: 32,
            p: 0,
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.error.main, 0.2)
              : alpha(theme.palette.error.main, 0.1),
            color: theme.palette.mode === 'dark' 
              ? theme.palette.error.light
              : theme.palette.error.main,
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.error.main, 0.3)
                : alpha(theme.palette.error.main, 0.2),
              boxShadow: 'none',
            },
            boxShadow: 'none',
          }}
        >
          <RemoveIcon sx={{ fontSize: '1.25rem' }} />
        </Button>
      </Box>

      {/* Template Name */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Template Name
          </Typography>
          <Tooltip title="Name of the template. Changing the name and saving will create a new template." placement="right">
            <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
              <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          size="small"
          value={editedTemplate.name}
          onChange={(e) => handleNameEdit(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.875rem',
              height: 40
            }
          }}
        />
      </Box>

      {/* Question Prompt */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Question Generation Prompt
          </Typography>
          <Tooltip title="This prompt instructs the AI how to generate questions from the document chunks." placement="right">
            <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
              <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          multiline
          fullWidth
          minRows={3}
          maxRows={6}
          value={editedTemplate.questionPrompt}
          onChange={(e) => handlePromptEdit('questionPrompt', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              '& textarea': {
                paddingRight: '16px',
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
          }}
        />
      </Box>

      {/* Answer Prompt */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Answer Generation Prompt
          </Typography>
          <Tooltip title="This prompt instructs the AI how to generate answers to the questions." placement="right">
            <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
              <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          multiline
          fullWidth
          minRows={3}
          maxRows={6}
          value={editedTemplate.answerPrompt}
          onChange={(e) => handlePromptEdit('answerPrompt', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              '& textarea': {
                paddingRight: '16px',
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
          }}
        />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        display: 'flex',
        gap: 1,
        mt: 2
      }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSaveTemplate}
          startIcon={<SaveIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          }}
        >
          Save
        </Button>
        <Button
          variant="contained"
          color="primary"
          component="label"
          fullWidth
          startIcon={<FileUploadIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          }}
        >
          Import
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleImportTemplates}
          />
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleExportTemplates}
          startIcon={<FileDownloadIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          }}
        >
          Export
        </Button>
      </Box>

      {/* Save/Switch Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setShowNameInput(false);
          setNewTemplateName('');
        }}
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
        }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {showNameInput ? 'Save as New Template' : dialogMode === 'switch' ? 'Unsaved Changes' : 'Save Template'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {showNameInput ? (
              <>
                <Typography variant="body1">
                  Enter a name for the new template:
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="New template name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }
                  }}
                />
              </>
            ) : (
              <Typography variant="body1">
                {dialogMode === 'switch' 
                  ? 'You have unsaved changes. What would you like to do?'
                  : 'How would you like to save your changes?'}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, display: 'flex', gap: 1 }}>
          {!showNameInput && dialogMode === 'switch' && (
            <Button
              onClick={() => handleDialogAction('discard')}
              variant="outlined"
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                px: 3,
                borderColor: alpha(theme.palette.error.main, 0.5),
                color: theme.palette.error.main,
                '&:hover': {
                  borderColor: theme.palette.error.main,
                  bgcolor: alpha(theme.palette.error.main, 0.04),
                }
              }}
            >
              Discard Changes
            </Button>
          )}
          {showNameInput ? (
            <>
              <Button
                onClick={() => {
                  setShowNameInput(false);
                  setNewTemplateName(generateNewName(editedTemplate?.name || ''));
                }}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  px: 3,
                  borderColor: alpha(theme.palette.error.main, 0.5),
                  color: theme.palette.error.main,
                  '&:hover': {
                    borderColor: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                  }
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleSaveAsConfirm}
                variant="contained"
                disabled={!newTemplateName.trim()}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  px: 3,
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleDialogAction('overwrite')}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  px: 3,
                  borderColor: alpha(theme.palette.warning.main, 0.5),
                  color: theme.palette.warning.main,
                  '&:hover': {
                    borderColor: theme.palette.warning.main,
                    bgcolor: alpha(theme.palette.warning.main, 0.04),
                  }
                }}
              >
                Overwrite Existing
              </Button>
              <Button
                onClick={() => handleDialogAction('saveAs')}
                variant="contained"
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  px: 3,
                  bgcolor: theme.palette.primary.main,
                }}
              >
                Save as New Template
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptTemplates; 
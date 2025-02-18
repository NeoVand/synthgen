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

  const handleTemplateChange = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    // Load saved edits if they exist
    const savedTemplate = templates.find(t => t.name === template.name);
    setEditedTemplate(savedTemplate || template);
    setOriginalName(template.name);
  };

  const handleSaveTemplate = () => {
    if (!editedTemplate) return;

    // Check if a template with the new name already exists
    const existingTemplate = templates.find(t => t.name === editedTemplate.name && t.name !== originalName);
    if (existingTemplate) {
      if (window.confirm(`A template named "${editedTemplate.name}" already exists. Do you want to override it?`)) {
        // Override existing template
        setTemplates(prev => prev.map(t => 
          t.name === editedTemplate.name ? editedTemplate : t
        ));
        setSelectedTemplate(editedTemplate);
        setOriginalName(editedTemplate.name);
      }
      return;
    }

    // If name has changed, update the template with the new name
    if (editedTemplate.name !== originalName) {
      // Remove old template and add new one
      setTemplates(prev => [
        ...prev.filter(t => t.name !== originalName),
        editedTemplate
      ]);
    } else {
      // Just update the existing template
      setTemplates(prev => prev.map(t => 
        t.name === editedTemplate.name ? editedTemplate : t
      ));
    }
    setSelectedTemplate(editedTemplate);
    setOriginalName(editedTemplate.name);
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
          onChange={(e) => setEditedTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
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
          onChange={(e) => setEditedTemplate(prev => 
            prev ? { ...prev, questionPrompt: e.target.value } : null
          )}
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
          onChange={(e) => setEditedTemplate(prev => 
            prev ? { ...prev, answerPrompt: e.target.value } : null
          )}
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
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1
      }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSaveTemplate}
          sx={{
            height: 32,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
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
          Save
        </Button>
        <Button
          component="label"
          variant="contained"
          size="small"
          startIcon={<FileUploadIcon />}
          sx={{
            height: 32,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
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
          Import
          <input
            type="file"
            hidden
            accept=".json"
            onChange={handleImportTemplates}
          />
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportTemplates}
          sx={{
            height: 32,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
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
          Export
        </Button>
      </Box>
    </Box>
  );
};

export default PromptTemplates; 
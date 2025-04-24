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
  DialogContentText,
  Divider,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import { PromptTemplate, defaultTemplates, createCustomTemplate } from '../config/promptTemplates';

interface PromptTemplatesProps {
  onPromptChange: (questionPrompt: string, answerPrompt: string) => void;
  initialQuestionPrompt: string;
  initialAnswerPrompt: string;
  isProcessingImages?: boolean;
  onImagePromptChange?: (questionPrompt: string, answerPrompt: string) => void;
  initialImageQuestionPrompt?: string;
  initialImageAnswerPrompt?: string;
}

type DialogMode = 'switch' | 'save' | null;
type PromptType = 'text' | 'image';

const PromptTemplates: React.FC<PromptTemplatesProps> = ({
  onPromptChange,
  initialQuestionPrompt,
  initialAnswerPrompt,
  isProcessingImages = false,
  onImagePromptChange,
  initialImageQuestionPrompt,
  initialImageAnswerPrompt,
}) => {
  const theme = useTheme();
  const [templates, setTemplates] = useState<PromptTemplate[]>(defaultTemplates);
  
  // Text prompt states
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<PromptTemplate | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  
  // Image prompt states
  const [selectedImageTemplate, setSelectedImageTemplate] = useState<PromptTemplate | null>(null);
  const [editedImageTemplate, setEditedImageTemplate] = useState<PromptTemplate | null>(null);
  const [originalImageName, setOriginalImageName] = useState<string>('');
  
  // Shared states
  const [isEdited, setIsEdited] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [pendingTemplate, setPendingTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [activePromptType, setActivePromptType] = useState<PromptType>('text');

  // Add a new state to track when to update parent
  const [shouldUpdateParent, setShouldUpdateParent] = useState(false);

  // Initialize text template
  useEffect(() => {
    // Filter for text templates (no "image" in name)
    const textTemplates = templates.filter(t => !t.name.toLowerCase().includes('image'));
    
    const initialTemplate = textTemplates.find(t => 
      t.questionPrompt === initialQuestionPrompt && 
      t.answerPrompt === initialAnswerPrompt
    ) || (textTemplates.length > 0 ? textTemplates[0] : templates[0]);
    
    setSelectedTemplate(initialTemplate);
    setEditedTemplate(initialTemplate);
    setOriginalName(initialTemplate.name);
    
    // Initial update to parent
    onPromptChange(initialTemplate.questionPrompt, initialTemplate.answerPrompt);
  }, []);

  // Initialize image template if processing images
  useEffect(() => {
    if (isProcessingImages) {
      // Filter for image templates
      const imageTemplates = templates.filter(t => t.name.toLowerCase().includes('image'));
      
      // Find the 'Image Analysis QA' template or use provided prompts
      const imageTemplate = imageTemplates.find(t => t.name === 'Image Analysis QA') || 
        imageTemplates.find(t => 
          t.questionPrompt === initialImageQuestionPrompt && 
          t.answerPrompt === initialImageAnswerPrompt
        ) || 
        (imageTemplates.length > 0 ? imageTemplates[0] : null);
      
      if (imageTemplate && onImagePromptChange) {
        setSelectedImageTemplate(imageTemplate);
        setEditedImageTemplate(imageTemplate);
        setOriginalImageName(imageTemplate.name);
        
        // Initial update to parent
        onImagePromptChange(imageTemplate.questionPrompt, imageTemplate.answerPrompt);
      }
    }
  }, [isProcessingImages, initialImageQuestionPrompt, initialImageAnswerPrompt]);

  // Update text prompts to parent component
  useEffect(() => {
    if (shouldUpdateParent && editedTemplate) {
      onPromptChange(editedTemplate.questionPrompt, editedTemplate.answerPrompt);
      if (editedImageTemplate && onImagePromptChange && isProcessingImages) {
        onImagePromptChange(editedImageTemplate.questionPrompt, editedImageTemplate.answerPrompt);
      }
      setShouldUpdateParent(false);
    }
  }, [shouldUpdateParent, editedTemplate, editedImageTemplate, onPromptChange, onImagePromptChange, isProcessingImages]);

  // Update text prompts whenever editedTemplate changes
  useEffect(() => {
    if (editedTemplate) {
      // We'll trigger updates to parent deliberately through shouldUpdateParent
    }
  }, [editedTemplate]);

  // Update image prompts whenever editedImageTemplate changes
  useEffect(() => {
    if (editedImageTemplate && onImagePromptChange) {
      // We'll trigger updates to parent deliberately through shouldUpdateParent
    }
  }, [editedImageTemplate, onImagePromptChange]);

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

  const handleTemplateChange = (template: PromptTemplate, type: PromptType = 'text') => {
    if (type === 'text') {
      if (isEdited && editedTemplate) {
        setPendingTemplate(template);
        setNewTemplateName(generateNewName(editedTemplate.name));
        setDialogMode('switch');
        setDialogOpen(true);
        setActivePromptType('text');
        return;
      }

      setSelectedTemplate(template);
      setEditedTemplate(template);
      setOriginalName(template.name);
      setIsEdited(false);
      setShouldUpdateParent(true); // Trigger update to parent
    } else {
      if (isEdited && editedImageTemplate) {
        setPendingTemplate(template);
        setNewTemplateName(generateNewName(editedImageTemplate.name));
        setDialogMode('switch');
        setDialogOpen(true);
        setActivePromptType('image');
        return;
      }

      setSelectedImageTemplate(template);
      setEditedImageTemplate(template);
      setOriginalImageName(template.name);
      setIsEdited(false);
      setShouldUpdateParent(true); // Trigger update to parent
    }
  };

  const handlePromptEdit = (
    field: 'questionPrompt' | 'answerPrompt', 
    value: string,
    type: PromptType = 'text'
  ) => {
    if (type === 'text') {
      if (!editedTemplate) return;

      const newTemplate = { ...editedTemplate, [field]: value };
      setEditedTemplate(newTemplate);
      setIsEdited(
        newTemplate.questionPrompt !== selectedTemplate?.questionPrompt ||
        newTemplate.answerPrompt !== selectedTemplate?.answerPrompt
      );
    } else {
      if (!editedImageTemplate) return;

      const newTemplate = { ...editedImageTemplate, [field]: value };
      setEditedImageTemplate(newTemplate);
      setIsEdited(
        newTemplate.questionPrompt !== selectedImageTemplate?.questionPrompt ||
        newTemplate.answerPrompt !== selectedImageTemplate?.answerPrompt
      );
    }
  };

  const handleNameEdit = (newName: string, type: PromptType = 'text') => {
    if (type === 'text') {
      if (!editedTemplate) return;
      setEditedTemplate({ ...editedTemplate, name: newName });
    } else {
      if (!editedImageTemplate) return;
      setEditedImageTemplate({ ...editedImageTemplate, name: newName });
    }
  };

  const handleSaveTemplate = (type: PromptType = 'text') => {
    if (type === 'text') {
      if (!editedTemplate || !isEdited) return;

      // If name is different from original, save directly as new template
      if (editedTemplate.name !== originalName) {
        setTemplates(prev => [...prev, editedTemplate]);
        setSelectedTemplate(editedTemplate);
        setOriginalName(editedTemplate.name);
        setIsEdited(false);
        setShouldUpdateParent(true); // Trigger update to parent
        return;
      }
      
      // If only prompts are edited, show save dialog
      setNewTemplateName(generateNewName(editedTemplate.name));
    } else {
      if (!editedImageTemplate || !isEdited) return;

      // If name is different from original, save directly as new template
      if (editedImageTemplate.name !== originalImageName) {
        setTemplates(prev => [...prev, editedImageTemplate]);
        setSelectedImageTemplate(editedImageTemplate);
        setOriginalImageName(editedImageTemplate.name);
        setIsEdited(false);
        setShouldUpdateParent(true); // Trigger update to parent
        return;
      }
      
      // If only prompts are edited, show save dialog
      setNewTemplateName(generateNewName(editedImageTemplate.name));
    }
    
    setActivePromptType(type);
    setDialogMode('save');
    setDialogOpen(true);
  };

  const handleDialogAction = (action: 'discard' | 'overwrite' | 'saveAs') => {
    const isTextPrompt = activePromptType === 'text';
    const currentTemplate = isTextPrompt ? editedTemplate : editedImageTemplate;
    const currentOriginalName = isTextPrompt ? originalName : originalImageName;
    
    if (!currentTemplate) return;

    if (action === 'saveAs') {
      setShowNameInput(true);
      return;
    }

    switch (action) {
      case 'discard':
        // Reset to selected template
        if (isTextPrompt) {
          setEditedTemplate(selectedTemplate);
        } else {
          setEditedImageTemplate(selectedImageTemplate);
        }
        
        setIsEdited(false);
        setShouldUpdateParent(true); // Trigger update to parent
        
        if (pendingTemplate) {
          if (isTextPrompt) {
            setSelectedTemplate(pendingTemplate);
            setEditedTemplate(pendingTemplate);
            setOriginalName(pendingTemplate.name);
          } else {
            setSelectedImageTemplate(pendingTemplate);
            setEditedImageTemplate(pendingTemplate);
            setOriginalImageName(pendingTemplate.name);
          }
          setPendingTemplate(null);
        }
        break;

      case 'overwrite':
        // Update existing template
        setTemplates(prev => prev.map(t => 
          t.name === currentOriginalName ? currentTemplate : t
        ));
        
        if (isTextPrompt) {
          setSelectedTemplate(currentTemplate);
        } else {
          setSelectedImageTemplate(currentTemplate);
        }
        
        setIsEdited(false);
        setShouldUpdateParent(true); // Trigger update to parent
        
        if (pendingTemplate) {
          if (isTextPrompt) {
            setSelectedTemplate(pendingTemplate);
            setEditedTemplate(pendingTemplate);
            setOriginalName(pendingTemplate.name);
          } else {
            setSelectedImageTemplate(pendingTemplate);
            setEditedImageTemplate(pendingTemplate);
            setOriginalImageName(pendingTemplate.name);
          }
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
    const isTextPrompt = activePromptType === 'text';
    const currentTemplate = isTextPrompt ? editedTemplate : editedImageTemplate;
    
    if (!currentTemplate || !newTemplateName.trim()) return;
    
    // Save as new template with the name from dialog
    const newTemplate = { ...currentTemplate, name: newTemplateName.trim() };
    setTemplates(prev => [...prev, newTemplate]);
    
    if (isTextPrompt) {
      setSelectedTemplate(newTemplate);
      setEditedTemplate(newTemplate);
      setOriginalName(newTemplate.name);
    } else {
      setSelectedImageTemplate(newTemplate);
      setEditedImageTemplate(newTemplate);
      setOriginalImageName(newTemplate.name);
    }
    
    setIsEdited(false);
    setShouldUpdateParent(true); // Trigger update to parent

    if (pendingTemplate) {
      if (isTextPrompt) {
        setSelectedTemplate(pendingTemplate);
        setEditedTemplate(pendingTemplate);
        setOriginalName(pendingTemplate.name);
      } else {
        setSelectedImageTemplate(pendingTemplate);
        setEditedImageTemplate(pendingTemplate);
        setOriginalImageName(pendingTemplate.name);
      }
      setPendingTemplate(null);
    }

    setDialogOpen(false);
    setDialogMode(null);
    setNewTemplateName('');
    setShowNameInput(false);
  };

  const handleAddCustomTemplate = (type: PromptType = 'text') => {
    const prefix = type === 'text' ? 'Text' : 'Image';
    const newTemplate = createCustomTemplate(`Custom ${prefix} Template ${templates.length + 1}`);
    setTemplates(prev => [...prev, newTemplate]);
    
    if (type === 'text') {
      setSelectedTemplate(newTemplate);
      setEditedTemplate(newTemplate);
      setOriginalName(newTemplate.name);
    } else {
      setSelectedImageTemplate(newTemplate);
      setEditedImageTemplate(newTemplate);
      setOriginalImageName(newTemplate.name);
    }
    
    setIsEdited(false);
    setShouldUpdateParent(true); // Trigger update to parent
  };

  const handleDeleteTemplate = (type: PromptType = 'text') => {
    const currentTemplate = type === 'text' ? selectedTemplate : selectedImageTemplate;
    if (!currentTemplate) return;
    
    // Cannot delete the only template
    if (templates.length <= 1) return;
    
    // Remove the template
    const newTemplates = templates.filter(t => t.name !== currentTemplate.name);
    setTemplates(newTemplates);
    
    // Select the first template
    const firstTemplate = newTemplates[0];
    
    if (type === 'text') {
      setSelectedTemplate(firstTemplate);
      setEditedTemplate(firstTemplate);
      setOriginalName(firstTemplate.name);
    } else {
      setSelectedImageTemplate(firstTemplate);
      setEditedImageTemplate(firstTemplate);
      setOriginalImageName(firstTemplate.name);
    }
    
    setIsEdited(false);
  };

  const handleExportTemplates = () => {
    const templatesJson = JSON.stringify(templates, null, 2);
    const blob = new Blob([templatesJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt_templates.json';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
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
        
        // Initialize both text and image templates
        const textTemplates = newTemplates.filter(t => !t.name.toLowerCase().includes('image'));
        const imageTemplates = newTemplates.filter(t => t.name.toLowerCase().includes('image'));
        
        // Update text templates if available
        if (textTemplates.length > 0) {
          const firstTextTemplate = textTemplates[0];
          setSelectedTemplate(firstTextTemplate);
          setEditedTemplate(firstTextTemplate);
          setOriginalName(firstTextTemplate.name);
        }
        
        // Update image templates if available and processing images
        if (isProcessingImages && imageTemplates.length > 0 && onImagePromptChange) {
          const firstImageTemplate = imageTemplates[0];
          setSelectedImageTemplate(firstImageTemplate);
          setEditedImageTemplate(firstImageTemplate);
          setOriginalImageName(firstImageTemplate.name);
        }
        
        // Trigger parent update after templates are set
        setShouldUpdateParent(true);
      } catch (error) {
        console.error('Error importing templates:', error);
        alert('Invalid template file format. Please ensure the file contains valid templates with name, questionPrompt, and answerPrompt fields.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const renderPromptSection = (type: PromptType) => {
    const isTextPrompt = type === 'text';
    const currentSelectedTemplate = isTextPrompt ? selectedTemplate : selectedImageTemplate;
    const currentEditedTemplate = isTextPrompt ? editedTemplate : editedImageTemplate;
    
    if (!currentSelectedTemplate || !currentEditedTemplate) return null;
    
    const title = isTextPrompt ? "Text QA Prompts" : "Image QA Prompts";
    const description = isTextPrompt 
      ? "These prompts are used for generating questions and answers from text chunks."
      : "These prompts are used for generating questions and answers from images.";
    
    // Filter templates based on type
    const filteredTemplates = templates.filter(template => {
      const isImageTemplate = template.name.toLowerCase().includes('image');
      return isTextPrompt ? !isImageTemplate : isImageTemplate;
    });
    
    return (
      <Box sx={{ width: '100%', mb: isTextPrompt && isProcessingImages ? 3 : 0 }}>
        {/* Section title */}
        {isProcessingImages && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="600">
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          </Box>
        )}
        
        {/* Template Selection */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            select
            fullWidth
            size="small"
            value={currentSelectedTemplate.name}
            onChange={(e) => {
              const template = templates.find(t => t.name === e.target.value);
              if (template) handleTemplateChange(template, type);
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                fontSize: '0.875rem',
                height: 32
              }
            }}
          >
            {filteredTemplates.map((template) => (
              <MenuItem key={`${type}-${template.name}`} value={template.name}>
                {template.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleAddCustomTemplate(type)}
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
            onClick={() => handleDeleteTemplate(type)}
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
            disabled={templates.length <= 1}
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
          </Box>
          <TextField
            fullWidth
            size="small"
            value={currentEditedTemplate.name}
            onChange={(e) => handleNameEdit(e.target.value, type)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.875rem'
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
            value={currentEditedTemplate.questionPrompt}
            onChange={(e) => handlePromptEdit('questionPrompt', e.target.value, type)}
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
            value={currentEditedTemplate.answerPrompt}
            onChange={(e) => handlePromptEdit('answerPrompt', e.target.value, type)}
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

        {/* Save button for this section */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => handleSaveTemplate(type)}
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
          Save {isTextPrompt ? 'Text' : 'Image'} Template
        </Button>
      </Box>
    );
  };

  if (!selectedTemplate || !editedTemplate) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Text Prompt Section */}
      {renderPromptSection('text')}
      
      {/* Divider when showing both sections */}
      {isProcessingImages && (
        <Divider sx={{ my: 3 }} />
      )}
      
      {/* Image Prompt Section (only shown when processing images) */}
      {isProcessingImages && renderPromptSection('image')}

      {/* Action Buttons - Only show at the bottom if we have both sections */}
      {isProcessingImages && (
        <Box sx={{ 
          display: 'flex',
          gap: 1,
          mt: 3
        }}>
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
      )}
      
      {/* If not processing images, keep original action buttons */}
      {!isProcessingImages && (
        <Box sx={{ 
          display: 'flex',
          gap: 1,
          mt: 2
        }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => handleSaveTemplate('text')}
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
      )}

      {/* Save/Switch Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ 
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {dialogMode === 'save' ? (
              <>
                <SaveIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                Save Template
              </>
            ) : (
              <>
                <WarningIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                Unsaved Changes
              </>
            )}
          </Box>
          <IconButton
            aria-label="close"
            onClick={() => setDialogOpen(false)}
            sx={{ color: theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <DialogContentText>
            {dialogMode === 'save' 
              ? "You've made changes to this template. How would you like to save them?"
              : "You have unsaved changes. What would you like to do?"}
          </DialogContentText>

          {showNameInput && (
            <TextField
              fullWidth
              label="Template Name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              margin="normal"
              variant="outlined"
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {showNameInput ? (
            <>
              <Button 
                onClick={() => setShowNameInput(false)} 
                color="inherit"
                variant="outlined"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAsConfirm} 
                variant="contained"
                color="primary"
                disabled={!newTemplateName.trim()}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => handleDialogAction('discard')} 
                color="inherit"
                variant="outlined"
              >
                {dialogMode === 'save' ? "Discard Changes" : "Discard & Switch"}
              </Button>
              {dialogMode === 'save' && (
                <Button 
                  onClick={() => handleDialogAction('overwrite')} 
                  color="primary"
                  variant="outlined"
                >
                  Overwrite
                </Button>
              )}
              <Button 
                onClick={() => handleDialogAction('saveAs')} 
                variant="contained"
                color="primary"
              >
                Save As New
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptTemplates; 
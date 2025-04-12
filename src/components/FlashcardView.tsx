import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  useTheme,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { QAPair } from '../types';

// Import the ImageViewerDialog
import ImageViewerDialog from './dialogs/ImageViewerDialog';
import { Region } from './ImageRegionSelector';

// Define ChunkingAlgorithm locally if it's not exported
type ChunkingAlgorithm = 'recursive' | 'line' | 'csv-tsv' | 'jsonl' | 'sentence-chunks' | 'markdown-chunks' | 'rolling-sentence-chunks';

interface FlashcardViewProps {
  qaPairs: QAPair[];
  onUpdateQA: (updatedQA: QAPair | QAPair[]) => void;
  currentIndex: number;
  chunkingAlgorithm: ChunkingAlgorithm;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({
  qaPairs,
  onUpdateQA,
  currentIndex,
}) => {
  const theme = useTheme();
  const currentQA = qaPairs[currentIndex];
  
  // Add state for image viewer
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState('');
  const [viewerPageNumber, setViewerPageNumber] = useState(0);
  
  // Track image elements with refs
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Helper to extract image info from HTML content
  const extractImageInfo = (htmlContent: string): { url: string; pageNumber: number } | null => {
    // Simple regex to extract image source
    const imgSrcMatch = htmlContent.match(/src="([^"]+)"/);
    
    // Try to match both formats: "PDF Page X" and "Page X Region"
    const pageNumberMatch = htmlContent.match(/(?:PDF Page|Page) (\d+)/);
    
    if (imgSrcMatch && pageNumberMatch) {
      return {
        url: imgSrcMatch[1],
        pageNumber: parseInt(pageNumberMatch[1], 10)
      };
    }
    
    return null;
  };

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

  // Check if content contains HTML image
  const isHtmlContent = typeof currentQA.context === 'string' && currentQA.context.includes('<div class="pdf-page-image">');
  const imageInfo = isHtmlContent ? extractImageInfo(currentQA.context as string) : null;

  // Attach click handlers to images
  useEffect(() => {
    if (!isHtmlContent || !imageContainerRef.current) return;
    
    // Find all images in the container
    const images = imageContainerRef.current.querySelectorAll('img');
    
    // Cleanup functions array
    const cleanupFunctions: (() => void)[] = [];
    
    // Attach click handler to each image
    images.forEach(img => {
      const clickHandler = (e: MouseEvent) => {
        e.stopPropagation();
        
        // Get the image URL
        const imageUrl = (img as HTMLImageElement).src;
        
        // Try to extract page number from parent elements
        let pageNumber = 1;
        const pageNumberElement = img.closest('.pdf-page-image')?.querySelector('.page-number');
        if (pageNumberElement) {
          const pageMatch = pageNumberElement.textContent?.match(/Page (\d+)/);
          if (pageMatch) {
            pageNumber = parseInt(pageMatch[1], 10);
          }
        }
        
        // Open the image viewer
        setViewerImageUrl(imageUrl);
        setViewerPageNumber(pageNumber);
        setImageViewerOpen(true);
      };
      
      // Add event listener
      img.addEventListener('click', clickHandler);
      
      // Add cleanup function
      cleanupFunctions.push(() => {
        img.removeEventListener('click', clickHandler);
      });
    });
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [currentQA, isHtmlContent]);

  // Function to handle selected regions from the image viewer
  const handleImageRegionSelect = useCallback((regions: Region[]) => {
    // Only process if there are new regions
    if (regions.length === 0) return;
    
    // Create new QA pairs for each region
    const newQAPairs: QAPair[] = regions.map((region, index) => {
      // Get the bare base64 data from the dataURL format (remove the "data:image/jpeg;base64," prefix)
      const base64Data = region.imageData.split('base64,')[1];
      
      // Create clean HTML content for the image region with better styling
      const imageHtml = `<div class="pdf-page-image">
        <img 
          src="data:image/jpeg;base64,${base64Data}" 
          alt="Selected region from page ${viewerPageNumber}"
          style="display: block; margin: 0 auto; max-width: 100%;"
        />
      </div>`;
      
      // For the first region, update the current QA pair
      if (index === 0) {
        return {
          ...currentQA,
          context: imageHtml,
          sources: currentQA.sources || `Page ${viewerPageNumber} (Region ${index + 1})`
        };
      }
      
      // For additional regions, create new QA pairs
      return {
        id: Date.now() + Math.floor(Math.random() * 1000) + index, // Generate unique numeric ID
        context: imageHtml,
        question: '',
        answer: '',
        sources: `Page ${viewerPageNumber} (Region ${index + 1})`,
        selected: false
      };
    });
    
    // Update with all regions at once using the array version of onUpdateQA
    onUpdateQA(newQAPairs);
    
    // Show confirmation
    alert(`Added ${regions.length} image region${regions.length > 1 ? 's' : ''} as cards. ${regions.length > 1 ? 'The first region replaces the current card content.' : ''}`);
    
    // Close the image viewer after a short delay
    setTimeout(() => {
      setImageViewerOpen(false);
    }, 500);
  }, [currentQA, viewerPageNumber, onUpdateQA]);

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
          {isHtmlContent ? (
            <Box 
              ref={imageContainerRef}
              sx={{ 
                width: '100%', 
                fontSize: '0.875rem',
                lineHeight: 1.5,
                minHeight: 'auto',
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: 'none',
                  display: 'block',
                  margin: '0 auto',
                  borderRadius: '4px',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 2px 8px rgba(0,0,0,0.5)' 
                    : '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'zoom-in',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: theme.palette.mode === 'dark' 
                      ? '0 4px 12px rgba(0,0,0,0.7)' 
                      : '0 4px 12px rgba(0,0,0,0.25)',
                  }
                },
                '& .pdf-page-image': {
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(0, 0, 0, 0.2)' 
                    : 'rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  maxWidth: '800px',
                  margin: '0 auto',
                },
                '& .page-number': {
                  fontSize: '0.75rem',
                  color: theme.palette.text.secondary,
                  marginBottom: '4px',
                  fontWeight: 500,
                },
                '& p': {
                  margin: '8px 0',
                  fontWeight: 500,
                }
              }}
              dangerouslySetInnerHTML={{ __html: currentQA.context as string }}
              onClick={() => {
                if (imageInfo) {
                  setViewerImageUrl(imageInfo.url);
                  setViewerPageNumber(imageInfo.pageNumber);
                  setImageViewerOpen(true);
                }
              }}
            />
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
      
      {/* Add the ImageViewerDialog */}
      <ImageViewerDialog
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewerImageUrl}
        pageNumber={viewerPageNumber}
        onRegionSelect={handleImageRegionSelect}
      />
    </Box>
  );
};

export default FlashcardView; 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Box,
  Typography,
  Checkbox,
  useTheme,
  alpha
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

// Import the types from the types folder
import { QAPair, GenerationType, GenerationProgress } from '../types';

// Import the ImageViewerDialog
import ImageViewerDialog from './dialogs/ImageViewerDialog';
import { Region } from './ImageRegionSelector';

interface TableViewProps {
  qaPairs: QAPair[];
  page: number;
  rowsPerPage: number;
  availableRowsPerPage: number[];
  expandedCells: Record<string, boolean>;
  isGenerating: boolean;
  generationType: GenerationType;
  generationProgress: GenerationProgress;
  
  // Callbacks
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  onToggleCellExpansion: (rowId: string | number, columnType: string) => void;
  onQAPairChange: (updatedQAPairs: QAPair[]) => void;
  onSelectRow: (rowId: string | number, selected: boolean) => void;
  onSelectAllRows: (selected: boolean) => void;
  isCellGenerating: (qa: QAPair, columnType: string) => boolean;
}

const TableView: React.FC<TableViewProps> = ({
  qaPairs,
  page,
  rowsPerPage,
  availableRowsPerPage,
  expandedCells,
  isGenerating,
  onPageChange,
  onRowsPerPageChange,
  onToggleCellExpansion,
  onQAPairChange,
  onSelectRow,
  onSelectAllRows,
  isCellGenerating
}) => {
  const theme = useTheme();
  
  // Add state for image viewer
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState('');
  const [viewerPageNumber, setViewerPageNumber] = useState(0);
  
  // Track image elements with refs
  const imageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handlePageChange = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAllRows(event.target.checked);
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    onSelectRow(id, checked);
  };

  const handleCellChange = (id: string | number, field: string, value: string) => {
    const updatedQAPairs = qaPairs.map(qa => 
      qa.id === id ? { ...qa, [field]: value } : qa
    );
    onQAPairChange(updatedQAPairs);
  };

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
  
  // Add this helper function to attach click handlers to all images in a container
  const attachImageClickHandlers = useCallback((container: HTMLElement, rowId: string | number, columnType: string) => {
    // Find all images in the container
    const images = container.querySelectorAll('img');
    
    // Store cleanup functions
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
        
        // Expand the cell
        onToggleCellExpansion(rowId, columnType);
      };
      
      // Add event listener
      img.addEventListener('click', clickHandler);
      
      // Add cleanup function
      cleanupFunctions.push(() => {
        img.removeEventListener('click', clickHandler);
      });
    });
    
    return cleanupFunctions;
  }, [setViewerImageUrl, setViewerPageNumber, setImageViewerOpen, onToggleCellExpansion]);

  // Update the useEffect to use the new helper function
  useEffect(() => {
    // Store all cleanup functions
    const allCleanupFunctions: (() => void)[] = [];
    
    // Process each visible row
    qaPairs
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .forEach(qa => {
        // Find all context cells with HTML content
        const contextContent = qa.context as string;
        if (contextContent.includes('<div class="pdf-page-image">')) {
          // Find the cell in the DOM
          const cellElement = document.querySelector(`[data-qa-id="${qa.id}"][data-column-type="context"]`);
          if (cellElement) {
            // Attach click handlers to all images in this cell
            const cleanups = attachImageClickHandlers(cellElement as HTMLElement, qa.id, 'context');
            allCleanupFunctions.push(...cleanups);
          }
        }
      });
    
    // Return cleanup function
    return () => {
      allCleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [page, rowsPerPage, qaPairs, attachImageClickHandlers]);

  // Function to handle selected regions from the image viewer
  const handleImageRegionSelect = (regions: Region[]) => {
    // Only process if there are new regions
    if (regions.length === 0) return;
    
    // Create new QA pairs for each region
    const newQAPairs: QAPair[] = regions.map((region, index) => {
      // Create HTML content for the image region with better styling
      const imageHtml = `<div class="pdf-page-image">
        <div class="page-number">Page ${viewerPageNumber} - Region ${index + 1}</div>
        <img 
          src="${region.imageData}" 
          alt="Selected region from page ${viewerPageNumber}"
          style="display: block; margin: 0 auto;"
        />
      </div>`;
      
      // Add the region as a new chunk to the QA list
      return {
        id: Date.now() + Math.floor(Math.random() * 1000) + index, // Generate unique numeric ID
        context: imageHtml,
        question: '',
        answer: '',
        sources: `Page ${viewerPageNumber} (Region ${index + 1})`,
        selected: false
      };
    });
    
    // Add all new regions to the QA list - adding at the beginning for better visibility
    onQAPairChange([...newQAPairs, ...qaPairs]);
    
    // Auto-expand the cells containing the new regions
    setTimeout(() => {
      // Create a new expanded cells object
      const newExpandedCells = { ...expandedCells };
      
      // Set each new region's cell to be expanded
      newQAPairs.forEach(pair => {
        newExpandedCells[`${pair.id}-context`] = true;
      });
      
      // Update expanded cells
      onToggleCellExpansion(newQAPairs[0].id, 'context');
    }, 100);
    
    // Show confirmation
    alert(`Added ${regions.length} image region${regions.length > 1 ? 's' : ''} to the table. Click on the thumbnails to view them full size.`);
    
    // Close the image viewer after a short delay to allow user to see confirmation
    setTimeout(() => {
      setImageViewerOpen(false);
    }, 500);
  };

  return (
    <TableContainer sx={{ 
      height: '100%',
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
      <Table size="small" stickyHeader sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          padding: '12px 16px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        },
        '& .MuiTableHead-root .MuiTableCell-root': {
          fontWeight: 600,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.9)
            : alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          borderBottom: '2px solid',
          borderColor: theme.palette.divider,
          fontSize: '0.8125rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          height: '40px', // Match toolbar height
          padding: '0 16px', // Adjust padding
          whiteSpace: 'nowrap',
        },
        '& .MuiTableHead-root .MuiTableCell-root:first-of-type, & .MuiTableBody-root .MuiTableCell-root:first-of-type': {
          width: '48px',
          padding: '0 0 0 14px', // Add left padding to align with sidebar button
        },
        '& .MuiTableBody-root .MuiTableRow-root': {
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.04)
              : alpha(theme.palette.primary.main, 0.04),
          },
        },
        '& .MuiCheckbox-root': {
          padding: '8px',
          borderRadius: '6px',
          color: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.common.white, 0.3)
            : alpha(theme.palette.common.black, 0.2),
          '& .MuiSvgIcon-root': {
            fontSize: '1.1rem',
            borderRadius: '2px',
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            color: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.common.white, 0.4)
              : alpha(theme.palette.common.black, 0.3),
          },
          '&.Mui-checked, &.MuiCheckbox-indeterminate': {
            color: `${theme.palette.primary.main} !important`,
          },
        },
      }}>
        <TableHead>
          <TableRow>
            <TableCell 
              padding="checkbox"
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600,
              }}
            >
              <Checkbox
                checked={qaPairs.length > 0 && qaPairs.every(qa => qa.selected)}
                indeterminate={qaPairs.some(qa => qa.selected) && !qaPairs.every(qa => qa.selected)}
                onChange={handleSelectAllClick}
              />
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.dark
              }}>
                <ExtensionIcon sx={{ fontSize: '1.1rem' }} />
                Context
              </Box>
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.secondary.light
                  : theme.palette.secondary.dark
              }}>
                <HelpOutlineIcon sx={{ fontSize: '1.1rem' }} />
                Question
              </Box>
            </TableCell>
            <TableCell 
              sx={{
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 600
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: theme.palette.mode === 'dark'
                  ? theme.palette.success.light
                  : theme.palette.success.dark
              }}>
                <LightbulbOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                Answer
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {qaPairs
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((qa, rowIndex) => {
              const isAnyExpanded = ['context', 'question', 'answer'].some(
                columnType => expandedCells[`${qa.id}-${columnType}`] || isCellGenerating(qa, columnType)
              );

              return (
                <TableRow 
                  key={qa.id}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark'
                      ? rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                      : rowIndex % 2 === 0 ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                    borderBottom: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={!!qa.selected}
                      onChange={(e) => handleSelectRow(qa.id, e.target.checked)}
                    />
                  </TableCell>
                  {['context', 'question', 'answer'].map((columnType) => {
                    const isGeneratingCell = isCellGenerating(qa, columnType);
                    const content = qa[columnType as keyof typeof qa] as string;
                    const isHtmlContent = columnType === 'context' && content.includes('<div class="pdf-page-image">');
                    const isExpanded = expandedCells[`${qa.id}-${columnType}`] || isGeneratingCell || isHtmlContent;
                    
                    // Extract image info if this is an HTML content cell
                    const imageInfo = isHtmlContent ? extractImageInfo(content) : null;
                    
                    // Create a unique key for this image container if needed
                    const imageRefKey = imageInfo ? `${qa.id}||${imageInfo.url}||${imageInfo.pageNumber}` : '';
                    
                    return (
                      <TableCell 
                        key={columnType}
                        onClick={() => onToggleCellExpansion(qa.id, columnType)}
                        data-qa-id={qa.id}
                        data-column-type={columnType}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          padding: '12px 16px',
                          minWidth: '200px',
                          maxWidth: '400px',
                          position: 'relative',
                          height: isAnyExpanded ? 'auto' : undefined,
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.04)'
                              : 'rgba(0, 0, 0, 0.02)',
                          },
                          '&:focus-within': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(0, 0, 0, 0.3)'
                              : 'rgba(255, 255, 255, 0.6)',
                          },
                        }}
                      >
                        <Box sx={{ 
                          position: 'relative',
                          maxHeight: isAnyExpanded ? (isExpanded ? 'none' : '100%') : '4.5em',
                          overflow: isExpanded ? 'visible' : 'auto',
                          transition: 'all 0.2s ease',
                          height: isAnyExpanded ? (isExpanded ? 'auto' : '100%') : '4.5em',
                          '&::-webkit-scrollbar': {
                            width: '8px',
                            height: '8px',
                            display: 'block'
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
                          },
                          overflowY: 'scroll'
                        }}>
                          {isHtmlContent ? (
                            <Box 
                              sx={{ 
                                width: '100%', 
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                minHeight: isExpanded ? 'auto' : '4.5em',
                                // Ensure the container has enough space to show images
                                maxHeight: isExpanded ? 'none' : '150px',
                                '& img': {
                                  maxWidth: '100%',
                                  height: 'auto',
                                  maxHeight: isExpanded ? 'none' : '120px',
                                  borderRadius: '4px',
                                  boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 2px 8px rgba(0,0,0,0.5)' 
                                    : '0 2px 8px rgba(0,0,0,0.15)',
                                  cursor: 'zoom-in', // Add pointer cursor for images
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: theme.palette.mode === 'dark' 
                                      ? '0 4px 12px rgba(0,0,0,0.7)' 
                                      : '0 4px 12px rgba(0,0,0,0.25)',
                                  }
                                },
                                // Highlight the pdf-page-image container
                                '& .pdf-page-image': {
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: '6px',
                                  padding: '8px',
                                  marginBottom: '8px',
                                  backgroundColor: theme.palette.mode === 'dark' 
                                    ? 'rgba(0, 0, 0, 0.2)' 
                                    : 'rgba(0, 0, 0, 0.03)',
                                },
                                // Style the page number
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
                              dangerouslySetInnerHTML={{ __html: content }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // If user clicks directly on the image container and we have image info,
                                // open the image viewer directly (enhances accessibility)
                                if (imageInfo) {
                                  setViewerImageUrl(imageInfo.url);
                                  setViewerPageNumber(imageInfo.pageNumber);
                                  setImageViewerOpen(true);
                                  // Also expand the cell to show the full image
                                  onToggleCellExpansion(qa.id, columnType);
                                } else {
                                  // If we don't have image info but this is an HTML cell,
                                  // just expand the cell to make it easier to see
                                  onToggleCellExpansion(qa.id, columnType);
                                }
                              }}
                              ref={(node: HTMLDivElement | null) => {
                                // Store reference to the container element
                                if (node && imageInfo) {
                                  imageRefs.current.set(imageRefKey, node);
                                } else if (!node && imageInfo) {
                                  // Cleanup when unmounting
                                  imageRefs.current.delete(imageRefKey);
                                }
                              }}
                            />
                          ) : (
                            <TextField
                              multiline
                              fullWidth
                              variant="standard"
                              value={content}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCellChange(qa.id, columnType, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              InputProps={{
                                disableUnderline: true,
                                sx: {
                                  alignItems: 'flex-start',
                                  padding: 0,
                                  fontSize: '0.875rem',
                                  lineHeight: 1.5,
                                  minHeight: isExpanded ? 'auto' : '4.5em',
                                  backgroundColor: 'transparent',
                                  '& textarea': {
                                    padding: 0,
                                  }
                                }
                              }}
                              sx={{
                                width: '100%',
                                '& .MuiInputBase-root': {
                                  padding: 0,
                                },
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          {qaPairs.length === 0 && !isGenerating && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary" align="center">
                  No chunks/Q&A yet. Upload &amp; chunk, then generate Q&A.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Add pagination controls */}
      <TablePagination
        component="div"
        count={qaPairs.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={availableRowsPerPage}
        sx={{
          borderTop: 1,
          borderColor: theme.palette.divider,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.6)
            : alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(8px)',
        }}
      />
      
      {/* Add the ImageViewerDialog */}
      <ImageViewerDialog
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewerImageUrl}
        pageNumber={viewerPageNumber}
        onRegionSelect={handleImageRegionSelect}
      />
    </TableContainer>
  );
};

export default TableView; 
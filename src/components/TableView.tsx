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
      // Get the bare base64 data from the dataURL format (remove the "data:image/jpeg;base64," prefix)
      const base64Data = region.imageData.split('base64,')[1];
      
      // Create clean HTML content for the image region with better styling
      // Make sure we don't include any extra tags or styling that might confuse the model
      const imageHtml = `<div class="pdf-page-image">
        <img 
          src="data:image/jpeg;base64,${base64Data}" 
          alt="Selected region from page ${viewerPageNumber}"
          style="display: block; margin: 0 auto; max-width: 100%;"
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
        tableLayout: 'fixed', // Force equal column widths
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          padding: '8px 12px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
          width: 'calc(100% / 3)', // Exactly one-third width
          textAlign: 'left',
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
        '& .MuiTableHead-root .MuiTableCell-root:first-of-type': {
          width: '48px',
          padding: '0 0 0 14px',
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
                justifyContent: 'flex-start', // Left align header content
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
                justifyContent: 'flex-start', // Left align header content
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
                justifyContent: 'flex-start', // Left align header content
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
                          padding: '8px 12px',
                          width: '100%',
                          height: '180px', // Increased from 120px
                          maxHeight: '180px', // Increased from 120px
                          position: 'relative',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflow: 'hidden', // Changed from auto to hidden
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
                          height: '160px', // Adjusted for new row height
                          maxHeight: '160px',
                          overflow: 'hidden', // Prevent scrolling
                          transition: 'all 0.2s ease',
                          display: 'block',
                          width: '100%',
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
                                width: isHtmlContent ? 'max-content' : '100%', 
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                minHeight: '2em',
                                display: 'block',
                                height: '160px',
                                maxHeight: '160px',
                                overflow: 'hidden',
                                textAlign: 'left',
                                '& img': {
                                  width: '100%',
                                  height: '100%', // Changed from fixed height
                                  objectFit: 'contain',
                                  display: 'block',
                                  margin: '0',
                                  marginRight: 'auto',
                                  borderRadius: '3px',
                                  boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 1px 4px rgba(0,0,0,0.5)' 
                                    : '0 1px 4px rgba(0,0,0,0.15)',
                                },
                                '& .pdf-page-image': {
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: '4px',
                                  padding: '4px',
                                  margin: '2px 0',
                                  width: '100%',
                                  height: '100%', // Changed from fixed height
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  backgroundColor: theme.palette.mode === 'dark' 
                                    ? 'rgba(0, 0, 0, 0.2)' 
                                    : 'rgba(0, 0, 0, 0.03)',
                                  '& img': {
                                    margin: '0',
                                    marginRight: 'auto',
                                    width: '100%',
                                    height: '100%', // Changed from fixed height
                                    objectFit: 'contain',
                                    maxWidth: '100%',
                                    maxHeight: '100%'
                                  }
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
                              dangerouslySetInnerHTML={{ __html: content }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (imageInfo) {
                                  setViewerImageUrl(imageInfo.url);
                                  setViewerPageNumber(imageInfo.pageNumber);
                                  setImageViewerOpen(true);
                                  onToggleCellExpansion(qa.id, columnType);
                                } else {
                                  onToggleCellExpansion(qa.id, columnType);
                                }
                              }}
                              ref={(node: HTMLDivElement | null) => {
                                if (node && imageInfo) {
                                  imageRefs.current.set(imageRefKey, node);
                                } else if (!node && imageInfo) {
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
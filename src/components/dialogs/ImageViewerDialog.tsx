import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Slide,
  Tooltip,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropIcon from '@mui/icons-material/Crop';
import { TransitionProps } from '@mui/material/transitions';
import ImageRegionSelector, { Region } from '../ImageRegionSelector';

// Custom transition for dialog entry
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface ImageViewerDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  pageNumber: number;
  onRegionSelect?: (regions: Region[]) => void;
}

const ImageViewerDialog: React.FC<ImageViewerDialogProps> = ({
  open,
  onClose,
  imageUrl,
  pageNumber,
  onRegionSelect
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Reset selection mode when opening a new image
  useEffect(() => {
    if (open) {
      setIsSelectionMode(false);
      setRegions([]);
    }
  }, [open, imageUrl]);
  
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
        const enteringSelectionMode = !prev;
        if (enteringSelectionMode) {
            setRegions([]);
        }
        return enteringSelectionMode;
    });
  }, []);
  
  const handleRegionsChange = useCallback((selectedRegions: Region[]) => {
    // This is called when the Save button in ImageRegionSelector is clicked
    // Safely update local state
    setRegions(selectedRegions);
    
    // Then pass the regions to the parent component
    if (onRegionSelect && selectedRegions.length > 0) {
      onRegionSelect(selectedRegions);
      
      // Close the dialog and reset selection mode after saving
      setTimeout(() => {
        setIsSelectionMode(false);
        onClose();
      }, 500);
    }
  }, [onRegionSelect, onClose]);
  
  const handleSaveRegions = useCallback(() => {
    if (onRegionSelect && regions.length > 0) {
      onRegionSelect(regions);
      onClose();
    } else if (regions.length === 0) {
      alert('Please select at least one region before saving');
    } else {
      setIsSelectionMode(false);
    }
  }, [onRegionSelect, regions, onClose]);
  
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setRegions([]);
  }, []);
  
  // Handle keyboard navigation (Remove zoom/pan related keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === 'Escape') {
         if (isSelectionMode) {
            handleCancelSelection();
            event.preventDefault();
            return;
         } else {
            onClose();
            event.preventDefault();
            return;
         }
      }

      if (isSelectionMode) return;

      switch (event.key) {
        case 'c':
           if (onRegionSelect) {
              toggleSelectionMode();
              event.preventDefault();
           }
           break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, isSelectionMode, onRegionSelect, handleCancelSelection, toggleSelectionMode]);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      TransitionComponent={SlideTransition}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: '#f5f5f5',
          width: '90vw',
          height: '90vh',
          maxWidth: '1600px',
          maxHeight: '90vh',
          m: 'auto',
          overflow: 'hidden',
          position: 'relative',
          cursor: isSelectionMode ? 'crosshair' : 'default',
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)'
        }
      }}
    >
      <DialogContent 
        ref={viewerRef}
        sx={{ 
          p: 0, 
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: '#f5f5f5',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '100px',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            }
          }
        }}
      >
        {/* Control Buttons */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          <Tooltip title="Close (Esc)">
            <IconButton onClick={onClose} size="large" sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
          {onRegionSelect && (
             <Tooltip title={isSelectionMode ? "Cancel Selection (Esc)" : "Crop Image Regions (c)"}>
                <IconButton 
                  onClick={toggleSelectionMode} 
                  size="large" 
                  sx={{ 
                    color: isSelectionMode ? 'primary.main' : 'white',
                    bgcolor: isSelectionMode ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
                    '&:hover': {
                      bgcolor: isSelectionMode ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <CropIcon />
                </IconButton>
              </Tooltip>
          )}
        </Box>

        {/* Image/Selector Container */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'transform 0.2s ease-out',
          }}
        >
          {isSelectionMode && onRegionSelect ? (
            <ImageRegionSelector
              imgSrc={imageUrl}
              onRegionSelect={handleRegionsChange}
              disabled={false}
            />
          ) : (
            <img
              src={imageUrl}
              alt={`Page ${pageNumber}`}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                userSelect: 'none',
              }}
            />
          )}
        </Box>
        
        {/* Action buttons for selection mode - these will be handled by the new ImageRegionSelector */}
        {isSelectionMode && !onRegionSelect && (
            <Box 
                sx={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    display: 'flex',
                    gap: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                    marginBottom: '20px'
                }}
            >
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveRegions}
                    disabled={regions.length === 0}
                    sx={{
                      fontWeight: 'bold',
                      py: 1
                    }}
                >
                    Save Regions ({regions.length})
                </Button>
                <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={handleCancelSelection}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'white', 
                      borderWidth: 2,
                      '&:hover': { 
                        borderColor: 'lightgrey',
                        borderWidth: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      } 
                    }}
                >
                    Cancel
                </Button>
            </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewerDialog; 
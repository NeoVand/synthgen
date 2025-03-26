import React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  useTheme,
  Slide,
  Zoom,
  Tooltip,
  Button,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
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
  const theme = useTheme();
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [regions, setRegions] = React.useState<Region[]>([]);
  
  // Reset zoom and selection mode when opening a new image
  React.useEffect(() => {
    if (open) {
      setZoomLevel(1);
      setIsSelectionMode(false);
      setRegions([]);
    }
  }, [open, imageUrl]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      
      switch (event.key) {
        case 'Escape':
          if (isSelectionMode) {
            setIsSelectionMode(false);
          } else {
            onClose();
          }
          break;
        case '+':
        case '=': // Same key as + on most keyboards
          if (!isSelectionMode) {
            handleZoomIn();
            event.preventDefault();
          }
          break;
        case '-':
          if (!isSelectionMode) {
            handleZoomOut();
            event.preventDefault();
          }
          break;
        case '0':
          if (!isSelectionMode) {
            setZoomLevel(1); // Reset zoom
            event.preventDefault();
          }
          break;
        case 'c':
          toggleSelectionMode();
          event.preventDefault();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, isSelectionMode]);
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3)); // Max zoom 3x
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // Min zoom 0.5x
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
  };
  
  const handleRegionSelect = (selectedRegions: Region[]) => {
    setRegions(selectedRegions);
    if (onRegionSelect) {
      onRegionSelect(selectedRegions);
    }
  };
  
  const handleSaveRegions = () => {
    if (onRegionSelect && regions.length > 0) {
      onRegionSelect(regions);
      // Don't close selection mode here - the parent component will close the dialog
      // after processing the regions
    } else if (regions.length === 0) {
      // Show a message if no regions are selected
      alert('Please select at least one region before saving');
    } else {
      setIsSelectionMode(false);
    }
  };
  
  const handleCancelSelection = () => {
    setIsSelectionMode(false);
  };
  
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
          bgcolor: '#f5f5f5', // Light beige background
          width: '90vw',
          height: '90vh',
          maxWidth: '1600px',
          maxHeight: '90vh',
          m: 'auto',
          overflow: 'hidden',
          position: 'relative',
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)'
        }
      }}
    >
      <DialogContent 
        sx={{ 
          p: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          overflow: 'auto',
          bgcolor: '#f5f5f5', // Ensure consistent beige background
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
        <Zoom in={open}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              bgcolor: '#f5f5f5' // Ensure consistent beige background
            }}
          >
            {isSelectionMode ? (
              <ImageRegionSelector 
                imgSrc={imageUrl} 
                onRegionSelect={handleRegionSelect}
              />
            ) : (
              <img
                src={imageUrl}
                alt={`PDF Page ${pageNumber}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease'
                }}
              />
            )}
          </Box>
        </Zoom>
      </DialogContent>
      
      {/* Close button */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          color: 'rgba(0, 0, 0, 0.7)',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.9)',
          },
          zIndex: 2,
          width: 40,
          height: 40
        }}
      >
        <CloseIcon />
      </IconButton>
      
      {/* Page indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: 16,
          color: 'rgba(0, 0, 0, 0.7)',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 2
        }}
      >
        Page {pageNumber}
      </Box>
      
      {/* Control panel */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: '12px',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          zIndex: 2,
        }}
      >
        {isSelectionMode ? (
          <>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                {regions.length === 0 
                  ? 'Draw a box around a region to select it' 
                  : `${regions.length} region${regions.length !== 1 ? 's' : ''} selected`}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveRegions}
              disabled={regions.length === 0}
              sx={{ mr: 1, px: 3 }}
            >
              Save Regions
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancelSelection}
              sx={{ px: 3 }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn} size="large" sx={{ mx: 1 }}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut} size="large" sx={{ mx: 1 }}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Select Regions">
              <Button
                variant="contained"
                startIcon={<CropIcon />}
                onClick={toggleSelectionMode}
                sx={{ mx: 1, px: 2 }}
              >
                Select Regions
              </Button>
            </Tooltip>
          </>
        )}
      </Box>
      
      {/* Keyboard shortcuts help */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          color: 'rgba(0, 0, 0, 0.7)',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '12px',
          opacity: 0.7,
          zIndex: 2
        }}
      >
        {isSelectionMode ? 'ESC to cancel • Draw to select regions' : 'ESC to close • + / - to zoom • 0 to reset zoom • C to select regions'}
      </Box>
    </Dialog>
  );
};

export default ImageViewerDialog; 
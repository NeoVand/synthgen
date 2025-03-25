import React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  useTheme,
  Slide,
  Zoom,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { TransitionProps } from '@mui/material/transitions';

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
}

const ImageViewerDialog: React.FC<ImageViewerDialogProps> = ({
  open,
  onClose,
  imageUrl,
  pageNumber
}) => {
  const theme = useTheme();
  const [zoomLevel, setZoomLevel] = React.useState(1);
  
  // Reset zoom when opening a new image
  React.useEffect(() => {
    if (open) {
      setZoomLevel(1);
    }
  }, [open, imageUrl]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=': // Same key as + on most keyboards
          handleZoomIn();
          event.preventDefault();
          break;
        case '-':
          handleZoomOut();
          event.preventDefault();
          break;
        case '0':
          setZoomLevel(1); // Reset zoom
          event.preventDefault();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3)); // Max zoom 3x
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // Min zoom 0.5x
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
      
      {/* Zoom controls */}
      <Box
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          display: 'flex',
          gap: 1,
          zIndex: 2
        }}
      >
        <Tooltip title="Zoom Out (-)">
          <IconButton
            onClick={handleZoomOut}
            sx={{
              color: 'rgba(0, 0, 0, 0.7)',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        
        <Box
          sx={{
            color: 'rgba(0, 0, 0, 0.7)',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '20px',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </Box>
        
        <Tooltip title="Zoom In (+)">
          <IconButton
            onClick={handleZoomIn}
            sx={{
              color: 'rgba(0, 0, 0, 0.7)',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
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
        ESC to close • + / - to zoom • 0 to reset zoom
      </Box>
    </Dialog>
  );
};

export default ImageViewerDialog; 
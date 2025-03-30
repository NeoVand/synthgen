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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Reset zoom, pan and selection mode when opening a new image
  useEffect(() => {
    if (open) {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
      setIsSelectionMode(false);
      setRegions([]);
      setIsDragging(false);
    }
  }, [open, imageUrl]);

  // Unified Zoom Handler (zooms towards point)
  const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
    if (!viewerRef.current) return;

    const newZoom = Math.max(0.1, Math.min(zoomLevel + delta, 5));
    if (newZoom === zoomLevel) return;

    const viewerRect = viewerRef.current.getBoundingClientRect();

    const originX = clientX !== undefined ? clientX - viewerRect.left : viewerRect.width / 2;
    const originY = clientY !== undefined ? clientY - viewerRect.top : viewerRect.height / 2;

    const imageX = (originX - pan.x) / zoomLevel;
    const imageY = (originY - pan.y) / zoomLevel;

    const newPanX = originX - imageX * newZoom;
    const newPanY = originY - imageY * newZoom;

    setZoomLevel(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoomLevel, pan.x, pan.y]);
  
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
    setTimeout(() => {
       setRegions(selectedRegions);
    }, 0);
  }, []);
  
  const handleSaveRegions = useCallback(() => {
    if (onRegionSelect && regions.length > 0) {
      onRegionSelect(regions);
    } else if (regions.length === 0) {
      alert('Please select at least one region before saving');
    } else {
      setIsSelectionMode(false);
    }
  }, [onRegionSelect, regions]);
  
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setRegions([]);
  }, []);
  
  // Mouse Down Handler for Panning
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isSelectionMode || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
    });
    if (viewerRef.current) {
      viewerRef.current.style.cursor = 'grabbing';
    }
  }, [isSelectionMode, pan.x, pan.y]);
  
  // Mouse Move Handler for Panning
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || isSelectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    setPan({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  }, [isDragging, isSelectionMode, dragStart.x, dragStart.y]);
  
  // Mouse Up/Leave Handler for Panning
  const handleMouseUpOrLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || isSelectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (viewerRef.current) {
      viewerRef.current.style.cursor = 'grab';
    }
  }, [isDragging, isSelectionMode]);
  
  // Wheel Handler for Zooming
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (isSelectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = -event.deltaY * 0.005;
    handleZoom(delta, event.clientX, event.clientY);
  }, [isSelectionMode, handleZoom]);
  
  // Handle keyboard navigation
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
        case '+':
        case '=':
          handleZoom(0.25);
          event.preventDefault();
          break;
        case '-':
          handleZoom(-0.25);
          event.preventDefault();
          break;
        case '0':
          setZoomLevel(1);
          setPan({ x: 0, y: 0 });
          event.preventDefault();
          break;
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
  }, [open, onClose, isSelectionMode, onRegionSelect, handleCancelSelection, handleZoom, toggleSelectionMode]);
  
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
          cursor: isSelectionMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'top left',
            willChange: 'transform',
          }}
        >
          {isSelectionMode ? (
            <ImageRegionSelector 
              key="selector"
              imgSrc={imageUrl}
              onRegionSelect={handleRegionsChange}
            />
          ) : (
            <img
              key="image"
              src={imageUrl}
              alt={`PDF Page ${pageNumber}`}
              style={{
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                width: 'auto',
                height: 'auto',
                display: 'block',
                minWidth: zoomLevel < 0.5 ? '200%' : (zoomLevel < 1 ? '100%' : 'auto')
              }}
              draggable={false}
              onLoad={(_e) => {
                if (viewerRef.current && zoomLevel === 1 && pan.x === 0 && pan.y === 0) {
                  viewerRef.current.scrollLeft = 0;
                  viewerRef.current.scrollTop = 0;
                }
              }}
            />
          )}
        </Box>
      </DialogContent>
      
      {/* Close button */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          zIndex: 1301,
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          '&:hover': {
             bgcolor: 'rgba(255, 255, 255, 0.9)',
          }
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
      {!isSelectionMode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 12px',
            borderRadius: '16px',
            zIndex: 1301,
            pointerEvents: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
            <Tooltip title="Zoom In (+)">
              <span style={{ display: 'inline-block' }}>
                <IconButton onClick={() => handleZoom(0.25)} size="small" sx={{ color: 'white' }} disabled={zoomLevel >= 5}>
                  <ZoomInIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={`Zoom: ${Math.round(zoomLevel * 100)}% (Reset: 0)`}>
              <Button
                onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }}
                size="small"
                sx={{ color: 'white', textTransform: 'none', minWidth: '45px' }}
              >
                {`${Math.round(zoomLevel * 100)}%`}
              </Button>
            </Tooltip>
            <Tooltip title="Zoom Out (-)">
              <span style={{ display: 'inline-block' }}>
                <IconButton onClick={() => handleZoom(-0.25)} size="small" sx={{ color: 'white' }} disabled={zoomLevel <= 0.1}>
                  <ZoomOutIcon />
                </IconButton>
              </span>
            </Tooltip>
            {onRegionSelect && (
              <Tooltip title="Crop Regions (C)">
                <IconButton onClick={toggleSelectionMode} size="small" sx={{ color: 'white' }}>
                  <CropIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}
      
      {/* Selection Mode Controls */}
      {isSelectionMode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 12px',
            borderRadius: '16px',
            zIndex: 1301,
          }}
        >
          <Button onClick={handleSaveRegions} variant="contained" color="primary" size="small">
            Save Regions
          </Button>
          <Button onClick={handleCancelSelection} variant="outlined" size="small" sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            Cancel Crop
          </Button>
        </Box>
      )}
      
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
        {isSelectionMode ? 'ESC to cancel • Draw to select regions' : 'ESC to close • + / - to zoom • 0 to reset zoom • C to select regions' + (zoomLevel > 1 ? ' • Drag to pan' : '')}
      </Box>
    </Dialog>
  );
};

export default ImageViewerDialog; 
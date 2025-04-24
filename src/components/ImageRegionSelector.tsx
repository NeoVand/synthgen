import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from 'uuid';

export interface Region {
  id: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    originalWidth?: number;
    originalHeight?: number;
  };
  imageData: string;
}

interface ImageRegionSelectorProps {
  imgSrc: string;
  onRegionSelect: (regions: Region[]) => void;
  disabled?: boolean;
}

const ImageRegionSelector: React.FC<ImageRegionSelectorProps> = ({
  imgSrc,
  onRegionSelect,
  disabled = false,
}) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionCurrent, setSelectionCurrent] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate region colors
  const colors = [
    { bg: 'rgba(255, 87, 34, 0.35)', border: 'rgba(255, 87, 34, 0.7)' }, // orange
    { bg: 'rgba(33, 150, 243, 0.35)', border: 'rgba(33, 150, 243, 0.7)' }, // blue
    { bg: 'rgba(76, 175, 80, 0.35)', border: 'rgba(76, 175, 80, 0.7)' }, // green
    { bg: 'rgba(156, 39, 176, 0.35)', border: 'rgba(156, 39, 176, 0.7)' }, // purple
    { bg: 'rgba(233, 30, 99, 0.35)', border: 'rgba(233, 30, 99, 0.7)' },  // pink
  ];

  // Calculate image position and scale
  const getImageDetails = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return null;

    const img = imageRef.current;
    const container = containerRef.current;
    
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;
    
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;
    
    const scaleX = img.naturalWidth / imgWidth;
    const scaleY = img.naturalHeight / imgHeight;
    
    return {
      offsetX,
      offsetY,
      imgWidth,
      imgHeight,
      scaleX,
      scaleY,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    };
  }, []);

  // Start selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || !containerRef.current || !imageRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();
    
    // Check if click is within the image
    if (
      e.clientX < imgRect.left ||
      e.clientX > imgRect.right ||
      e.clientY < imgRect.top ||
      e.clientY > imgRect.bottom
    ) {
      return;
    }
    
    setIsSelecting(true);
    
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    
    setSelectionStart({ x, y });
    setSelectionCurrent({ x, y });
  }, [disabled]);

  // Update selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const x = Math.max(0, Math.min(e.clientX - containerRect.left, containerRect.width));
    const y = Math.max(0, Math.min(e.clientY - containerRect.top, containerRect.height));
    
    setSelectionCurrent({ x, y });
  }, [isSelecting]);

  // End selection
  const handleMouseUp = useCallback(async () => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    
    // Get selection dimensions
    const details = getImageDetails();
    if (!details) return;
    
    const { offsetX, offsetY, scaleX, scaleY, naturalWidth, naturalHeight } = details;
    
    // Calculate selection in container coordinates
    const left = Math.min(selectionStart.x, selectionCurrent.x);
    const top = Math.min(selectionStart.y, selectionCurrent.y);
    const width = Math.abs(selectionCurrent.x - selectionStart.x);
    const height = Math.abs(selectionCurrent.y - selectionStart.y);
    
    // Minimum size check
    if (width < 10 || height < 10) return;
    
    // Convert to image coordinates
    const imgLeft = (left - offsetX) * scaleX;
    const imgTop = (top - offsetY) * scaleY;
    const imgWidth = width * scaleX;
    const imgHeight = height * scaleY;
    
    // Create canvas to extract the image region
    const canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current) return;
    
    // Draw the selected region to the canvas
    ctx.drawImage(
      imageRef.current,
      imgLeft,                   // source x
      imgTop,                    // source y
      imgWidth,                  // source width
      imgHeight,                 // source height
      0,                         // destination x
      0,                         // destination y
      imgWidth,                  // destination width
      imgHeight                  // destination height
    );
    
    // Get the image data
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Create new region
    const newRegion: Region = {
      id: uuidv4(),
      crop: {
        x: imgLeft,
        y: imgTop,
        width: imgWidth,
        height: imgHeight,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight
      },
      imageData
    };
    
    // Update local regions state only, don't call onRegionSelect yet
    setRegions(prev => {
      return [...prev, newRegion];
    });
  }, [isSelecting, selectionStart, selectionCurrent, getImageDetails]);

  // Handle clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (isSelecting && containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsSelecting(false);
    }
  }, [isSelecting]);

  // Add document event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Delete a region
  const deleteRegion = useCallback((id: string) => {
    setRegions(prev => {
      const updated = prev.filter(r => r.id !== id);
      return updated;
    });
  }, []);

  // Clear all regions
  const clearRegions = useCallback(() => {
    setRegions([]);
  }, []);

  // Get selection bounds
  const getSelectionBounds = useCallback(() => {
    const left = Math.min(selectionStart.x, selectionCurrent.x);
    const top = Math.min(selectionStart.y, selectionCurrent.y);
    const width = Math.abs(selectionCurrent.x - selectionStart.x);
    const height = Math.abs(selectionCurrent.y - selectionStart.y);
    
    return { left, top, width, height };
  }, [selectionStart, selectionCurrent]);

  // Get the next color for a new region
  const getNextRegionColor = useCallback(() => {
    const colorIndex = regions.length % colors.length;
    return colors[colorIndex];
  }, [regions, colors]);

  // Convert image coordinates to container coordinates
  const imageToContainerCoords = useCallback((x: number, y: number, width: number, height: number) => {
    const details = getImageDetails();
    if (!details) return { left: 0, top: 0, width: 0, height: 0 };
    
    const { offsetX, offsetY, scaleX, scaleY } = details;
    
    return {
      left: offsetX + (x / scaleX),
      top: offsetY + (y / scaleY),
      width: width / scaleX,
      height: height / scaleY
    };
  }, [getImageDetails]);

  // If disabled, just show the image
  if (disabled) {
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <img
          src={imgSrc}
          alt="Region selector"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {regions.length > 0 && (
          <Box sx={{ position: 'absolute', top: 20, left: 20 }}>
            <Typography variant="body2" sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.7)', p: 1, borderRadius: 1 }}>
              {regions.length} region{regions.length !== 1 ? 's' : ''} selected
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isSelecting ? 'crosshair' : 'default',
        bgcolor: '#000'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Control Buttons - Moved to top-right corner */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 80,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Save Button */}
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => {
            if (regions.length > 0) {
              onRegionSelect(regions);
            } else {
              alert('Please select at least one region before saving');
            }
          }}
          disabled={regions.length === 0}
          sx={{ 
            fontWeight: 'bold',
            fontSize: '0.8rem',
            py: 0.5,
            px: 1,
            minWidth: 'auto',
            '&:disabled': {
              opacity: 0.6,
              color: 'rgba(255, 255, 255, 0.8)'
            }
          }}
        >
          Save {regions.length} Region{regions.length !== 1 ? 's' : ''}
        </Button>
        
        {/* Clear Button */}
        {regions.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={clearRegions}
            sx={{
              fontSize: '0.8rem',
              py: 0.5,
              px: 1,
              borderWidth: 1,
              minWidth: 'auto',
              '&:hover': {
                borderWidth: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Clear All
          </Button>
        )}
        
        {/* Region Count */}
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'white', 
            textAlign: 'center',
            fontSize: '0.7rem',
            opacity: 0.8
          }}
        >
          {regions.length} region{regions.length !== 1 ? 's' : ''} selected
        </Typography>
      </Box>

      {/* Image Container */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          ref={imageRef}
          src={imgSrc}
          alt="Region selector source"
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
          onLoad={() => setImageLoaded(true)}
        />
      </Box>

      {/* Current Selection */}
      {isSelecting && (
        <Box
          ref={selectionRef}
          sx={{
            position: 'absolute',
            ...getSelectionBounds(),
            border: `2px dashed ${getNextRegionColor().border}`,
            backgroundColor: getNextRegionColor().bg,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Existing Regions */}
      {imageLoaded && regions.map((region, index) => {
        const colorIndex = index % colors.length;
        const color = colors[colorIndex];
        const coords = imageToContainerCoords(
          region.crop.x,
          region.crop.y,
          region.crop.width,
          region.crop.height
        );
        
        return (
          <Box
            key={region.id}
            sx={{
              position: 'absolute',
              ...coords,
              backgroundColor: color.bg,
              border: `2px solid ${color.border}`,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography 
              sx={{ 
                color: 'white', 
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {index + 1}
            </Typography>
            
            <IconButton
              size="small"
              onClick={() => deleteRegion(region.id)}
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)'
                },
                zIndex: 2
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })}

      {/* Helper instruction */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 12px',
          borderRadius: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          fontSize: '0.8rem'
        }}
      >
        Click and drag to create regions
      </Box>
    </Box>
  );
};

export default ImageRegionSelector; 
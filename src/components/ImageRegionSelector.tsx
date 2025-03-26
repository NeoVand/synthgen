import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { Crop, ReactCropProps } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Box, Typography, IconButton, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
  disabled = false
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({
    aspect: undefined,
    unit: '%',
    width: 30,
    height: 30
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Generate region colors
  const getRegionColors = useCallback((isDark: boolean): { bg: string[], border: string[] } => {
    const colors = [
      { base: '#ff5722', name: 'orange' },
      { base: '#2196f3', name: 'blue' },
      { base: '#4caf50', name: 'green' },
      { base: '#9c27b0', name: 'purple' },
      { base: '#e91e63', name: 'pink' },
      { base: '#00bcd4', name: 'cyan' }
    ];
    
    return {
      bg: colors.map(c => `${c.base}59`), // 35% opacity
      border: colors.map(c => `${c.base}b3`) // 70% opacity
    };
  }, []);
  
  const { bg: bgColors, border: borderColors } = getRegionColors(isDark);
  
  // Get scale factors based on displayed vs natural image size
  const getScaleFactors = useCallback(() => {
    if (!imgRef.current) return { scaleX: 1, scaleY: 1 };
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    return { scaleX, scaleY };
  }, []);
  
  // Generate cropped image from selection
  const generateCroppedImage = useCallback((pixelCrop: Crop | null): string => {
    if (!pixelCrop || !imgRef.current || 
        typeof pixelCrop.x !== 'number' || 
        typeof pixelCrop.y !== 'number' || 
        typeof pixelCrop.width !== 'number' || 
        typeof pixelCrop.height !== 'number') return '';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    const pixelRatio = window.devicePixelRatio || 1;

    // Set canvas size to the size of the cropped area
    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;
    
    // Draw the image to the canvas
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
    );
    
    // Convert canvas to base64 encoded string
    return canvas.toDataURL('image/jpeg');
  }, []);
  
  // Save the current selection as a region
  const saveRegion = useCallback(() => {
    if (!completedCrop || !imgRef.current || 
        typeof completedCrop.x !== 'number' || 
        typeof completedCrop.y !== 'number' || 
        typeof completedCrop.width !== 'number' || 
        typeof completedCrop.height !== 'number') return;
    
    // Generate cropped image
    const imageData = generateCroppedImage(completedCrop);
    
    // Create new region
    const newRegion: Region = {
      id: uuidv4(),
      crop: {
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height,
        originalWidth: imgRef.current.naturalWidth,
        originalHeight: imgRef.current.naturalHeight
      },
      imageData
    };
    
    // Add to regions array
    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    
    // Notify parent component
    onRegionSelect(updatedRegions);
    
    // Reset current selection
    setCrop({
      aspect: undefined,
      unit: '%',
      width: 30,
      height: 30
    });
    setCompletedCrop(null);
    setIsSelecting(false);
  }, [completedCrop, generateCroppedImage, onRegionSelect, regions]);
  
  // Delete a region
  const deleteRegion = useCallback((id: string) => {
    const updatedRegions = regions.filter(region => region.id !== id);
    setRegions(updatedRegions);
    onRegionSelect(updatedRegions);
  }, [regions, onRegionSelect]);
  
  // Handle window resize
  useEffect(() => {
    if (!imgRef.current) return;
    
    const handleResize = () => {
      // Force re-render when window is resized
      setRegions(prev => [...prev]);
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(imgRef.current);
    
    return () => {
      if (imgRef.current) {
        resizeObserver.unobserve(imgRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);
  
  // Handler for image load
  const onImageLoaded = useCallback((image: HTMLImageElement) => {
    imgRef.current = image;
    return false; // Important: Return false here to update crop state in onImageLoaded
  }, []);
  
  // Render regions overlay
  const renderRegionsOverlay = useCallback(() => {
    if (!imgRef.current || regions.length === 0) return null;
    
    const containerWidth = imgRef.current.width;
    const containerHeight = imgRef.current.height;
    
    return (
      <Box
        className="region-overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {regions.map((region, index) => {
          const colorIndex = index % bgColors.length;
          
          // Calculate display dimensions based on actual image size
          const displayRatio = {
            width: containerWidth / (region.crop.originalWidth || containerWidth),
            height: containerHeight / (region.crop.originalHeight || containerHeight)
          };
          
          return (
            <Box
              key={region.id}
              sx={{
                position: 'absolute',
                top: region.crop.y * displayRatio.height,
                left: region.crop.x * displayRatio.width,
                width: region.crop.width * displayRatio.width,
                height: region.crop.height * displayRatio.height,
                backgroundColor: bgColors[colorIndex],
                border: `2px solid ${borderColors[colorIndex]}`,
                boxSizing: 'border-box',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto'
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
                  zIndex: 2,
                  pointerEvents: 'auto'
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    );
  }, [regions, bgColors, borderColors, deleteRegion]);
  
  if (disabled) {
    // If disabled, just render the image with regions overlay
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Region selector"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onLoad={() => setRegions(prev => [...prev])} // Force regions re-render
        />
        {renderRegionsOverlay()}
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {/* Instructions heading */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 10, 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'medium',
          textAlign: 'center',
          maxWidth: '80%'
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {regions.length === 0 
            ? 'Click and drag to select a region of the image' 
            : `${regions.length} region${regions.length !== 1 ? 's' : ''} selected - click and drag to add more`}
        </Typography>
      </Box>

      <ReactCrop
        src={imgSrc}
        crop={crop}
        onChange={(c) => {
          setCrop(c);
          setIsSelecting(c.width !== 0 && c.height !== 0);
        }}
        onComplete={(c) => {
          setCompletedCrop(c);
        }}
        className="region-selector-container"
        disabled={disabled}
        style={{ 
          maxWidth: '100%', 
          maxHeight: 'calc(100vh - 200px)',
          margin: '20px auto'
        }}
        onImageLoaded={onImageLoaded}
      />

      {/* Selection controls */}
      {isSelecting && completedCrop && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            gap: 2
          }}
        >
          <IconButton
            onClick={saveRegion}
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              width: 48,
              height: 48
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      )}

      {/* Render existing regions */}
      {renderRegionsOverlay()}
    </Box>
  );
};

export default ImageRegionSelector; 
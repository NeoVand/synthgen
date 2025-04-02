import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Box, Typography, IconButton } from '@mui/material';
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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: 'px', width: 0, height: 0, x: 0, y: 0 });
  const [regions, setRegions] = useState<Region[]>([]);
  
  // Generate region colors
  const getRegionColors = useCallback((): { bg: string[], border: string[] } => {
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
  
  const { bg: bgColors, border: borderColors } = getRegionColors();
  
  // Generate cropped image from selection
  const generateCroppedImage = useCallback((pixelCrop: Crop): string => {
    if (!imgRef.current || 
        typeof pixelCrop.x !== 'number' || 
        typeof pixelCrop.y !== 'number' || 
        typeof pixelCrop.width !== 'number' || 
        typeof pixelCrop.height !== 'number' ||
        pixelCrop.width === 0 ||
        pixelCrop.height === 0) {
          console.error('generateCroppedImage: Invalid pixelCrop provided', pixelCrop);
          return '';
        }
    
    // Create a higher quality canvas for better image fidelity
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return '';
    
    // Set dimensions to match the crop
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    // Set quality settings for better image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw the cropped portion of the image
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    // Use higher quality (0.95) for JPEG conversion
    return canvas.toDataURL('image/jpeg', 0.95);
  }, []);
  
  // Function to add a new region based on a completed pixel crop (parameter type Crop)
  const addRegion = useCallback((newPixelCrop: Crop) => {
    // Add checks for undefined properties, although onComplete should provide them
    if (!imgRef.current || 
        typeof newPixelCrop.x !== 'number' || 
        typeof newPixelCrop.y !== 'number' || 
        typeof newPixelCrop.width !== 'number' || 
        typeof newPixelCrop.height !== 'number' ||
        newPixelCrop.width === 0 || 
        newPixelCrop.height === 0) {
          console.warn('addRegion: Received invalid or zero-dimension crop', newPixelCrop);
          return; // Do not add region if crop is invalid
        }

    // Now TypeScript knows x, y, width, height are numbers here
    const safePixelCrop = newPixelCrop as Required<Crop>; // Assert type after checks

    const imageData = generateCroppedImage(safePixelCrop);
    if (!imageData) return;

    const newRegion: Region = {
      id: uuidv4(),
      crop: {
        x: safePixelCrop.x,
        y: safePixelCrop.y,
        width: safePixelCrop.width,
        height: safePixelCrop.height,
        originalWidth: imgRef.current.naturalWidth,
        originalHeight: imgRef.current.naturalHeight
      },
      imageData
    };

    setRegions(prevRegions => {
      const updatedRegions = [...prevRegions, newRegion];
      onRegionSelect(updatedRegions);
      return updatedRegions;
    });

    // Reset the visual crop selection in ReactCrop to an empty state
    setCrop({ unit: 'px', width: 0, height: 0, x: 0, y: 0 });

  }, [generateCroppedImage, onRegionSelect]);
  
  // Delete a region
  const deleteRegion = useCallback((id: string) => {
    setRegions(prevRegions => {
        const updatedRegions = prevRegions.filter(region => region.id !== id);
        onRegionSelect(updatedRegions);
        return updatedRegions;
    });
  }, [onRegionSelect]);
  
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
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'inline-block',
        cursor: disabled ? 'not-allowed' : 'crosshair',
        maxWidth: '100%',
        lineHeight: 0,
      }}
    >
      <ReactCrop
        src={imgSrc}
        crop={crop}
        onChange={(c) => setCrop(c)}
        onComplete={(c) => {
          if (c.width && c.height) {
            setTimeout(() => addRegion(c), 0); 
          }
        }}
        disabled={disabled}
        style={{ display: 'block' }}
      >
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Selectable Region"
          style={{ 
            opacity: disabled ? 0.6 : 1,
            maxWidth: 'none',
            maxHeight: 'none',
            display: 'block',
            userSelect: 'none',
          }}
          onLoad={(e) => { imgRef.current = e.currentTarget; }}
        />
      </ReactCrop>
      
      {renderRegionsOverlay()}
    </Box>
  );
};

export default ImageRegionSelector; 
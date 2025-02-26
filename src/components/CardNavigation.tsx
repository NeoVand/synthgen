import React from 'react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  useTheme,
  Tooltip
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface CardNavigationProps {
  currentIndex: number;
  totalCards: number;
  onCardChange: (index: number) => void;
}

const CardNavigation: React.FC<CardNavigationProps> = ({ 
  currentIndex, 
  totalCards, 
  onCardChange 
}) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: 1,
      maxWidth: 'fit-content',  // Prevent excessive width
    }}>
      <Tooltip title={currentIndex > 0 ? "Previous card" : "No previous card"}>
        <span>
          <IconButton 
            onClick={() => onCardChange(currentIndex - 1)} 
            disabled={currentIndex <= 0}
            size="small"
            sx={{
              width: 28,  // Reduced from default
              height: 28,  // Reduced from default
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <NavigateBeforeIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </span>
      </Tooltip>
      
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 0.75,  // Reduced gap
      }}>
        <TextField
          size="small"
          value={currentIndex + 1}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 1 && value <= totalCards) {
              onCardChange(value - 1);
            }
          }}
          inputProps={{
            style: { 
              textAlign: 'center',
              padding: '2px 4px',  // Reduced padding
              width: '32px',  // Reduced width
              fontSize: '0.875rem'  // Slightly smaller font
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
            }
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ 
          fontSize: '0.875rem',  // Match input text size
          userSelect: 'none'  // Prevent selection
        }}>
          / {totalCards}
        </Typography>
      </Box>
      
      <Tooltip title={currentIndex < totalCards - 1 ? "Next card" : "No more cards"}>
        <span>
          <IconButton 
            onClick={() => onCardChange(currentIndex + 1)} 
            disabled={currentIndex >= totalCards - 1}
            size="small"
            sx={{
              width: 28,  // Reduced from default
              height: 28,  // Reduced from default
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <NavigateNextIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default CardNavigation; 
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  useTheme
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxWidth: '400px',
          bgcolor: theme.palette.mode === 'dark' ? '#1D1F21' : '#FFFFFF',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        color: theme.palette.primary.main
      }}>
        <ScienceIcon sx={{ fontSize: '1.75rem' }} />
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Q&A Generator
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '4px !important' }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          A powerful tool for generating question-answer pairs from documents using local language models.
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Developed by{' '}
          <Typography component="span" sx={{ 
            color: theme.palette.primary.main,
            fontWeight: 500
          }}>
            Neo Mohsenvand
          </Typography>
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog; 
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Typography,
  FormControl,
  Select,
  MenuItem,
  Slider,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Button,
  CircularProgress,
  useTheme,
  alpha,
  Tooltip,
  IconButton
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import MemoryIcon from '@mui/icons-material/Memory';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface OllamaSettings {
  model: string;
  temperature: number;
  topP: number;
  useFixedSeed: boolean;
  seed: number;
  numCtx: number;
}

interface OllamaSettingsProps {
  onSettingsSave: (settings: OllamaSettings) => void;
  autoApply?: boolean;
  hideTitle?: boolean;
  initialSettings?: OllamaSettings;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({ onSettingsSave, autoApply = false, hideTitle = false, initialSettings }) => {
  const theme = useTheme();
  const [settings, setSettings] = useState<OllamaSettings>(initialSettings || {
    model: '',
    temperature: 0.7,
    topP: 0.9,
    useFixedSeed: false,
    seed: 42,
    numCtx: 2048,
  });
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetch models function
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data.models);
      setError(null);
    } catch (err) {
      setError('Failed to load models. Please ensure:\n1. Ollama is running on your machine\n2. Start Ollama with CORS enabled:\nOLLAMA_ORIGINS=http://localhost:5173 ollama serve');
      console.error('Error fetching models:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch models on mount only
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Add effect to update settings when initialSettings changes
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Auto-apply changes when settings change if autoApply is true
  useEffect(() => {
    if (autoApply && initialSettings && settings !== initialSettings) {
      onSettingsSave(settings);
    }
  }, [settings, autoApply, onSettingsSave, initialSettings]);

  // Memoize the filtered models
  const availableModels = useMemo(() => models || [], [models]);

  return (
    <Box>
      {!hideTitle && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          mb: 3,
          color: theme.palette.primary.main 
        }}>
          <TuneIcon sx={{ fontSize: '1.5rem' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              fontSize: '1.125rem',
              letterSpacing: '-0.025em'
            }}
          >
            Model Settings
          </Typography>
          <Tooltip title="Configure the AI model's behavior and parameters" placement="right">
            <IconButton size="small" sx={{ ml: 'auto', color: 'inherit', opacity: 0.7 }}>
              <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <FormControl 
        fullWidth 
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ 
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
            }}>
              Model
            </Typography>
            <Tooltip title="Select the AI model to use for generation. Different models may have different capabilities and performance characteristics." placement="right">
              <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Select
          value={settings.model || ''}
          onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
          startAdornment={
            <MemoryIcon sx={{ 
              ml: 1, 
              mr: 1, 
              color: theme.palette.primary.main,
              opacity: 0.8
            }} />
          }
          MenuProps={{
            autoFocus: false,
            disableAutoFocusItem: true,
            onClose: () => {
              const selectElement = document.querySelector('[aria-labelledby="model-select"]');
              if (selectElement) {
                (selectElement as HTMLElement).focus();
              }
            }
          }}
          id="model-select"
          sx={{
            '& .MuiSelect-select': {
              py: 1.5,
            }
          }}
        >
          {loading ? (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                <CircularProgress size={16} />
                <Typography sx={{ fontSize: '0.875rem' }}>
                  Loading models...
                </Typography>
              </Box>
            </MenuItem>
          ) : error ? (
            <MenuItem disabled>
              <Typography color="error" sx={{ fontSize: '0.875rem' }}>
                {error}
              </Typography>
            </MenuItem>
          ) : (
            availableModels.map((model) => (
              <MenuItem 
                key={model.name} 
                value={model.name}
                sx={{
                  borderRadius: '6px',
                  mx: 0.5,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                {model.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ 
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
            }}>
              Temperature
            </Typography>
            <Tooltip title="Controls randomness in the output. Higher values (e.g., 0.8) make the output more creative but less focused, lower values (e.g., 0.2) make it more deterministic and focused." placement="right">
              <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
          <span style={{ 
            fontFamily: 'var(--font-mono)',
            color: theme.palette.primary.main,
            fontSize: '0.8125rem'
          }}>
            {settings.temperature}
          </span>
        </Box>
        <Slider
          value={settings.temperature}
          onChange={(_, value) => setSettings(prev => ({ ...prev, temperature: value as number }))}
          min={0}
          max={2}
          step={0.1}
          marks={[
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
          ]}
          sx={{
            '& .MuiSlider-mark': {
              width: '4px',
              height: '4px',
              borderRadius: '50%',
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }
          }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ 
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
            }}>
              Top P
            </Typography>
            <Tooltip title="Controls diversity of word choices. Lower values (e.g., 0.1) make the output more focused on highly probable words, higher values (e.g., 0.9) allow more diverse word choices." placement="right">
              <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
          <span style={{ 
            fontFamily: 'var(--font-mono)',
            color: theme.palette.primary.main,
            fontSize: '0.8125rem'
          }}>
            {settings.topP}
          </span>
        </Box>
        <Slider
          value={settings.topP}
          onChange={(_, value) => setSettings(prev => ({ ...prev, topP: value as number }))}
          min={0}
          max={1}
          step={0.1}
          marks={[
            { value: 0, label: '0' },
            { value: 0.5, label: '0.5' },
            { value: 1, label: '1' },
          ]}
          sx={{
            '& .MuiSlider-mark': {
              width: '4px',
              height: '4px',
              borderRadius: '50%',
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.useFixedSeed}
              onChange={(e) => setSettings(prev => ({ ...prev, useFixedSeed: e.target.checked }))}
              sx={{
                '&.Mui-checked': {
                  color: theme.palette.primary.main,
                }
              }}
            />
          }
          label={
            <Typography sx={{ 
              fontSize: '0.875rem',
              fontWeight: 500,
              color: theme.palette.text.secondary
            }}>
              Use Fixed Seed
            </Typography>
          }
        />
        <Tooltip title="When enabled, uses a fixed random seed to make generation results more reproducible." placement="right">
          <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
            <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {settings.useFixedSeed && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Seed Value
            </Typography>
            <Tooltip title="The specific random seed to use. Using the same seed with the same prompt and settings should produce similar results." placement="right">
              <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
                <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            type="number"
            fullWidth
            value={settings.seed}
            onChange={(e) => setSettings(prev => ({ ...prev, seed: Number(e.target.value) }))}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem'
              }
            }}
          />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Context Size
          </Typography>
          <Tooltip title="Maximum number of tokens the model can process at once. Larger values allow for more context but use more memory and may be slower." placement="right">
            <IconButton size="small" sx={{ ml: 0.5, opacity: 0.7 }}>
              <HelpOutlineIcon sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          type="number"
          fullWidth
          value={settings.numCtx}
          onChange={(e) => setSettings(prev => ({ ...prev, numCtx: Number(e.target.value) }))}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem'
            }
          }}
        />
      </Box>

      {!autoApply && (
        <Button
          variant="contained"
          fullWidth
          sx={{ 
            mt: 2,
            py: 1.25,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            letterSpacing: '-0.025em',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: alpha(theme.palette.primary.main, 0.9)
            }
          }}
          onClick={() => onSettingsSave(settings)}
        >
          Apply Settings
        </Button>
      )}
    </Box>
  );
};

export default OllamaSettings;

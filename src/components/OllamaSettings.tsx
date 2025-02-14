import React, { useEffect, useState } from 'react';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';

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
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({ onSettingsSave, autoApply = false, hideTitle = false }) => {
  const [settings, setSettings] = useState<OllamaSettings>({
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

  // Fetch available models from Ollama
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data.models);
        setError(null);
      } catch (err) {
        setError('Failed to load models. Is Ollama running?');
        console.error('Error fetching models:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Auto-apply changes when settings change if autoApply is true
  useEffect(() => {
    if (autoApply) {
      onSettingsSave(settings);
    }
  }, [settings, autoApply, onSettingsSave]);

  return (
    <Box>
      {!hideTitle && (
        <Typography 
          variant="subtitle2" 
          gutterBottom 
          sx={{ 
            fontWeight: 500,
            color: 'text.secondary',
            fontSize: '0.875rem'
          }}
        >
          Model Settings
        </Typography>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Model</InputLabel>
        <Select
          value={settings.model}
          label="Model"
          onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
        >
          {loading ? (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                Loading models...
              </Box>
            </MenuItem>
          ) : error ? (
            <MenuItem disabled>
              <Typography color="error">{error}</Typography>
            </MenuItem>
          ) : (
            models.map((model) => (
              <MenuItem key={model.name} value={model.name}>
                {model.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <Typography 
        gutterBottom 
        variant="subtitle2"
        sx={{ 
          fontWeight: 500,
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}
      >
        Temperature ({settings.temperature})
      </Typography>
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
      />

      <Typography 
        gutterBottom 
        variant="subtitle2"
        sx={{ 
          fontWeight: 500,
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}
      >
        Top P ({settings.topP})
      </Typography>
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
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={settings.useFixedSeed}
            onChange={(e) => setSettings(prev => ({ ...prev, useFixedSeed: e.target.checked }))}
          />
        }
        label="Use Fixed Seed"
      />

      {settings.useFixedSeed && (
        <TextField
          label="Seed"
          type="number"
          fullWidth
          margin="normal"
          value={settings.seed}
          onChange={(e) => setSettings(prev => ({ ...prev, seed: Number(e.target.value) }))}
        />
      )}

      <TextField
        label="Context Size (numCtx)"
        type="number"
        fullWidth
        margin="normal"
        value={settings.numCtx}
        onChange={(e) => setSettings(prev => ({ ...prev, numCtx: Number(e.target.value) }))}
      />

      {!autoApply && (
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => onSettingsSave(settings)}
        >
          Apply Settings
        </Button>
      )}
    </Box>
  );
};

export default OllamaSettings;

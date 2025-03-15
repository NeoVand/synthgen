import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TuneIcon from '@mui/icons-material/Tune';

// Import directly from components (the newly created index.ts will handle the re-export)
import OllamaSettings from './OllamaSettings';
import AzureOpenAISettings from './AzureOpenAISettings';
import { ModelProvider, OllamaSettings as OllamaSettingsType, AzureOpenAISettings as AzureOpenAISettingsType } from '../types';

interface ModelSettingsProps {
  onProviderChange: (provider: ModelProvider) => void;
  ollamaSettings: OllamaSettingsType;
  onOllamaSettingsChange: (newSettings: OllamaSettingsType) => void;
  azureSettings: AzureOpenAISettingsType;
  onAzureSettingsChange: (newSettings: AzureOpenAISettingsType) => void;
  hideTitle?: boolean;
  onHelp?: () => void;
}

const ModelSettings: React.FC<ModelSettingsProps> = ({
  onProviderChange,
  ollamaSettings,
  onOllamaSettingsChange,
  azureSettings,
  onAzureSettingsChange,
  hideTitle = false,
  onHelp,
}) => {
  const theme = useTheme();
  // Keep track of which provider is selected
  const [provider, setProvider] = useState<ModelProvider>('ollama');

  const handleProviderChange = (e: SelectChangeEvent) => {
    const newProvider = e.target.value as ModelProvider;
    setProvider(newProvider);
    onProviderChange(newProvider);
  };

  return (
    <Box>
      {!hideTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <TuneIcon sx={{ fontSize: '1.5rem', color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Model Provider
          </Typography>
          {onHelp && (
            <Tooltip title="Select which AI provider you want to use">
              <IconButton size="small" onClick={onHelp}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Provider dropdown */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Select
          value={provider}
          onChange={handleProviderChange}
          sx={{
            '& .MuiSelect-select': {
              py: 1.5,
            },
          }}
        >
          <MenuItem value="ollama">Ollama (Local)</MenuItem>
          <MenuItem value="azure">Azure OpenAI</MenuItem>
        </Select>
      </FormControl>

      {/* Render the settings for the selected provider */}
      {provider === 'ollama' && (
        <OllamaSettings
          autoApply
          initialSettings={ollamaSettings}
          onSettingsSave={onOllamaSettingsChange}
          hideTitle
          onHelp={onHelp}
        />
      )}

      {provider === 'azure' && (
        <AzureOpenAISettings
          autoApply
          initialSettings={azureSettings}
          onSettingsSave={onAzureSettingsChange}
          hideTitle
          onHelp={onHelp}
        />
      )}
    </Box>
  );
};

export default ModelSettings; 
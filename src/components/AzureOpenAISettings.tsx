import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Tooltip,
  useTheme,
  Button,
  FormHelperText,
  alpha,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MemoryIcon from '@mui/icons-material/Memory';
import TuneIcon from '@mui/icons-material/Tune';
import { AzureOpenAISettings as AzureSettings } from '../types';

interface AzureOpenAISettingsProps {
  initialSettings?: AzureSettings;
  onSettingsSave: (settings: AzureSettings) => void;
  autoApply?: boolean;
  hideTitle?: boolean;
  onHelp?: () => void;
}

// Export the component directly to help TypeScript recognize it
const AzureOpenAISettings: React.FC<AzureOpenAISettingsProps> = ({
  initialSettings,
  onSettingsSave,
  autoApply = false,
  hideTitle = false,
  onHelp,
}) => {
  const theme = useTheme();

  const [settings, setSettings] = useState<AzureSettings>(
    initialSettings || {
      endpoint: '',
      apiVersion: '2023-12-01-preview',
      deploymentName: '',
      authMethod: 'apiKey',
      apiKey: '',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 512,
    }
  );

  const handleChange = (field: keyof AzureSettings, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    if (autoApply) {
      onSettingsSave(newSettings);
    }
  };

  const handleSaveClick = () => {
    onSettingsSave(settings);
  };

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  return (
    <Box>
      {!hideTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <TuneIcon sx={{ fontSize: '1.5rem', color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Azure OpenAI Settings
          </Typography>
          {onHelp && (
            <Tooltip title="Azure OpenAI configuration" placement="right">
              <IconButton size="small" onClick={onHelp}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Endpoint */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Azure OpenAI Endpoint"
          value={settings.endpoint}
          onChange={(e) => handleChange('endpoint', e.target.value)}
          placeholder="https://<your-resource-name>.openai.azure.com"
          size="small"
          helperText="The endpoint URL for your Azure OpenAI resource"
        />
      </FormControl>

      {/* API Version */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="API Version"
          value={settings.apiVersion}
          onChange={(e) => handleChange('apiVersion', e.target.value)}
          size="small"
          helperText="Azure OpenAI API version (e.g., 2023-12-01-preview)"
        />
      </FormControl>

      {/* Deployment name */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Deployment Name"
          value={settings.deploymentName}
          onChange={(e) => handleChange('deploymentName', e.target.value)}
          size="small"
          helperText="The name of your deployed model in Azure OpenAI"
        />
      </FormControl>

      {/* Auth Method */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="auth-method-label">Auth Method</InputLabel>
        <Select
          labelId="auth-method-label"
          label="Auth Method"
          value={settings.authMethod}
          onChange={(e) => handleChange('authMethod', e.target.value)}
          size="small"
        >
          <MenuItem value="apiKey">API Key</MenuItem>
          <MenuItem value="aad">Azure AD</MenuItem>
        </Select>
        <FormHelperText>
          Choose how to authenticate with Azure OpenAI
        </FormHelperText>
      </FormControl>

      {/* If API Key is selected, show API Key input */}
      {settings.authMethod === 'apiKey' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            type="password"
            label="API Key"
            value={settings.apiKey || ''}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            size="small"
            helperText="Your Azure OpenAI API key"
          />
        </FormControl>
      )}

      {/* If AAD is selected, show information message */}
      {settings.authMethod === 'aad' && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: alpha(theme.palette.info.main, 0.1), 
          borderRadius: 1, 
          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
        }}>
          <Typography variant="body2">
            Azure AD authentication will use your browser's auth session.
            Ensure you have the "Cognitive Services OpenAI User" role on your Azure OpenAI resource.
          </Typography>
        </Box>
      )}

      {/* Temperature */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Temperature</Typography>
          <Typography sx={{ fontFamily: 'monospace' }}>{settings.temperature}</Typography>
        </Box>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <FormHelperText>
          Controls randomness: Lower values are more deterministic, higher values more creative
        </FormHelperText>
      </Box>

      {/* Top P */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Top P</Typography>
          <Typography sx={{ fontFamily: 'monospace' }}>{settings.topP}</Typography>
        </Box>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.topP}
          onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <FormHelperText>
          Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered
        </FormHelperText>
      </Box>

      {/* Max Tokens */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Max Tokens"
          type="number"
          value={settings.maxTokens}
          onChange={(e) => handleChange('maxTokens', parseInt(e.target.value, 10))}
          size="small"
          helperText="Maximum number of tokens to generate"
        />
      </FormControl>

      {!autoApply && (
        <Button variant="contained" onClick={handleSaveClick}>
          Save Azure Settings
        </Button>
      )}
    </Box>
  );
};

// Explicit default export
export default AzureOpenAISettings; 
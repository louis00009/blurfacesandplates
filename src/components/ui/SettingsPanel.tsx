import React from 'react';
import {
  Paper, Typography, Button, Box, Switch, FormControlLabel, Slider, Stack, 
  Divider, CircularProgress, TextField, Chip
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { ProcessingSettings, DetectionMethod } from '../../types';

interface SettingsPanelProps {
  settings: ProcessingSettings;
  onSettingsChange: (settings: Partial<ProcessingSettings>) => void;
  selectedImagesCount: number;
  onProcessSelectedImages: () => void;
  onSelectAllImages: () => void;
  onClearSelection: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  imagesCount: number;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  selectedImagesCount,
  onProcessSelectedImages,
  onSelectAllImages,
  onClearSelection,
  onFileUpload,
  isProcessing,
  imagesCount
}) => {
  const detectionMethods = [
    {key: 'smartAPI', label: '🤖 SMART API', desc: 'Intelligent API management (RECOMMENDED)'},
    {key: 'plateRecognizer', label: '📸 Plate Recognizer', desc: 'Professional API (MOST ACCURATE)'},
    {key: 'openalpr', label: '🔓 OpenALPR', desc: 'Free 1000/month'},
    {key: 'googleVision', label: '🔍 Google Vision', desc: 'Free 1000/month'},
    {key: 'azure', label: '🔷 Azure Vision', desc: 'Free 5000/month'},
    {key: 'aws', label: '🟠 AWS Rekognition', desc: 'Free 5000/month'},
    {key: 'deepLearning', label: '🤖 DEEP LEARNING', desc: 'YOLOv8n + OCR (Local)'},
    {key: 'robust', label: '🧠 INTELLIGENT', desc: '5-method combined (Local)'},
    {key: 'simple', label: '🎯 Simple', desc: 'Fast & effective (Local)'},
    {key: 'aggressive', label: '🔥 Aggressive', desc: 'Loose criteria (Local)'},
    {key: 'australian', label: '🇦🇺 Australian', desc: 'Optimized for AU plates (Local)'}
  ];

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>Control Panel</Typography>
      
      {/* File Upload */}
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="raised-button-file"
        multiple
        type="file"
        onChange={onFileUpload}
      />
      <label htmlFor="raised-button-file">
        <Button variant="contained" component="span" startIcon={<CloudUpload />} fullWidth>
          Upload Images
        </Button>
      </label>

      {/* Batch Processing Controls */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Batch Processing ({selectedImagesCount} selected)
        </Typography>
        
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <Button 
              variant="contained" 
              onClick={onProcessSelectedImages}
              disabled={selectedImagesCount === 0 || isProcessing}
              fullWidth
              sx={{ flex: 2 }}
            >
              {isProcessing ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                `Process ${selectedImagesCount} Image${selectedImagesCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={onSelectAllImages}
              disabled={imagesCount === 0}
            >
              Select All
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              onClick={onClearSelection}
              disabled={selectedImagesCount === 0}
            >
              Clear Selection
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* Detection Settings */}
      <Typography variant="h6">Detection Settings</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enableFaceDetection}
            onChange={(e) => onSettingsChange({ enableFaceDetection: e.target.checked })}
            name="faceDetection"
          />
        }
        label="Enable Face Detection"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.enablePlateDetection}
            onChange={(e) => onSettingsChange({ enablePlateDetection: e.target.checked })}
            name="plateDetection"
          />
        }
        label="Enable License Plate Detection"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.debugMode}
            onChange={(e) => onSettingsChange({ debugMode: e.target.checked })}
            name="debugMode"
          />
        }
        label="🐛 Debug Mode (Show Console Logs)"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.highlightMode}
            onChange={(e) => onSettingsChange({ highlightMode: e.target.checked })}
            name="highlightMode"
          />
        }
        label="🎨 Highlight Mode (Testing - Use Color Instead of Blur/Mosaic)"
      />
      {settings.highlightMode && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography gutterBottom>Highlight Color:</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <input
              type="color"
              value={settings.highlightColor}
              onChange={(e) => onSettingsChange({ highlightColor: e.target.value })}
              style={{
                width: 50,
                height: 40,
                border: '2px solid #ccc',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Selected: {settings.highlightColor.toUpperCase()}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Detection Method Selection */}
      <Typography gutterBottom>Detection Method:</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {detectionMethods.map((method) => (
          <Chip
            key={method.key}
            label={method.label}
            variant={settings.detectionMethod === method.key ? 'filled' : 'outlined'}
            color={settings.detectionMethod === method.key ? 'primary' : 'default'}
            clickable
            onClick={() => onSettingsChange({ detectionMethod: method.key as DetectionMethod })}
            sx={{ mb: 1 }}
          />
        ))}
      </Stack>

      {/* Smart API Management Button */}
      {settings.detectionMethod === 'smartAPI' && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              // This will be handled by the parent component
              const event = new CustomEvent('openAPIManager');
              window.dispatchEvent(event);
            }}
            sx={{ mb: 1 }}
          >
            🔧 Open API Management Center
          </Button>
          <Typography variant="body2" color="text.secondary">
            Configure multiple APIs, set priorities, monitor usage, and enable automatic fallback.
          </Typography>
        </Box>
      )}

      {/* API Key Inputs */}
      {settings.detectionMethod === 'plateRecognizer' && (
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Plate Recognizer API Key:</Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={settings.plateRecognizerApiKey}
            onChange={(e) => onSettingsChange({ plateRecognizerApiKey: e.target.value })}
            placeholder="Enter your Plate Recognizer API key"
            variant="outlined"
            helperText="Get free API key at platerecognizer.com (1000 calls/month)"
          />
        </Box>
      )}

      {settings.detectionMethod === 'openalpr' && (
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>OpenALPR API Key:</Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={settings.openalprApiKey}
            onChange={(e) => onSettingsChange({ openalprApiKey: e.target.value })}
            placeholder="Enter your OpenALPR API key"
            variant="outlined"
            helperText="Get free API key at openalpr.com (1000 calls/month)"
          />
        </Box>
      )}

      {settings.detectionMethod === 'googleVision' && (
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Google Cloud Vision API Key:</Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={settings.googleVisionApiKey}
            onChange={(e) => onSettingsChange({ googleVisionApiKey: e.target.value })}
            placeholder="Enter your Google Cloud Vision API key"
            variant="outlined"
            helperText="Get free API key at cloud.google.com/vision (1000 calls/month)"
          />
        </Box>
      )}

      <Divider />

      {/* Anonymization Settings */}
      <Typography variant="h6">Anonymization Settings</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={settings.blur}
            onChange={(e) => onSettingsChange({ blur: e.target.checked })}
            name="blurEffect"
          />
        }
        label="Apply Blur"
      />
      {settings.blur && (
        <Box>
          <Typography gutterBottom>Blur Amount: {settings.blurAmount}%</Typography>
          <Slider
            value={settings.blurAmount}
            onChange={(e, newValue) => onSettingsChange({ blurAmount: newValue as number })}
            aria-labelledby="blur-amount-slider"
            valueLabelDisplay="auto"
            min={0}
            max={100}
          />
        </Box>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={settings.mosaic}
            onChange={(e) => onSettingsChange({ mosaic: e.target.checked })}
            name="mosaicEffect"
          />
        }
        label="Apply Mosaic"
      />
      {settings.mosaic && (
        <Box>
          <Typography gutterBottom>Mosaic Pixel Size: {settings.mosaicAmount}</Typography>
          <Slider
            value={settings.mosaicAmount}
            onChange={(e, newValue) => onSettingsChange({ mosaicAmount: newValue as number })}
            aria-labelledby="mosaic-amount-slider"
            valueLabelDisplay="auto"
            min={4}
            max={30}
          />
        </Box>
      )}
    </Paper>
  );
};

export default SettingsPanel;
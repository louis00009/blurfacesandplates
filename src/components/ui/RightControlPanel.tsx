import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Switch,
  FormControlLabel,
  Slider,
  Stack,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { ProcessingSettings } from '../../types';

interface RightControlPanelProps {
  settings: ProcessingSettings;
  onSettingsChange: (settings: Partial<ProcessingSettings>) => void;
  selectedImagesCount: number;
  onProcessSelectedImages: () => void;
  onSelectAllImages: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
  imagesCount: number;
}

const RightControlPanel: React.FC<RightControlPanelProps> = ({
  settings,
  onSettingsChange,
  selectedImagesCount,
  onProcessSelectedImages,
  onSelectAllImages,
  onClearSelection,
  isProcessing,
  imagesCount
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        width: 320,
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Control Panel
      </Typography>

      {/* Batch Processing Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Batch Processing
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selected: {selectedImagesCount} of {imagesCount} images
          </Typography>
          
          <Button
            variant="contained"
            onClick={onProcessSelectedImages}
            disabled={selectedImagesCount === 0 || isProcessing}
            fullWidth
            startIcon={isProcessing ? <CircularProgress size={16} /> : <PlayArrow />}
            sx={{ mb: 1 }}
          >
            {isProcessing
              ? 'Processing...'
              : `Process ${selectedImagesCount} Image${selectedImagesCount !== 1 ? 's' : ''}`
            }
          </Button>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={onSelectAllImages}
              disabled={imagesCount === 0}
              sx={{ flex: 1 }}
            >
              Select All
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={onClearSelection}
              disabled={selectedImagesCount === 0}
              sx={{ flex: 1 }}
            >
              Clear
            </Button>
          </Stack>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Detection Settings */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Detection Settings
        </Typography>
        
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableFaceDetection}
                onChange={(e) => onSettingsChange({ enableFaceDetection: e.target.checked })}
              />
            }
            label="Face Detection"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.enablePlateDetection}
                onChange={(e) => onSettingsChange({ enablePlateDetection: e.target.checked })}
              />
            }
            label="License Plate Detection"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.debugMode}
                onChange={(e) => onSettingsChange({ debugMode: e.target.checked })}
              />
            }
            label="Debug Mode"
          />
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Anonymization Settings */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Anonymization Method
        </Typography>
        
        <Stack spacing={2}>
          {/* Blur Settings */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.blur}
                  onChange={(e) => onSettingsChange({ blur: e.target.checked })}
                />
              }
              label="Apply Blur Effect"
            />
            {settings.blur && (
              <Box sx={{ mt: 1, px: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Blur Intensity: {settings.blurAmount}%
                </Typography>
                <Slider
                  value={settings.blurAmount}
                  onChange={(e, newValue) => onSettingsChange({ blurAmount: newValue as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Box>
            )}
          </Box>

          {/* Mosaic Settings */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.mosaic}
                  onChange={(e) => onSettingsChange({ mosaic: e.target.checked })}
                />
              }
              label="Apply Mosaic Effect"
            />
            {settings.mosaic && (
              <Box sx={{ mt: 1, px: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Pixel Size: {settings.mosaicAmount}px
                </Typography>
                <Slider
                  value={settings.mosaicAmount}
                  onChange={(e, newValue) => onSettingsChange({ mosaicAmount: newValue as number })}
                  min={4}
                  max={30}
                  step={2}
                  marks
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Box>
            )}
          </Box>

          {/* Highlight Mode */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.highlightMode}
                  onChange={(e) => onSettingsChange({ highlightMode: e.target.checked })}
                />
              }
              label="Highlight Mode (Testing)"
            />
            {settings.highlightMode && (
              <Box sx={{ mt: 1, px: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Highlight Color:
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <input
                    type="color"
                    value={settings.highlightColor}
                    onChange={(e) => onSettingsChange({ highlightColor: e.target.value })}
                    style={{
                      width: 40,
                      height: 30,
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {settings.highlightColor.toUpperCase()}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Processing Status */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Status
        </Typography>
        
        <Stack spacing={1}>
          <Chip
            label={isProcessing ? "Processing Active" : "Ready"}
            color={isProcessing ? "warning" : "success"}
            variant="outlined"
            size="small"
          />
          {settings.enableFaceDetection && (
            <Chip
              label="Face Detection: ON"
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {settings.enablePlateDetection && (
            <Chip
              label="Plate Detection: ON"
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Stack>
      </Box>
    </Paper>
  );
};

export default RightControlPanel;
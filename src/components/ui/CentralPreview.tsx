import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  CloudUpload,
  Visibility,
  VisibilityOff,
  Image as ImageIcon,
  DragIndicator
} from '@mui/icons-material';
import { ProcessedImage } from '../../types';

interface CentralPreviewProps {
  selectedImage: ProcessedImage | null;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (files: FileList) => void;
  images: ProcessedImage[];
}

const CentralPreview: React.FC<CentralPreviewProps> = ({
  selectedImage,
  showOriginal,
  onToggleOriginal,
  onFileUpload,
  onFileDrop,
  images
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileDrop(files);
    }
  }, [onFileDrop]);

  // Empty state when no images are uploaded
  if (images.length === 0) {
    return (
      <Paper
        elevation={2}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          minHeight: 400,
          border: isDragOver ? '2px dashed #2196f3' : '2px dashed #ccc',
          bgcolor: isDragOver ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DragIndicator sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          Upload Images to Get Started
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Click the button below or drag and drop images here
        </Typography>
        
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="central-file-upload"
          multiple
          type="file"
          onChange={onFileUpload}
        />
        <label htmlFor="central-file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUpload />}
            size="large"
            sx={{ mb: 2 }}
          >
            Choose Images
          </Button>
        </label>
        
        <Typography variant="caption" color="text.secondary">
          Supports multiple image selection and drag & drop
        </Typography>
      </Paper>
    );
  }

  // Preview state when images are available but none selected
  if (!selectedImage) {
    return (
      <Paper
        elevation={2}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          minHeight: 400
        }}
      >
        <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom color="text.secondary">
          Select an Image to Preview
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Choose an image from the gallery on the left to see the preview
        </Typography>
      </Paper>
    );
  }

  // Main preview with selected image
  return (
    <Paper
      elevation={2}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        minHeight: 400
      }}
    >
      {/* Header with controls */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Preview: {selectedImage.fileName}
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Processing status */}
          {selectedImage.processing && (
            <Chip label="Processing..." color="warning" size="small" />
          )}
          
          {/* Toggle original/processed view */}
          {selectedImage.processedDataUrl && (
            <IconButton
              onClick={onToggleOriginal}
              color={showOriginal ? "default" : "primary"}
              size="small"
            >
              {showOriginal ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          )}
          
          {/* Current view indicator */}
          {selectedImage.processedDataUrl && (
            <Chip
              label={showOriginal ? "Original" : "Processed"}
              variant="outlined"
              size="small"
              color={showOriginal ? "default" : "primary"}
            />
          )}
        </Stack>
      </Box>

      {/* Image display area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {selectedImage.processing ? (
          <Box textAlign="center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Processing Image...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while AI analyzes the image
            </Typography>
          </Box>
        ) : (
          <img
            src={
              showOriginal || !selectedImage.processedDataUrl
                ? selectedImage.originalUrl
                : selectedImage.processedDataUrl
            }
            alt={selectedImage.fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        )}
      </Box>

      {/* Detection info */}
      {selectedImage.detectionInfo && !selectedImage.processing && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" variant="outlined">
            <Typography variant="body2">
              {selectedImage.detectionInfo}
            </Typography>
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default CentralPreview;
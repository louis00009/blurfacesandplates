import React from 'react';
import {
  Box, Card, CardContent, CardMedia, Typography, Stack, Button, IconButton, LinearProgress
} from '@mui/material';
import { Visibility, Download } from '@mui/icons-material';
import { ProcessedImage } from '../../types';

interface ImagePreviewProps {
  selectedImage: ProcessedImage | null;
  showOriginal: boolean;
  onToggleOriginal: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  selectedImage,
  showOriginal,
  onToggleOriginal
}) => {
  if (!selectedImage) {
    return (
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 300,
        bgcolor: 'grey.100',
        borderRadius: 1
      }}>
        <Typography variant="h6" color="text.secondary">
          Select an image to preview
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      position: 'relative', 
      minHeight: 300 
    }}>
      <Card raised sx={{ 
        maxWidth: '100%', 
        maxHeight: 600, 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <CardMedia
          component="img"
          image={showOriginal ? selectedImage.originalUrl : (selectedImage.processedDataUrl || selectedImage.originalUrl)}
          alt={selectedImage.fileName}
          sx={{ 
            maxWidth: '100%', 
            height: 'auto', 
            objectFit: 'contain',
            display: 'block',
            filter: 'none' // Blur is applied only to detected regions in processImage function
          }}
        />
        <CardContent>
          <Typography variant="subtitle1">{selectedImage.fileName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedImage.processing ? 'Processing...' : selectedImage.detectionInfo}
          </Typography>
          {selectedImage.processing && (
            <LinearProgress sx={{ mt: 1 }} />
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={onToggleOriginal}
              startIcon={<Visibility />}
            >
              {showOriginal ? 'Show Processed' : 'Show Original'}
            </Button>
            <IconButton 
              aria-label="download" 
              size="small" 
              href={selectedImage.processedDataUrl || selectedImage.originalUrl} 
              download={selectedImage.fileName.replace(/(\.[\w\d_-]+)$/i, '_anonymized$1')}
            >
              <Download />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImagePreview;
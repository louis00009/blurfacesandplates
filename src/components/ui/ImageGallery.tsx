import React from 'react';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, Stack, IconButton, Chip
} from '@mui/material';
import { Settings, Delete, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { ProcessedImage } from '../../types';

interface ImageGalleryProps {
  images: ProcessedImage[];
  selectedImage: ProcessedImage | null;
  selectedImages: string[];
  onImageSelect: (image: ProcessedImage) => void;
  onImageToggleSelect: (imageId: string, event: React.MouseEvent) => void;
  onImageProcess: (imageId: string) => void;
  onImageDelete: (imageId: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  selectedImage,
  selectedImages,
  onImageSelect,
  onImageToggleSelect,
  onImageProcess,
  onImageDelete
}) => {
  return (
    <Box sx={{ my: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Image Gallery</Typography>
        {selectedImages.length > 0 && (
          <Chip 
            label={`${selectedImages.length} selected`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Stack>
      <Grid container spacing={2}>
        {images.map(img => (
          <Grid item key={img.id} xs={12} sm={6} md={3}>
            <Card 
              onClick={() => onImageSelect(img)}
              sx={{ 
                cursor: 'pointer', 
                border: selectedImages.includes(img.id) ? '2px solid #2196f3' : 
                        (img.id === selectedImage?.id ? '2px solid primary.main' : '1px solid #e0e0e0'),
                boxShadow: selectedImages.includes(img.id) ? 3 : 
                           (img.id === selectedImage?.id ? 5 : 1),
                position: 'relative'
              }}
            >
              {/* Multi-selection checkbox in top-right corner */}
              <Box
                onClick={(e) => onImageToggleSelect(img.id, e)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 1)',
                    transform: 'scale(1.1)'
                  }
                }}
              >
                {selectedImages.includes(img.id) ? (
                  <CheckCircle sx={{ color: '#2196f3', fontSize: 22 }} />
                ) : (
                  <RadioButtonUnchecked sx={{ color: 'grey.400', fontSize: 22 }} />
                )}
              </Box>

              {/* Preview indicator in top-left if this is the main preview image */}
              {img.id === selectedImage?.id && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    borderRadius: '12px',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
                    PREVIEW
                  </Typography>
                </Box>
              )}
              <CardMedia
                component="img"
                height="140"
                image={img.processedDataUrl || img.originalUrl}
                alt={img.fileName}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="subtitle2" noWrap>{img.fileName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {img.processing ? 'Processing...' : img.detectionInfo || 'Not processed'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <IconButton 
                    aria-label="process" 
                    size="small" 
                    onClick={(e) => { e.stopPropagation(); onImageProcess(img.id); }} 
                    disabled={img.processing}
                  >
                    <Settings fontSize="small" />
                  </IconButton>
                  <IconButton 
                    aria-label="delete" 
                    size="small" 
                    onClick={(e) => { e.stopPropagation(); onImageDelete(img.id); }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ImageGallery;
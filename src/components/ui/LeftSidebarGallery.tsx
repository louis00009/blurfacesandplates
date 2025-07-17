import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Stack,
  Divider
} from '@mui/material';
import {
  Add,
  Delete,
  CheckCircle,
  RadioButtonUnchecked,
  Image as ImageIcon
} from '@mui/icons-material';
import { ProcessedImage } from '../../types';

interface LeftSidebarGalleryProps {
  images: ProcessedImage[];
  selectedImage: ProcessedImage | null;
  selectedImages: string[];
  onImageSelect: (image: ProcessedImage) => void;
  onImageToggleSelect: (imageId: string) => void;
  onImageDelete: (imageId: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSelection: () => void;
  onRemoveAllImages: () => void;
}

const LeftSidebarGallery: React.FC<LeftSidebarGalleryProps> = ({
  images,
  selectedImage,
  selectedImages,
  onImageSelect,
  onImageToggleSelect,
  onImageDelete,
  onFileUpload,
  onClearSelection,
  onRemoveAllImages
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        width: 300,
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        p: 2
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Image Gallery
        </Typography>
        
        {/* Add Image Button */}
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="sidebar-file-upload"
          multiple
          type="file"
          onChange={onFileUpload}
        />
        <label htmlFor="sidebar-file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<Add />}
            fullWidth
            sx={{ mb: 1 }}
          >
            Add Images
          </Button>
        </label>

        {/* Selection Controls */}
        {selectedImages.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ flex: 1, alignSelf: 'center' }}>
              {selectedImages.length} selected
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={onClearSelection}
            >
              Clear
            </Button>
          </Stack>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Image List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {images.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <ImageIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body2" textAlign="center">
              No images uploaded
            </Typography>
            <Typography variant="caption" textAlign="center">
              Click "Add Images" to get started
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ p: 0 }}>
            {images.map((image) => (
              <ListItem
                key={image.id}
                disablePadding
                sx={{
                  mb: 1,
                  border: selectedImage?.id === image.id ? 2 : 1,
                  borderColor: selectedImage?.id === image.id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: selectedImage?.id === image.id ? 'action.selected' : 'transparent'
                }}
              >
                <ListItemButton
                  onClick={() => onImageSelect(image)}
                  sx={{ px: 1, py: 0.5 }}
                >
                  {/* Thumbnail */}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      mr: 1,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.100'
                    }}
                  >
                    <img
                      src={image.processedDataUrl || image.originalUrl}
                      alt={image.fileName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>

                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap>
                        {image.fileName}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {image.processing ? 'Processing...' : 
                         image.processedDataUrl ? 'Processed' : 'Ready'}
                      </Typography>
                    }
                    sx={{ mr: 1 }}
                  />
                </ListItemButton>

                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={0.5}>
                    {/* Selection Checkbox */}
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onImageToggleSelect(image.id)}
                    >
                      {selectedImages.includes(image.id) ? (
                        <CheckCircle color="primary" fontSize="small" />
                      ) : (
                        <RadioButtonUnchecked fontSize="small" />
                      )}
                    </IconButton>

                    {/* Delete Button */}
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onImageDelete(image.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Remove All Button - Only show when images exist */}
      {images.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={onRemoveAllImages}
            startIcon={<Delete />}
          >
            Remove All ({images.length})
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default LeftSidebarGallery;
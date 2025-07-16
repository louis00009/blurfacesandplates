import React, { useState, useEffect, useCallback } from 'react';
import { Container, Box, Grid, Alert, Typography } from '@mui/material';
import * as faceapi from 'face-api.js';

// Import our new components and types
import { ProcessedImage, ProcessingSettings, Annotation, AppState } from './types';
import ImagePreview from './components/ui/ImagePreview';
import ImageGallery from './components/ui/ImageGallery';
import SettingsPanel from './components/ui/SettingsPanel';
import { useImageProcessor } from './components/detection/ImageProcessor';

declare var cv: any;

const App: React.FC = () => {
  // Main app state
  const [state, setState] = useState<AppState>({
    images: [],
    modelsLoaded: false,
    error: null,
    selectedImage: null,
    selectedImages: [],
    showOriginal: false,
    settingsOpen: false,
    annotations: []
  });

  // Processing settings
  const [settings, setSettings] = useState<ProcessingSettings>({
    enableFaceDetection: true,
    enablePlateDetection: true,
    blur: true,
    mosaic: false,
    blurAmount: 50,
    mosaicAmount: 12,
    highlightMode: false,
    highlightColor: '#FF0000',
    plateOpacity: 0.8,
    detectionMethod: 'robust',
    plateRecognizerApiKey: '',
    debugMode: false
  });

  // Initialize face detection models
  useEffect(() => {
    const initializeModels = async () => {
      try {
        console.log('Loading face detection models...');
        
        // Test if models are accessible first
        console.log('Testing model accessibility...');
        const testResponse = await fetch('/models/ssd_mobilenetv1_model-weights_manifest.json');
        if (!testResponse.ok) {
          throw new Error(`Models not accessible: ${testResponse.status}`);
        }
        console.log('Models are accessible, proceeding with face-api.js loading...');
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
        console.log('All face-api.js models loaded successfully');
        
        // Check if OpenCV is loaded
        let attempts = 0;
        const checkOpenCV = () => {
          if (typeof cv !== 'undefined' && cv.Mat) {
            console.log('OpenCV is ready');
            setState(prev => ({ ...prev, modelsLoaded: true }));
          } else if (attempts < 50) {
            attempts++;
            setTimeout(checkOpenCV, 100);
          } else {
            console.warn('OpenCV failed to load after 5 seconds, continuing without OpenCV');
            setState(prev => ({ ...prev, modelsLoaded: true })); // Continue without OpenCV
          }
        };
        checkOpenCV();
        
      } catch (error) {
        console.error('Failed to load models:', error);
        console.error('Error details:', error);
        let errorMessage = 'An unknown error occurred while loading AI models.';
        if (error instanceof Error) {
          errorMessage = `Failed to load AI models: ${error.message}`;
        }
        setState(prev => ({ ...prev, error: errorMessage }));
      }
    };

    initializeModels();
  }, []);

  // Image processor hook
  const { processImage } = useImageProcessor({
    modelsLoaded: state.modelsLoaded,
    settings,
    annotations: state.annotations,
    onImageUpdate: useCallback((imageId: string, updates: Partial<ProcessedImage>) => {
      setState(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img.id === imageId ? { ...img, ...updates } : img
        )
      }));
      
      // Auto-switch to show processed result when processing completes
      if (updates.processing === false && state.selectedImage?.id === imageId) {
        setState(prev => ({ ...prev, showOriginal: false }));
      }
    }, [state.selectedImage?.id]),
    onError: useCallback((error: string) => {
      setState(prev => ({ ...prev, error }));
    }, [])
  });

  // File upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files);
      const newImages: ProcessedImage[] = fileList.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        originalUrl: URL.createObjectURL(file),
        processedDataUrl: null,
        fileName: file.name,
        processing: false,
        detectionInfo: '',
        faceCount: 0,
        plateCount: 0,
        detectedRegions: []
      }));

      setState(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
        error: null
      }));
      
      // Auto-select first image if none selected
      if (!state.selectedImage && newImages.length > 0) {
        setState(prev => ({ ...prev, selectedImage: newImages[0] }));
      }
    }
    
    // Reset input
    event.target.value = '';
  };

  // Image selection handlers
  const handleImageSelect = (img: ProcessedImage) => {
    setState(prev => ({ ...prev, selectedImage: img }));
    // If the selected image has been processed, show processed version by default
    if (img.processedDataUrl) {
      setState(prev => ({ ...prev, showOriginal: false }));
    }
  };

  const toggleImageSelection = (imgId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setState(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.includes(imgId)
        ? prev.selectedImages.filter(id => id !== imgId)
        : [...prev.selectedImages, imgId]
    }));
  };

  // Batch processing
  const processSelectedImages = async () => {
    if (state.selectedImages.length === 0) {
      setState(prev => ({ ...prev, error: 'Please select at least one image to process.' }));
      return;
    }

    console.log(`Starting batch processing of ${state.selectedImages.length} images:`, state.selectedImages);
    
    const imagesToProcess = [...state.selectedImages];
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgId = imagesToProcess[i];
      const image = state.images.find(img => img.id === imgId);
      
      if (image) {
        console.log(`Processing image ${i + 1}/${imagesToProcess.length}: ${imgId}`);
        
        try {
          await processImage(imgId, image);
          console.log(`Completed processing image ${i + 1}/${imagesToProcess.length}: ${imgId}`);
          
          if (i < imagesToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Failed to process image ${imgId}:`, error);
        }
      }
    }

    console.log('Batch processing completed');
    
    // After processing, update the preview to show the first processed image
    setState(prev => {
      const firstProcessedImage = prev.images.find(img => img.id === imagesToProcess[0]);
      if (firstProcessedImage && firstProcessedImage.processedDataUrl) {
        return {
          ...prev,
          selectedImage: firstProcessedImage,
          showOriginal: false
        };
      }
      return prev;
    });
  };

  // Utility functions
  const selectAllImages = () => {
    setState(prev => ({
      ...prev,
      selectedImages: prev.images.map(img => img.id)
    }));
  };

  const clearSelection = () => {
    setState(prev => ({ ...prev, selectedImages: [] }));
  };

  const handleDelete = (imgId: string) => {
    setState(prev => {
      const imageToDelete = prev.images.find(img => img.id === imgId);
      if (imageToDelete) {
        URL.revokeObjectURL(imageToDelete.originalUrl);
        if (imageToDelete.processedDataUrl) {
          URL.revokeObjectURL(imageToDelete.processedDataUrl);
        }
      }
      
      return {
        ...prev,
        images: prev.images.filter(img => img.id !== imgId),
        selectedImages: prev.selectedImages.filter(id => id !== imgId),
        selectedImage: prev.selectedImage?.id === imgId ? null : prev.selectedImage
      };
    });
  };

  const handleSingleImageProcess = async (imgId: string) => {
    const image = state.images.find(img => img.id === imgId);
    if (image) {
      await processImage(imgId, image);
    }
  };

  const updateSettings = (newSettings: Partial<ProcessingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <Container maxWidth="lg" style={{ padding: '20px' }}>
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI-Powered Image Anonymizer
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Blur or mosaic faces and license plates in your images with advanced detection.
        </Typography>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {!state.modelsLoaded && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Loading AI models... Please wait.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
          <SettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            selectedImagesCount={state.selectedImages.length}
            onProcessSelectedImages={processSelectedImages}
            onSelectAllImages={selectAllImages}
            onClearSelection={clearSelection}
            onFileUpload={handleImageUpload}
            isProcessing={state.images.some(img => state.selectedImages.includes(img.id) && img.processing)}
            imagesCount={state.images.length}
          />
        </Grid>

        {/* Image Preview */}
        <Grid item xs={12} md={8}>
          <ImagePreview
            selectedImage={state.selectedImage}
            showOriginal={state.showOriginal}
            onToggleOriginal={() => setState(prev => ({ ...prev, showOriginal: !prev.showOriginal }))}
          />
        </Grid>
      </Grid>

      {/* Image Gallery */}
      <ImageGallery
        images={state.images}
        selectedImage={state.selectedImage}
        selectedImages={state.selectedImages}
        onImageSelect={handleImageSelect}
        onImageToggleSelect={toggleImageSelection}
        onImageProcess={handleSingleImageProcess}
        onImageDelete={handleDelete}
      />
    </Container>
  );
};

export default App;

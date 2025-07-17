import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, Stack } from '@mui/material';
import * as faceapi from 'face-api.js';

// Import our new components and types
import { ProcessedImage, ProcessingSettings, Annotation, AppState } from './types';
import NavigationBar from './components/ui/NavigationBar';
import LeftSidebarGallery from './components/ui/LeftSidebarGallery';
import CentralPreview from './components/ui/CentralPreview';
import RightControlPanel from './components/ui/RightControlPanel';
import APIManagerPage from './components/admin/APIManagerPage';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ProfilePage from './components/auth/ProfilePage';
import SubscriptionManager from './components/subscription/SubscriptionManager';
import { AuthProvider } from './contexts/AuthContext';
import { useImageProcessor } from './components/detection/ImageProcessor';
import { initializeOCR } from './utils';

declare var cv: any;

const AppContent: React.FC = () => {
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
    detectionMethod: 'smartAPI', // Default to smart API management
    plateRecognizerApiKey: '',
    openalprApiKey: '',
    googleVisionApiKey: '',
    debugMode: false,
    useApiManager: true
  });

  // API Manager page state
  const [showAPIManager, setShowAPIManager] = useState(false);

  // Admin page state
  const [showAdmin, setShowAdmin] = useState(false);

  // Auth modal states
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // Listen for API Manager open event
  useEffect(() => {
    const handleOpenAPIManager = () => {
      setShowAPIManager(true);
    };

    window.addEventListener('openAPIManager', handleOpenAPIManager);
    return () => {
      window.removeEventListener('openAPIManager', handleOpenAPIManager);
    };
  }, []);

  // Check URL for admin access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = window.location.pathname === '/admin' || urlParams.get('admin') === 'true';
    if (adminParam) {
      setShowAdmin(true);
    }
  }, []);

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
        const checkOpenCV = async () => {
          if (typeof cv !== 'undefined' && cv.Mat) {
            console.log('OpenCV is ready');
            
            // Initialize OCR after OpenCV is ready
            console.log('Initializing OCR...');
            try {
              await initializeOCR();
              console.log('OCR initialized successfully');
            } catch (error) {
              console.warn('OCR initialization failed, continuing without OCR:', error);
            }
            
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
      handleFiles(event.target.files);
    }
    
    // Reset input
    event.target.value = '';
  };

  // File drop handler
  const handleFileDrop = (files: FileList) => {
    handleFiles(files);
  };

  // Common file handling logic
  const handleFiles = (files: FileList) => {
    const fileList = Array.from(files).filter(file => file.type.startsWith('image/'));
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
  };

  // Image selection handlers
  const handleImageSelect = (img: ProcessedImage) => {
    setState(prev => ({ ...prev, selectedImage: img }));
    // If the selected image has been processed, show processed version by default
    if (img.processedDataUrl) {
      setState(prev => ({ ...prev, showOriginal: false }));
    }
  };

  const toggleImageSelection = (imgId: string) => {
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

  const handleRemoveAllImages = () => {
    setState(prev => {
      // Clean up all object URLs
      prev.images.forEach(img => {
        URL.revokeObjectURL(img.originalUrl);
        if (img.processedDataUrl) {
          URL.revokeObjectURL(img.processedDataUrl);
        }
      });
      
      return {
        ...prev,
        images: [],
        selectedImages: [],
        selectedImage: null
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

  // Navigation handlers
  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleUpgradeClick = () => {
    setShowSubscription(true);
  };

  const handleMenuItemClick = (item: string) => {
    console.log('Menu item clicked:', item);
    // Handle different menu items as needed
    if (item === 'upgrade') {
      setShowSubscription(true);
    }
  };

  // Show API Manager page if requested
  if (showAPIManager) {
    return <APIManagerPage onClose={() => setShowAPIManager(false)} />;
  }

  // Show Admin Dashboard if requested
  if (showAdmin) {
    return <AdminDashboard onClose={() => {
      setShowAdmin(false);
      // Clear admin from URL
      window.history.pushState({}, '', window.location.pathname);
    }} />;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      <NavigationBar
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
        onProfileClick={handleProfileClick}
        onUpgradeClick={handleUpgradeClick}
        onMenuItemClick={handleMenuItemClick}
        onAdminClick={() => setShowAdmin(true)}
      />

      {/* Error and Loading States */}
      {state.error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {state.error}
        </Alert>
      )}

      {!state.modelsLoaded && (
        <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
          Loading AI models... Please wait.
        </Alert>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', p: 2, gap: 2, overflow: 'hidden' }}>
        {/* Left Sidebar - Image Gallery */}
        <LeftSidebarGallery
          images={state.images}
          selectedImage={state.selectedImage}
          selectedImages={state.selectedImages}
          onImageSelect={handleImageSelect}
          onImageToggleSelect={toggleImageSelection}
          onImageDelete={handleDelete}
          onFileUpload={handleImageUpload}
          onClearSelection={clearSelection}
          onRemoveAllImages={handleRemoveAllImages}
        />

        {/* Center - Preview Area */}
        <CentralPreview
          selectedImage={state.selectedImage}
          showOriginal={state.showOriginal}
          onToggleOriginal={() => setState(prev => ({ ...prev, showOriginal: !prev.showOriginal }))}
          onFileUpload={handleImageUpload}
          onFileDrop={handleFileDrop}
          images={state.images}
        />

        {/* Right Sidebar - Control Panel */}
        <RightControlPanel
          settings={settings}
          onSettingsChange={updateSettings}
          selectedImagesCount={state.selectedImages.length}
          onProcessSelectedImages={processSelectedImages}
          onSelectAllImages={selectAllImages}
          onClearSelection={clearSelection}
          isProcessing={state.images.some(img => state.selectedImages.includes(img.id) && img.processing)}
          imagesCount={state.images.length}
        />
      </Box>

      {/* Authentication Modals */}
      {showLogin && (
        <LoginPage
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <RegisterPage
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}

      {showProfile && (
        <ProfilePage
          onClose={() => setShowProfile(false)}
        />
      )}

      {showSubscription && (
        <SubscriptionManager
          onClose={() => setShowSubscription(false)}
        />
      )}
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

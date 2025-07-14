import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Container, Button, Box, CircularProgress, Slider, Typography, Switch, 
  FormControlLabel, Alert, Grid, Paper, Card, CardContent, CardMedia,
  Fab, LinearProgress, Chip, IconButton, Dialog, DialogContent, DialogTitle,
  Tabs, Tab, Divider, Stack
} from '@mui/material';
import { 
  CloudUpload, Delete, Download, Visibility, Settings, 
  PhotoLibrary, Face, DirectionsCar, Close
} from '@mui/icons-material';
import * as faceapi from 'face-api.js';

declare var cv: any;

interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedDataUrl: string | null;
  fileName: string;
  processing: boolean;
  detectionInfo: string;
  faceCount: number;
  plateCount: number;
}

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blur, setBlur] = useState(true);
  const [mosaic, setMosaic] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20);
  const [mosaicAmount, setMosaicAmount] = useState(12);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [detectionInfo, setDetectionInfo] = useState<string>('');

  const plateCascadeRef = useRef<any>(null);

  useEffect(() => {
    const loadResources = async () => {
      try {
        setError(null);

        // Wait for OpenCV to be ready
        const checkOpenCV = (resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
          const maxAttempts = 50; // 5 seconds timeout
          let attempts = 0;
          const interval = setInterval(() => {
            // Case 1: OpenCV is already initialized and ready
            if (typeof cv !== 'undefined' && typeof cv.CascadeClassifier === 'function') {
              console.log('OpenCV already initialized.');
              clearInterval(interval);
              resolve(true);
              return;
            }
            // Case 2: OpenCV object exists, but not yet initialized. Set the callback.
            if (typeof cv !== 'undefined' && typeof cv.onRuntimeInitialized === 'function') {
              cv.onRuntimeInitialized = () => {
                console.log('OpenCV initialized.');
                clearInterval(interval);
                resolve(true);
              };
              return;
            }

            attempts++;
            if (attempts > maxAttempts) {
              clearInterval(interval);
              reject('OpenCV failed to load in time.');
            }
          }, 100);
        };
        await new Promise(checkOpenCV);

        const MODEL_URL = '/models';
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

        // Try to load the plate cascade, but don't fail if it is invalid
        try {
          const plateCascadeFile = 'haarcascade_russian_plate_number.xml';
          const plateCascadeUrl = `${MODEL_URL}/${plateCascadeFile}`;
          const response = await fetch(plateCascadeUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${plateCascadeFile}: ${response.statusText}`);
          }
          const buffer = await response.arrayBuffer();
          const data = new Uint8Array(buffer);
          // Use a unique filename to avoid conflicts
          const uniquePlateCascadeFile = `/${Date.now()}_${plateCascadeFile}`;
          cv.FS_createDataFile('/', uniquePlateCascadeFile, data, true, false, false);
          const classifier = new cv.CascadeClassifier();
          if (!classifier.load(uniquePlateCascadeFile)) {
            console.warn(`Failed to load cascade file: ${uniquePlateCascadeFile}`);
            try {
              classifier.delete();
            } catch (e) {
              console.warn('Error deleting classifier:', e);
            }
          } else {
            plateCascadeRef.current = classifier;
            console.log('Plate cascade loaded successfully.');
          }
          
        } catch (e) {
          console.warn('Error loading plate cascade:', e);
        }
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading models:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during model loading.');
      }
    };

    loadResources();

    // return () => {
    //     plateCascadeRef.current?.delete();
    // }
  }, []);

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
        plateCount: 0
      }));
      
      setImages(prev => [...prev, ...newImages]);
      setError(null);
      
      // Auto-process new images
      newImages.forEach(img => processImage(img.id));
    }
    
    // Reset input
    event.target.value = '';
  };

  const processImage = useCallback(async (imageId: string) => {
    if (!modelsLoaded) return;

    // Find the image to process
    const imageToProcess = images.find(img => img.id === imageId);
    if (!imageToProcess) return;

    // Mark as processing
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, processing: true } : img
    ));

    try {
      // Create temporary image and canvas for processing
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageToProcess.originalUrl;
      });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Set up canvas
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
      context.filter = 'none';
      context.globalCompositeOperation = 'source-over';
      context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    // 人脸检测
    let faceBoxes: { x: number; y: number; width: number; height: number; }[] = [];
    try {
      const faceDetections = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options());
      faceBoxes = Array.isArray(faceDetections) ? faceDetections.map(d => d.box) : [];
      console.log(`Face detection result: ${faceBoxes.length} faces detected`);
    } catch (e) {
      console.warn('Face detection failed:', e);
    }

    // 车牌检测 - Improved but conservative license plate detection
    let plateRects: { x: number; y: number; width: number; height: number; }[] = [];
    if (plateCascadeRef.current) {
      let src, gray, plates, processedGray, blurred;
      try {
        src = cv.imread(img);
        gray = new cv.Mat();
        processedGray = new cv.Mat();
        blurred = new cv.Mat();
        plates = new cv.RectVector();

        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        
        // Simple histogram equalization for better contrast
        cv.equalizeHist(gray, processedGray);

        const classifier = plateCascadeRef.current;
        
        // Conservative detection with proven parameters, gradually increasing sensitivity
        const detectionParams = [
          // Start with most reliable parameters
          { scaleFactor: 1.1, minNeighbors: 5, minSize: new cv.Size(60, 15) },
          { scaleFactor: 1.05, minNeighbors: 4, minSize: new cv.Size(50, 12) },
          // Slightly more sensitive
          { scaleFactor: 1.08, minNeighbors: 3, minSize: new cv.Size(40, 10) },
          // Most sensitive for difficult cases
          { scaleFactor: 1.03, minNeighbors: 2, minSize: new cv.Size(35, 9) }
        ];

        let detectedCount = 0;
        for (const params of detectionParams) {
          if (detectedCount > 0) break; // Stop after first successful detection to avoid duplicates
          
          const tempPlates = new cv.RectVector();
          try {
            // Primary detection on processed image
            classifier.detectMultiScale(
              processedGray, 
              tempPlates, 
              params.scaleFactor, 
              params.minNeighbors, 
              0, 
              params.minSize
            );
            
            // If no results, try with slight blur to reduce noise
            if (tempPlates.size() === 0) {
              cv.GaussianBlur(processedGray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
              classifier.detectMultiScale(
                blurred, 
                tempPlates, 
                params.scaleFactor, 
                params.minNeighbors, 
                0, 
                params.minSize
              );
            }
            
            // Last resort: try on original grayscale
            if (tempPlates.size() === 0) {
              classifier.detectMultiScale(
                gray, 
                tempPlates, 
                params.scaleFactor, 
                params.minNeighbors, 
                0, 
                params.minSize
              );
            }
            
            // Add detected plates, avoiding duplicates
            for (let i = 0; i < tempPlates.size(); i++) {
              const p = tempPlates.get(i);
              const newRect = { x: p.x, y: p.y, width: p.width, height: p.height };
              
              // Check for overlapping detections (simple overlap check)
              const isOverlapping = plateRects.some(existing => {
                const overlapX = Math.max(0, Math.min(existing.x + existing.width, newRect.x + newRect.width) - Math.max(existing.x, newRect.x));
                const overlapY = Math.max(0, Math.min(existing.y + existing.height, newRect.y + newRect.height) - Math.max(existing.y, newRect.y));
                const overlapArea = overlapX * overlapY;
                const existingArea = existing.width * existing.height;
                const newArea = newRect.width * newRect.height;
                return overlapArea > 0.3 * Math.min(existingArea, newArea);
              });
              
              if (!isOverlapping) {
                plateRects.push(newRect);
                detectedCount++;
              }
            }
          } catch (paramErr) {
            console.warn(`Detection failed with params ${JSON.stringify(params)}:`, paramErr);
          } finally {
            tempPlates.delete();
          }
        }

        console.log(`Plate detection result: ${detectedCount} plates detected with improved algorithm`);
        
        if (detectedCount === 0) {
          console.warn('No license plates detected. Try adjusting the image or ensuring plates are clearly visible.');
          setDetectionInfo('No license plates detected. The current cascade is optimized for Russian plates. Try images with clear, well-lit license plates.');
        } else {
          setDetectionInfo(`Successfully detected ${detectedCount} license plate(s) for blurring/mosaic.`);
        }
      } catch (err) {
        console.warn("Error during plate detection:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during plate detection.';
        setError(`Plate detection failed: ${errorMessage}`);
      } finally {
        src?.delete && src.delete();
        gray?.delete && gray.delete();
        processedGray?.delete && processedGray.delete();
        blurred?.delete && blurred.delete();
        plates?.delete && plates.delete();
      }
    }

    const detections = [...faceBoxes, ...plateRects];
    
    // Update detection info with combined results
    const totalDetections = faceBoxes.length + plateRects.length;
    let infoMessage = `Detected ${faceBoxes.length} face(s)`;
    if (plateRects.length > 0) {
      infoMessage += ` and ${plateRects.length} license plate(s)`;
    } else if (faceBoxes.length === 0) {
      infoMessage = detectionInfo || 'No faces or license plates detected in this image.';
    }
    setDetectionInfo(infoMessage);

    detections.forEach(detection => {
      const { x, y, width, height } = detection;
      
      // Expand detection area by 15% in all directions for better coverage
      const expansion = 0.15;
      const expandedX = Math.max(0, x - width * expansion);
      const expandedY = Math.max(0, y - height * expansion);
      const expandedWidth = Math.min(canvas.width - expandedX, width * (1 + 2 * expansion));
      const expandedHeight = Math.min(canvas.height - expandedY, height * (1 + 2 * expansion));
      
      if (blur) {
        if (expandedWidth > 0 && expandedHeight > 0) {
          context.save();
          // Apply multiple layers of blur for stronger privacy protection
          context.filter = `blur(${blurAmount}px)`;
          context.drawImage(canvas, expandedX, expandedY, expandedWidth, expandedHeight, expandedX, expandedY, expandedWidth, expandedHeight);
          
          // Apply additional blur pass for license plates
          if (detection.width / detection.height > 2.5) { // Likely a license plate (wider than tall)
            context.filter = `blur(${blurAmount * 1.2}px)`;
            context.drawImage(canvas, expandedX, expandedY, expandedWidth, expandedHeight, expandedX, expandedY, expandedWidth, expandedHeight);
          }
          context.restore();
        }
      }
      if (mosaic) {
        const mosaicSize = Math.max(mosaicAmount, 8); // Minimum mosaic size for privacy
        for (let i = 0; i < expandedWidth; i += mosaicSize) {
          for (let j = 0; j < expandedHeight; j += mosaicSize) {
            const pixelX = expandedX + i + Math.floor(mosaicSize / 2);
            const pixelY = expandedY + j + Math.floor(mosaicSize / 2);
            if (pixelX < canvas.width && pixelY < canvas.height && pixelX >= 0 && pixelY >= 0) {
                const pixel = context.getImageData(pixelX, pixelY, 1, 1).data;
                context.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                context.fillRect(
                  expandedX + i, 
                  expandedY + j, 
                  Math.min(mosaicSize, expandedWidth - i), 
                  Math.min(mosaicSize, expandedHeight - j)
                );
            }
          }
        }
      }
    });

      // Update the processed image
      const processedDataUrl = canvas.toDataURL('image/png');
      
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              processing: false, 
              processedDataUrl,
              faceCount: faceBoxes.length,
              plateCount: plateRects.length,
              detectionInfo: `${faceBoxes.length} face(s), ${plateRects.length} plate(s)`
            } 
          : img
      ));
      
    } catch (err) {
      console.error('Processing failed:', err);
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              processing: false, 
              detectionInfo: 'Processing failed'
            } 
          : img
      ));
      setError(err instanceof Error ? err.message : 'Processing failed');
    }
  }, [modelsLoaded, blur, mosaic, blurAmount, mosaicAmount, images]);

  const handleDownload = (image: ProcessedImage) => {
    if (image.processedDataUrl) {
      const link = document.createElement('a');
      link.download = `processed-${image.fileName}`;
      link.href = image.processedDataUrl;
      link.click();
    }
  };

  const handleDelete = (imageId: string) => {
    setImages(prev => {
      const imageToDelete = prev.find(img => img.id === imageId);
      if (imageToDelete) {
        URL.revokeObjectURL(imageToDelete.originalUrl);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleReprocess = (imageId: string) => {
    processImage(imageId);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PhotoLibrary sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" component="h1" fontWeight="bold">
              Privacy Protector
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={<Face />} 
              label="Face Detection" 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              icon={<DirectionsCar />} 
              label="License Plate Detection" 
              color="secondary" 
              variant="outlined" 
            />
            <IconButton onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </Box>
        </Box>

        {/* Loading State */}
        {!modelsLoaded && !error && (
          <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>Loading AI Models</Typography>
            <Typography color="text.secondary">
              Initializing face detection and license plate recognition...
            </Typography>
            <LinearProgress sx={{ mt: 2, width: '100%' }} />
          </Paper>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Upload Area */}
        {modelsLoaded && (
          <Paper sx={{ p: 4, mb: 4, textAlign: 'center', border: '2px dashed', borderColor: 'primary.main' }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              multiple
              onChange={handleImageUpload}
            />
            <label htmlFor="image-upload">
              <Fab 
                component="span" 
                size="large" 
                color="primary" 
                sx={{ mb: 2 }}
              >
                <CloudUpload />
              </Fab>
            </label>
            <Typography variant="h5" gutterBottom>
              Drop images here or click to upload
            </Typography>
            <Typography color="text.secondary">
              Select multiple images to process them all at once
            </Typography>
          </Paper>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                Your Images ({images.length})
              </Typography>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Grid View" />
                <Tab label="List View" />
              </Tabs>
            </Box>

            {activeTab === 0 ? (
              // Grid View
              <Grid container spacing={3}>
                {images.map((image) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={image.processedDataUrl || image.originalUrl}
                          alt={image.fileName}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setPreviewImage(image)}
                        />
                        {image.processing && (
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(0,0,0,0.7)'
                          }}>
                            <CircularProgress />
                          </Box>
                        )}
                        <IconButton
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() => handleDelete(image.id)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" noWrap title={image.fileName}>
                          {image.fileName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {image.detectionInfo || 'Processing...'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          {image.faceCount > 0 && (
                            <Chip size="small" icon={<Face />} label={image.faceCount} />
                          )}
                          {image.plateCount > 0 && (
                            <Chip size="small" icon={<DirectionsCar />} label={image.plateCount} />
                          )}
                        </Stack>
                      </CardContent>
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => setPreviewImage(image)}
                            fullWidth
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Download />}
                            onClick={() => handleDownload(image)}
                            disabled={!image.processedDataUrl}
                            fullWidth
                          >
                            Download
                          </Button>
                        </Stack>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              // List View
              <Box>
                {images.map((image) => (
                  <Paper key={image.id} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Box
                      component="img"
                      src={image.processedDataUrl || image.originalUrl}
                      alt={image.fileName}
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, mr: 2 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{image.fileName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {image.detectionInfo || 'Processing...'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {image.faceCount > 0 && (
                          <Chip size="small" icon={<Face />} label={`${image.faceCount} faces`} />
                        )}
                        {image.plateCount > 0 && (
                          <Chip size="small" icon={<DirectionsCar />} label={`${image.plateCount} plates`} />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setPreviewImage(image)}
                      >
                        View
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => handleDownload(image)}
                        disabled={!image.processedDataUrl}
                      >
                        Download
                      </Button>
                      <IconButton onClick={() => handleDelete(image.id)}>
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Privacy Protection Settings
            <IconButton
              sx={{ position: 'absolute', right: 8, top: 8 }}
              onClick={() => setSettingsOpen(false)}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 2 }}>
              <FormControlLabel
                control={<Switch checked={blur} onChange={(e) => setBlur(e.target.checked)} />}
                label="Enable Blur Effect"
              />
              {blur && (
                <Box>
                  <Typography gutterBottom>Blur Intensity: {blurAmount}px</Typography>
                  <Slider
                    value={blurAmount}
                    onChange={(_, newValue) => {
                      if (typeof newValue === 'number') {
                        setBlurAmount(newValue);
                      }
                    }}
                    min={5}
                    max={100}
                    marks={[
                      { value: 5, label: 'Light' },
                      { value: 50, label: 'Medium' },
                      { value: 100, label: 'Heavy' }
                    ]}
                  />
                </Box>
              )}
              
              <Divider />
              
              <FormControlLabel
                control={<Switch checked={mosaic} onChange={(e) => setMosaic(e.target.checked)} />}
                label="Enable Mosaic Effect"
              />
              {mosaic && (
                <Box>
                  <Typography gutterBottom>Mosaic Block Size: {mosaicAmount}px</Typography>
                  <Slider
                    value={mosaicAmount}
                    onChange={(_, newValue) => {
                      if (typeof newValue === 'number') {
                        setMosaicAmount(newValue);
                      }
                    }}
                    min={5}
                    max={50}
                    marks={[
                      { value: 5, label: 'Fine' },
                      { value: 25, label: 'Medium' },
                      { value: 50, label: 'Large' }
                    ]}
                  />
                </Box>
              )}
              
              <Alert severity="info">
                Changes will apply to newly processed images. Use "Reprocess" to apply settings to existing images.
              </Alert>
            </Stack>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog 
          open={!!previewImage} 
          onClose={() => setPreviewImage(null)} 
          maxWidth="lg" 
          fullWidth
        >
          {previewImage && (
            <>
              <DialogTitle>
                {previewImage.fileName}
                <IconButton
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                  onClick={() => setPreviewImage(null)}
                >
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Original</Typography>
                    <Box
                      component="img"
                      src={previewImage.originalUrl}
                      alt="Original"
                      sx={{ width: '100%', height: 'auto', borderRadius: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Privacy Protected</Typography>
                    <Box
                      component="img"
                      src={previewImage.processedDataUrl || previewImage.originalUrl}
                      alt="Processed"
                      sx={{ width: '100%', height: 'auto', borderRadius: 1 }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {previewImage.detectionInfo}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => handleReprocess(previewImage.id)}
                      disabled={previewImage.processing}
                    >
                      Reprocess
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() => handleDownload(previewImage)}
                      disabled={!previewImage.processedDataUrl}
                    >
                      Download
                    </Button>
                  </Stack>
                </Box>
              </DialogContent>
            </>
          )}
        </Dialog>
      </Box>
    </Container>
  );
};

export default App;

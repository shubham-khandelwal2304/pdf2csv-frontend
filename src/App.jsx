import React, { useState, useCallback } from 'react'
import { Box, Container, Typography, Button, Alert, CircularProgress } from '@mui/material'
import { CloudUpload, FileText, Download, RotateCcw } from 'lucide-react'
import { styled } from '@mui/material/styles'
import Sidebar from './components/Sidebar'

// Custom styled button with gradient
const GradientButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(180deg, #2579E3 0%, #8E54F7 100%) !important',
  backgroundColor: 'transparent !important',
  color: 'white !important',
  border: 'none !important',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(1.5, 4),
  fontWeight: 600,
  fontSize: 16,
  textTransform: 'none',
  boxShadow: 'none !important',
  '&:hover': {
    background: 'linear-gradient(180deg, #1e6bb8 0%, #7c3aed 100%) !important',
    backgroundColor: 'transparent !important',
    boxShadow: 'none !important',
  },
  '&:disabled': {
    background: '#9CA3AF !important',
    backgroundColor: '#9CA3AF !important',
    color: '#fff !important'
  },
  '&.MuiButton-root': {
    background: 'linear-gradient(180deg, #2579E3 0%, #8E54F7 100%) !important',
    backgroundColor: 'transparent !important',
  }
}))

const PDFtoCSV = () => {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [currentJobId, setCurrentJobId] = useState(null)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const BACKEND_URL = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com'

  const isValidInvoiceFile = useCallback((file) => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp'
    ];
    return file && validTypes.includes(file.type);
  }, []);

  const handleFileSelectFromInput = useCallback((selectedFile) => {
    if (isValidInvoiceFile(selectedFile)) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a valid PDF or image invoice file')
    }
  }, [isValidInvoiceFile])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelectFromInput(e.dataTransfer.files[0])
    }
  }, [handleFileSelectFromInput])

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelectFromInput(e.target.files[0])
    }
  }, [handleFileSelectFromInput])

  const handleUpload = useCallback(async () => {
    if (!file) {
      // If no file is selected, trigger file input
      document.getElementById('file-input').click()
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file to backend:', BACKEND_URL)
      
      const response = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload response:', result)
      
      setIsUploading(false)
      setIsProcessing(true)
      
      // Check if conversion is complete or needs polling
      if (result.downloadUrl) {
        setIsProcessing(false)
        setDownloadUrl(result.downloadUrl)
      } else if (result.jobId) {
        // Store job ID for download
        setCurrentJobId(result.jobId)
        // Poll for completion
        await pollForCompletion(result.jobId)
      } else {
        throw new Error('Invalid response from server')
      }
      
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
      setIsUploading(false)
      setIsProcessing(false)
    }
  }, [file])

  const pollForCompletion = useCallback(async (jobId) => {
    const maxAttempts = 30 // 5 minutes max
    let attempts = 0
    
    const poll = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/status`)
        const result = await response.json()
        
        if (result.ready) {
          // Job is ready, we can now download
          setIsProcessing(false)
          setDownloadUrl('ready') // Set a flag that download is ready
          return
        } else if (result.status === 'error') {
          throw new Error(result.error || 'Conversion failed')
        } else if (attempts >= maxAttempts) {
          throw new Error('Conversion timeout. Please try again.')
        } else {
          attempts++
          setTimeout(poll, 10000) // Poll every 10 seconds
        }
      } catch (err) {
        console.error('Polling error:', err)
        setIsProcessing(false)
        setError(err.message || 'Failed to check conversion status')
      }
    }
    
    poll()
  }, [])

  const handleDownload = useCallback(async () => {
    if (downloadUrl && currentJobId) {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com';
        
        // Get the file ID from the job by calling the download-url endpoint
        const response = await fetch(`${apiBase}/api/jobs/${currentJobId}/download-url`);
        if (!response.ok) {
          throw new Error('Failed to get download URL');
        }
        
        const data = await response.json();
        
        // Extract file ID from the download URL (same logic as sidebar)
        const fileIdMatch = data.url.match(/\/api\/files\/download\/(.+)$/);
        if (!fileIdMatch) {
          throw new Error('Invalid download URL format');
        }
        
        const fileId = fileIdMatch[1];
        
        // Use the EXACT same download logic as the sidebar
        const directDownloadUrl = `${apiBase}/api/files/download/${fileId}`;
        
        // Create a temporary link to trigger download (same as sidebar)
        const link = document.createElement('a');
        link.href = directDownloadUrl;
        // Replace file extension with .csv
        const fileName = file?.name || 'converted-file';
        const csvName = fileName.replace(/\.(pdf|jpg|jpeg|png|gif|webp|tiff|tif|bmp)$/i, '.csv');
        link.download = csvName;
        link.target = '_blank'; // Open in new tab as fallback
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Download failed:', err);
        setError('Download failed. Please try again.');
      }
    }
  }, [downloadUrl, currentJobId, file])

  const handleReset = useCallback(() => {
    setFile(null)
    setDownloadUrl(null)
    setCurrentJobId(null)
    setError(null)
    setIsUploading(false)
    setIsProcessing(false)
  }, [])

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const handleFileSelect = useCallback((selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setDownloadUrl(null)
    }
  }, [])

  return (
    <Box sx={{ minHeight: "100vh", background: "#000", color: "#fff", position: 'relative' }}>
      {/* Background Gradient */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "88%",
          height: { xs: "10%", md: "10%" },
          background: `radial-gradient(ellipse at top, rgba(154, 106, 255, 0.6) 0%, rgba(0, 0, 0, 0) 60%)`,
          zIndex: 1,
          opacity: 1,
        }}
      />

      <Container maxWidth="md" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 4, md: 8 }, position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            sx={{ 
              fontWeight: 800, 
              fontSize: { xs: 32, sm: 40, md: 48 },
              fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
              mb: 2,
              color: '#fff'
            }}
          >
            Invoice to CSV{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(180deg, #2579E3 0%, #8E54F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Converter
            </Box>
          </Typography>
          <Typography sx={{ 
            fontSize: { xs: 16, sm: 18 },
            color: 'rgba(255,255,255,0.9)',
            maxWidth: 600,
            mx: 'auto',
            lineHeight: 1.6
          }}>
            Convert your PDF and image invoices to CSV format quickly and easily
          </Typography>
        </Box>

        {/* Flatten Invoice Section */}
        <Box sx={{
          background: 'transparent',
          borderRadius: 4,
          p: { xs: 3, md: 4 },
          mb: 4,
          border: '1px solid #8E54F7',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600, 
              mb: 2, 
              color: '#fff',
              fontSize: { xs: 20, sm: 24 }
            }}
          >
            Flatten your PDF before processing to CSV
          </Typography>
          <Typography 
            sx={{ 
              mb: 3, 
              color: 'rgba(255,255,255,0.9)',
              fontSize: { xs: 14, sm: 16 },
              lineHeight: 1.6
            }}
          >
            If your PDF contains forms, layers, or annotations, flattening it can improve conversion accuracy.
          </Typography>
          <Button
            variant="contained"
            href="https://pdf-flattening-frontend.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              background: 'linear-gradient(180deg, #2579E3 0%, #8E54F7 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: { xs: 14, sm: 16 },
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                background: 'linear-gradient(180deg, #1e6bb8 0%, #7c3aed 100%)',
                boxShadow: 'none',
              },
            }}
          >
            Select Invoice File
          </Button>
        </Box>

        {/* Upload Card */}
        <Box sx={{
          background: '#000',
          borderRadius: 4,
          p: { xs: 3, md: 6 },
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #8E54F7'
        }}>
          {/* Upload Area */}
          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: dragActive ? '3px dashed #3B82F6' : '2px dashed #D1D5DB',
              borderRadius: 3,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
              '&:hover': {
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.02)'
              }
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif,.bmp"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            
            <Box sx={{ mb: 4 }}>
              <FileText size={64} color="#9CA3AF" />
            </Box>
            
            <Typography sx={{ 
              fontSize: 24, 
              fontWeight: 600, 
              color: '#fff',
              mb: 2
            }}>
              Upload Invoice
            </Typography>
            
            <Typography sx={{ 
              fontSize: 16, 
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              lineHeight: 1.6
            }}>
              Drag and drop a PDF or image invoice here, or{' '}
              <Box 
                component="span" 
                sx={{ 
                  color: '#3B82F6', 
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { color: '#2563EB' }
                }}
              >
                browse files
              </Box>
            </Typography>
            
            <Box sx={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              pt: 3,
              textAlign: 'center'
            }}>
              <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                • PDF, JPEG, PNG, GIF, WebP, TIFF, or BMP files
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                • Maximum size: 20MB
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                • One file at a time
              </Typography>
            </Box>
          </Box>

          {/* File Selected */}
          {file && (
            <Box sx={{ 
              mt: 4, 
              p: 3, 
              backgroundColor: '#000',
              borderRadius: 2,
              border: '1px solid #8E54F7'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FileText size={24} color="#fff" />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 500, color: '#fff' }}>
                    {file.name}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <Button
                  onClick={handleReset}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    minWidth: 'auto',
                    p: 1
                  }}
                >
                  <RotateCcw size={20} />
                </Button>
              </Box>
            </Box>
          )}

          {/* Error Message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mt: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {!downloadUrl && (
              <GradientButton
                size="large"
                onClick={handleUpload}
                disabled={isUploading || isProcessing}
                startIcon={
                  isUploading || isProcessing ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <CloudUpload size={20} />
                  )
                }
              >
                {isUploading ? 'Uploading...' : isProcessing ? 'Converting...' : file ? 'Convert to CSV' : 'Select Invoice File'}
              </GradientButton>
            )}

            {downloadUrl && (
              <Button
                variant="contained"
                size="large"
                onClick={handleDownload}
                startIcon={<Download size={20} />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #8E54F7 0%, #7C3AED 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  }
                }}
              >
                Download CSV
              </Button>
            )}

            {(file || downloadUrl) && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleReset}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 16,
                  borderColor: '#6B7280',
                  color: '#6B7280',
                  '&:hover': {
                    borderColor: '#374151',
                    color: '#374151',
                    backgroundColor: 'rgba(107, 114, 128, 0.04)'
                  }
                }}
              >
                Convert Another
              </Button>
            )}
          </Box>
        </Box>

       
      </Container>

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        onFileSelect={handleFileSelect}
      />
    </Box>
  )
}

export default PDFtoCSV
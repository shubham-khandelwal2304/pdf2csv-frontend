import React, { useState, useCallback } from 'react'
import { Box, Container, Typography, Button, Alert, CircularProgress } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { CloudUpload, FileText, Download, RotateCcw, Check, Edit2, Loader2 } from 'lucide-react'
import { styled } from '@mui/material/styles'
import Sidebar from './components/Sidebar'

// Framer Motion Variants
const dropZoneVariants = {
  initial: { scale: 1, borderColor: 'rgba(209, 213, 219, 1)', boxShadow: "0px 0px 0px rgba(0,0,0,0)" },
  hover: { scale: 1.02, borderColor: '#3B82F6', boxShadow: "0px 10px 20px rgba(59, 130, 246, 0.1)" },
  drag: {
    scale: 1.05,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    boxShadow: "0px 0px 30px rgba(59, 130, 246, 0.3)",
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
}

const successVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 15 } }
}

const steps = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Process' },
  { id: 3, label: 'Export' }
]

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
  // UX States
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [currentJobId, setCurrentJobId] = useState(null)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lastUploadedFileName, setLastUploadedFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [downloadName, setDownloadName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  // 0=Idle, 1=Uploading, 2=Processing, 3=Done
  const [processStep, setProcessStep] = useState(0)

  const BACKEND_URL = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com'

  const isValidInvoiceFile = useCallback((file) => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg'
    ];
    return file && validTypes.includes(file.type);
  }, []);

  const handleFileSelectFromInput = useCallback((selectedFile) => {
    if (isValidInvoiceFile(selectedFile)) {
      setFile(selectedFile)
      setError(null)
      setDownloadUrl(null)
      setCurrentJobId(null)
      setProcessStep(0)

      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
      toast.success("File selected ready to upload", {
        style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' },
        icon: <Check color="#8E54F7" />
      })
    } else {
      const msg = 'Please select a valid PDF or image invoice file'
      setError(msg)
      toast.error(msg)
    }
  }, [isValidInvoiceFile])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isUploading || isProcessing) return

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [isUploading, isProcessing])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (isUploading || isProcessing) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelectFromInput(e.dataTransfer.files[0])
    }
  }, [handleFileSelectFromInput, isUploading, isProcessing])

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
      setLastUploadedFileName(file.name)
      setFile(null)

      console.log('Uploading file to backend:', BACKEND_URL)

      setProcessStep(1)
      const toastId = toast.loading("Uploading file...", {
        style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' }
      })

      const response = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload response:', result)

      toast.dismiss(toastId)
      setIsUploading(false)
      setIsProcessing(true)
      setProcessStep(2)

      // Check if conversion is complete or needs polling
      if (result.downloadUrl) {
        setIsProcessing(false)
        setProcessStep(3)
        setDownloadUrl(result.downloadUrl)
        setDownloadName(file.name.replace(/\.(pdf|jpg|jpeg)$/i, ''))
        toast.success("Conversion complete!", {
          style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' },
          icon: <Check color="#8E54F7" />
        })
      } else if (result.jobId) {
        // Store job ID for download
        setCurrentJobId(result.jobId)
        // Set initial filename for valid future download reference
        setDownloadName(file.name.replace(/\.(pdf|jpg|jpeg)$/i, ''))

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
          setProcessStep(3)
          setDownloadUrl('ready') // Set a flag that download is ready
          toast.success("Conversion successful!", {
            style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' },
            icon: <Check color="#8E54F7" />
          })
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
        setProcessStep(0)
        setError(err.message || 'Failed to check conversion status')
        toast.error('Conversion failed')
      }
    }

    poll()
  }, [])

  const handleDownload = useCallback(async () => {
    if (downloadUrl && currentJobId) {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com';

        // 1. Get the Download URL info
        const response = await fetch(`${apiBase}/api/jobs/${currentJobId}/download-url`);
        if (!response.ok) throw new Error('Failed to get download URL');

        const data = await response.json();
        const fileIdMatch = data.url.match(/\/api\/files\/download\/(.+)$/);
        if (!fileIdMatch) throw new Error('Invalid download URL format');

        const fileId = fileIdMatch[1];
        const directDownloadUrl = `${apiBase}/api/files/download/${fileId}`;

        // 2. Fetch the actual file content as a Blob
        // This is necessary to enforce the custom filename on cross-origin requests
        const toastId = toast.loading("Preparing download...", {
          style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' }
        });
        const fileResponse = await fetch(directDownloadUrl);

        if (!fileResponse.ok) {
          toast.dismiss(toastId);
          throw new Error('Failed to download file content');
        }

        const blob = await fileResponse.blob();
        const blobUrl = URL.createObjectURL(blob);

        // 3. Create link with Blob URL
        const link = document.createElement('a');
        link.href = blobUrl;

        // Calculate filename
        const defaultName = file?.name ? file.name.replace(/\.(pdf|jpg|jpeg)$/i, '.csv') : 'converted-file.csv';
        const nameToUse = downloadName.trim() ? downloadName : defaultName;
        const finalName = nameToUse.toLowerCase().endsWith('.csv') ? nameToUse : `${nameToUse}.csv`;

        link.download = finalName;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast.dismiss(toastId);
        toast.success("Download started", {
          style: { border: '1px solid #8E54F7', color: '#fff', background: '#000' },
          icon: <Check color="#8E54F7" />
        });

      } catch (err) {
        console.error('Download failed:', err);
        setError('Download failed. Please try again.');
        toast.error("Download failed to start");
      }
    }
  }, [downloadUrl, currentJobId, file, downloadName])

  const handleReset = useCallback(() => {
    setFile(null)
    setDownloadUrl(null)
    setCurrentJobId(null)
    setError(null)
    setIsUploading(false)
    setIsProcessing(false)
    setPreviewUrl(null)
    setProcessStep(0)
    setDownloadName('')
  }, [])

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const handleFileSelect = useCallback((selectedFile) => {
    if (isUploading || isProcessing) return

    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setDownloadUrl(null)
      setCurrentJobId(null)
    }
  }, [isUploading, isProcessing])

  return (
    <Box sx={{ minHeight: "100vh", background: "#000", color: "#fff", position: 'relative' }}>
      <Toaster position="top-center" richColors theme="dark" />
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
        {/* <Box sx={{
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
        </Box> */}

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
            component={motion.div}
            initial="initial"
            animate={dragActive ? "drag" : "initial"}
            whileHover={!isUploading && !isProcessing ? "hover" : "initial"}
            variants={dropZoneVariants}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed #D1D5DB', // Base border handled by variants
              borderRadius: 3,
              p: 6,
              textAlign: 'center',
              cursor: (isUploading || isProcessing) ? 'not-allowed' : 'pointer',
              opacity: (isUploading || isProcessing) ? 0.6 : 1,
            }}
            onClick={() => !isUploading && !isProcessing && !downloadUrl && document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              disabled={isUploading || isProcessing}
            />

            {/* Stepper Progress UI */}
            {(isUploading || isProcessing || downloadUrl) && (
              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                {steps.map((step) => {
                  const isActive = processStep >= step.id
                  const isCompleted = processStep > step.id
                  return (
                    <Box key={step.id} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: isActive ? '#8E54F7' : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 14,
                        color: '#fff',
                        transition: 'all 0.3s ease'
                      }}>
                        {isCompleted ? <Check size={16} /> : step.id}
                      </Box>
                      <Typography sx={{ ml: 1, fontSize: 14, color: isActive ? '#fff' : '#666', fontWeight: isActive ? 600 : 400 }}>
                        {step.label}
                      </Typography>
                      {step.id !== 3 && <Box sx={{ width: 40, height: 2, bgcolor: isCompleted ? '#8E54F7' : '#333', mx: 2 }} />}
                    </Box>
                  )
                })}
              </Box>
            )}

            {!isUploading && !isProcessing && !downloadUrl && (
              <>
                <Box sx={{ mb: 4 }}>
                  <FileText size={64} color="#9CA3AF" />
                </Box>
                <Typography sx={{ fontSize: 24, fontWeight: 600, color: '#fff', mb: 2 }}>
                  Upload Invoice
                </Typography>
                <Typography sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', mb: 4, lineHeight: 1.6 }}>
                  Drag and drop a PDF or image invoice here, or <span style={{ color: '#3B82F6', textDecoration: 'underline' }}>browse files</span>
                </Typography>
                <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', pt: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>• PDF or JPEG/JPG files • Max 20MB</Typography>
                </Box>
              </>
            )}

            {/* Processing Animation */}
            {(isUploading || isProcessing) && (
              <Box sx={{ py: 4 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ display: 'inline-block' }}>
                  <Loader2 size={48} color="#8E54F7" />
                </motion.div>
                <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.8)' }}>
                  {isUploading ? 'Uploading file...' : 'Processing your document...'}
                </Typography>
              </Box>
            )}

            {/* Success State */}
            {downloadUrl && (
              <motion.div variants={successVariants} initial="hidden" animate="visible">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(142, 84, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Check size={32} color="#8E54F7" />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Ready to Download</Typography>

                  {/* Filename Editor */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#111', p: 1, px: 2, borderRadius: 2, mb: 3, border: '1px solid #333' }}>
                    <FileText size={18} color="#8E54F7" />
                    <input
                      type="text"
                      value={downloadName.replace(/\.csv$/i, '')}
                      onChange={(e) => setDownloadName(e.target.value.replace(/\.csv$/i, ''))}
                      onClick={(e) => e.stopPropagation()}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 16, width: 200, outline: 'none', textAlign: 'left' }}
                    />
                    <Typography sx={{ color: '#666', userSelect: 'none' }}>.csv</Typography>
                    <Edit2 size={16} color="#666" style={{ marginLeft: 8 }} />
                  </Box>
                </Box>
              </motion.div>
            )}
          </Box>

          {/* File Selected */}
          {file && !isUploading && !isProcessing && !downloadUrl && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Box sx={{
                mt: 4,
                p: 3,
                backgroundColor: '#000',
                borderRadius: 2,
                border: '1px solid #8E54F7',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                {previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }}
                  />
                ) : (
                  <FileText size={48} color="#fff" />
                )}
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
            </motion.div>
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
              <GradientButton
                size="large"
                onClick={handleDownload}
                startIcon={<Download size={20} />}
              >
                Download CSV
              </GradientButton>
            )}

            {(file || downloadUrl) && !isUploading && !isProcessing && (
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
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton, List, ListItem, ListItemText, ListItemIcon, Divider, CircularProgress, Alert } from '@mui/material';
import { FileText, Download, Delete, RotateCcw, X, Folder } from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, onFileSelect }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalFiles: 0, formattedTotalSize: '0 Bytes' });
  const [refreshing, setRefreshing] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState(new Set());

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com';
      const response = await fetch(`${apiBase}/api/files`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      setStats({
        totalFiles: data.totalFiles || 0,
        formattedTotalSize: data.formattedTotalSize || '0 Bytes'
      });
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  }, [fetchFiles]);

  const handleDownload = useCallback(async (file) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com';
      
      // Use the direct download endpoint from the backend
      const downloadUrl = `${apiBase}/api/files/download/${file.id}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.filename.replace(/\.pdf$/i, '.csv');
      link.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed');
    }
  }, []);

  const handleFileClick = useCallback((file) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDelete = useCallback(async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      return;
    }
    setDeletingFiles(prev => new Set([...prev, file.id]));
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'https://csv-backend-oyvb.onrender.com';
      const response = await fetch(`${apiBase}/api/files/${file.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }
      
      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setStats(prev => ({
        totalFiles: prev.totalFiles - 1,
        formattedTotalSize: prev.formattedTotalSize
      }));
    } catch (err) {
      console.error('Failed to delete file:', err);
      setError('Failed to delete file');
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  }, []);

  // Load files on component mount
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  // Auto-refresh every 30 seconds when sidebar is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchFiles();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchFiles]);

  return (
    <>
      {/* Sidebar Toggle Button */}
      <IconButton
        onClick={onToggle}
        sx={{
          position: 'fixed',
          top: { xs: 20, sm: 24, md: 32 },
          right: { xs: 16, sm: 20, md: 24 },
          zIndex: 1000,
          backgroundColor: isOpen ? '#EF4444' : '#3B82F6',
          color: 'white',
          width: { xs: 44, sm: 48, md: 52 },
          height: { xs: 44, sm: 48, md: 52 },
          '&:hover': {
            backgroundColor: isOpen ? '#DC2626' : '#2563EB',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease',
        }}
        title={isOpen ? 'Close Files' : 'View Files'}
      >
        {isOpen ? <X size={20} /> : <Folder size={20} />}
      </IconButton>

      {/* Sidebar Overlay */}
      {isOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1200,
          }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 288, // 96 * 3 = 288px
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(10px)',
          // borderLeft: '1px solid #8E54F7',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          zIndex: 1300,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2579E3 0%, #8E54F7 100%)',
            color: 'white',
            p: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              📁 CSV Files
            </Typography>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
                '&:disabled': { opacity: 0.5 },
              }}
              title="Refresh files"
            >
              {refreshing ? <CircularProgress size={20} color="inherit" /> : <RotateCcw size={20} />}
            </IconButton>
          </Box>
          <Box sx={{ fontSize: 14, opacity: 0.9 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>Total Files:</span>
              <span style={{ fontWeight: 600 }}>{stats.totalFiles}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Size:</span>
              <span style={{ fontWeight: 600 }}>{stats.formattedTotalSize}</span>
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, backgroundColor: 'transparent' }}>
          {loading && !refreshing && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} sx={{ mr: 2, color: '#8E54F7' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>Loading files...</Typography>
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Try Again
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!loading && !error && files.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FileText size={64} style={{ opacity: 0.3, marginBottom: 16, color: '#8E54F7' }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, color: '#fff' }}>
                No files found
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Upload a PDF to get started
              </Typography>
            </Box>
          )}

          {/* Files List */}
          <List sx={{ p: 0 }}>
            {files.map((file) => (
              <Box
                key={file.id}
                sx={{
                  backgroundColor: 'rgba(142, 84, 247, 0.1)',
                  border: '1px solid',
                  borderColor: 'rgba(142, 84, 247, 0.3)',
                  borderRadius: 2,
                  mb: 1,
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(142, 84, 247, 0.2)',
                    borderColor: 'rgba(142, 84, 247, 0.5)',
                  },
                }}
                onClick={() => handleFileClick(file)}
              >
                {/* File Info Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <FileText size={20} color="#8E54F7" style={{ marginRight: 12 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 500, 
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {file.filename}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      Size: {file.formattedSize}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Action Buttons Section */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    sx={{ 
                      color: '#8E54F7',
                      backgroundColor: 'rgba(142, 84, 247, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(142, 84, 247, 0.2)',
                      }
                    }}
                    title="Download"
                  >
                    <Download size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    disabled={deletingFiles.has(file.id)}
                    sx={{ 
                      color: '#EF4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      }
                    }}
                    title="Delete File"
                  >
                    {deletingFiles.has(file.id) ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Delete size={16} />
                    )}
                  </IconButton>
                </Box>
              </Box>
            ))}
          </List>
        </Box>

        {/* Footer */}
        <Box sx={{ borderTop: 1, borderColor: 'rgba(142, 84, 247, 0.3)', p: 2, backgroundColor: 'transparent' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', display: 'block' }}>
            Files are stored in MongoDB GridFS
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', display: 'block', mt: 0.5 }}>
            Auto-refreshes every 30 seconds
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default Sidebar;
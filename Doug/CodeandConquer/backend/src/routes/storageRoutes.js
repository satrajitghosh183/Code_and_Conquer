/**
 * Storage Routes
 * 
 * Routes for managing Supabase Storage (buckets and files).
 */

import express from 'express';
import storageService from '../services/storageService.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if storage service is available
const checkStorageService = (req, res, next) => {
  if (!storageService.isAvailable()) {
    return res.status(503).json({ 
      error: 'Storage service not available. Check SUPABASE_SERVICE_ROLE_KEY configuration.' 
    });
  }
  next();
};

/**
 * GET /api/storage/buckets
 * Get all buckets
 */
router.get('/buckets', checkStorageService, async (req, res) => {
  try {
    const buckets = await storageService.getBuckets();
    res.json(buckets);
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/buckets/:bucketName
 * Get bucket by name
 */
router.get('/buckets/:bucketName', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const bucket = await storageService.getBucket(bucketName);
    
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    
    res.json(bucket);
  } catch (error) {
    console.error('Error fetching bucket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/buckets
 * Create a new bucket
 */
router.post('/buckets', checkStorageService, async (req, res) => {
  try {
    const { name, public: isPublic, fileSizeLimit, allowedMimeTypes } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }
    
    const bucket = await storageService.createBucket(name, {
      public: isPublic,
      fileSizeLimit,
      allowedMimeTypes,
    });
    
    res.json(bucket);
  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/storage/buckets/:bucketName
 * Delete a bucket
 */
router.delete('/buckets/:bucketName', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    await storageService.deleteBucket(bucketName);
    res.json({ success: true, message: 'Bucket deleted' });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/buckets/:bucketName/files
 * List files in a bucket
 */
router.get('/buckets/:bucketName/files', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { path = '', limit = 100, offset = 0 } = req.query;
    
    const files = await storageService.listObjects(bucketName, path, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/buckets/:bucketName/upload
 * Upload a file
 */
router.post('/buckets/:bucketName/upload', checkStorageService, upload.single('file'), async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { path, metadata, contentType } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const result = await storageService.uploadFile(
      bucketName,
      path,
      file.buffer,
      {
        contentType: contentType || file.mimetype,
        metadata: metadata ? JSON.parse(metadata) : {},
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/buckets/:bucketName/files
 * Download a file (path in query param)
 */
router.get('/buckets/:bucketName/files', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const file = await storageService.downloadFile(bucketName, path);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(file);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/buckets/:bucketName/files/url
 * Get public URL for a file (path in query param)
 */
router.get('/buckets/:bucketName/files/url', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { path, signed = false, expiresIn = 3600 } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    if (signed === 'true') {
      const url = await storageService.createSignedUrl(bucketName, path, parseInt(expiresIn));
      res.json({ url });
    } else {
      const url = storageService.getPublicUrl(bucketName, path);
      res.json({ url });
    }
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/storage/buckets/:bucketName/files
 * Delete a file (path in query param)
 */
router.delete('/buckets/:bucketName/files', checkStorageService, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    await storageService.deleteFile(bucketName, path);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


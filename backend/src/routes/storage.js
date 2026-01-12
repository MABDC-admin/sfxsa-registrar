import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuth } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'default';
    const uploadPath = path.join('uploads', bucket);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const customPath = req.params[0]; // Capture path after bucket
    if (customPath) {
      // Use the provided path/filename
      const dir = path.dirname(customPath);
      const uploadPath = path.join('uploads', req.params.bucket, dir);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, path.basename(customPath));
    } else {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Upload file to bucket
router.post('/object/:bucket/*', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      // Handle raw body upload (for direct file content)
      return res.status(400).json({ error: 'No file provided' });
    }

    const bucket = req.params.bucket;
    
    // If bucket is 'db', store in database
    if (bucket === 'db') {
      const { originalname, mimetype, size } = req.file;
      const fileContent = fs.readFileSync(req.file.path);
      
      const result = await pool.query(
        'INSERT INTO storage_blobs (name, mime_type, content, size) VALUES ($1, $2, $3, $4) RETURNING id',
        [originalname, mimetype, fileContent, size]
      );
      
      // Clean up disk file after DB storage
      fs.unlinkSync(req.file.path);
      
      const blobId = result.rows[0].id;
      return res.json({
        Key: `db/${blobId}`,
        path: blobId,
        fullPath: `db/${blobId}`,
        id: blobId
      });
    }

    const filePath = req.params[0] || req.file.filename;

    res.json({
      Key: `${bucket}/${filePath}`,
      path: filePath,
      fullPath: `${bucket}/${filePath}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve blob from database
router.get('/db/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT mime_type, content FROM storage_blobs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { mime_type, content } = result.rows[0];
    res.setHeader('Content-Type', mime_type);
    res.send(content);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload with upsert
router.put('/object/:bucket/*', optionalAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const bucket = req.params.bucket;
    const filePath = req.params[0] || req.file.filename;

    res.json({
      Key: `${bucket}/${filePath}`,
      path: filePath,
      fullPath: `${bucket}/${filePath}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get public URL
router.get('/object/public/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const fullPath = path.join('uploads', bucket, filePath);

  if (fs.existsSync(fullPath)) {
    res.sendFile(path.resolve(fullPath));
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Generate public URL (returns URL string)
router.post('/object/public-url/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const baseUrl = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 3001}`;

  if (bucket === 'db') {
    return res.json({
      data: {
        publicUrl: `${baseUrl}/storage/v1/db/${filePath}`
      }
    });
  }

  res.json({
    data: {
      publicUrl: `${baseUrl}/storage/v1/object/public/${bucket}/${filePath}`
    }
  });
});

// Download/get file
router.get('/object/:bucket/*', optionalAuth, (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const fullPath = path.join('uploads', bucket, filePath);

  if (fs.existsSync(fullPath)) {
    res.sendFile(path.resolve(fullPath));
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete file(s)
router.delete('/object/:bucket', optionalAuth, async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const { prefixes } = req.body; // Array of file paths to delete

    const deleted = [];
    const errors = [];

    if (bucket === 'db') {
      for (const id of prefixes || []) {
        try {
          await pool.query('DELETE FROM storage_blobs WHERE id = $1', [id]);
          deleted.push(id);
        } catch (err) {
          errors.push({ path: id, error: err.message });
        }
      }
    } else {
      for (const filePath of prefixes || []) {
        const fullPath = path.join('uploads', bucket, filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          deleted.push(filePath);
        } else {
          errors.push({ path: filePath, error: 'File not found' });
        }
      }
    }

    res.json({ data: deleted, errors: errors.length > 0 ? errors : null });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List files in bucket
router.get('/bucket/:bucket/objects', optionalAuth, (req, res) => {
  try {
    const bucket = req.params.bucket;
    const bucketPath = path.join('uploads', bucket);

    if (!fs.existsSync(bucketPath)) {
      return res.json([]);
    }

    const files = fs.readdirSync(bucketPath, { withFileTypes: true });
    const objects = files.map(file => ({
      name: file.name,
      id: file.name,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json(objects);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create bucket
router.post('/bucket', optionalAuth, (req, res) => {
  try {
    const { name } = req.body;
    const bucketPath = path.join('uploads', name);

    if (!fs.existsSync(bucketPath)) {
      fs.mkdirSync(bucketPath, { recursive: true });
    }

    res.json({ name, created: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
